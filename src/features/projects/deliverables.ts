import { datasetCatalog, lessons } from "@/content";
import type { Project } from "@/content/types";
import { milestoneDone, type MilestoneState, type ProjectState } from "@/lib/learning-state";

type SavedResult = {
  ok?: boolean;
  guided?: boolean;
  columns?: string[];
  values?: unknown[][];
  time?: number;
};

const cell = (v: unknown) =>
  v === null || v === undefined ? "NULL" : String(v).replace(/\|/g, "\\|").replace(/\n/g, " ");

function table(r: SavedResult): string {
  if (!r.columns?.length) return "_No result table saved._";
  const head = `| ${r.columns.map(cell).join(" | ")} |`;
  const rule = `| ${r.columns.map(() => "---").join(" | ")} |`;
  const body = (r.values ?? []).map((row) => `| ${row.map(cell).join(" | ")} |`);
  return [head, rule, ...body].join("\n");
}

function status(m: MilestoneState | undefined): string {
  if (milestoneDone(m)) return "Completed";
  if (m) return "In progress";
  return "Not started";
}

/** Markdown report of the learner's saved project work (queries, checked results, status). */
export function projectReport(project: Project, rec: ProjectState | undefined, now = new Date()): string {
  const ds = datasetCatalog[project.dataset];
  const done = project.milestoneIds.filter((id) => milestoneDone(rec?.milestones[id])).length;
  const out: string[] = [
    `# ${project.title}`,
    "",
    project.description,
    "",
    `- Sample database: ${ds?.name ?? project.dataset} (${(ds?.tables ?? []).join(", ")})`,
    `- Milestones completed: ${done} of ${project.milestoneIds.length}`,
    `- Exported: ${now.toISOString()}`,
    "",
  ];
  project.milestoneIds.forEach((id, i) => {
    const l = lessons[id];
    const m = rec?.milestones[id];
    out.push(`## Milestone ${i + 1}: ${l.title}`, "", `Status: ${status(m)}${m?.check ? " · concept check passed" : ""}`, "");
    if (m?.notes?.trim()) out.push("**Findings**", "", m.notes.trim(), "");
    l.tasks.forEach((t, v) => {
      const q = m?.queries?.[v];
      const r = m?.results?.[v] as SavedResult | undefined;
      const state = m?.solved?.includes(v)
        ? "solved without hints"
        : r?.ok
          ? "solved with help"
          : r
            ? "checked, not yet correct"
            : "not attempted";
      out.push(`### ${i + 1}.${v + 1} ${t.prompt}`, "", `_${state}_`, "");
      if (q) out.push("```sql", q.trim(), "```", "");
      if (r?.ok) out.push(table(r), "");
    });
  });
  return out.join("\n");
}
