import pack from "./content-pack.json";
import type { ContentPack, Lesson, Project } from "./types";

export const content = pack as unknown as ContentPack;

export const lessons: Lesson[] = content.lessons;
export const projects: Project[] = content.projects;
export const groups = content.groups;
export const moduleDescriptions = content.moduleDescriptions;
export const courseOrder = content.courseOrder;
export const datasetCatalog = content.datasetCatalog;
export const seed = content.seed;
export const fixtureMutation = content.fixtureMutation;
export const dialectGuide = content.dialectGuide;
export const sourceLinks = content.sourceLinks;
export const planComparisons = content.planComparisons;
export const warehouseMap = content.warehouseMap;
export const labExperiments = content.labExperiments;
export const playgroundStarters = content.playgroundStarters;
export const labLessonPresets = content.labLessonPresets;
export const counts = content.counts;

export function getLesson(id: number): Lesson | undefined {
  return lessons[id];
}

export function getProject(id: number): Project | undefined {
  return projects[id];
}

export function lessonsInModule(moduleId: number): Lesson[] {
  return courseOrder.map((id) => lessons[id]).filter((l) => l.group === moduleId);
}

export type Starter = {
  /** Text placed in a fresh editor. Never a complete, runnable answer. */
  sql: string;
  /** Caret offset to place the cursor where the learner should start typing. */
  cursor: number;
};

/** First table named in the reference answer's FROM clause, if any. */
function firstTable(answer: string): string | null {
  const m = /\bFROM\s+([A-Za-z_][A-Za-z0-9_]*)/i.exec(answer);
  return m ? m[1] : null;
}

/**
 * Starting SQL for a challenge. Query lessons get an executable-shape scaffold
 * ("SELECT ⎸ / FROM …") with the cursor after SELECT; beginner lessons also name
 * the table, since the task text already does. Lab scripts start empty (the
 * editor shows a placeholder) because they begin with CREATE/INSERT/BEGIN.
 * A scaffold is always incomplete SQL, so it can never pass a check.
 */
export function starterFor(lesson: Lesson, variant = 0): Starter {
  if (lesson.mode === "lab") return { sql: "", cursor: 0 };
  const table =
    lesson.difficulty === "Beginner" ? firstTable(lesson.tasks[variant]?.answer ?? "") : null;
  const sql = table ? `SELECT \nFROM ${table};` : "SELECT \nFROM ";
  return { sql, cursor: "SELECT ".length };
}

/** Back-compatible: the starter text only. */
export function starterSql(lesson: Lesson, variant = 0): string {
  return starterFor(lesson, variant).sql;
}

/**
 * Drafts saved from the previous comment-only starter contain no SQL at all.
 * Treat them as empty so returning learners get the new scaffold instead.
 */
export function isBlankSql(sql: string | undefined): boolean {
  if (sql === undefined) return true;
  return sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, "").trim() === "";
}

/**
 * Runnable starter questions per dataset, ported from the original
 * Playground presets() — the content pack only kept their labels.
 */
export const playgroundPresets: Record<string, Array<{ label: string; query: string }>> = {
  shop: [
    { label: "Most expensive products", query: "SELECT name,price FROM products ORDER BY price DESC;" },
    {
      label: "Paid revenue",
      query:
        "SELECT SUM(o.quantity*p.price) AS revenue FROM orders o JOIN products p ON p.id=o.product_id WHERE o.status='paid';",
    },
    {
      label: "Customers without orders",
      query:
        "SELECT c.name FROM customers c WHERE NOT EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=c.id);",
    },
  ],
  stream: [
    { label: "Daily active viewers", query: lessons[45].tasks[0].answer },
    { label: "Rolling observed-row average", query: lessons[42].tasks[0].answer },
    { label: "Exact-day D7 retention", query: lessons[47].tasks[1].answer },
  ],
  social: [
    { label: "Latest version of each event", query: lessons[44].tasks[0].answer },
    { label: "Ordered conversion funnel", query: lessons[46].tasks[0].answer },
    { label: "Session counts", query: lessons[48].tasks[0].answer },
  ],
  ai: [
    { label: "Successful usage cost by model", query: lessons[51].tasks[0].answer },
    { label: "Invoice reconciliation gaps", query: lessons[50].tasks[1].answer },
    { label: "Safe account-level summaries", query: lessons[49].tasks[0].answer },
  ],
  warehouse: [
    { label: "Profile raw customer versions", query: lessons[69].tasks[0].answer },
    { label: "Explore the sales fact", query: lessons[72].tasks[0].answer },
    { label: "Customer report", query: lessons[73].tasks[0].answer },
  ],
  lab: [
    { label: "Read the lab inventory", query: "SELECT * FROM lab_items;" },
    { label: "Inspect audit records", query: "SELECT * FROM lab_audit;" },
    { label: "Find higher-priced items", query: "SELECT * FROM lab_items WHERE price>40;" },
  ],
  market: [
    { label: "Orders with their shopper", query: "SELECT o.id, s.name, o.order_date, o.status FROM sales_orders o JOIN shoppers s ON s.id = o.shopper_id ORDER BY o.order_date;" },
    { label: "Revenue per order", query: "SELECT order_id, SUM(quantity * unit_price) AS order_total FROM order_lines GROUP BY order_id;" },
    { label: "Payments and refunds per order", query: "SELECT o.id, (SELECT SUM(amount) FROM order_payments p WHERE p.order_id = o.id) AS paid, (SELECT SUM(amount) FROM order_refunds r WHERE r.order_id = o.id) AS refunded FROM sales_orders o;" },
  ],
  org: [
    { label: "Who reports to whom", query: "SELECT e.name AS employee, m.name AS manager FROM employees e LEFT JOIN employees m ON m.id = e.manager_id;" },
    { label: "Headcount by department", query: "SELECT d.name, COUNT(e.id) AS headcount FROM departments d LEFT JOIN employees e ON e.department_id = d.id GROUP BY d.id;" },
    { label: "Salary history", query: "SELECT * FROM salary_history ORDER BY employee_id, valid_from;" },
  ],
  integration: [
    { label: "Compare source and landed counts", query: lessons[76].example },
    { label: "Resolve CRM + ERP customer attributes", query: lessons[77].example },
    { label: "Inspect the field catalog", query: "SELECT * FROM warehouse_catalog;" },
  ],
};
