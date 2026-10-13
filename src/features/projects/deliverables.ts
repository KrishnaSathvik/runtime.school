import { datasetCatalog, lessons } from "@/content";
import type { Project } from "@/content/types";
import { milestoneDone, type MilestoneState, type ProjectState } from "@/lib/learning-state";

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

/**
 * Minimal text PDF (no server). Long lines wrap; Unicode beyond Latin-1 is replaced.
 * Prefer Markdown for full fidelity; PDF is a printable companion.
 */
export function projectReportPdf(project: Project, rec: ProjectState | undefined, now = new Date()): Uint8Array {
  const md = projectReport(project, rec, now);
  const lines = md
    .split("\n")
    .flatMap((line) => {
      const cleaned = line.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "?");
      if (cleaned.length <= 90) return [cleaned];
      const chunks: string[] = [];
      for (let i = 0; i < cleaned.length; i += 90) chunks.push(cleaned.slice(i, i + 90));
      return chunks;
    });

  const pageHeight = 792;
  const margin = 48;
  const lineHeight = 11;
  const linesPerPage = Math.floor((pageHeight - margin * 2) / lineHeight);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += linesPerPage) pages.push(lines.slice(i, i + linesPerPage));
  if (!pages.length) pages.push([""]);

  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  const kids = pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
  objects.push(`2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>endobj\n`);

  pages.forEach((pageLines, i) => {
    const pageObj = 3 + i * 2;
    const contentObj = pageObj + 1;
    const y = pageHeight - margin;
    const content = [
      "BT",
      "/F1 10 Tf",
      `${margin} ${y} Td`,
      `${lineHeight} TL`,
      ...pageLines.map((line, idx) => (idx === 0 ? `(${pdfEscape(line)}) Tj` : `T* (${pdfEscape(line)}) Tj`)),
      "ET",
    ].join("\n");
    objects.push(
      `${pageObj} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 ${pageHeight}] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> >>endobj\n`,
    );
    objects.push(`${contentObj} 0 obj<< /Length ${content.length} >>stream\n${content}\nendstream\nendobj\n`);
  });
  const fontObj = 3 + pages.length * 2;
  objects.push(`${fontObj} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>endobj\n`);

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
