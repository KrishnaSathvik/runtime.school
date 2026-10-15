# Retail Performance Review — locked content v2

Generated from the runtime catalog. This is the exact learner copy and analytical contract; see RETAIL_AUDIT.md for rationale, empirical evidence, hidden edge cases, and acceptance criteria.

Dataset: retail v1.0.0. Content revision: 2.

## Exact brief

### who

You support the commercial manager of a UK gift retailer.

### situation

The manager is reviewing the December 2009–February 2010 invoice extract before choosing the next commercial investigation. Lower net value could reflect less positive trading activity, larger negative adjustments, or both. The team has time for two follow-up actions and needs evidence before deciding where to focus.

### ask

What explains the changes in net invoiced value, which adjustments deserve investigation, and how far can customer-linked records support a follow-up?

### data

Online Retail — invoice headers and original invoice lines from 1 December 2009 through 28 February 2010, with stock-code descriptions and customer identifiers. This is an invoice extract, not a payment ledger.

### deliverable

A short commercial review with three connected findings, two prioritized follow-up actions, and explicit limits on what the extract can establish.

## Preparation

Filtering · Aggregation · Joins · Conditional metrics · Calendar months · Missing values

## Project tables

countries, customers, products, orders, order_items

## Stage 1: Project brief

Type: orientation. Stable ID: brief.

### Business question

Decide what you can establish from invoices before recommending a commercial action.

### Why it matters / data notes

The commercial team needs an investigation plan supported by invoice evidence.

Tables: No SQL required.

## Stage 2: Understand Online Retail

Type: orientation. Stable ID: understand-data.

### Business question

Trace an original invoice line to its observed header and stock-code description. Identify which records support customer-level analysis and which do not.

### Why it matters / data notes

orders.id identifies one observed header; the original invoice number is not guaranteed unique. Join order_items.order_id to orders.id. Each order_items.source_row is an original worksheet row: retain repeated-looking rows. products has one row per stock_code, including Manual, Discount, postage, and other adjustment-style codes; its first observed description can be missing or differ from line descriptions. A missing customer_id means unidentified, not necessarily a guest checkout. A cancellation flag identifies a C-prefixed invoice, not a reason for an adjustment. Preserve signed quantity × unit price, including zero-value lines. The extract covers December 2009–February 2010; dates use local wall time with no specified timezone. Recorded activity spans 1–23 December, 4–31 January, and 1–28 February: a day with no invoices does not tell you whether the business was closed or the extract is incomplete.

Tables: countries, customers, products, orders, order_items

## Stage 3: Size the adjustment problem

Type: checkpoint. Stable ID: baseline.

### Business question

Across the full extract, how many invoice headers and identified customer IDs are represented, and how much positive value remains after negative adjustments?

### Why it matters / data notes

Before blaming a product or customer group, establish how much negative invoice value reduces positive invoiced value across the whole review period. This is the control total for the next investigations.

Tables: orders, order_items

### Result and validation contract

Grain/order: one summary row.

Columns, in order: invoice_headers, identified_customers, positive_gbp, negative_gbp, net_gbp, adjustment_rate.

Semantic reference: retail-performance-baseline. Changed-data validation enabled.

- Count orders.id once, including headers with no lines; count distinct nonmissing customer IDs on headers.
- Preserve every source row and all signed line values, including cancellation invoices.
- positive_gbp + negative_gbp = net_gbp; adjustment_rate uses positive value as denominator.

### Exact metric definitions

- Scope: all headers and all original lines in the supplied December 2009–February 2010 extract. Do not remove cancellations, unidentified customers, repeated-looking rows, or adjustment codes.
- invoice_headers = number of distinct orders.id; identified_customers = number of distinct nonmissing orders.customer_id, not rows in the customers table.
- Line value = quantity × unit_price_gbp. positive_gbp = sum of values greater than zero; negative_gbp = sum of values less than zero, retaining the negative sign; net_gbp = sum of all line values.
- adjustment_rate = absolute negative value / positive value, as a fraction (0.05 means 5%). Return NULL when positive value is zero. This is a value ratio, not a count of returned orders or a refund rate.
- Round GBP totals to 2 decimal places and rates to 6, after aggregation. Calculate rates from unrounded totals.

### Progressive hints

1. An invoice header and an invoice line are different units of observation. Which totals belong to each?
2. Keep positive and negative line values separate before calculating net value. Zero-value lines contribute zero.
3. The adjustment rate is the magnitude of negative value divided by positive value. Counting joined rows would inflate invoice headers.

### Required interpretation prompt

