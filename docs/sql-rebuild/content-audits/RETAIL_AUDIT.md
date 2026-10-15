# Retail Performance Review — content quality audit

Status: Retail content revision 2 implemented and locked for review. Projects UX is frozen. Airline and projects 3–10 are outside this pass.

The exact runtime brief, questions, definitions, columns, hints, finding prompts, synthesis, and report fields are in [RETAIL_LOCKED_CONTRACT.md](RETAIL_LOCKED_CONTRACT.md). The [JSON lock](retail-performance-v2.json) is regression-tested against the runtime catalog. Refresh both only after an intentional content review:

```sh
npx vitest run --config vitest.scripts.config.ts scripts/retail-project-lock.gen.ts
```

## Judgment on the original project

The original project was not ready to be the quality template. Its individual queries were executable, but the business ask, expected results, and interpretation were not consistently aligned.

| Finding | Why it mattered | Revision |
| --- | --- | --- |
| “Where revenue is being lost” presumed a loss mechanism the invoice extract cannot identify. | Signed invoice value does not establish lost demand, profit, payment settlement, or recoverable cash. | A commercial manager must choose two follow-up investigations based on changes in invoiced value and uncertainty. |
| Stage 5 asked about negative adjustments but graded the top 20 codes by **net** value. | The largest negative contributor, Manual, has negative net value and is absent from that shortlist. | Rank ten codes by negative-value magnitude, with their share of all negative value. |
| “Products and categories” had no category dimension or category analysis. | The stage title promised an investigation the schema and validation did not support. | “Prioritize adjustment investigations,” explicitly retaining non-merchandise codes. |
| “Average order value” included cancellation and adjustment headers. | Readers could confuse it with average purchase basket size. | `net_per_header_gbp`, with an explicit all-header denominator and caveat. |
| Missing customer IDs were described as guest checkout. | Missing IDs do not establish checkout behavior. | “Anonymous” is strictly the output label for a missing identifier. |
| Customer stage asked for a share but returned only net value and counts. | No explicit denominator or separation of positive-value and adjustment coverage. | Return both positive-value share and adjustment share using their respective period totals. |
| Monthly order, precision, description selection, and some inclusion rules were implicit. | Learners could give reasonable but grader-incompatible results. | Publish ordering, tie-breaks, rounding, NULL denominators, canonical description selection, and preservation rules. |
| A country hint had no role in the identity split. | It nudged learners toward an unnecessary join. | Three progressive, grain-aware hints per checkpoint, tied to the actual result. |
| Synthesis/report copy remained generic; the catalog replaced custom report prompts. | Findings did not have a clear route into a commercial decision. | Project-specific synthesis and three report fields use existing layouts; the catalog preserves explicit structured templates. |
| Checks ran only on the original data. | Memorized totals and accidental correctness could pass. | Retail-only changed-data grading plus targeted adversarial tests. |

## 1–3. Brief, situation, and data

Role: junior analyst supporting a UK gift retailer's commercial manager. The scenario is an educational assignment, not a claim about the historical retailer's actual management decisions.

Situation: the manager is reviewing the December 2009–February 2010 invoice extract before allocating effort to two follow-up actions. Lower net value could arise from less positive invoiced value, more negative adjustments, or both. The learner must distinguish those possibilities before recommending an investigation.

Deliverable: three connected findings, two prioritized actions, and limitations. Actions need an owner, quantitative justification, and a next record/check; they must not promise cash recovery or label a product defective without supporting evidence.

Canonical scope: `retail`, version `1.0.0`, project dataset. All original rows are preserved. This pass does not modify the dataset or invent a new dataset version.

| Table | Actual grain and role |
| --- | --- |
| `orders` | Distinct observed header, keyed by `id`; original invoice number is not guaranteed unique. Header dates and customer-ID presence define monthly and identity groups. |
| `order_items` | Original worksheet row, keyed by `source_row`; the source of signed line value. Repeated-looking rows remain separate. |
| `products` | One stock code, including adjustment/non-merchandise codes; first observed description is the display label and may be NULL. |
| `customers` | One known customer identifier. The presence of a dimension row does not establish activity in the selected headers; baseline counts observed header IDs. |
| `countries` | Source country label, not a standardized geography. Orientation context only; no required geographic investigation. |

Required SQL tables stay focused: stages 3, 4, and 6 use headers and lines; stage 5 uses lines and products. No unnecessary customer or country joins are prescribed.

## 4–7. Investigative progression

