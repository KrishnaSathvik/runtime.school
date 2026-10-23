# SQL question wording

The wording pass is closed. Runtime still uses Learn, then Practice, then Projects. Early questions now name the filter column. Later questions still ask the learner to apply a column that was already taught. Checker SQL, project briefs, and the capped practice previews were left as they were.

## Current behavior

| Area | Now |
| --- | --- |
| Practice bank | 139 questions and 139 expected-result previews. The earlier 132 count stopped while reading the question files. |
| Early Learn | Three questions name the column the checker filters on. |
| Easy Practice | Nine questions name that column. |
| Dataset card | `orders` and `products` start open on Filter with WHERE, Combine conditions, and Understand NULL. They still collapse and reopen on their own. Every other lesson, and Practice, still starts closed. |
| Hints | They explain the reasoning. They do not paste the predicate. |
| Checker SQL | Unchanged. |
| Project briefs | Unchanged. Sale and cancellation stay defined in business language. |
| Expected-result previews | Still capped. Frequent customers shows the first 3 of 36 rows. |

## Regression check

Each rewritten question still asks for the same rows, columns, and order as its unchanged solution.

| Question | Condition the question states | Solution |
| --- | --- | --- |
| Filter with WHERE, challenge 1 | cancellations in `order_type` | `order_type = 'cancellation'`; returns `order_id`, `invoice_no`, `ordered_at` |
| Combine conditions, challenge 1 | sales in `order_type`, shipped to Germany or France | `order_type = 'sale'` and those two countries; returns `order_id`, `country`, `ordered_at` |
| Understand NULL, challenge 2 | sale orders with no `customer_id` | `customer_id IS NULL` and `order_type = 'sale'`; returns `order_id`, `invoice_no`, `country` |
| Frequent customers | a `customer_id`, at least 20 orders whose `order_type` is sale | `order_type = 'sale'` and `customer_id IS NOT NULL`, then `HAVING COUNT(*) >= 20` |
| 2011 net sales by department | 2011 on `ordered_at`, sales and cancellations, rounded to 2 | half-open 2011 on `ordered_at`, no type filter |
| Users created in March 2025 | `created_at` in March 2025 | half-open March on `created_at` |
| Developers and their teams | a team, `organization_id` 1 | inner join, `organization_id = 1` |
| Every developer, with a team label | `organization_id` 1, `Unassigned` when there is no team | left join and `COALESCE` |
| Spring orders from France and Germany | `order_type` sale, March through May 2011 on `ordered_at`, France or Germany | those filters, with the countries grouped |
| Average price by category | `is_merchandise` 1 and a `category_id` | those filters, then `ROUND(AVG(list_price), 2)` |
| Price bands | `is_merchandise` 1, and the four bands | that filter and the same `CASE` |
| Active buyers per month | 2011 on `ordered_at`, a `customer_id`, `order_type` sale | those filters and `COUNT(DISTINCT customer_id)` |

None of these twelve ask for an order, and none of their solutions sort.

The second Combine conditions challenge was left as written. It asks for merchandise that costs more than 50 or is in the Jewellery category, and says the grouping is wrong. The editor already contains `is_merchandise = 1`, `list_price > 50`, and `category_id = 7`. Category 7 is Jewellery. The lesson is testing parentheses. The learner does not have to discover the column or the category id.

On the live lesson pages, Filter with WHERE, Combine conditions, and Understand NULL open `orders` and `products`. Closing one leaves the other open, and a closed table opens again. Comparisons & ranges starts with both tables closed, and opening one does not open the other. Practice starts closed and still opens when chosen. A fresh load of Comparisons & ranges no longer reports a hydration mismatch on the disclosure: a missing table list had been passing `open` as undefined, and it is now always true or false.

## Original finding

This is the audit record, not the current wording.

Before:

> Find every cancellation order.
> Return `order_id`, `invoice_no`, and `ordered_at`.

`order_type` was not in that question. The worked example on the same page said `order_type` tells you whether a row is a sale, cancellation, or adjustment. The hint repeated the column. The same lesson’s second challenge already said “not merchandise (`is_merchandise = 0`)”.

After:

> Find orders marked as cancellations in the `order_type` column.
> Return `order_id`, `invoice_no`, and `ordered_at`.

The question names the column. It does not write `WHERE order_type = 'cancellation'`.

Early challenges that said “cancellation”, “sale order”, or “merchandise” without naming the column:

| Lesson | Question asked for | What happened |
| --- | --- | --- |
| Filter with WHERE | every cancellation order | Question now names `order_type`. |
| Combine conditions | sale orders shipped to Germany or France | Question now names `order_type`. |
| Combine conditions | merchandise, or the Jewellery category | Left. The editor already shows `is_merchandise` and `category_id`. |
| Understand NULL | sale orders with no customer | Question now names `customer_id`. The sale filter stays in the editor. |
| Sort & limit | the 10 most expensive merchandise products | Left. `is_merchandise` was already taught. |
| Sort & limit | the 20 most recent cancellations | Left. `order_type` was already taught. |
| Databases, schemas, tables & keys | every sale order placed by a known customer | Left. |
| NOT IN and the NULL trap | customers who never placed a cancellation | Left. |

Dates written as “December 2010” were already a complete period. The question does not repeat the timestamp literals.

## What stayed

Practice still shows a “what to return” spec and a capped expected-result preview. 122 of the 139 previews are shorter than the full result. 17 small results show the whole answer. That preview stays off Learn.

Project steps stay in business language. The Retail review defines sale and cancellation with `order_type`, then defines the measures.

Learn states the requirement and teaches the SQL. Practice states the requirement and asks for the query. Projects state the business problem and the definitions. That is the progression to keep.