Quote the positive, negative, and net amounts and the adjustment rate. How large is the adjustment problem, and why is that rate not a customer return rate? Use this as the baseline for the monthly diagnosis.

## Stage 4: Explain the monthly change

Type: checkpoint. Stable ID: revenue-over-time.

### Business question

For each recorded calendar month, how do positive invoiced value, negative adjustments, invoice activity, and net value per header change? Which component explains the change in net value?

### Why it matters / data notes

The baseline alone cannot distinguish weaker positive trading activity from more negative adjustments. Separate these components by month before deciding what the team should investigate.

Tables: orders, order_items

### Result and validation contract

Grain/order: one row per recorded month (YYYY-MM), ordered by month ascending.

Columns, in order: month, invoice_headers, positive_gbp, negative_gbp, net_gbp, adjustment_rate, net_per_header_gbp.

Semantic reference: retail-performance-monthly. Changed-data validation enabled.

- Month uses the stored invoice_at calendar month without timezone conversion.
- Invoice headers count once, including cancellation and zero-line headers.
- Monthly signed totals reconcile to the baseline; ratios are calculated within each month.

### Exact metric definitions

- month = YYYY-MM from the stored orders.invoice_at. Return every month represented by headers, in ascending order; do not invent months without headers.
- invoice_headers counts distinct orders.id in the month, including cancellation headers. Preserve headers without lines; they contribute zero invoice value.
- positive_gbp, negative_gbp, net_gbp, and adjustment_rate follow the baseline definitions within each month. The rate denominator is that month's positive value, not the period total.
- net_per_header_gbp = the month's signed net value / all invoice headers in that month. It is not an average purchase basket: cancellations and adjustment headers are included.
- Round GBP outputs to 2 decimals and rates to 6 after aggregation; use unrounded amounts for division.

### Guidance

- Reconcile monthly header and value totals to your baseline before interpreting the changes.
- Recorded activity covers 21 days in December and 24 in each of January and February. Calendar lengths and recorded days differ; missing dates do not prove zero demand or a closure.

### Progressive hints

1. Use the same inclusion rules as your baseline so the monthly amounts can add back to it.
2. A fall in net value can come from less positive value even when the magnitude of negative adjustments also falls. Compare the two components separately.
3. Each month needs its own distinct header count and positive-value denominator. Net per header includes adjustment headers too.

### Required interpretation prompt

Compare two adjacent months using changes in positive and negative value to explain the net change. Use header volume and net per header to refine the diagnosis, and state why three calendar months do not establish a long-term demand trend.

## Stage 5: Prioritize adjustment investigations

Type: checkpoint. Stable ID: products-categories.

### Business question

Across the full review period, which ten stock codes contribute the largest magnitude of negative invoice value, and what share of all negative value does each explain?

### Why it matters / data notes

Use the monthly diagnosis to distinguish a broad trading change from an adjustment issue. The next question is where adjustment review effort belongs: a high-net-value product list can miss the largest negative contributors, and some codes represent bookkeeping entries rather than merchandise.

Tables: order_items, products

### Result and validation contract

Grain/order: up to 10 stock codes with negative_gbp < 0, ordered by negative_gbp ascending then stock_code ascending.

Columns, in order: stock_code, description, positive_gbp, negative_gbp, net_gbp, adjustment_share.

Semantic reference: retail-performance-adjustment-priorities. Changed-data validation enabled.

- Rank by negative-value magnitude, not net sales; preserve non-merchandise codes.
- Use products.description exactly, preserving NULL; line descriptions do not define separate groups.
- The denominator includes negative value from all codes, not just the shortlisted ten.

### Exact metric definitions

- Use every original line in the full review period. Group by stock_code, preserving adjustment codes and missing descriptions. description must be products.description; do not substitute a line description.
- positive_gbp, negative_gbp, and net_gbp follow the baseline signed-value rules within each stock code. Include both positive and negative lines when calculating a qualifying code's totals.
- adjustment_share = absolute negative value for the code / absolute negative value for all codes in the extract. The denominator is not limited to the top ten. Return the fraction rounded to 6 decimals.
- Round GBP totals to 2 decimals. Keep codes whose negative_gbp is below zero; sort that rounded value ascending, then stock_code ascending; return at most 10 rows. If there are no negative values, return no rows.

### Guidance

- These are investigation priorities, not proven product faults or recoverable losses. Invoice data does not link each negative entry to an original sale or identify its cause.

### Progressive hints

1. Start from the value you want to investigate: negative adjustments. A stock code with low or negative net value can still be the largest contributor.
2. One stock code can have several line descriptions. The stock code defines the group; the products table supplies the display description.
3. Calculate each code's share against the magnitude of all negative value before limiting the shortlist. More-negative signed totals rank first; break ties by stock code.