| Stage | Decision it supports | What it carries forward | Final report contribution |
| --- | --- | --- | --- |
| 3: Size the adjustment problem | How material is negative invoice value relative to positive activity? | Period control totals and a value-based adjustment rate. | Scale of the problem and the distinction between invoice adjustments and customer returns. |
| 4: Explain the monthly change | Is the net movement primarily positive activity, adjustments, or both? | Same inclusion rules; monthly values reconcile to stage 3. Header counts and net per header refine the diagnosis. | A quantified explanation of the movement without declaring a long-term demand trend. |
| 5: Prioritize adjustment investigations | Where should an adjustment review start, if warranted by the diagnosis? | Full-period negative total from stage 3 is the share denominator. Stage 4 prevents overstating adjustments as the only issue. | A ranked, evidence-backed next investigation, with merchandise vs bookkeeping ambiguity acknowledged. |
| 6: Assess customer follow-up coverage | How much of the extract supports customer-linked investigation? | Positive and negative totals reconcile to stage 3; coverage qualifies potential actions arising from stages 4–5. | Scope of supported customer analysis and the records still needed before outreach. |

Stage 6 deliberately measures full-extract coverage. It does **not** establish the coverage of each shortlisted code. That limitation is stated explicitly; a recommendation for a particular code must request a linkage check before outreach. This retains beginner query complexity without pretending a broad coverage ratio proves a narrower claim.

Later queries do not consume the learner's earlier result tables. They reuse consistent definitions against the same source so an early SQL mistake cannot silently become a later reference answer. The learner's findings and synthesis provide the investigative continuity. There is no single mandated commercial recommendation.

## 8–9. Metric and output contract

The locked contract lists every stage's exact ordered columns, grain, expected row ordering, and definitions. Core rules:

- Count observed headers by `orders.id`, never original invoice strings or joined line counts. Include headers without lines; their monetary contribution is zero.
- Identify customers by distinct nonmissing IDs on headers, not total dimension rows. Missing IDs remain in scope for all monetary measures.
- Line value is signed quantity × unit price. Do not remove cancellation invoices, negative entries, zero prices, missing descriptions, repeated-looking rows, or adjustment codes.
- Positive value sums strictly positive line values; negative value sums strictly negative values and remains signed; net is their sum.
- Adjustment rate is absolute negative value / positive value. It is not a returned-order rate or settled-refund rate.
- Shares use the corresponding **full-period** totals; rates within a month use that month's positive value.
- Return NULL for a zero denominator. Baseline empty sums are zero. An extract with no negative value produces no adjustment-shortlist rows.
- Round monetary outputs to two decimals and rates/shares to six only after aggregation. Calculate ratios using unrounded totals.
- Monthly output is ordered chronologically. Priorities use rounded negative value ascending (most negative first), then stock code ascending for deterministic ties, at most ten rows.
- Use `products.description` exactly, allowing NULL; changing line descriptions never create extra stock-code groups.

## Evidence from the actual dataset

These are reviewer observations, not learner-facing answers. Reproduce with the four references in `src/content/projects/references/beginner.ts` against `public/datasets/retail/1.0.0/project.json`.

- 5,934 observed headers but 5,932 distinct invoice strings: counting the invoice string loses two observed headers.
- 106,171 original lines; 1,157 extra repeated-looking rows when grouping by header, stock, line description, quantity, and price. Appearance alone does not justify deleting them.
- 1,018 zero-price lines and 960 missing line descriptions are retained.
- Positive value £2,032,107.57, signed negative value −£75,136.14, net value £1,956,971.43. Adjustment-to-positive-value ratio: 3.6974%.

| Month | Headers | Positive GBP | Negative GBP | Net GBP | Net GBP/header |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2009-12 | 2,331 | 825,685.76 | −25,838.65 | 799,847.11 | 343.13 |
| 2010-01 | 1,634 | 652,708.50 | −28,675.61 | 624,032.89 | 381.91 |
| 2010-02 | 1,969 | 553,713.31 | −20,621.88 | 533,091.43 | 270.74 |

December→January net falls £175,814.22: positive value falls £172,977.26 and negative value becomes £2,836.96 more negative. January→February net falls £90,941.46 despite an £8,053.73 reduction in adjustment magnitude, because positive value falls £98,995.19. February has more headers than January but lower net value per header. These observations support several follow-up hypotheses; they do not establish demand, product faults, or causality.

Manual (`M`) contributes −£29,350.81, or 39.0635% of all negative value, despite net value of −£6,925.10. Bank Charges, Discount, Adjustment, and Postage also appear in the top ten. A high-net-product ranking is the wrong lens for this question.

Identified headers account for 86.1344% of positive value and 87.4676% of adjustment magnitude. Missing-ID headers account for the remainder. Identifiers support linkage; the dataset does not provide contact details, consent, or a reason for adjustment.

Recorded days: December 1–23 (21 distinct dates), January 4–31 (24), February 1–28 (24). These are observed transaction dates, not verified opening days. Three months, holiday timing, and unequal activity coverage limit trend claims.

## 10. Hidden edge cases and validation

All semantic rules are published. Hidden tests vary data, not business definitions.

