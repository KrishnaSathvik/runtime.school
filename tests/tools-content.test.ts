/** The four SQL tools run only on the twelve canonical datasets; every script and comparison runs for real. */
import { beforeAll, describe, expect, it } from "vitest";
import { learningDatasets } from "@/data/datasets/learning";
import { canonicalNames } from "@/data/datasets/learning-map";
import { CENTRAL_TABLE, STARTER_QUERY, TOOL_DATASETS, relationships, tablesIn, toolDataset } from "@/content/tools/datasets";
import { LAB_GROUPS, experimentsFor, labExperiments } from "@/content/tools/lab";
import { comparisonCases, comparisonsFor, performanceComparisons } from "@/content/tools/performance";
import { SYNTAX_CONCEPTS } from "@/content/syntax-notes";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (data: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});
const seed = (id: keyof typeof canonicalNames) => toolDataset(id).seed;
const planText = (c: { plan: { values: unknown[][] } }) => c.plan.values.map((v) => String(v.at(-1))).join(" | ");

describe("canonical dataset universe", () => {
  it("offers exactly the twelve canonical datasets, in catalogue order", () => {
    expect(TOOL_DATASETS).toEqual(Object.keys(canonicalNames));
    expect(TOOL_DATASETS).toHaveLength(12);
    for (const id of TOOL_DATASETS) expect(learningDatasets[id].ref.datasetVersion).toBe("3.0.0");
  });

  it("every central table exists and every starter query runs on the full data", async () => {
    for (const id of TOOL_DATASETS) {
      expect(toolDataset(id).metadata.tables.map((t) => t.name), id).toContain(CENTRAL_TABLE[id]);
      const r = await send({ seed: seed(id), query: STARTER_QUERY[id] });
      expect(r.error ?? null, id).toBeNull();
      expect(r.result.values, id).toHaveLength(20);
    }
  }, 120_000);

  it("relationships and table detection come from the declared schema", () => {
    expect(relationships("retail").filter((r) => r.fromTable === "order_items").map((r) => `${r.fromColumns[0]}→${r.toTable}`)).toEqual([
      "order_id→orders",
      "stock_code→products",
    ]);
    expect(relationships("flights").filter((r) => r.fromTable === "routes").map((r) => `${r.fromColumns[0]}→${r.toTable}.${r.toColumns[0]}`)).toEqual([
      "origin→airports.airport_code",
      "destination→airports.airport_code",
    ]);
    expect(tablesIn("retail", "SELECT * FROM orders JOIN order_items USING (order_id) -- customers")).toEqual(["orders", "order_items"]);
  });
});

describe("Database Lab", () => {
  it("groups ~25–30 experiments and gives every dataset several", () => {
    const real = labExperiments.filter((e) => e.group !== "free");
    expect(real.length).toBeGreaterThanOrEqual(25);
    expect(real.length).toBeLessThanOrEqual(30);
    expect(new Set(labExperiments.map((e) => e.group))).toEqual(new Set(LAB_GROUPS.map((g) => g.id)));
    for (const id of TOOL_DATASETS) expect(experimentsFor(id).filter((e) => e.group !== "free").length, id).toBeGreaterThanOrEqual(2);
  });

  const cases = labExperiments.flatMap((e) => Object.entries(e.scripts).map(([id, s]) => ({ e, id: id as keyof typeof canonicalNames, s: s! })));
  it.each(cases.map((c) => [`${c.e.id} · ${c.id}`, c] as const))("%s runs, ends in a result, and is safe to rerun", async (_, { id, s }) => {
    const first = await send({ seed: seed(id), query: s.sql, allowWrites: true });
    expect(first.error ?? null).toBeNull();
    expect(first.result.columns.length).toBeGreaterThan(0);
    expect(tablesIn(id, s.sql).length).toBeGreaterThan(0);
    // Every run starts from the original data, so the same script gives the same answer.
    const second = await send({ seed: seed(id), query: s.sql, allowWrites: true });
    expect(second.result).toEqual(first.result);
    if (s.variant) {
      const broken = await send({ seed: seed(id), query: s.variant.sql, allowWrites: true });
      expect(broken.error, "the variant must break a rule").toBeTruthy();
      expect(broken.error).toMatch(/constraint failed|append-only/);
    }
  }, 60_000);

  it("writes never leak into the shared read-only dataset", async () => {
    await send({ seed: seed("retail"), query: "DELETE FROM order_items; CREATE INDEX x ON orders(country); SELECT 1", allowWrites: true });
    const r = await send({ seed: seed("retail"), query: "SELECT COUNT(*) FROM order_items" });
    expect(r.result.values[0][0]).toBe(learningDatasets.retail.metadata.rows.order_items);
    const integrity = await send({ seed: seed("retail"), query: "SELECT COUNT(*) FROM orders", allowWrites: true });
    expect(integrity.error ?? null).toBeNull();
  }, 60_000);
});

describe("Query Performance", () => {
  it("has 20–25 comparisons covering all twelve datasets", () => {
    expect(performanceComparisons.length).toBeGreaterThanOrEqual(20);
    expect(performanceComparisons.length).toBeLessThanOrEqual(25);
    for (const id of TOOL_DATASETS) expect(comparisonsFor(id).length, id).toBeGreaterThanOrEqual(1);
    expect(new Set(performanceComparisons.map((p) => p.id)).size).toBe(performanceComparisons.length);
  });

  it.each(performanceComparisons.map((p) => [p.id, p] as const))("%s: same output, different real plan", async (_, p) => {
    const r = await send({ seed: seed(p.datasetId), query: "SELECT 1", allowWrites: true, compare: comparisonCases(p) });
    expect(r.error ?? null).toBeNull();
    expect(r.equivalent).toBe(true);
    expect(r.comparison[0].total).toBeGreaterThan(0);
    const [a, b] = r.comparison.map(planText);
    expect(a).not.toBe(b);
    // The page describes these plans; keep the description honest.
    expect(b).toMatch(/SEARCH|MULTI-INDEX/);
    expect(`${p.explain} ${p.question}`).not.toMatch(/\d+\s?ms\b/);
  }, 60_000);
});

describe("Compare Syntax", () => {
  it("has 20–30 concepts, each SQLite example on a canonical dataset that runs", async () => {
    expect(SYNTAX_CONCEPTS.length).toBeGreaterThanOrEqual(20);
    expect(SYNTAX_CONCEPTS.length).toBeLessThanOrEqual(30);
    for (const c of SYNTAX_CONCEPTS) {
      expect(c.examples.sqlite.trim(), c.title).toBeTruthy();
      expect(c.examples.postgres.trim(), c.title).toBeTruthy();
      expect(c.examples.sqlserver.trim(), c.title).toBeTruthy();
      if (!c.runs) continue;
      expect(TOOL_DATASETS, c.title).toContain(c.dataset);
      const r = await send({ seed: seed(c.dataset!), query: c.examples.sqlite, allowWrites: c.runs === "lab" });
      expect(r.error ?? null, c.title).toBeNull();
      expect(r.result?.values.length ?? 0, c.title).toBeGreaterThan(0);
    }
  }, 120_000);

  it("no example mentions a retired fixture", () => {
    const text = JSON.stringify(SYNTAX_CONCEPTS) + JSON.stringify(labExperiments) + JSON.stringify(performanceComparisons);
    expect(text).not.toMatch(/Corner Shop|Streamly|Harbor Market|Atlas Corp|Northstar|SocialLoop|Community Studio|Disposable Lab/);
  });
});
