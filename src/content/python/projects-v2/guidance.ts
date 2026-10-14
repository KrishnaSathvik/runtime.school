/** Learner-facing orientation. These examples explain the task, not its implementation. */
export const projectGuidance:Record<string,{skills:string;flow:string;example:string}>={
 'customer-data-quality':{
  skills:'Functions, dictionaries, lists, string methods, and reading/writing JSON.',
  flow:'main.py reads customers_a.json followed by customers_b.json and loads rules.json. Your functions in cleaning.py normalize and validate those records, then write the clean records, rejections, and quality report.',
  example:'A customer named "  ana  " with email " ANA@SHOP.COM " becomes name "Ana" and email "ana@shop.com". Keep the original record unchanged. Missing names are handled by the validation milestone, not by inventing a name.'
 },
 'retail-order-engine':{
  skills:'Functions, dictionaries, loops, integer arithmetic, exceptions, and JSON files.',
  flow:'main.py loads the product catalog, carts, and pricing rules. checkout.py prices each cart, applies its order status, and produces receipts and a sales summary. Amounts are stored in cents: 1250 means $12.50.',
  example:'If the catalog price is 1,250 cents and the cart requests two units, its subtotal is 2,500 cents. Apply the configured discount before tax. A refunded order still has a sale total, but contributes zero net revenue.'
 },
 'csv-sales-analyst':{
  skills:'Functions, CSV/JSON files, dates, grouping records, and basic matplotlib.',
  flow:'main.py reads orders, products, payments, and returns. reporting.py validates orders and calculates revenue; charts.py draws the calculated daily totals. Order IDs connect payments and returns to orders; product IDs supply categories.',
  example:'For a valid paid order with 10,000 cents captured and 2,000 cents returned, net revenue is 8,000 cents. Use the captured payment, even if the order face value is different.'
 },
 'product-event-investigation':{
  skills:'Functions, JSON lines, timezone-aware dates, grouping/sorting, and basic matplotlib.',
  flow:'main.py loads the event log and required fields. analytics.py validates events, groups them into sessions, and calculates conversion and retention. charts.py plots weekly activity. Each nonblank log line is one candidate event; some lines are deliberately malformed.',
  example:'A view at 10:00 followed by a buy at 10:20 counts as a conversion in that session. A buy before the view does not. A gap of exactly 30 minutes stays in the same session; a longer gap starts another.'
 },
 'marketplace-eda':{
  skills:'pandas DataFrames, filtering, merges, groupby, dates, and basic matplotlib.',
  flow:'main.py reads orders, customers, and products into DataFrames. analysis.py cleans orders and joins customer cohorts and product categories; charts.py plots monthly cohort revenue. A cohort is the month a customer joined.',
  example:'If an otherwise valid order has no matching customer, keep its revenue and label its cohort "unknown". Do not drop that order during the join. A repeat customer has at least two retained orders.'
 },
 'reliable-mini-etl':{
  skills:'Functions, dictionaries, JSON lines, CSV files, exceptions, and sorting.',
  flow:'main.py reads the existing target, three ordered batches, and the validation schema. pipeline.py parses and validates updates, merges them by ID and version, then writes the updated target and processing report. ETL means extract, transform, and load.',
  example:'If the target has ID K0001 at version 2, an incoming version 3 replaces it; version 1 does not. Processing the same batches a second time must leave the result unchanged. This is what replay-safe means.'
 }
};
