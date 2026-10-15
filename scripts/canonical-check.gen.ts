/**
 * Authoring check for canonical lessons: runs every task, example and walkthrough step against the
 * full dataset and reports rows, time, errors and whether the changed-data fixture changes each answer.
 *   LESSONS=0,1,2 npx vitest run --config vitest.scripts.config.ts scripts/canonical-check.gen.ts
 */
import { it } from "vitest";
import { canonicalLessons } from "@/content/canonical/lessons";
import { learningDatasets } from "@/data/datasets/learning";
import { openSeed, lastResult, withMutation, sameResult } from "../tests/helpers/canonical";

it("check canonical lessons", async () => {
  const only = process.env.LESSONS ? new Set(process.env.LESSONS.split(",").map(Number)) : null;
  const lines: string[] = [];
  for (const [idText, spec] of Object.entries(canonicalLessons)) {
    const id = Number(idText);
    if (only && !only.has(id)) continue;
    const dataset = learningDatasets[spec.dataset];
    const seed = dataset.seed + (spec.setupSql ?? "");
    const mutation = `${dataset.mutation}\n${spec.extraMutation ?? ""}`;
    const lab = /^\s*(CREATE|INSERT|UPDATE|DELETE|BEGIN|ALTER|DROP|WITH\s+\w+\s+AS\s*\([\s\S]*\)\s*(INSERT|UPDATE|DELETE))/i;
    const run = async (label: string, sql: string, check = false) => {
      const writes = lab.test(sql) || /;\s*\S/.test(sql.trim().replace(/;\s*$/, ""));
      const db = await openSeed(seed);
      try {
        const t0 = performance.now();
        const base = lastResult(db, sql);
        const ms = performance.now() - t0;
        let changed = "";
        if (check) {
          const other = writes
            ? await (async () => { const d2 = await openSeed(seed); try { d2.exec(mutation); return lastResult(d2, sql); } finally { d2.close(); } })()
            : withMutation(db, mutation, () => lastResult(db, sql));
          changed = sameResult(base, other) ? "  !! SAME ON CHANGED DATA" : "";
        }
        lines.push(`${String(id).padStart(3)} ${label.padEnd(6)} ${String(base.values.length).padStart(7)} rows ${ms.toFixed(0).padStart(5)} ms  [${base.columns.join(", ")}]${changed}`);
      } catch (e) {
        lines.push(`${String(id).padStart(3)} ${label.padEnd(6)} ERROR ${(e as Error).message}\n      ${sql.slice(0, 200)}`);
      } finally { db.close(); }
    };
    await run("ex", spec.example);
    for (const [i, s] of spec.walkthrough.entries()) await run(`w${i + 1}`, s.query);
    for (const [i, t] of spec.tasks.entries()) await run(`task${i + 1}`, t.answer, true);
  }
  console.log(lines.join("\n"));
}, 600000);
