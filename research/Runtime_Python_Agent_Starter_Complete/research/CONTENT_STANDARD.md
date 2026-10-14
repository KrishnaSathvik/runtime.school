# Runtime Python Content Authoring Standard — draft v0.1

## Identity and prerequisites
- Lesson ID never changes after a learner has solved it; titles and slugs may be displayed differently but IDs retain compatible aliases. Existing `python:variables-and-values` is permanent.
- A concept must never require unseen Python features. Before introducing functions, assignment/challenge problems rely on known variables, records and stdout; use clear fixtures for any not-yet-taught machinery.
- Stable canonical question ID in every course link/track/case. Question completion is not duplicate credit and never auto-grants unrelated lesson mastery.

## Lesson fields (author each manually)
`id`, `slug`, `moduleId`, `ordinal`, `title`, `whyItMatters`, `goal`, `prerequisites`, `introducedConcepts`, `teachText`, `runExamples[]`, `walkthroughSteps[]`, `commonMistake{badCode,error,explanation}`, `challenges[2]`, `conceptChecks[]`, `reviewPrompts[]`, `status`, `contentVersion`.

Every example needs tested `code`, real expected `stdout` or exception in the pinned interpreter, and a `resultHash` if fixture dependent. A walkthrough must explain observed state changes. No fake console output, invented costs, or hidden required instructions.

## Guided challenge fields
`id`, `title`, `scenario`, `task`, `requirements`, `starter`, `fixtureRefs[]`, `assessmentKind`, `visibleChecks[]`, `hiddenChecks[]`, `typesAndComparison`, `validReferenceSolution`, `alternativeValidSolutions[]`, `knownWrongSolutions[]`, `hintLevels[]`, `explanationOnFailure`, `creditPolicy`, `prerequisites`.

Before accepting a challenge, run each reference solution and each known wrong solution through the real Pyodide M2 adapter. Deliberately test empty/boundary/invalid/duplicate cases. Reveal full solution only after explicit learner action; assisted pass and independent pass must remain distinct.

## Independent practice fields
Same as guided challenge plus `difficulty`, `tags`, `targetModules[]`, `estimatedMinutes`, `trackIds[]`, `problemVariant`, `conceptDensity`, `learnerReviewStatus`.

Catalog briefs in `practice-bank.json` must be expanded to full prompts and runnable tests before implementation. Never expose them as live questions based only on their current titles.

## Project fields
`id`, `goal`, `businessBrief`, `prerequisites`, `datasetManifest`, `dataDictionary`, `milestones[]`, `referenceSolutions`, `gradePolicies`, `expectedEvidence`, `reportRules`, `exportManifest`, `licenses`, `runtimeRequirements`.

Each milestone has `brief`, `activeChallenge`, `fixtures`, `check`, `optionalFinding`, `completion`, `resume`. Separate required code/test passing from optional written interpretation. Full dataset overview should remain accessible without forcing unnecessary data scrolling.

## Curriculum/editorial review checklist
1. Clarity: beginner can explain the task without opening three panels.
2. Scope: does not demand a concept taught later.
3. Truth: every code output/error verified on the pinned runtime.
4. Correctness: reference implementation passes all designed tests.
5. Robustness: at least three incorrect approaches fail for the intended reasons.
6. Fairness: multiple reasonable solutions pass; exact source-string matching prohibited.
7. Feedback: explains the first actionable issue and is visible after Check.
8. Assistance: hint and full answer do not silently grant independent credit.
9. UX: no duplicate title, hidden core requirements or giant empty editors.
10. Legal: all public-facing prose, images, problem cases, fixture datasets and code owned or properly permissioned; no verbatim PDF republishing.
11. Reliability: no network/credential dependency in default browser exercises.
12. Stability: existing SQL IDs/storage and all prior Python progress preserved.

## Sample expanded specification: independent question

**ID:** `python:bank:py06-01` — Reusable Shipping Calculator.  
**Signature:** `calculate_shipping(weight_kg: float, zone: str) -> float`.  
**Rules:** For nonnegative weight: Zone `local` costs 4.00 + 1.50 per kg; zone `regional` costs 6.00 + 2.00 per kg; zone `national` costs 9.00 + 3.00 per kg. Unknown zone or negative weight raises `ValueError`. Return a numeric cost; compare within 1e-9.  
**Visible cases:** `(0, "local") -> 4.0`, `(2, "regional") -> 10.0`.  
**Other check cases:** weights 0.5, 1, 10; all zones; unknown zone and negative weight.  
**Misconceptions:** always return one sample value; incorrectly multiply base fee; choose wrong zone; round intermediate values.  
**Hint 1:** Separate fixed and weight-dependent charges.  
**Hint 2:** Validate zone and weight before computing the charge.  
**Status:** editorial sample only; actual M2 exception assertions and serialization policies still need implementation verification.

## Sample expanded specification: early variable calculation

**ID:** `python:bank:py01-01` — Order Receipt.  
**Task:** Starting from `unit_price = 6`, `quantity = 4`, and `delivery_fee = 3`, calculate and print `final_total`. The learner must use these variables to form the calculation.  
**Expected:** `27` and `final_total == 27`.  
**Check:** numerical/output correctness plus a narrow structural rule showing the calculation is derived from input variables; valid alternatives and multi-line intermediate computation must pass. Do not compare complete source text.  
**Likely failure:** `final_total = 27` without calculating; missing delivery fee; printing different variable.  
**Status:** sample only; validate structural rule against several equivalent formulations before shipping.

## Sample expanded specification: pandas exercise

**ID:** `python:bank:py11-06` — Customer Order Aggregates.  
**Input:** Fixture DataFrame `orders` with columns `order_id`, `customer_id`, `status`, `amount`.  
**Task:** Only include status `completed`, group by customer, output `customer_id`, `completed_orders`, `revenue`, sorted by `customer_id`. Null amount excludes row from revenue but still counts completed order; null customer ID is excluded explicitly.  
**Cases:** duplicate order IDs policy must be defined (choose whether source retains all rows or deduplicates before authoring).  
**Check:** DataFrame schema, row count, row values, numeric tolerance, deterministic order; tests with empty input, unmatched statuses, nulls.  
**Status:** needs full fixture and tested golden output before shipping.
