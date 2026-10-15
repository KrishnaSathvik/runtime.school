import type { Project } from "@/content/projects";
import type { ExecuteRequest } from "@/engine/sql-client";
import { draftPrefix, parseEvidence } from "./evidence";

type Rule = { description: string; sql: string; value: number };
const rule = (description: string, sql: string): Rule => ({ description, sql, value: 1 });
const exists = (name: string, type = "table") => rule(`${name} must exist as a ${type}.`, `SELECT COUNT(*) = 1 FROM sqlite_master WHERE name = '${name}' AND type = '${type}'`);
const sameRows = (target: string, source: string) => rule(`${target} must hold exactly the rows of ${source}.`, `SELECT (SELECT COUNT(*) FROM ${target}) = (SELECT COUNT(*) FROM ${source}) AND NOT EXISTS (SELECT * FROM ${source} EXCEPT SELECT * FROM ${target})`);
const count = (target: string, source: string) => rule(`${target} must have one row per ${source} row.`, `SELECT (SELECT COUNT(*) FROM ${target}) = (SELECT COUNT(*) FROM ${source})`);
const pk = (table: string, column: string) => rule(`${table}.${column} must be the declared primary key.`, `SELECT COUNT(*) = 1 FROM pragma_table_info('${table}') WHERE name = '${column}' AND pk > 0`);
const unique = (table: string, column: string) => rule(`${table}.${column} must be populated and unique.`, `SELECT COUNT(*) = COUNT(DISTINCT ${column}) AND COUNT(*) = COUNT(${column}) FROM ${table}`);
const columns = (table: string, names: string[]) => rule(`${table} must have the columns ${names.join(", ")}.`, `SELECT COUNT(*) = ${names.length} FROM pragma_table_info('${table}') WHERE name IN (${names.map((n) => `'${n}'`).join(", ")})`);

const factRules = [
  exists("fact_sales"),
  columns("fact_sales", ["order_item_id", "order_id", "date_key", "customer_key", "product_key", "quantity", "line_value"]),
  count("fact_sales", "order_items"),
  unique("fact_sales", "order_item_id"),
  rule("Each fact line_value must equal quantity × unit_price of its source line.", "SELECT NOT EXISTS (SELECT 1 FROM order_items AS i LEFT JOIN fact_sales AS f ON f.order_item_id = i.order_item_id WHERE f.order_item_id IS NULL OR f.line_value IS NULL OR ABS(f.line_value - i.quantity * i.unit_price) > 0.001)"),
  rule("Each fact row must carry its invoice, date, product and customer keys; anonymous invoices keep customer_key NULL.", `SELECT NOT EXISTS (
    SELECT 1 FROM fact_sales AS f
    JOIN order_items AS i ON i.order_item_id = f.order_item_id
    JOIN orders AS o ON o.order_id = i.order_id
    LEFT JOIN dim_product AS p ON p.product_key = f.product_key
    LEFT JOIN dim_customer AS c ON c.customer_key = f.customer_key
    WHERE f.order_id IS NOT o.order_id OR f.date_key IS NOT date(o.ordered_at)
       OR p.stock_code IS NOT i.stock_code OR c.customer_id IS NOT o.customer_id)`),
];

