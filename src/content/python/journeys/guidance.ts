/** Teaching context, separate from the executable milestone contracts and answers. */
export type MilestoneGuidance = { data: string; approaches: string[]; example: string; output: string };
export const milestoneGuidance: Record<string, MilestoneGuidance> = {
  'retail-order-engine': {
    data: 'cart.json contains the items to price; pricing_rules.json supplies the discount threshold, rates, and tax policy. Work in integer cents so each calculation has an explicit rounding boundary.',
    approaches: [
      'Separate loading the files from calculating the subtotal. Each line contributes its price multiplied by its quantity; summing those contributions also gives a natural result of zero for an empty cart.',
      'Calculate the subtotal first, decide whether the threshold is met, then discount before calculating tax. Round each percentage amount half up rather than relying on Python’s default tie rounding. Keep intermediate amounts so the receipt can explain the total.',
      'Build the receipt from the cart and the calculated totals, rather than typing the fixture’s answer. Convert cents to a two-decimal currency string only for display, and keep numeric cents in the JSON export.',
      'Validate each item before trusting its price and quantity. Python treats booleans as integers in some checks, so explicitly exclude them from quantities. Check an empty cart and boundary values as well as the supplied example.',
    ],
    example: 'items = [{"price": 125, "quantity": 2}, {"price": 80, "quantity": 1}]\nline_totals = [item["price"] * item["quantity"] for item in items]\nprint(line_totals)\nprint(sum(line_totals))', output: '[250, 80]\n330',
  },
  'customer-data-quality': {
    data: 'customers_raw.json is the unmodified customer feed; email_rules.json describes the separator rule. Preserve source IDs throughout repairs and rejections so every input can be accounted for.',
    approaches: [
      'Inspect the raw input before changing it. Count records and identify available fields, then read the rules separately so your validation policy does not depend on one example address.',
      'Make a new record for each repair. Limit normalization to the specified whitespace and case changes; keep IDs and additional fields unchanged so later findings can be traced back to the source.',
      'Validate an address before adding it to the set of accepted addresses. A rejected invalid row must not reserve an address. Process records in input order to make “keep the first” deterministic, and retain rejected rows with reasons.',
      'Export the complete accepted and rejected collections, not just counts. Reopen the files to check that IDs, repaired values, and rejection reasons survive serialization.',
      'Reconcile identities as well as totals. Equal counts alone can hide a dropped record replaced by a duplicate; compare the combined accepted/rejected IDs against the original IDs.',
    ],
    example: 'raw = {"id": 7, "name": "  sam  ", "email": " SAM@EXAMPLE.COM "}\ncleaned = {**raw, "name": raw["name"].strip().title()}\nprint(cleaned["name"])\nprint(raw["name"] == "  sam  ")', output: 'Sam\nTrue',
  },
  'product-event-investigation': {
    data: 'product_events.jsonl stores one event per line. event_schema.json lists the required fields. Preserve input order within each session: that order is the evidence used to detect timestamp anomalies.',
    approaches: [
      'Parse each nonblank line as its own JSON value. Check that every required field is present before accepting the record; checking only whether a record has any fields is not sufficient.',
      'Group records by session without sorting away the original order. A user can appear in several sessions, so count distinct users separately from the session groups.',
      'Count actions across events, then inspect the set of actions within each session for the funnel. A session containing both actions qualifies for this presence-based measure even if the timestamps later reveal a sequencing problem.',
      'Compare each parsed timestamp with the preceding timestamp in the same session. Reset the comparison at session boundaries, and retain the anomalous event ID so a reader can locate the evidence.',
      'Export the computed counts and anomaly IDs together. Explain that action presence is not proof of a chronological conversion; use the timestamp findings to qualify the conclusion.',
    ],
    example: 'events = [{"session": "s1", "action": "view"}, {"session": "s1", "action": "buy"}]\nactions = {event["action"] for event in events}\nprint({"view", "buy"}.issubset(actions))', output: 'True',
  },
  'csv-sales-analyst': {
    data: 'orders.csv supplies transactions; products.csv maps products to categories. CSV fields begin as text. Cancelled orders can be valid records even though they do not contribute paid revenue.',
    approaches: [
      'Use a header-aware CSV reader so values are associated with field names. Build the category lookup from the product file rather than embedding category names in your program.',
      'Normalize status text, then validate dates, amounts, product references, and allowed statuses. Quarantine failures with their original ID instead of silently dropping them or inventing replacement values.',
      'Aggregate only paid rows using a (date, category) key. Keep amounts in cents and use the normalized date/category fields from the validated records.',
      'Check two independent invariants: every input ID appears in clean or rejected data, and the grouped revenue equals the sum of paid clean rows. Neither check alone proves the other.',
      'Write explicit CSV headers and sort aggregate keys for reproducible output. Keep all valid rows in clean.csv, including cancellations, and preserve rejection reasons in the separate JSON file.',
    ],
    example: 'rows = [{"status": "paid", "cents": 250}, {"status": "cancelled", "cents": 900}]\npaid_cents = sum(row["cents"] for row in rows if row["status"] == "paid")\nprint(paid_cents)', output: '250',
  },
  'marketplace-eda': {
    data: 'marketplace_orders.csv contains the order sample; marketplace_customers.csv supplies customer cohorts. Duplicate orders, missing amounts, and unmatched customers need distinct policies so the analysis does not silently lose revenue.',
    approaches: [
      'Profile the original frames before cleaning. Count duplicates after their first occurrence separately from missing amounts; these measurements explain what the cleaning step changes.',
      'Apply the specified duplicate and missing-value policies in order, then copy the resulting frame before converting amounts. Keep the source frame intact for comparisons and reconciliation.',
      'Use a left join to preserve every cleaned order. Validate the customer side as many-to-one to catch accidental row multiplication, and label unmatched cohorts explicitly rather than dropping those orders.',
      'Group the joined data by cohort and sum cents. Include the unknown cohort, sort the result for a stable display, and compare the summary total with the joined orders.',
      'Export the joined evidence and grouped result alongside a qualified finding. A small sample with omitted amounts cannot establish a marketplace-wide trend; explain unmatched customers as a separate limitation.',
    ],
    example: 'import pandas as pd\norders = pd.DataFrame({"cohort": ["new", "new", "unknown"], "cents": [100, 250, 80]})\nsummary = orders.groupby("cohort")["cents"].sum().sort_index()\nprint(summary.to_dict())', output: "{'new': 350, 'unknown': 80}",
  },
  'reliable-mini-etl': {
    data: 'daily_events_a.jsonl and daily_events_b.jsonl are incremental batches, processed in that order. existing_output.csv is the current target. Keep malformed lines as evidence with their file and line number; a parse failure is different from a parsed record that violates the schema.',
    approaches: [
      'Define the target columns and schema version before transforming data. Convert existing numeric CSV fields to integers so comparisons with incoming JSON values use the same types.',
      'Handle each line independently so one malformed JSON value does not stop the batch. Record file and one-based line number on parse failures, and keep successfully parsed values for a separate schema check.',
      'Validate the record shape before reading its fields. Exclude booleans from integer fields and reject invalid ranges. Keep schema failures distinct from parse errors so the manifest explains both.',
      'Index records by ID, then replace a record only when the incoming version is strictly higher. Keeping the existing record on ties makes replays deterministic. Return copies sorted by ID without modifying either input.',
      'Replay the accepted batch against the new output and compare the complete records. Reconcile all source lines across accepted, schema-rejected, and parse-rejected groups before writing the rejection report.',
      'Write the output in the declared column order. Derive the manifest counts and total cents from the actual processing results so the manifest can be checked against the files and replay result.',
    ],
    example: 'existing = {"id": "x", "version": 2, "cents": 100}\nincoming = {"id": "x", "version": 2, "cents": 900}\nchosen = incoming if incoming["version"] > existing["version"] else existing\nprint(chosen["cents"])', output: '100',
  },
};
