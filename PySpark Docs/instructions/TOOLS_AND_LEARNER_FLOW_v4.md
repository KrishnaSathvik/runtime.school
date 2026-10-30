# Learn / Practice / Projects / Tools — one coherent user experience

## Non-negotiable alignment

A dataset is the shared learning world; a lesson explains one concept with a tiny view into it; practice makes the learner solve a related but new problem; a project combines mastered skills into a whole deliverable; tools help explore and debug the *same* versions. Learners should always understand what data represents, why a step matters, what input/output is expected, and where it leads next.

Do not create a separate synthetic dataset for every question when the shared domain suffices. Never require unseen skills before they are taught without labeling prerequisites. Align terminology, schema, table names, business rules and types across all surfaces.

## Six integrated tools

| Tool | Job | Execution mode | Data source |
|---|---|---|---|
| PySpark Playground | Run real PySpark and examine bounded output/schema/clear errors | isolated classic Spark | Any licensed/approved dataset fixture |
| Datasets Explorer | Schema, entity graph, samples, versions, formats, business dictionaries | read-only metadata + bounded sample APIs | All 15 datasets |
| Spark SQL Lab | Spark SQL temp views and equivalent DataFrame operations | isolated classic Spark SQL | Same fixture/version as lesson |
| Query Plans & Performance Lab | Explain plan, DAG/stage/shuffle reasoning, controlled benchmark | profiled Spark or later distributed tier | D07/D08/D15 and others |
| Compare Approaches | Two valid strategies, same data + correctness + repeated benchmarks | two isolated identical executions | D01/D05/D07/D10 etc |
| Pipeline & Streaming Lab | Milestone code, Delta CDC, streaming batch replay and checkpoint/restart | stateful isolated project worker | D04/D06/D08/D09/D12/D14/D15 |

The first four tools need not be fully delivered on the first milestone. All tools must share engine adapters, dataset registry, output formatter, authentication, progress and permissions. Avoid six independent editors or six inconsistent execution engines.

## Learner journey example: joins

- L025 on D01: show `customers` + `orders`, tiny rows, join concept and SQL equivalent.
- L026 on D02: introduce semi/anti joins only after learner knows join keys and null semantics.
- Q0126–Q0130: business uses posted transactions, account activity and reconciliation with hidden fixtures.
- P01: process retail sales, join customers/orders/items/products, quality-check double counting, publish marts.
- Tools: Schema Explorer + SQL Lab for relational context; Compare Approaches for join strategy; Query Plans for advanced learner.

## Each page must expose

- Learn: the question "what skill and why", dataset/version, tiny visible inputs, runnable code, expected output, guided explanation, relevant practice link.
- Practice: clear independent prompt, explicit table schemas, output columns/order, Run and Submit, helpful errors and graded outcomes, back-link to relevant lesson.
- Projects: business brief, milestones, exact deliverables, prerequisite lesson IDs and question IDs, current milestone, persistent code state, retry-safe assessment.
- Tools: dataset selector, visible version and limits, real execution semantics, no fake or precomputed "run" outputs, source link/context when appropriate.
- Datasets: business dictionary, provenance, permissions, schemas, relationships, event definition, fixture sizes/versions, where used.

Maintain existing runtime.school navigation conventions (Learn / Practice / Projects / Tools, Continue distinct from browse). Match the already built SQL and Python tracks where it improves consistency, but do not change them without regression tests or clear need. Use responsive editor split panes, keyboard accessibility, mobile functional checks, and stable learner progress.

## UX and educational quality gates

- Each lesson uses the columns and tables its prompt mentions; no surprise dataset joins.
- Questions must only assess what was taught or declare prerequisites.
- Project milestones have meaningful outputs, not arbitrary code fragments.
- Every next step knows which lesson/practice/project/experiment it links to.
- Dataset identity and version are visible consistently; no silent table mutation.
- Bounded previews; truncate very large output intentionally and explain limits.
- Empty inputs, nulls, ties and invalid records documented instead of implicit.
- Authored solution explanations are technically verified; do not require exact code style when behavior equivalent.
