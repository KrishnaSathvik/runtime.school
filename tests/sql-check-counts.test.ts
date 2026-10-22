import { beforeAll, describe, expect, it } from "vitest";
import { visibleChecks } from "@/features/rt/checks";
import { learningDatasets } from "@/data/datasets/learning";
import type { ExecuteResponse } from "@/engine/sql-client";
import { bootWorker } from "./helpers/original";
let send: Awaited<ReturnType<typeof bootWorker>>;
beforeAll(async () => { send = await bootWorker(); });
const rows = (n: number) => `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<${n}) SELECT x FROM n`;
const countCheck = (r: ExecuteResponse) => visibleChecks(r, false).find(c => /^Returns \d+ rows?$/.test(c.label));
describe("full-result check counts with capped previews", () => {
  for (const [branch, seed] of [["disposable", ""], ["shared canonical", learningDatasets.retail.seed]] as const) {
    it(`${branch}: matching 848 rows shows 848 without expanding previews`, async () => {
      const r = await send({ seed, query: rows(848), answer: rows(848) });
      expect(r.grade.ok).toBe(true);
      expect(r.result.values).toHaveLength(200);
      expect(r.expected.values).toHaveLength(200);
      expect(r.total).toBe(848);
      expect(r.expectedTotal).toBe(848);
      expect(countCheck(r)).toMatchObject({ label: "Returns 848 rows", state: "pass" });
    });
    it(`${branch}: unequal counts above the cap fail the count check`, async () => {
      const r = await send({ seed, query: rows(847), answer: rows(848) });
      expect(r.grade.ok).toBe(false);
      expect(r.result.values).toHaveLength(200);
      expect(r.expected.values).toHaveLength(200);
      expect(countCheck(r)).toMatchObject({ label: "Returns 848 rows", state: "fail", detail: expect.stringMatching(/^Yours returned 847, fewer than expected\./) });
    });
  }
  it("preserves original counts when only changed-data grading fails", async () => {
    const r = await send({ seed: `CREATE TABLE source(x); INSERT INTO source ${rows(848)};`, query: "SELECT x FROM source WHERE x<=848", answer: "SELECT x FROM source", mutation: "INSERT INTO source VALUES(849);" });
    expect(r.grade.variationFailed).toBe(true);
    expect(r.expectedTotal).toBe(848);
    expect(countCheck(r)).toMatchObject({ label: "Returns 848 rows", state: "pass" });
  });
  it("reports zero and one without losing zero to a fallback", async () => {
    for (const [query, count, label] of [["SELECT 1 AS x WHERE 0", 0, "Returns 0 rows"], ["SELECT 1 AS x", 1, "Returns 1 row"]] as const) {
      const r = await send({ seed: "", query, answer: query });
      expect(r.expectedTotal).toBe(count);
      expect(countCheck(r)).toMatchObject({ label, state: "pass" });
    }
  });
  it("supports existing complete-result responses without count metadata", () => {
    const r = { result: { columns: ["x"], values: [[1]] }, expected: { columns: ["x"], values: [[1]] }, grade: { ok: true, message: "correct" } };
    expect(countCheck(r)).toMatchObject({ label: "Returns 1 row", state: "pass" });
  });
});
