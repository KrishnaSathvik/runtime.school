import { it, expect } from "vitest";
import { bootWorker } from "../helpers/original";
import { learningDatasets } from "@/data/datasets/learning";

it("runs, grades and changed-data checks a query on a full canonical dataset", async () => {
  const run = await bootWorker();
  const d = learningDatasets.flights;
  const answer = "SELECT airline_code, COUNT(*) AS flights FROM flights GROUP BY airline_code";
  const t0 = performance.now();
  const ok = await run({ seed: d.seed, query: answer, answer, mutation: d.mutation });
  const t1 = performance.now();
  expect(ok.error).toBeUndefined();
  expect(ok.grade.ok).toBe(true);
  expect(ok.total).toBe(14);
  // A hard-coded copy of the visible output passes the original data but fails the changed data.
  const literal = "SELECT * FROM (VALUES " + ok.result.values.map((r: unknown[]) => `('${r[0]}', ${r[1]})`).join(",") + ") AS v(airline_code, flights)";
  const fake = await run({ seed: d.seed, query: `WITH v(airline_code, flights) AS (VALUES ${ok.result.values.map((r: unknown[]) => `('${r[0]}', ${r[1]})`).join(",")}) SELECT * FROM v`, answer, mutation: d.mutation });
  expect(fake.grade.ok).toBe(false);
  expect(fake.grade.variationFailed).toBe(true);
  void literal;
  // The live connection is restored after the changed-data check.
  const again = await run({ seed: d.seed, query: "SELECT COUNT(*) FROM flights" });
  expect(again.result.values[0][0]).toBe(124460);
  // Writes are rejected on the shared read-only connection.
  const write = await run({ seed: d.seed, query: "DELETE FROM flights" });
  expect(write.error).toMatch(/read-only/);
  const pragma = await run({ seed: d.seed, query: "PRAGMA query_only=OFF" });
  expect(pragma.error).toMatch(/read-only/);
  console.log(`first graded run incl. load ${(t1 - t0).toFixed(0)} ms`);
}, 60000);

it("gives lab tasks a disposable copy with overlay tables", async () => {
  const run = await bootWorker();
  const d = learningDatasets.retail;
  const seed = `${d.seed}CREATE TABLE scratch AS SELECT customer_id, country FROM customers LIMIT 5;`;
  const r = await run({ seed, query: "INSERT INTO scratch VALUES (1, 'X'); SELECT COUNT(*) FROM scratch;", allowWrites: true });
  expect(r.error).toBeUndefined();
  expect(r.result.values[0][0]).toBe(6);
  const fresh = await run({ seed, query: "SELECT COUNT(*) FROM scratch" });
  expect(fresh.result.values[0][0]).toBe(5);
}, 60000);
