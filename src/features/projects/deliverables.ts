import { datasetCatalog, lessons } from "@/content";
import type { Project } from "@/content/types";
import { milestoneDone, type MilestoneState, type ProjectState } from "@/lib/learning-state";
import { BRAND_DOMAIN, BRAND_NAME, BRAND_TAGLINE } from "@/platform/brand";

/** Persisted evidence from a successful Check answer (not a bare Run). */
export type VerifiedResult = {
  ok: boolean;
  guided?: boolean;
  columns?: string[];
  values?: unknown[][];
  time?: number;
  /** Exact SQL that produced this verified result. */
  sql?: string;
  /** True when only a prefix of the result rows was stored. */
  truncated?: boolean;
  /** Row count returned by the engine before any client truncation, when known. */
  rowCount?: number;
};

export type ReportKind = "empty" | "draft" | "complete";

export type ReportReadiness = {
  kind: ReportKind;
  /** Human-readable reasons the report is not complete (empty when complete). */
  missing: string[];
  milestonesCompleted: number;
  milestonesTotal: number;
  findingsWritten: number;
  verifiedChecks: number;
  hasAnyWork: boolean;
};

const RESULT_ROW_CAP = 100;

const cell = (v: unknown) =>
  v === null || v === undefined ? "NULL" : String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");

function asVerified(r: unknown): VerifiedResult | undefined {
  if (!r || typeof r !== "object") return undefined;
  return r as VerifiedResult;
}

function table(r: VerifiedResult): string {
  if (!r.columns?.length) return "_No result table saved._";
  const head = `| ${r.columns.map(cell).join(" | ")} |`;
  const rule = `| ${r.columns.map(() => "---").join(" | ")} |`;
  const body = (r.values ?? []).map((row) => `| ${row.map(cell).join(" | ")} |`);
  const note =
    r.truncated
      ? `\n\n_Result evidence truncated for storage: showing ${r.values?.length ?? 0} of ${r.rowCount ?? "many"} rows from the checked run._`
      : "";
  return [head, rule, ...body].join("\n") + note;
}

function status(m: MilestoneState | undefined): string {
  if (milestoneDone(m)) return "Completed";
  if (m) return "In progress";
  return "Not started";
}

function verifiedSql(m: MilestoneState | undefined, variant: number): string | undefined {
  const r = asVerified(m?.results?.[variant]);
  if (r?.ok && typeof r.sql === "string" && r.sql.trim()) return r.sql;
  if (r?.ok && typeof m?.queries?.[variant] === "string") return m.queries[variant];
  return undefined;
}

export function countVerifiedChecks(rec: ProjectState | undefined, project: Project): number {
  let n = 0;
  for (const id of project.milestoneIds) {
    const m = rec?.milestones[id];
    if (!m) continue;
    for (const v of [0, 1]) {
      if (asVerified(m.results[v])?.ok) n += 1;
    }
  }
  return n;
}

/**
 * Draft vs complete readiness.
 * - empty: no saved queries, verified results, or findings
 * - draft: some project work exists, but not every milestone is SQL-complete with a finding
 * - complete: every milestone is milestoneDone AND has a non-empty learner finding
 *
 * SQL completion (milestoneDone) is unchanged and does not require findings.
 */
export function reportReadiness(project: Project, rec: ProjectState | undefined): ReportReadiness {
  const milestonesTotal = project.milestoneIds.length;
  const milestonesCompleted = project.milestoneIds.filter((id) => milestoneDone(rec?.milestones[id])).length;
  const findingsWritten = project.milestoneIds.filter((id) => !!rec?.milestones[id]?.notes?.trim()).length;
  const verifiedChecks = countVerifiedChecks(rec, project);
  const hasAnyWork =
    verifiedChecks > 0 ||
    findingsWritten > 0 ||
    project.milestoneIds.some((id) => Object.keys(rec?.milestones[id]?.queries ?? {}).length > 0);

  const missing: string[] = [];
  if (!hasAnyWork) {
    return {
      kind: "empty",
      missing: ["Check at least one SQL challenge or write a finding before downloading a report."],
      milestonesCompleted,
      milestonesTotal,
      findingsWritten,
      verifiedChecks,
      hasAnyWork: false,
    };
  }

  for (const id of project.milestoneIds) {
    const l = lessons[id];
    const m = rec?.milestones[id];
    if (!milestoneDone(m)) {
      missing.push(`Complete milestone SQL + concept check: ${l.title}`);
    } else if (!m?.notes?.trim()) {
      missing.push(`Write a finding for: ${l.title}`);
    }
  }

  return {
    kind: missing.length ? "draft" : "complete",
    missing,
    milestonesCompleted,
    milestonesTotal,
    findingsWritten,
    verifiedChecks,
    hasAnyWork: true,
  };
}

