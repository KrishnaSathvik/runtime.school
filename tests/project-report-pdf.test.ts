import { describe, it, expect } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { buildProjectPdf } from "@/features/rt/projects/report-pdf";
import { projectReportDocument, type ReportDocument } from "@/features/rt/projects/report-document";
import { projects } from "@/content/projects";
import { reportSectionKey } from "@/features/rt/projects/evidence";

const fonts = { bold: readFileSync("public/fonts/pdf/geist-sans-semibold.ttf"), sans: readFileSync("public/fonts/pdf/geist-sans.ttf"), mono: readFileSync("public/fonts/pdf/geist-mono.ttf"), serif: readFileSync("public/fonts/pdf/source-serif-4-latin.ttf") };
const report: ReportDocument = {
  title: "Retail Performance Review", role: "Junior Business Analyst", level: "beginner", dataset: "Retail", complete: true,
  learner: "Alex García", completedAt: "2026-10-15T12:00:00Z",
  sections: [{title:"Summary",text:"Net invoiced value was £1,956,971.43. Negative adjustments represented 3.70% of positive value."},{title:"Recommendation",text:"Prioritize the largest negative adjustments and verify customer coverage before outreach."},{title:"Limitations",text:"This invoice extract does not establish payment or refund outcomes."}],
  synthesis: [{title:"Commercial diagnosis",text:"Negative values reduce the positive control total; the next step is to investigate adjustment causes."}],
  findings: [{title:"Size the adjustment problem",text:"Adjustments reduced positive value by £75,136.14.",stageNumber:3,query:"SELECT SUM(quantity * unit_price_gbp) AS net_gbp\nFROM order_items;",total:1,result:{columns:["net_gbp"],values:[[1956971.43]]}}],
  source:"Chen, D. (2012). Online Retail II. Licensed CC BY 4.0.",sourceUrl:"https://archive.ics.uci.edu/dataset/502/online+retail+ii",
};
describe("Project certificate and report PDF", () => {
  it("does not certify an unfinished project", async () => {
    await expect(buildProjectPdf({...report,complete:false},fonts)).rejects.toThrow("Complete the project");
    const project = projects[0];
    const model = projectReportDocument(project,{[reportSectionKey(project,"certificate-name")]:"Alex",[reportSectionKey(project,project.reportTemplate.sections[0].id)]:"Draft analysis"});
    expect(model.complete).toBe(false); expect(model.learner).toBe("Alex"); expect(model.sections[0].text).toBe("Draft analysis");
  });
  it("creates a certificate, analysis pages and SQL appendix using embedded fonts", async () => {
    const bytes=await buildProjectPdf(report,fonts);
    const doc=await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
    expect(doc.getTitle()).toContain("Certificate");
    expect(doc.getAuthor()).toBe("Alex García");
    writeFileSync("/tmp/project-certificate-report.pdf",bytes);
  });
  it("paginates long narratives and SQL without dropping the appendix", async () => {
    const bytes=await buildProjectPdf({...report,sections:[{title:"Summary",text:"A long analytical conclusion with numbers £125 and 5.5%. ".repeat(300)}],findings:[{...report.findings[0],query:"SELECT '"+"x".repeat(1200)+"' AS long_value;"}]},fonts);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(6);
    writeFileSync("/tmp/project-certificate-long.pdf",bytes);
  });
});
