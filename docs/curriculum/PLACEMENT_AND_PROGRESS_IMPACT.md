# Placement and progress impact

The proposed sequence can be stored without a storage migration. Saved mastery, concept-check results, drafts, attempts, reviews, practice progress, and project milestones are keyed by stable ids. This document says what those keys are, which behaviors read `courseOrder` or `group`, and what an existing learner would see after the correction in [CURRENT_TO_PROPOSED_ORDER.md](CURRENT_TO_PROPOSED_ORDER.md).

Nothing here has been applied.

## Where progress lives

Browser storage is the Zustand persist record `sql-studio-v1`, version 3. The fields that matter:

| Saved field | Key | What a reorder does |
| --- | --- | --- |
| `stats` | lesson id | Unchanged. Mastery, solved challenges, quiz attempts, and error counts stay on that id. |
| `reviews` | lesson id | Unchanged. A due review stays due for the same lesson. |
| `drafts` | `sql-lesson-{lessonId}-{variant}` or `sql-project-{projectId}-{lessonId}-{variant}` | Unchanged. Opening `/lesson/1` still loads the draft for lesson 1. |
| `sessions` | `activity:{project}:{lessonId}` | Unchanged. The workspace restores the same stage and challenge. |
| `attempts` | `lesson:{lessonId}:{variant}` or `project-{n}:{lessonId}:{variant}` | Unchanged. |
| `questions` | practice question id (`qb-…`, and lesson challenges as `lc-{lessonId}-{variant}`) | Unchanged. |
| `projects` | project id, then milestone lesson id | Unchanged. Milestone ids are not renumbered. |
| `placement` | slot index into `PLACEMENT_IDS`, plus `{ ok, time }` | Unchanged only if `PLACEMENT_IDS` stays `[0, 3, 5, 10, 32, 14]`. Reordering that array would reinterpret saved answers. |

Exports and imports use the same shape. An older backup still restores the same lesson ids after the path change. A lesson that has moved in the course still opens at `/lesson/{id}`.

Moving a lesson does not erase mastery and does not grant mastery. `isMastered` reads `stats[id]`. `courseOrder` is not stored in the save.

Derived displays do change, because they are computed:

- “Lesson N of 88” is `courseOrder.indexOf(id) + 1` in `LessonWorkspace`.
- Module “Mastered / In progress / Not started” counts lessons that currently share a `group`.
- The numbers 01, 02 on a module page are the index inside that module’s filtered list, not the lesson id.
- The Practice question browser sorts lesson challenges by `courseOrder.indexOf(sourceLessonId)` (`src/features/practice/browser.ts`). Question identity and solved state stay. Browse order follows the new path.
- Next lesson is the next id in `courseOrder`, not “the next unmastered lesson.”

## Placement

`PLACEMENT_IDS` in `src/lib/learning-state.ts` is `[0, 3, 5, 10, 32, 14]`. Each question is the first challenge of that lesson. Scoring:

- The first missed slot returns `PLACEMENT_IDS[firstMiss]`. That is a stable lesson id.
- All six correct returns `courseOrder[courseOrder.indexOf(14) + 1]`. That is positional. Today the next lesson is 15, LEFT JOIN.

The six questions:

| Slot | Lesson | First challenge, which is what placement grades | Skill it actually checks |
| ---: | ---: | --- | --- |
| 0 | 0 | Name and city of every customer. | SELECT |
| 1 | 3 | Name and city for customers in Chicago. | WHERE |
| 2 | 5 | Tech products priced under 100. | AND |
| 3 | 10 | Category and product count. | GROUP BY |
| 4 | 32 | Success rate by account. | A single-table ratio. The lesson’s second challenge, which needs a left join, is not the placement question. |
| 5 | 14 | Order id and customer name. | INNER JOIN |

`courseContinuation` uses the placement result only when the learner has not started: no lesson session, no attempt, and no mastered lesson. Once any lesson has been touched, Continue ignores placement and resumes the active lesson, the latest unfinished history entry, or a saved session.

### What the proposed order does to the starting lesson

Lesson 15 stays immediately after lesson 14, so the all-pass formula still returns lesson 15. The implementation should still return the constant `15` rather than “whatever follows 14,” so a later edit cannot move the starting lesson by accident. Learners who pass every question have passed the join question. Starting at LEFT JOIN is the same recommendation as today. They will next meet ratios, which they also passed. That one-lesson overlap is the safe reading of a pass.

A miss on slots 0, 1, 2, 3, or 5 still returns lesson 0, 3, 5, 10, or 14. Those ids sit in the same conceptual place in the new path: SELECT, WHERE, AND, GROUP BY, INNER JOIN.

A miss on slot 4 still returns lesson 32 if the function is left as it is. Today that is a reasonable start, because ratios currently appear before joins. After the move, lesson 32 sits after LEFT JOIN. A brand-new learner who fails the ratio question and has not started would be sent to ratios and would skip the join lessons now placed in front of it. They never answered the join question, because a miss stops the check.

