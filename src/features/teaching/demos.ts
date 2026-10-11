export type TeachingDemo = {
  title: string;
  question: string;
  inputs: { label: string; columns: string[]; rows: (string | number | null)[][] }[];
  choices: { label: string; sql: string; why: string }[];
};
const people = "WITH people(id, name) AS (VALUES (1, 'Ana'), (2, 'Bo'), (3, 'Cy')), orders(id, person_id, amount) AS (VALUES (101, 1, 20), (102, 1, 40), (103, 2, 20))\n";
const sales = "WITH sales(id, region, amount, receipt) AS (VALUES (1, 'East', 20, 'A'), (2, 'East', 40, NULL), (3, 'West', 40, NULL), (4, 'West', 10, 'B'))\n";
const salesInput = { label: "sales · one row per sale", columns: ["id", "region", "amount", "receipt"], rows: [[1, "East", 20, "A"], [2, "East", 40, null], [3, "West", 40, null], [4, "West", 10, "B"]] };
export const teachingDemos: Record<string, TeachingDemo> = {
  join: {
    title: "Watch a JOIN change the rows",
    question: "Ana has two orders. Cy has none. Who stays in the result?",
    inputs: [
      { label: "people", columns: ["id", "name"], rows: [[1,"Ana"],[2,"Bo"],[3,"Cy"]] },
      { label: "orders", columns: ["id","person_id","amount"], rows: [[101,1,20],[102,1,40],[103,2,20]] },
    ],
    choices: [
      { label: "INNER JOIN", sql: people + "SELECT p.name, o.id AS order_id, o.amount\nFROM people p INNER JOIN orders o ON o.person_id = p.id\nORDER BY p.id, o.id;", why: "Three rows: Ana matches twice and Bo once. Cy has no match, so INNER JOIN removes Cy. A join produces one row per matching pair, not one per person." },
      { label: "LEFT JOIN", sql: people + "SELECT p.name, o.id AS order_id, o.amount\nFROM people p LEFT JOIN orders o ON o.person_id = p.id\nORDER BY p.id, o.id;", why: "Four rows: the three matching pairs plus Cy with NULL order values. LEFT JOIN preserves an unmatched person; it does not collapse Ana’s two matches." },
      { label: "Filter in ON", sql: people + "SELECT p.name, o.id AS order_id, o.amount\nFROM people p LEFT JOIN orders o ON o.person_id = p.id AND o.amount > 20\nORDER BY p.id, o.id;", why: "Three rows: only Ana’s 40 order qualifies as a match. Bo and Cy stay with NULL order values because the filter controls matching, not which people survive." },
      { label: "Filter in WHERE", sql: people + "SELECT p.name, o.id AS order_id, o.amount\nFROM people p LEFT JOIN orders o ON o.person_id = p.id\nWHERE o.amount > 20\nORDER BY p.id, o.id;", why: "One row: WHERE removes rows after joining. Cy’s NULL > 20 is unknown, not true, and Bo’s 20 fails. Only Ana’s 40 order survives." },
    ],
  },
  group: {
    title: "Watch GROUP BY change the grain",
    question: "Four sales become how many summaries? Compare filtering before and after grouping.",
    inputs: [salesInput],
    choices: [
      { label: "All sales", sql: sales + "SELECT COUNT(*) AS sales_count, SUM(amount) AS total\nFROM sales;", why: "One summary row: all four sales form a single group. The total is 110. Individual sale ids no longer belong to this result’s grain." },
      { label: "By region", sql: sales + "SELECT region, COUNT(*) AS sales_count, SUM(amount) AS total\nFROM sales\nGROUP BY region\nORDER BY region;", why: "Two rows: East combines 20 + 40 = 60; West combines 40 + 10 = 50. GROUP BY replaces the four sale rows with one row per region." },
      { label: "WHERE amount > 20", sql: sales + "SELECT region, COUNT(*) AS sales_count, SUM(amount) AS total\nFROM sales\nWHERE amount > 20\nGROUP BY region\nORDER BY region;", why: "WHERE first removes the 20 and 10 sales. Each region now has one sale totaling 40. This changes the inputs to the aggregation." },
      { label: "HAVING total > 50", sql: sales + "SELECT region, COUNT(*) AS sales_count, SUM(amount) AS total\nFROM sales\nGROUP BY region\nHAVING SUM(amount) > 50\nORDER BY region;", why: "HAVING filters the completed groups. East keeps both its sales and total 60; West’s total 50 does not exceed 50. This differs from filtering individual amounts." },
    ],
  },
  window: {
    title: "Watch a window keep the detail",
    question: "Both 40 sales tie. Compare partition totals, ranking, and a running total.",
    inputs: [salesInput],
    choices: [
      { label: "Partition totals", sql: sales + "SELECT id, region, amount, SUM(amount) OVER (PARTITION BY region) AS region_total\nFROM sales\nORDER BY id;", why: "All four sales stay visible. East’s total 60 repeats on its two rows; West’s total 50 repeats on its two rows. Unlike GROUP BY, a window adds a value without collapsing detail." },
      { label: "Rank ties", sql: sales + "SELECT id, amount, ROW_NUMBER() OVER (ORDER BY amount DESC, id) AS row_num, RANK() OVER (ORDER BY amount DESC) AS rank_num, DENSE_RANK() OVER (ORDER BY amount DESC) AS dense_rank\nFROM sales\nORDER BY amount DESC, id;", why: "The two 40 sales share rank 1. RANK skips to 3 for the next amount; DENSE_RANK uses 2. ROW_NUMBER gives each sale a distinct position using id to break ties." },
      { label: "Running total", sql: sales + "SELECT id, region, amount, SUM(amount) OVER (ORDER BY id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total\nFROM sales\nORDER BY id;", why: "The frame grows one sale at a time in id order: 20, 60, 100, 110. This is a running total across all sales; adding PARTITION BY region would restart it for each region." },
    ],
  },
};

