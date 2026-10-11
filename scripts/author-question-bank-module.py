import sys,json
seed=open(sys.argv[1]).read().strip()
mutation=" ".join("""UPDATE shoppers SET region='East' WHERE id=3;
UPDATE shoppers SET signup_date='2025-01-02' WHERE id=6;
INSERT INTO shoppers VALUES(18,'Quinn Yu',' Gus@Harbor.test','West','2025-03-08');
UPDATE catalog_items SET price=16.0 WHERE id=9;
INSERT INTO catalog_items VALUES(14,'Bird Feeder','Garden',22.0),(15,'Apron','Kitchen',45.0),(16,'Lamp Shade','Lighting',18.0);
UPDATE sales_orders SET status='delivered',delivered_date='2025-02-16' WHERE id=110;
INSERT INTO sales_orders VALUES(140,16,'2025-04-08','delivered','2025-04-09'),(141,18,'2025-03-09','processing',NULL),(142,11,'2025-04-02','processing',NULL),(143,8,'2025-03-15','delivered','2025-03-18');
INSERT INTO order_lines VALUES(140,12,1,249.0),(141,1,1,39.0),(142,10,1,12.0),(143,3,1,19.5);
UPDATE order_lines SET quantity=5 WHERE order_id=109 AND item_id=3;
INSERT INTO order_payments VALUES(40,140,'2025-04-08',249.0,'card'),(41,121,'2025-03-12',20.0,'card');
INSERT INTO order_refunds VALUES(7,117,'2025-03-08',12.0),(8,107,'2025-02-10',5.0);
INSERT INTO app_logins VALUES(2,'2025-03-05'),(3,'2025-03-20'),(3,'2025-03-21'),(3,'2025-03-22'),(3,'2025-03-23');
UPDATE shopper_snapshots SET region='West' WHERE shopper_id=2 AND snapshot_date='2025-04-30';
INSERT INTO departments VALUES(7,'Legal','Berlin',180000.0);
INSERT INTO employees VALUES(21,'Uma Reyes',7,1,'Engineer',125000.0,'2025-01-06');
UPDATE employees SET salary=99000.0 WHERE id=10;
UPDATE employees SET department_id=6,hired_at='2023-07-01' WHERE id=19;
INSERT INTO salary_history VALUES(21,125000.0,'2025-01-06',NULL);
UPDATE salary_history SET valid_from='2024-01-01' WHERE employee_id=6 AND salary=120000.0;
INSERT INTO performance_reviews VALUES(14,21,'2025-02-15',5),(15,13,'2024-06-10',2);""".split("\n"))
ts='''import type { DatasetInfo } from "@/content/types";

/**
 * Synthetic datasets added for the practice question bank. All names, emails
 * and figures are fictional. Edge cases are deliberate and documented in
 * docs/question-bank/DATASET_INVENTORY.md (duplicate emails after trimming,
 * NULL regions, price/salary ties, month-boundary dates, split, missing and
 * over-payments, partial and full refunds, overlapping salary periods, an
 * employee with no manager or department, a department with no employees).
 *
 * Table names avoid the curriculum tables (customers, orders, payments...)
 * because every question runs on one SQLite database: curriculum seed + this seed.
 * Generated once by an author-time script; this file is the canonical source.
 */
export const questionBankSeed = SEED;

/**
 * Changed-data fixture for question-bank checks (applied after the seed).
 * It moves regions, adds shoppers/orders/lines/payments/refunds/logins,
 * changes prices and salaries, and moves an employee, so a query that
 * hard-codes the visible output fails.
 */
export const questionBankMutation = MUTATION;

export const questionBankDatasets: Record<string, DatasetInfo> = {
  market: {
    name: "Harbor Market",
    role: "Ecommerce analyst",
    description:
      "An online homeware shop: shoppers, a product catalog, orders with line items, payments (some split, missing or over-paid), refunds, app logins and monthly region snapshots.",
    tables: [
      "shoppers",
      "catalog_items",
      "sales_orders",
      "order_lines",
      "order_payments",
      "order_refunds",
      "app_logins",
      "shopper_snapshots",
    ],
  },
  org: {
    name: "Atlas Corp",
    role: "People analyst",
    description:
      "A company directory: departments, employees with a manager hierarchy, salary history with start/end dates, and performance reviews.",
    tables: ["departments", "employees", "salary_history", "performance_reviews"],
  },
};
'''.replace("SEED",json.dumps(seed)).replace("MUTATION",json.dumps(mutation))
open('src/content/question-bank/datasets.ts','w').write(ts)