The implementation changes that one interpretation and leaves the saved array alone: if the first miss is slot 4 and lesson 14 is not mastered, return 14. Stored `placement.answers[4]` still means “the ratio challenge was missed.” The suggested start becomes INNER JOIN, which is the untested skill now standing before ratios. Learners who already have any lesson attempt never hit this branch.

Do not reorder `PLACEMENT_IDS`. Saved answers are positional.

## Navigation that reads order

| Behavior | Source | After the correction |
| --- | --- | --- |
| Next lesson on the lesson page | next id in `courseOrder` | Follows the new path. After aliases, Next is WHERE (lesson 3) rather than DISTINCT (lesson 2). |
| Continue on a module page | first unmastered lesson in `lessonsInModule` | Follows the new path only because the seven moved lessons also change `group`. Course order alone is not enough. |
| Global recommendation, “next concept” | first unmastered id in `courseOrder` | The same path. Used when there is no active lesson, no due review, and no unfinished attempt that sorts earlier. |
| “Finish a concept you already started” | first id in `courseOrder` that has attempts and is not mastered | Can point at an earlier new-path lesson the learner started later. An active session still wins and resumes the open lesson. |
| Weak-lesson hint | first unmet id in `lesson.prereq` | Follows the arrays. The six array edits in the implementation plan are what keep this hint from pointing forward. |
| Resume / Continue | active lesson, then most recent unfinished history, then saved session | Still the lesson id they were on. Order does not pick this. |
| Placement start | above | All-pass stays lesson 15. A ratio miss with no other progress starts at lesson 14. |
| Project offer | first two milestone lessons mastered, in `recommendation()` | Project 2 still waits for lessons 32 and 49. Moving 32 earlier does not unlock the project. |
| Module “related project” link | first project with any milestone whose lesson `group` equals the module | The AI economics link moves from module 2 to module 3 with lesson 32. The project’s milestone ids stay. |
| Search | `/lesson/{id}` | Unchanged. |
| Practice tracks | curated id lists | Unchanged by this correction. Tracks are not gated on course position today, and this phase does not add a gate. |

## Regression scenarios

These are the cases to run when the sequence is implemented. They are not run in this audit.

**Mastered the first two lessons only.** `stats[0]` and `stats[1]` stay mastered. No session is active. The next unmastered lesson in the new path is lesson 3 (WHERE). Lesson 2 is not unmarked. DISTINCT appears later, still unmastered, inside module 2.

**Mastered the old foundations set (0, 1, 2, 30, 54).** Each of those records stays mastered. Module 0 now contains only lessons 0 and 1, so its card can still read Mastered. Lessons 2 and 30 show as mastered inside module 2. Lesson 54 shows as mastered inside module 3. Nothing is re-awarded, and nothing is cleared. A learner who had module 0 “in progress” at 3 of 5, with only 0 and 1 mastered, sees module 0 become Mastered because those are the only lessons left in it. DISTINCT, MIN/MAX, and keys show their real records in the modules they join.

**Opened DISTINCT, did not finish it.** The session `activity:null:2` remains. Continue resumes lesson 2 if that session is the latest unfinished one. Mastery is unchanged. The module card for module 2 shows In progress because lesson 2 now belongs there.

**Unfinished draft on aliases.** `drafts["sql-lesson-1-0"]` still opens at `/lesson/1`. The Next button after that lesson points at lesson 3.

**Concept check already passed on lesson 30.** `stats[30].check` stays true. The lesson’s new position does not reset the check or the review schedule.

**Due review on a mastered lesson.** `reviews[id].due` is unchanged. The review recommendation still names that lesson id.

**Placement finished, no lesson started, all six correct.** Suggested start remains lesson 15. After the pin to the constant 15, inserting a lesson between 14 and 15 later cannot move this start.

**Placement finished, no lesson started, missed the ratio question.** Saved answers stay in slot order. Suggested start becomes lesson 14, not lesson 32. The learner still has a recorded miss on the ratio challenge.

**Placement finished, then the learner started any lesson.** Placement is ignored. Continue uses the session they already have.

**Project milestone in progress.** A note on milestone 45, or solved challenges on milestone 76, stays under that project id and lesson id. Warehouse and integration milestone order is unchanged.

**Practice question solved.** `questions["lc-2-0"]` or `questions["qb-0002"]` stays solved. The question may sort to a different row in the browser.

**Exported backup from before the change.** Import restores the same stats, drafts, and milestones. The learner does not repeat mastered lessons. Their Next and module Continue buttons follow the new path from the first unmastered lesson.

**Direct URL and an old shared link.** `/lesson/54` still opens the keys lesson. The page’s “Lesson N of 88” shows the new position.

## What would require a migration

A migration would be required if lesson ids were renumbered, if `PLACEMENT_IDS` were reordered, or if drafts were re-keyed by course position. This recommendation does none of those.

Changing `courseOrder`, `lesson.group`, `lesson.prereq`, and the two module labels does not require a migration. The placement-start tweak reads the existing slot-4 answer and returns a different lesson id for learners who have not started. It does not rewrite `placement.answers`.
