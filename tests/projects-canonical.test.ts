/** Every project runs on its canonical dataset: checkpoints grade their own reference, builds pass their rules. */
import { beforeAll, describe, expect, it } from "vitest";
import { projects } from "@/content/projects";
import { getProjectReference } from "@/content/projects/references";
import { TOOL_DATASETS, toolDataset } from "@/content/tools/datasets";
import { buildSetup, buildValidation } from "@/features/rt/projects/build";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (data: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});

describe("catalog", () => {
  it("has thirteen projects covering all twelve datasets", () => {
    expect(projects).toHaveLength(13);
    expect(new Set(projects.map((p) => p.datasetId))).toEqual(new Set(TOOL_DATASETS));
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length);
  });

  it("every stage names tables that exist in its dataset", () => {
    for (const p of projects) {
      const names = new Set(toolDataset(p.datasetId).metadata.tables.map((t) => t.name));
      for (const t of [...p.relevantTables, ...p.stages.flatMap((s) => s.relevantTables)]) expect(names.has(t), `${p.id}: ${t}`).toBe(true);
    }
  });
});

const checkpoints = projects.flatMap((p) => p.stages.filter((s) => s.validation.kind === "checkpoint").map((s) => ({ p, s })));
describe("checkpoints", () => {
  it.each(checkpoints.map((c) => [`${c.p.id} · ${c.s.id}`, c] as const))("%s grades its own reference on original and changed data", async (_, { p, s }) => {
    if (s.validation.kind !== "checkpoint") return;
    const sql = getProjectReference(s.validation.referenceId)!;
    const d = toolDataset(p.datasetId);
    const r = await send({ seed: d.seed, query: sql, answer: sql, ordered: s.validation.ordered, mutation: d.mutation });
    expect(r.error ?? null).toBeNull();
    expect(r.result.columns).toEqual(s.validation.expectedColumns);
    expect(r.result.values.length).toBeGreaterThan(0);
    expect(r.grade.ok, r.grade.message).toBe(true);
  }, 60_000);
});

/** A reference solution for each warehouse build step, run in order on one growing state. */
const WAREHOUSE: Record<string, string> = {
  "build-staging": `CREATE TABLE stg_orders AS SELECT * FROM orders;
CREATE TABLE stg_order_items AS SELECT * FROM order_items;`,
  "build-dimensions": `CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, customer_id INTEGER NOT NULL UNIQUE, country TEXT, region TEXT, segment TEXT);
INSERT INTO dim_customer (customer_id, country, region, segment)
SELECT c.customer_id, c.country, c.region, h.segment FROM customers AS c
LEFT JOIN customer_history AS h ON h.customer_id = c.customer_id AND h.is_current = 1 ORDER BY c.customer_id;
CREATE TABLE dim_product (product_key INTEGER PRIMARY KEY, stock_code TEXT NOT NULL UNIQUE, description TEXT, department TEXT);
INSERT INTO dim_product (stock_code, description, department)
SELECT p.stock_code, p.description, COALESCE(c.department, 'Uncategorised') FROM products AS p
LEFT JOIN categories AS c ON c.category_id = p.category_id ORDER BY p.stock_code;
CREATE TABLE dim_date (date_key TEXT PRIMARY KEY);
INSERT INTO dim_date SELECT DISTINCT date(ordered_at) FROM orders;`,
  "build-fact": `CREATE TABLE fact_sales (order_item_id INTEGER PRIMARY KEY, order_id INTEGER, date_key TEXT, customer_key INTEGER, product_key INTEGER, quantity INTEGER, line_value REAL);
INSERT INTO fact_sales
SELECT i.order_item_id, o.order_id, date(o.ordered_at), c.customer_key, p.product_key, i.quantity, i.quantity * i.unit_price
FROM order_items AS i JOIN orders AS o ON o.order_id = i.order_id
JOIN dim_product AS p ON p.stock_code = i.stock_code
LEFT JOIN dim_customer AS c ON c.customer_id = o.customer_id;`,
  "incremental-load": `INSERT INTO fact_sales
SELECT i.order_item_id, o.order_id, date(o.ordered_at), c.customer_key, p.product_key, i.quantity, i.quantity * i.unit_price
FROM order_items AS i JOIN orders AS o ON o.order_id = i.order_id
JOIN dim_product AS p ON p.stock_code = i.stock_code
LEFT JOIN dim_customer AS c ON c.customer_id = o.customer_id
WHERE NOT EXISTS (SELECT 1 FROM fact_sales AS f WHERE f.order_item_id = i.order_item_id);`,
  "quality-checks": `CREATE VIEW quality_checks AS
SELECT 'orphan_product_keys' AS check_name, COUNT(*) = 0 AS passed, COUNT(*) AS observed_value FROM fact_sales WHERE product_key NOT IN (SELECT product_key FROM dim_product)
UNION ALL SELECT 'orphan_customer_keys', COUNT(*) = 0, COUNT(*) FROM fact_sales WHERE customer_key IS NOT NULL AND customer_key NOT IN (SELECT customer_key FROM dim_customer)
UNION ALL SELECT 'fact_reconciles_to_source', d = 0, d FROM (SELECT ROUND(ABS((SELECT SUM(line_value) FROM fact_sales) - (SELECT SUM(quantity * unit_price) FROM order_items)), 2) AS d)
UNION ALL SELECT 'duplicate_order_items', COUNT(*) - COUNT(DISTINCT order_item_id) = 0, COUNT(*) - COUNT(DISTINCT order_item_id) FROM fact_sales;`,
  "publish-reporting": `CREATE VIEW v_sales_monthly AS
SELECT substr(date_key, 1, 7) AS month, COUNT(DISTINCT order_id) AS invoices, ROUND(SUM(line_value), 2) AS net_sales,
       ROUND(SUM(CASE WHEN line_value > 0 THEN line_value ELSE 0 END), 2) AS gross_sales
FROM fact_sales GROUP BY month;`,
};