export const buildRules: Record<string, Rule[]> = {
  "build-staging": [exists("stg_orders"), exists("stg_order_items"), sameRows("stg_orders", "orders"), sameRows("stg_order_items", "order_items")],
  "build-dimensions": [
    exists("dim_customer"), exists("dim_product"), exists("dim_date"),
    pk("dim_customer", "customer_key"), pk("dim_product", "product_key"), pk("dim_date", "date_key"),
    unique("dim_customer", "customer_id"), unique("dim_product", "stock_code"),
    count("dim_customer", "customers"), count("dim_product", "products"),
    rule("dim_customer.segment must be each customer's current segment.", "SELECT NOT EXISTS (SELECT 1 FROM dim_customer AS d JOIN customer_history AS h ON h.customer_id = d.customer_id AND h.is_current = 1 WHERE d.segment IS NOT h.segment)"),
    rule("dim_product.department must come from categories, with 'Uncategorised' when missing.", "SELECT NOT EXISTS (SELECT 1 FROM dim_product AS d JOIN products AS p ON p.stock_code = d.stock_code LEFT JOIN categories AS c ON c.category_id = p.category_id WHERE d.department IS NOT COALESCE(c.department, 'Uncategorised'))"),
    rule("dim_date must hold exactly the distinct invoice dates (YYYY-MM-DD).", "SELECT (SELECT COUNT(*) FROM dim_date) = (SELECT COUNT(DISTINCT date(ordered_at)) FROM orders) AND NOT EXISTS (SELECT date(ordered_at) FROM orders EXCEPT SELECT date_key FROM dim_date)"),
  ],
  "build-fact": factRules,
  "incremental-load": factRules,
  "quality-checks": [
    exists("quality_checks", "view"),
    columns("quality_checks", ["check_name", "passed", "observed_value"]),
    rule("Publish the four required checks.", "SELECT COUNT(DISTINCT check_name) = 4 FROM quality_checks WHERE check_name IN ('orphan_product_keys', 'orphan_customer_keys', 'fact_reconciles_to_source', 'duplicate_order_items')"),
    rule("Every check must record passed (0 or 1) and an observed value.", "SELECT NOT EXISTS (SELECT 1 FROM quality_checks WHERE passed IS NULL OR passed NOT IN (0, 1) OR observed_value IS NULL)"),
    rule("All four checks must pass on the warehouse you built.", "SELECT COUNT(*) = 4 FROM quality_checks WHERE passed = 1 AND check_name IN ('orphan_product_keys', 'orphan_customer_keys', 'fact_reconciles_to_source', 'duplicate_order_items')"),
  ],
  "publish-reporting": [
    exists("v_sales_monthly", "view"),
    columns("v_sales_monthly", ["month", "invoices", "net_sales", "gross_sales"]),
    rule("The reporting view must read from fact_sales.", "SELECT instr(lower(sql), 'fact_sales') > 0 FROM sqlite_master WHERE name = 'v_sales_monthly'"),
    rule("Every month must reconcile to the source invoices.", `SELECT NOT EXISTS (
      SELECT substr(o.ordered_at, 1, 7), COUNT(DISTINCT o.order_id), ROUND(SUM(i.quantity * i.unit_price), 2),
             ROUND(SUM(CASE WHEN i.quantity * i.unit_price > 0 THEN i.quantity * i.unit_price ELSE 0 END), 2)
      FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id GROUP BY 1
      EXCEPT SELECT month, invoices, net_sales, gross_sales FROM v_sales_monthly)
      AND (SELECT COUNT(*) FROM v_sales_monthly) = (SELECT COUNT(DISTINCT substr(ordered_at, 1, 7)) FROM orders)`),
  ],
};

/** Starting state a build step needs beyond the learner's earlier steps. */
export const buildSetup: Record<string, string> = {
  // The latest day's invoices have not loaded yet.
  "incremental-load": "DELETE FROM fact_sales WHERE date_key >= '2011-12-01';",
};

export function priorBuildSql(project: Project, stageIndex: number, drafts: Record<string, string>): string {
  return project.stages.slice(0, stageIndex).filter(s => s.type === "build").map(s => {
    const e = parseEvidence(drafts[`${draftPrefix(project, s.id)}-evidence`]);
    return e?.checkPassed ? `${e.query}\n;` : "";
  }).filter(Boolean).join("\n");
}

export function buildValidation(project: Project, stageId: string): Pick<ExecuteRequest, "answer" | "validate" | "stateQueries" | "repeatCheck"> {
  return { answer: "SELECT 1 AS validated", validate: buildRules[stageId] ?? [], repeatCheck: stageId === "incremental-load", stateQueries: project.relevantTables.map(t => `SELECT * FROM ${t}`) };
}