/** Cap rows when persisting verified Check evidence; records truncation honestly. */
export function persistableResult(
  result: { columns?: string[]; values?: unknown[][] } | null | undefined,
  meta: { ok: boolean; guided: boolean; sql: string },
): VerifiedResult {
  const values = result?.values ?? [];
  const truncated = values.length > RESULT_ROW_CAP;
  return {
    ok: meta.ok,
    guided: meta.guided,
    columns: result?.columns ?? [],
    values: truncated ? values.slice(0, RESULT_ROW_CAP) : values,
    time: Date.now(),
    sql: meta.sql,
    ...(truncated ? { truncated: true, rowCount: values.length } : { rowCount: values.length }),
  };
}

/** Markdown report of the learner's saved project work (queries, checked results, status). */
export function projectReport(project: Project, rec: ProjectState | undefined, now = new Date()): string {
  const ds = datasetCatalog[project.dataset];
  const readiness = reportReadiness(project, rec);
  const label = readiness.kind === "complete" ? "Complete report" : readiness.kind === "draft" ? "Draft report" : "Empty report";
  const out: string[] = [
    `# ${project.title}`,
    "",
    `_${label}_`,
    "",
    project.description,
    "",
    `- Sample database: ${ds?.name ?? project.dataset} (${(ds?.tables ?? []).join(", ")})`,
    `- Milestones completed (SQL + concept check): ${readiness.milestonesCompleted} of ${readiness.milestonesTotal}`,
    `- Findings written: ${readiness.findingsWritten} of ${readiness.milestonesTotal}`,
    `- Verified checks (Check answer passed): ${readiness.verifiedChecks}`,
    `- Exported: ${now.toISOString()}`,
    "",
    "Findings are the learner’s own interpretation. Passing a SQL check does not verify the written finding.",
    "",
  ];

  if (readiness.kind === "draft" && readiness.missing.length) {
    out.push("## Incomplete for a complete report", "", ...readiness.missing.map((m) => `- ${m}`), "");
  }

  project.milestoneIds.forEach((id, i) => {
    const l = lessons[id];
    const m = rec?.milestones[id];
    out.push(`## Milestone ${i + 1}: ${l.title}`, "", `Status: ${status(m)}${m?.check ? " · concept check passed" : ""}`, "");
    if (m?.notes?.trim()) out.push("**Findings**", "", m.notes.trim(), "");
    else out.push("_No finding written yet._", "");
    l.tasks.forEach((t, v) => {
      const r = asVerified(m?.results?.[v]);
      const q = verifiedSql(m, v) ?? m?.queries?.[v];
      const draftDiffers = r?.ok && r.sql && m?.queries?.[v] && r.sql.trim() !== m.queries[v].trim();
      const state = m?.solved?.includes(v)
        ? "solved without hints"
        : r?.ok
          ? "solved with help"
          : r
            ? "checked, not yet correct"
            : q
              ? "attempted, not verified"
              : "not attempted";
      out.push(`### ${i + 1}.${v + 1} ${t.prompt}`, "", `_${state}_`, "");
      if (r?.ok) {
        const sqlText = (typeof r.sql === "string" && r.sql.trim() ? r.sql : q) ?? "";
        if (sqlText) {
          out.push("**Checked SQL** (verified by Check answer)", "", "```sql", sqlText.trim(), "```", "");
        }
        if (r.columns?.length) out.push(table(r), "");
        else if (!r.columns?.length && !sqlText) out.push("_Verified check recorded without saved SQL or result table._", "");
        if (draftDiffers) {
          out.push(
            "_Editor draft changed after this check. The draft below was not re-verified._",
            "",
            "```sql",
            m!.queries[v].trim(),
            "```",
            "",
          );
        }
      } else if (q) {
        out.push("```sql", q.trim(), "```", "");
        if (r && !r.ok) out.push("_Last check did not pass. No verified result evidence._", "");
      }
    });
  });
  return out.join("\n");
}

function pdfEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfLatin1(s: string): string {
  return s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
}

type PdfFont = "Helv" | "HelvB" | "Cour";
type PdfLine = {
  text: string;
  font: PdfFont;
  size: number;
  /** Extra space after this line (points). */
  after?: number;
  color?: [number, number, number];
};

const PDF_PAGE_W = 612;
const PDF_PAGE_H = 792;
const PDF_MARGIN_X = 54;
const PDF_MARGIN_TOP = 56;
const PDF_MARGIN_BOTTOM = 52;
/** Approximate average glyph width as a fraction of font size (Helvetica ≈ 0.5). */
const PDF_CHAR_W: Record<PdfFont, number> = { Helv: 0.5, HelvB: 0.52, Cour: 0.6 };

function pdfWrap(text: string, font: PdfFont, size: number, maxWidth: number): string[] {
  const cleaned = pdfLatin1(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return [""];
  const maxChars = Math.max(8, Math.floor(maxWidth / (size * PDF_CHAR_W[font])));
  if (cleaned.length <= maxChars) return [cleaned];
  const words = cleaned.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    if (w.length <= maxChars) {
      cur = w;
    } else {
      for (let i = 0; i < w.length; i += maxChars) lines.push(w.slice(i, i + maxChars));
      cur = "";
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

function pushWrapped(
  out: PdfLine[],
  text: string,
  font: PdfFont,
  size: number,
  after = 2,
  color?: [number, number, number],
) {
  const width = PDF_PAGE_W - PDF_MARGIN_X * 2;
  const parts = pdfWrap(text, font, size, width);
  parts.forEach((t, i) => {
    out.push({
      text: t,
      font,
      size,
      after: i === parts.length - 1 ? after : Math.round(size * 0.35),
      color,
    });
  });
}

/** Build printable lines from project state (not raw Markdown — matches Runtime tone). */
function reportPdfLines(project: Project, rec: ProjectState | undefined, now: Date): PdfLine[] {
  const ds = datasetCatalog[project.dataset];
  const readiness = reportReadiness(project, rec);
  const kindLabel =
    readiness.kind === "complete" ? "Complete report" : readiness.kind === "draft" ? "Draft report" : "Empty report";
  const muted: [number, number, number] = [0.4, 0.4, 0.4];
  const ink: [number, number, number] = [0.07, 0.07, 0.07];
  const amber: [number, number, number] = [0.72, 0.48, 0.08];
  const lines: PdfLine[] = [];

  pushWrapped(lines, `${BRAND_NAME.toLowerCase()}.`, "HelvB", 11, 2, amber);
  pushWrapped(lines, BRAND_TAGLINE, "Helv", 9, 2, muted);
  pushWrapped(lines, BRAND_DOMAIN, "Helv", 9, 14, muted);

  pushWrapped(lines, project.title, "HelvB", 20, 6, ink);
  pushWrapped(lines, kindLabel, "Helv", 11, 8, amber);
  pushWrapped(lines, project.description, "Helv", 10, 12, ink);

  pushWrapped(lines, `Sample database  ${ds?.name ?? project.dataset}`, "Helv", 10, 3, muted);
  if (ds?.tables?.length) {
    pushWrapped(lines, `Tables  ${ds.tables.join(", ")}`, "Helv", 10, 3, muted);
  }
  pushWrapped(
    lines,
    `Milestones  ${readiness.milestonesCompleted} of ${readiness.milestonesTotal} complete`,
    "Helv",
    10,
    3,
    muted,
  );
  pushWrapped(
    lines,
    `Findings  ${readiness.findingsWritten} of ${readiness.milestonesTotal}  ·  Verified checks  ${readiness.verifiedChecks}`,
    "Helv",
    10,
    3,
    muted,
  );
  pushWrapped(lines, `Exported  ${now.toISOString()}`, "Helv", 10, 14, muted);

  pushWrapped(
    lines,
    "Findings are the learner's own interpretation. Passing a SQL check does not verify the written finding.",
    "Helv",
    9,
    16,
    muted,
  );

  if (readiness.kind === "draft" && readiness.missing.length) {
    pushWrapped(lines, "Still needed for a complete report", "HelvB", 12, 6, ink);
    for (const m of readiness.missing) pushWrapped(lines, `•  ${m}`, "Helv", 10, 3, muted);
    lines.push({ text: " ", font: "Helv", size: 8, after: 10 });
  }

  project.milestoneIds.forEach((id, i) => {
    const l = lessons[id];
    const m = rec?.milestones[id];
    pushWrapped(lines, `Milestone ${i + 1}`, "Helv", 9, 2, amber);
    pushWrapped(lines, l.title, "HelvB", 14, 4, ink);
    pushWrapped(
      lines,
      `Status  ${status(m)}${m?.check ? "  ·  concept check passed" : ""}`,
      "Helv",
      10,
      8,
      muted,
    );

    pushWrapped(lines, "Finding", "HelvB", 10, 3, ink);
    if (m?.notes?.trim()) pushWrapped(lines, m.notes.trim(), "Helv", 10, 10, ink);
    else pushWrapped(lines, "No finding written yet.", "Helv", 10, 10, muted);

    l.tasks.forEach((t, v) => {
      const r = asVerified(m?.results?.[v]);
      const q = verifiedSql(m, v) ?? m?.queries?.[v];
      const state = m?.solved?.includes(v)
        ? "Solved without hints"
        : r?.ok
          ? "Solved with help"
          : r
            ? "Checked, not yet correct"
            : q
              ? "Attempted, not verified"
              : "Not attempted";

      pushWrapped(lines, `${i + 1}.${v + 1}  ${t.prompt}`, "HelvB", 11, 3, ink);
      pushWrapped(lines, state, "Helv", 9, 6, muted);

      if (r?.ok) {
        const sqlText = (typeof r.sql === "string" && r.sql.trim() ? r.sql : q) ?? "";
        if (sqlText) {
          pushWrapped(lines, "Checked SQL", "HelvB", 9, 3, muted);
          for (const row of sqlText.trim().split("\n")) {
            pushWrapped(lines, row || " ", "Cour", 9, 1, ink);
          }
          lines.push({ text: " ", font: "Helv", size: 6, after: 4 });
        }
        if (r.columns?.length) {
          pushWrapped(lines, "Result evidence", "HelvB", 9, 3, muted);
          const header = r.columns.join("  |  ");
          pushWrapped(lines, header, "Cour", 8, 2, muted);
          for (const row of (r.values ?? []).slice(0, 20)) {
            pushWrapped(lines, row.map(cell).join("  |  "), "Cour", 8, 1, ink);
          }
          if ((r.values?.length ?? 0) > 20 || r.truncated) {
            pushWrapped(
              lines,
              r.truncated
                ? `Showing first ${r.values?.length ?? 0} of ${r.rowCount ?? "many"} rows.`
                : "Showing first 20 rows.",
              "Helv",
              8,
              4,
              muted,
            );
          }
          lines.push({ text: " ", font: "Helv", size: 6, after: 6 });
        }
      } else if (q) {
        pushWrapped(lines, "Draft SQL (not verified)", "HelvB", 9, 3, muted);
        for (const row of q.trim().split("\n")) {
          pushWrapped(lines, row || " ", "Cour", 9, 1, ink);
        }
        if (r && !r.ok) {
          pushWrapped(lines, "Last check did not pass. No verified result evidence.", "Helv", 9, 4, muted);
        }
        lines.push({ text: " ", font: "Helv", size: 6, after: 6 });
      } else {
        lines.push({ text: " ", font: "Helv", size: 6, after: 4 });
      }
    });

    lines.push({ text: " ", font: "Helv", size: 8, after: 12 });
  });

  return lines;
}

function paginatePdfLines(lines: PdfLine[]): PdfLine[][] {
  const pages: PdfLine[][] = [];
  let page: PdfLine[] = [];
  let y = PDF_PAGE_H - PDF_MARGIN_TOP;
  const minY = PDF_MARGIN_BOTTOM + 18;

  const flush = () => {
    pages.push(page);
    page = [];
    y = PDF_PAGE_H - PDF_MARGIN_TOP;
  };

  for (const line of lines) {
    const need = line.size + (line.after ?? 2);
    if (y - need < minY && page.length) flush();
    page.push(line);
    y -= need;
  }
  if (page.length) pages.push(page);
  if (!pages.length) pages.push([{ text: " ", font: "Helv", size: 10, after: 2 }]);
  return pages;
}

/**
 * Branded printable PDF (no server, no deps). Structured layout — not a Markdown dump.
 * Prefer the Markdown download for full Unicode fidelity; PDF uses Latin-1 + Helvetica/Courier.
 */
export function projectReportPdf(project: Project, rec: ProjectState | undefined, now = new Date()): Uint8Array {
  const pages = paginatePdfLines(reportPdfLines(project, rec, now));
  const fontIds = { Helv: 0, HelvB: 0, Cour: 0 };
  const pageCount = pages.length;
  // Objects: 1 Catalog, 2 Pages, then pairs (Page, Content) per page, then 3 fonts.
  const firstFont = 3 + pageCount * 2;
  fontIds.Helv = firstFont;
  fontIds.HelvB = firstFont + 1;
  fontIds.Cour = firstFont + 2;

  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objects.push(`2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>endobj\n`);

  pages.forEach((pageLines, pageIndex) => {
    const pageObj = 3 + pageIndex * 2;
    const contentObj = pageObj + 1;
    let y = PDF_PAGE_H - PDF_MARGIN_TOP;
    const ops: string[] = [];

    // Accent rule under the brand band on page 1.
    if (pageIndex === 0) {
      ops.push("0.72 0.48 0.08 rg", `${PDF_MARGIN_X} ${PDF_PAGE_H - 36} ${40} 2.5 re f`, "0 0 0 rg");
    }

    ops.push("BT");
    let curFont: PdfFont | null = null;
    let curSize = 0;
    let curColor: string | null = null;

    for (const line of pageLines) {
      if (curFont !== line.font || curSize !== line.size) {
        ops.push(`/${line.font} ${line.size} Tf`);
        curFont = line.font;
        curSize = line.size;
      }
      const rgb = line.color ?? [0.07, 0.07, 0.07];
      const colorKey = rgb.join(",");
      if (colorKey !== curColor) {
        ops.push(`${rgb[0]} ${rgb[1]} ${rgb[2]} rg`);
        curColor = colorKey;
      }
      ops.push(`1 0 0 1 ${PDF_MARGIN_X} ${y - line.size} Tm`, `(${pdfEscape(line.text)}) Tj`);
      y -= line.size + (line.after ?? 2);
    }
    ops.push("ET");

    // Footer
    const footer = `${BRAND_NAME}  ·  ${BRAND_DOMAIN}  ·  ${pageIndex + 1} / ${pageCount}`;
    ops.push(
      "BT",
      `/Helv 8 Tf`,
      `0.45 0.45 0.45 rg`,
      `1 0 0 1 ${PDF_MARGIN_X} 28 Tm`,
      `(${pdfEscape(pdfLatin1(footer))}) Tj`,
      "ET",
    );

    const content = ops.join("\n");
    const resources = `/Font << /Helv ${fontIds.Helv} 0 R /HelvB ${fontIds.HelvB} 0 R /Cour ${fontIds.Cour} 0 R >>`;
    objects.push(
      `${pageObj} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE_W} ${PDF_PAGE_H}] /Contents ${contentObj} 0 R /Resources << ${resources} >> >>endobj\n`,
    );
    objects.push(`${contentObj} 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`);
  });

  objects.push(`${fontIds.Helv} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`);
  objects.push(`${fontIds.HelvB} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n`);
  objects.push(`${fontIds.Cour} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>endobj\n`);

  const enc = new TextEncoder();
  const byteLen = (s: string) => enc.encode(s).length;
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(byteLen(pdf));
    pdf += obj;
  }
  const xref = byteLen(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return enc.encode(pdf);
}

export function reportFilename(project: Project, kind: ReportKind, ext: "md" | "pdf"): string {
  const base = project.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const tag = kind === "complete" ? "complete" : kind === "draft" ? "draft" : "empty";
  return `${base}-${tag}-report.${ext}`;
}
