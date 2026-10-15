# Distribution and difficulty review

Difficulty combines schema roles, aggregation grain, edge cases and pattern recognition. SQL feature scores are diagnostic, not query-length targets. Changed lesson SQL is rescored by the existing rubric; explicit reviewed overrides remain in question-bank/existing.ts. Standalone question rationales are recorded individually in PRACTICE.md. Foundations intentionally keep the small Retail store tables. Advanced lessons now use all twelve domains; Retail remains the largest domain because the full warehouse/ingestion sequence is coherent Retail work, not a set of independent renamed examples.

| Dataset | Lessons | All challenges | Standalone questions |
| --- | --- | --- | --- |
| Retail | 49 | 157 | 59 |
| Product / SaaS Analytics | 19 | 39 | 1 |
| Weather | 2 | 7 | 3 |
| Finance / Payments | 1 | 3 | 1 |
| Logistics | 6 | 15 | 3 |
| Developer Platform | 2 | 21 | 17 |
| IoT / Sensors | 2 | 5 | 1 |
| Healthcare | 1 | 3 | 1 |
| Energy | 1 | 11 | 9 |
| U.S. Flights | 2 | 7 | 3 |
| Mobility | 1 | 5 | 3 |
| Sports | 2 | 17 | 13 |

| Difficulty | Lesson challenges | Standalone questions |
| --- | --- | --- |
| warmup | 31 | 8 |
| easy | 57 | 20 |
| medium | 56 | 50 |
| hard | 32 | 36 |

| Type | Count |
| --- | --- |
| write | 266 |
| predict | 12 |
| debug | 12 |

Predict/Debug cover NULL/UNKNOWN, left joins and ON filters, COUNT differences, rank ties, peer versus row frames, date boundaries, fan-out, logical-event deduplication, integer ratios and unit/denominator mistakes. Write remains dominant because independent construction is the main outcome. No modality quota was added.
