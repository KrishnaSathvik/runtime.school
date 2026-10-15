/**
 * Authoring check for canonical Practice questions, through the production worker:
 * the solution and every equivalent must pass, every wrong answer must be rejected,
 * and the changed-data fixture must change the solution’s result.
 *   QUESTIONS=qb-0001,qb-0002 npx vitest run --config vitest.scripts.config.ts scripts/practice-check.gen.ts
 */
import { it } from "vitest";
import { canonicalQuestions } from "@/content/question-bank/canonical";
import { learningDatasets } from "@/data/datasets/learning";
import { bootWorker } from "../tests/helpers/original";
import { openSeed, lastResult, withMutation, sameResult } from "../tests/helpers/canonical";

it("check canonical practice", async () => {
  const only = process.env.QUESTIONS ? new Set(process.env.QUESTIONS.split(",")) : null;
  const run = await bootWorker();
  const lines: string[] = [];
  for (const q of canonicalQuestions) {
    if (only && !only.has(q.id)) continue;
    const ds = learningDatasets[q.datasetId as keyof typeof learningDatasets];
    const seed = ds.seed + (q.setupSql ?? "");
    const mutation = `${ds.mutation}\n${q.extraMutation ?? ""}`;
    const request = (query: string) => ({ seed, query, answer: q.solution, ordered: q.ordered, mutation, allowWrites: q.mode === "lab", planValidation: q.planValidation ?? null, repeatCheck: q.repeatCheck, stateQueries: q.stateQueries, validate: q.validate ?? null, required: q.required ?? null });
    const t0 = performance.now();
    const ok = await run(request(q.solution));
    const ms = performance.now() - t0;
    const problems: string[] = [];
    if (ok.error) problems.push(`solution error: ${ok.error}`);
    else if (!ok.grade?.ok) problems.push(`solution rejected: ${ok.grade?.message}`);
    for (const eq of q.equivalent ?? []) { const r = await run(request(eq)); if (!r.grade?.ok) problems.push(`equivalent rejected: ${r.error ?? r.grade?.message}`); }
    for (const w of q.wrong) { const r = await run(request(w.sql)); if (r.grade?.ok) problems.push(`WRONG ACCEPTED (${w.mistake})`); }
    if (q.mode !== "lab" && q.exerciseType !== "predict") {
      const db = await openSeed(seed);
      try { const base = lastResult(db, q.solution); const changed = withMutation(db, mutation, () => lastResult(db, q.solution)); if (sameResult(base, changed)) problems.push("same on changed data"); } finally { db.close(); }
    }
    lines.push(`${q.id} ${q.datasetId.padEnd(10)} ${String(ok.total ?? "-").padStart(6)} rows ${ms.toFixed(0).padStart(5)} ms ${problems.length ? "  !! " + problems.join(" | ") : ""}`);
  }
  console.log(lines.join("\n"));
}, 1800000);