### Required interpretation prompt

Name the largest contributor and its share of all negative value. Does its description point to a merchandise issue or an entry requiring reconciliation? Choose one follow-up check; do not infer a return reason from a stock-code label.

## Stage 6: Assess customer follow-up coverage

Type: checkpoint. Stable ID: customers.

### Business question

How much positive invoiced value and negative adjustment value can be linked to identified customers, and how much belongs to headers with missing customer IDs?

### Why it matters / data notes

Your shortlist may justify reviewing invoice entries, but a customer-focused action also needs a known customer identifier. Quantify that coverage before recommending outreach or interpreting customer behavior.

Tables: orders, order_items

### Result and validation contract

Grain/order: one row per observed identity_status (anonymous or identified), in any order.

Columns, in order: identity_status, invoice_headers, positive_gbp, negative_gbp, net_gbp, positive_value_share, adjustment_share.

Semantic reference: retail-performance-identity-split. Changed-data validation enabled.

- Anonymous means missing ID, not proven guest checkout; include those headers.
- Both shares use their corresponding full-period value denominator, not header counts or net value.
- Bucket header and value totals reconcile to the baseline.

### Exact metric definitions

- identity_status = 'anonymous' if orders.customer_id is NULL, otherwise 'identified'. Return only groups represented by headers. Anonymous is a label for missing IDs, not a known checkout type.
- invoice_headers = distinct orders.id per group, including cancellation and zero-line headers. Missing customer IDs must not remove their lines.
- positive_gbp, negative_gbp, and net_gbp use the baseline signed-value rules within each group.
- positive_value_share = group positive value / full-period positive value. adjustment_share = absolute group negative value / absolute full-period negative value. Use unrounded amounts; return NULL if the corresponding denominator is zero.
- Round GBP outputs to 2 decimals and shares to 6. A customer ID establishes linkage, not a contact address, consent to contact, satisfaction, or a reason for an adjustment.

### Guidance

- The two groups' header counts and signed amounts must reconcile to the baseline. Nonzero-denominator shares should sum to 1 before rounding.
- These shares describe the full extract, not the shortlisted stock codes. Check customer linkage for each priority before recommending outreach.

### Progressive hints

1. Classify each header by whether its customer identifier is present. Missing IDs must remain part of the analysis.
2. Use positive value to measure positive-value coverage and negative-value magnitude to measure adjustment coverage. These are different denominators.
3. Count each header once after associating its lines. Divide each bucket's values by the corresponding totals from all buckets, then reconcile the signed amounts to your baseline.

### Required interpretation prompt

Quote the identified share of positive value and of negative adjustments. What does this allow the team to investigate, and what customer or outreach claims remain unsupported? Use this to qualify one of your final actions.

## Stage 7: Review the commercial diagnosis

Type: synthesis. Stable ID: synthesis.

### Business question

Connect the baseline, monthly bridge, adjustment shortlist, and customer coverage into one defensible commercial diagnosis.

### Why it matters / data notes

Separate what the data demonstrates from the questions the commercial and reconciliation teams should investigate next.

Tables: No SQL required.

### Required interpretation prompt

Which three conclusions matter most? Explain the monthly net change using positive value and negative adjustments; identify the adjustment priority without treating its label as a cause; and use customer-ID coverage to qualify two follow-up actions. What observation would change your recommendation?

## Stage 8: Report

Type: report. Stable ID: report.

### Business question

Deliver three connected findings, two prioritized actions, and the limitations that determine how the team should use the analysis.

### Why it matters / data notes

Your manager will use this review to choose two follow-up actions, not to book a recovery or declare a product defective.

Tables: No SQL required.

## Final report structure

Saved findings are selected after Summary; wording may be edited independently. The three text fields below are required. Markdown export includes the selected findings and their saved SQL/results.

### Summary

Explain whether the monthly change is mainly in positive invoiced value, negative adjustments, or both. Connect three saved findings from the baseline, monthly diagnosis, adjustment priorities, and customer coverage; quote their amounts or shares and the period.

### Recommendation

Prioritize two follow-up actions. For each, name the responsible team, the amount or share that justifies it, and the additional record or check needed. Distinguish reviewing adjustment entries from contacting identified customers; do not promise recoverable revenue.

### Limitations

Explain the three-month observation window, unequal recorded activity, missing customer identifiers, and why signed invoice adjustments do not establish settled refunds, profit, lost demand, or the cause of a return.