| Case | Coverage | Failure detected |
| --- | --- | --- |
| Conflicting invoice headers sharing one invoice string | Observed source + synthetic fixture | Counting invoice strings instead of header keys. |
| Repeated identical line values on different source rows | Observed source + changed-data fixture | Deduplicating or inflating totals at the wrong grain. |
| Missing customer ID and an unused customer dimension row | Observed missing IDs + changed-data fixture | Dropping unidentified value or counting dimension rows as active customers. |
| Negative value without cancellation flag | Synthetic fixture | Treating the flag as the metric definition. In the current extract all nonzero negative value happens to be on flagged headers; that coincidence must not become a hidden rule. |
| Zero-price negative quantity | Observed source + synthetic fixture | Treating every negative quantity as negative monetary value. |
| Large negative adjustment with NULL product description | Changed-data fixture | Ranking net rather than negative value; filtering missing descriptions; substituting line labels. |
| Zero-line header | Synthetic fixture only | Inner joins dropping activity or inconsistent baseline/monthly denominators. |
| No positive / no negative values, or an empty extract | Synthetic tests | Invalid ratios, fabricated rows, or inconsistent zero totals. |
| Twelve tied negative contributors | Synthetic test | Nondeterministic top-ten selection or a denominator restricted to shortlisted codes. |
| An alternative preaggregated monthly solution | Production grader test | Accidental SQL-string matching or unnecessary query-shape restrictions. |
| Hardcoded correct baseline outputs | Changed-data production grader | Accepting memorized answers that do not generalize. |

The browser Check action runs original and changed-data comparisons for Retail. Separate tests assert independent numeric expectations on a small fixture and reconcile source totals; they do not merely run a reference query against itself.

## 11–12. Hints and finding quality

Each checkpoint has three progressive hints: first clarify the analytical unit or comparison, then the definition or relationship, then a more concrete aggregation/denominator warning. No first hint reveals a full query.

Findings are required after validation and are decision-oriented:

1. Size and interpret the adjustment rate without calling it a customer return rate.
2. Explain a month-to-month net change using both signed components and a coverage caveat.
3. Name a priority and its share, distinguish a label from a proven cause, and choose a follow-up check.
4. Quantify two kinds of identity coverage and qualify a customer-focused action.

A numerically correct query with “sales went down” is not a strong finding. The application checks required text, not whether the prose is insightful; the editorial rubric below is a human review standard, not a claim of automated prose grading.

## 13–14. Synthesis and report

Synthesis asks for three connected conclusions: the monthly bridge, the adjustment priority, and the limits of customer linkage. It then asks how those conclusions qualify two actions and what observation could change the recommendation.

The existing report layout retains three required fields: Summary, Recommendation, Limitations. Saved findings are selected after Summary and can be reworded independently. Exact prompts are locked in the content manifest; there are no new panels, layouts, or interaction patterns.

Reviewer acceptance rubric:

- The summary quotes magnitudes and period, reconciles the signed components, and does not confuse net invoice value with profit or settled cash.
- At least three selected findings connect the stages. A shorter narrative can combine baseline and monthly evidence rather than repeating every table.
- Two prioritized actions name an owner, explain the supporting amount/share, and request a specific next record or validation. More than one defensible prioritization is allowed.
- The adjustment recommendation does not equate Manual/Discount/bank-charge entries with defective merchandise or proven recoverable revenue.
- The customer recommendation distinguishes full-extract coverage from priority-specific coverage and acknowledges missing contact/causal information.
- Limitations cover the short observation window, recorded-date coverage, unidentified headers, and the absence of original-sale/refund/payment matching or causal evidence.

## Lock, compatibility, and next project

The dataset version and stage IDs stay stable. Content revision 2 invalidates earlier checkpoint passes and requires final-report confirmation, while preserving SQL, findings, snapshots, and report text. Old saved findings remain accessible and show “Needs refresh.” This prevents an old top-net query from completing the new adjustment-priority investigation.

Scope of runtime changes: content bindings for the project-specific synthesis/report copy, the Retail changed-data fixture, and revision-aware validation/completion. No CSS, stage layouts, controls, navigation model, or report field count was redesigned.

The reference template for Airline is now: a concrete decision with a bounded source window; four stages with distinct investigative roles; explicit grains and denominators; every interpretation prompt feeding the final decision; no conclusion stronger than the available evidence; and independent original/changed-data tests. Airline has not been edited in this pass.

## Verification result

- 94 tests passed across seven suites, including 19 Retail content/edge-case tests, the other projects' reference SQL, routes, workspace completion, and saved findings.
- SQL typecheck and targeted ESLint passed.
- Existing Playwright desktop/mobile workflow passed with the revised Retail queries, changed-data checks, saved findings, structured report, export, and explicit completion.
- The content-lock generator passed. The exact contract is checked against the runtime catalog on ordinary test runs.
- No claim is made that prose quality or commercial judgment is automatically graded; the reviewer rubric remains necessary.
