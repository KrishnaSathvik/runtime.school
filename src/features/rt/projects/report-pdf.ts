import { PDFDocument, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { completionDate, type ReportDocument } from "./report-document";

const ink = rgb(.10, .10, .09), muted = rgb(.38, .38, .35), amber = rgb(.85, .57, .16);
const W = 595.28, H = 841.89, M = 52, WIDTH = W - M * 2;
export function wrapPdfText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  const widths = new Map<string, number>();
  const measure = (value: string) => { let result = widths.get(value); if (result === undefined) { result = font.widthOfTextAtSize(value,size); widths.set(value,result); } return result; };
  for (const paragraph of text.replace(/\r\n/g, "\n").replace(/\t/g, "    ").split("\n")) {
    let line = "", lineWidth = 0;
    for (const word of paragraph.split(/( +)/)) {
      const wordWidth = measure(word);
      if (wordWidth > width) {
        for (const char of word) {
          const charWidth = measure(char);
          if (lineWidth + charWidth > width) { lines.push(line); line = ""; lineWidth = 0; }
          line += char; lineWidth += charWidth;
        }
      } else {
        if (line && lineWidth + wordWidth > width) { lines.push(line.trimEnd()); line = ""; lineWidth = 0; if (!word.trim()) continue; }
        line += word; lineWidth += wordWidth;
      }
    }
    lines.push(line);
  }
  return lines;
}
export async function buildProjectPdf(report: ReportDocument, fonts: { sans: Uint8Array; mono: Uint8Array; serif: Uint8Array; bold: Uint8Array }) {
  if (!report.complete) throw new Error("Complete the project before downloading its certificate.");
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [sans, mono, serif, bold] = await Promise.all([pdf.embedFont(fonts.sans, { subset: true }), pdf.embedFont(fonts.mono, { subset: true }), pdf.embedFont(fonts.serif, { subset: true }), pdf.embedFont(fonts.bold, { subset: true })]);
  pdf.setTitle(`${report.title} — Certificate & project report`); pdf.setAuthor(report.learner || "Runtime"); pdf.setCreator("Runtime SQL Projects");
  const CW = H, CH = W;
  let page = pdf.addPage([CW, CH]);
  const gold = rgb(.65,.48,.19), paleGold = rgb(.91,.85,.70);
  page.drawRectangle({x:0,y:0,width:CW,height:CH,color:rgb(.995,.991,.977)});
  page.drawRectangle({x:25,y:25,width:CW-50,height:CH-50,borderColor:gold,borderWidth:1.5});
  page.drawRectangle({x:32,y:32,width:CW-64,height:CH-64,borderColor:paleGold,borderWidth:.6});
  for (const x of [42,CW-42]) for (const yy of [42,CH-42]) {
    const dx=x<CW/2?1:-1, dy=yy<CH/2?1:-1;
    page.drawLine({start:{x,y:yy},end:{x:x+dx*42,y:yy},color:gold,thickness:2});
    page.drawLine({start:{x,y:yy},end:{x,y:yy+dy*24},color:gold,thickness:2});
  }
  const center = (text: string, size: number, yy: number, font = sans, color = ink) => page.drawText(text, { x:(CW-font.widthOfTextAtSize(text,size))/2, y:yy, size, font, color });
  center("runtime",13,CH-70,mono);
  center("Certificate",46,CH-142,serif);
  center("OF PROJECT COMPLETION",10,CH-167,bold,gold);
  center(report.learner ? "Presented to" : "Awarded for completing",11,CH-212,sans,muted);
  let cy=CH-253;
  if (report.learner) {
    let nameSize=29;
    while (nameSize>16 && wrapPdfText(report.learner,serif,nameSize,CW-180).length>2) nameSize--;
    for (const line of wrapPdfText(report.learner,serif,nameSize,CW-180)) { center(line,nameSize,cy,serif); cy-=nameSize+6; }
    page.drawLine({start:{x:CW/2-170,y:cy+18},end:{x:CW/2+170,y:cy+18},color:paleGold,thickness:.7});
    cy-=12;
    center("for completing the SQL project",11,cy,sans,muted); cy-=30;
  }
  let titleSize=20;
  while (titleSize>12 && wrapPdfText(report.title,bold,titleSize,CW-180).length>2) titleSize--;
  for (const line of wrapPdfText(report.title,bold,titleSize,CW-180)) { center(line,titleSize,cy,bold); cy-=titleSize+7; }
  center("SQL investigations, interpretation, and a completed analytical report",10,cy-8,sans,muted);
  page.drawCircle({x:CW/2,y:108,size:25,borderColor:gold,borderWidth:1.5,color:rgb(.97,.94,.86)});
  page.drawCircle({x:CW/2,y:108,size:20,borderColor:paleGold,borderWidth:.8});
  center("SQL",11,104,bold,gold);
  page.drawLine({start:{x:105,y:111},end:{x:285,y:111},color:paleGold,thickness:.8});
  page.drawLine({start:{x:CW-285,y:111},end:{x:CW-105,y:111},color:paleGold,thickness:.8});
  const date=completionDate(report.completedAt);
  page.drawText(date || "Project completed",{x:105,y:91,font:bold,size:10,color:ink});
  page.drawText("Completion date",{x:105,y:74,font:sans,size:8,color:muted});
  page.drawText("Runtime SQL Projects",{x:CW-285,y:91,font:bold,size:10,color:ink});
  page.drawText(`${report.level[0].toUpperCase()+report.level.slice(1)} · ${report.dataset}`,{x:CW-285,y:74,font:sans,size:8,color:muted});
  let y = 0;
  const nextPage = () => { page=pdf.addPage([W,H]); y=H-85; page.drawText("runtime",{x:M,y:H-38,font:bold,size:10,color:ink}); page.drawText("PROJECT REPORT",{x:W-M-95,y:H-38,font:sans,size:8,color:muted}); page.drawLine({start:{x:M,y:H-49},end:{x:W-M,y:H-49},color:rgb(.85,.84,.80),thickness:.6}); };
  const ensure = (height: number) => { if (y-height < 58) nextPage(); };
  const paragraph = (text: string, size=11, font=sans, code=false) => {
    for (const line of wrapPdfText(text,font,size,WIDTH-(code?20:0))) {
      ensure(size*1.6);
      if (code) page.drawRectangle({x:M,y:y-size*.35,width:WIDTH,height:size*1.65,color:rgb(.96,.96,.95)});
      if (line) page.drawText(line,{x:M+(code?10:0),y,font,size,color:ink});
      y -= size*1.6;
    }
    y-=12;
  };
  const heading = (text: string, size=16) => {
    const lines=wrapPdfText(text,bold,size,WIDTH-24);
    const height=lines.length*size*1.35;
    ensure(height+76); y-=12;
    if (size >= 16 && size < 24) {
      page.drawRectangle({x:M,y:y-height+size*1.35-10,width:WIDTH,height:height-size*1.35+size+18,color:rgb(.95,.95,.93)});
      page.drawRectangle({x:M,y:y-height+size*1.35-10,width:3,height:height-size*1.35+size+18,color:amber});
    }
    for (const line of lines) { page.drawText(line,{x:M+(size>=16&&size<24?12:0),y,font:bold,size,color:ink}); y-=size*1.35; }
    y-=size>=16?22:10;
  };
  nextPage(); heading("Project analysis",26); paragraph(report.title,15,bold); paragraph(`${report.role} · ${report.dataset}`,10);
  for (const section of report.sections) { heading(section.title); paragraph(section.text); }
  if (report.findings.length) heading("Key findings",21);
  for (const finding of report.findings) { heading(finding.title,14); paragraph(finding.text); }
  for (const section of report.synthesis) { heading(section.title); paragraph(section.text); }
  if (report.findings.length) { nextPage(); heading("SQL & saved results",25); }
  for (const finding of report.findings) {
    heading(`Stage ${finding.stageNumber} · ${finding.title}`,16);
    paragraph(finding.query,9,mono,true);
    paragraph(`${finding.result.values.length} saved rows of ${finding.total} result rows.`,9);
    // Vertical records remain legible for wide query outputs and paginate without clipping columns.
    finding.result.values.forEach((row,i) => { heading(`Result ${i+1}`,11); paragraph(finding.result.columns.map((column,j)=>`${column}: ${row[j] === null ? "NULL" : String(row[j])}`).join("\n"),9,mono); });
  }
  heading("Data source"); paragraph(report.source,9); paragraph(report.sourceUrl,9);
  pdf.getPages().forEach((p,i) => p.drawText(`Runtime · ${i+1} / ${pdf.getPageCount()}`,{x:M,y:i === 0 ? 14 : 30,font:sans,size:8,color:muted}));
  return pdf.save();
}
export async function downloadProjectPdf(report: ReportDocument, filename: string) {
  const getFont = async (name: string) => { const res = await fetch(`/fonts/pdf/${name}.ttf`); if (!res.ok) throw new Error("Could not load report fonts. Please try again."); return new Uint8Array(await res.arrayBuffer()); };
  const [sans,mono,serif,bold] = await Promise.all([getFont("geist-sans"),getFont("geist-mono"),getFont("source-serif-4-latin"),getFont("geist-sans-semibold")]);
  const bytes = await buildProjectPdf(report,{sans,mono,serif,bold});
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:"application/pdf"}));
  const a=document.createElement("a"); a.href=url; a.download=filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
