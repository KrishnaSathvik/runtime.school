# Current V4 status

Implemented: six prediction exercises, six debugging exercises, five capacity stages, shared progress/history, generated inventories, enhanced live demos and contextual engineering checks. Original lesson/project/track requirements remain intact. Inventory: 264 exercises, 249 practice-ready, 11 datasets (nine retained + two new).

Remaining: physical mobile keyboard and screen-reader checks; Safari/Firefox verification; JSON row entry could later gain a grid alternative. Same-draft conflicts across tabs remain latest-writer; localStorage does not provide transactional cross-device sync. Large source references were reviewed by topic, not certified answer by answer. No cloud, launch, account or deployment work is included.

See [V4 report](v4/V4_IMPLEMENTATION_REPORT.md) for verified results. The following entries document earlier phases and their historical counts.

# Product gaps

_Updated 2026-10-09 after the learner experience pass (`docs/audit/LEARNER_EXPERIENCE_FINAL.md`). SQL Studio is a local product; publishing is out of scope until you decide otherwise._

## P0
None known.

## Done this sprint
Runnable editor scaffold with cursor placement · deterministic error and wrong-output explanations · mobile task bar and keyboard-aware actions · Reveal answer · functional spaced review (levels, due dates, review page and sessions) · placement check · project phases (Warehouse, CRM + ERP) and optional written findings · axe-core accessibility scans (0 violations) · token-based editor theme · completion pop-up no longer opens while typing (Ctrl+Space on request, SQLite dialect, exercise schema).

## Done: practice question bank (2026-10-08)
48 original problems (8 Warm-up · 16 Easy · 16 Medium · 8 Hard) on two new datasets, a four-level difficulty system with a recorded rubric, a 12-family topic taxonomy, classification of all 176 lesson challenges, the Practice hub (browse, filter, search, status, continue) and question workspace, and separate practice progress. Inventory: 224 unique questions (generated). See `docs/question-bank/`.

## Done: Phase B content and grading feedback (2026-10-08)
23 additional questions across optimization, funnels/sessions, advanced engineering, many-to-many relationships, parsing, and an independently reproducible five-stage checkout case study. Inventory is now 247 unique questions and 232 practice-ready. The six tracks retain their prior compositions. Plan feedback distinguishes actual output, index and access checks; engineering supports replay and full database-state validation. See `question-bank/QUESTION_GAPS.md`.

## Done: Learning Experience Completion (2026-10-08)
Audited existing placement, spaced review, editor help and learning links before extending them. Kept the original six-question placement and 1/3/7/21-day schedule; fixed retake draft leakage, review draft reuse, answer-variant drift after completion and missing review plan validation. Added due reasons and exact scheduled times, conservative SQL formatting with independent undo, shortcut help, live SQLite demonstrations for JOIN/GROUP BY/windows, and lesson-to-practice/track/project recommendations. Repeated difficulty brings concept links back into view. Inventory remains nine datasets, 247 questions and six tracks.

## Done: learner experience quality pass

Exact interrupted review restoration, atomic cycle-guarded completion, two-tab saved-progress refresh, practice-aware Home continuation and truthful independent-solve totals, actual track-position resume, previous-query result notice, stable first-tap mobile Run/Check, fresh-database project instructions, and 42 topic-aligned existing concept checks. No questions, datasets, tracks or architecture were added. Evidence and limitations: [UX findings](audit/UX_FINDINGS.md), [final assessment](audit/LEARNER_EXPERIENCE_FINAL.md).

## P2 — future refinements
| Item | Why | Complexity |
| --- | --- | --- |
| Completion ranking | Schema-aware completion and formatting work; rarely-used SQLite keywords could be ranked lower | Low |
| Evaluate new question placement | Review Phase B usage before placing questions in existing tracks or considering a dedicated optimization track | Medium |
| Error explanations for GROUP BY bare columns | SQLite accepts them silently, so the only signal is wrong values; would need deeper query analysis | Medium |

## P2
| Item | Notes |
| --- | --- |
| Saved SQL snippets library | Drafts exist per activity |
| On-brand progress reset dialog | Settings uses `window.confirm`; editor reset uses an inline confirmation |
| Card layout for Compare SQL Syntax on phones | Table now scrolls in a focusable region |
| Show all Database Lab guided lessons | 192 px scroll box |
| Own git repository for SQL Studio | The project sits inside the home-directory repo; nothing has been committed |
| Accounts / sync, AI tutor, more engines | On hold |

## Manual checks still worth doing locally
Real phone (keyboard over editor) and VoiceOver/NVDA. Use [the short manual checklist](audit/MANUAL_DEVICE_CHECKLIST.md). Agent simulation is not a real-user study.