describe("warehouse builds", () => {
  it("each build step passes with a correct script, in order, and rejects a broken one", async () => {
    const project = projects.find((p) => p.id === "trusted-retail-warehouse")!;
    const d = toolDataset(project.datasetId);
    const builds = project.stages.filter((s) => s.type === "build");
    expect(builds.map((s) => s.id)).toEqual(Object.keys(WAREHOUSE));
    let prior = "";
    for (const s of builds) {
      const request = (script: string) => ({
        seed: `${d.seed}\n${prior}\n${buildSetup[s.id] ?? ""}`,
        query: `${script}\n;\nSELECT 1 AS validated;`,
        allowWrites: true,
        ...buildValidation(project, s.id),
      });
      const good = await send(request(WAREHOUSE[s.id]));
      expect(good.error ?? null, s.id).toBeNull();
      expect(good.grade.ok, `${s.id}: ${good.grade.message}`).toBe(true);
      const broken = await send(request(s.id === "incremental-load" ? "SELECT 1;" : "CREATE TABLE placeholder (x);"));
      expect(broken.grade?.ok ?? false, `${s.id} must reject an incomplete script`).toBe(false);
      if (s.id === "build-staging") {
        // Copying after changing a source table must fail: the source has to stay untouched.
        const tampered = await send(request(`UPDATE products SET list_price = list_price + 1 WHERE stock_code = '85123A'; ${WAREHOUSE[s.id]}`));
        expect(tampered.grade?.ok, "changing a source table is rejected").toBe(false);
      }
      if (s.id === "incremental-load") {
        // A plain INSERT reloads December once, but duplicates every line when the load is rerun.
        const notIdempotent = WAREHOUSE[s.id].replace(/\nWHERE NOT EXISTS[^;]*;/, ";");
        expect(notIdempotent).not.toBe(WAREHOUSE[s.id]);
        expect((await send(request(notIdempotent))).grade?.ok ?? false, "a load that duplicates on rerun is rejected").toBe(false);
      }
      prior += `${WAREHOUSE[s.id]}\n;\n`;
    }
  }, 300_000);
});