teachingDemos.join.choices.push({label:"Count people after joining",sql:people+"SELECT COUNT(*) AS joined_rows, COUNT(DISTINCT p.id) AS people FROM people p LEFT JOIN orders o ON o.person_id=p.id",why:"The join has four rows but only three people. Ana appears twice. Summing a person-level measure here would count Ana twice; aggregate orders to one row per person first."});
teachingDemos.group.choices.push({label:"Count known receipts",sql:sales+"SELECT region,COUNT(*) AS sales_count,COUNT(receipt) AS known_receipts FROM sales GROUP BY region ORDER BY region",why:"Both regions have two sales but only one known receipt. NULL contributes to COUNT(*) but not COUNT(receipt). Missing a receipt does not erase the sale."});
teachingDemos.window.choices.push(
 {label:"RANGE includes ties",sql:sales+"SELECT id,amount,SUM(amount) OVER (ORDER BY amount RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS peer_total FROM sales ORDER BY amount,id",why:"Totals are 10, 30, 110, 110: the first 40 includes the other 40 peer. This is also the default frame when this aggregate window has ORDER BY amount."},
 {label:"ROWS counts positions",sql:sales+"SELECT id,amount,SUM(amount) OVER (ORDER BY amount,id ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) AS two_row_total FROM sales ORDER BY amount,id",why:"Totals are 10, 30, 60, 80. The first frame has one row; each later frame has the current row and exactly one predecessor. This is two rows, not two calendar days."},
 {label:"Previous in partition",sql:sales+"SELECT id,region,amount,LAG(amount) OVER (PARTITION BY region ORDER BY id) AS previous_amount FROM sales ORDER BY id",why:"East sees NULL then 20; West sees NULL then 40. LAG restarts in each partition. It finds a previous row, which is not necessarily yesterday."}
);

export function demoForLesson(id: number): string | null {
  if ([14, 15, 37].includes(id)) return "join";
  if ([10, 11].includes(id)) return "group";
  if ([21, 22, 23, 24, 40, 41, 42, 43, 53].includes(id)) return "window";
  return null;
}
