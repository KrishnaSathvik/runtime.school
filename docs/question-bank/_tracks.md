Tracks turn the question bank into guided sequences. A track is only an **ordered list of existing question ids** (`src/content/question-bank/tracks.ts`). It never copies a question's text, grading or progress.

## How tracks work

- **Start / continue.** A track page shows the objective, starting point, skills, progress and the next unsolved question. "Start track" or "Continue" opens it. The hub's *Continue* section also shows the last track and its next question.
- **Context.** A question opened from a track shows "← Track · Question n of N". After a correct check, the next action is **Next in track** (the next unsolved question, wrapping around), or "Track complete" when every question is solved.
- **Shared completion.** Status comes from the canonical records: new practice problems use practice progress, and lesson challenges use lesson progress. Solving a question anywhere marks it solved in the browser and in every track that contains it. Guided solves (hint or revealed solution) show as "Solved with help" and don't complete a track item.
- **No side effects.** Finishing a track never changes lesson mastery (two independent solves plus the concept check), reviews or project milestones. Only the started tracks and their last position are stored, and they survive refresh and export/import.

## Ordering rules (enforced by `tests/tracks.test.ts`)

1. Every id exists and is practice-eligible (the 15 lesson-only challenges are excluded).
2. No question appears twice in a track. Reuse across tracks is supported and shares completion.
3. Difficulty rises at most one level per step (no Warm-up → Hard jumps). An easier consolidation step is allowed when `consolidation[questionId]` explains its teaching purpose.
4. Neighbouring questions never share a reasoning pattern (so no back-to-back near-duplicates).
5. Each track covers at least three topics and matches its stated range and focus.

Question workspaces link to prerequisite lessons whose concept check has not been passed. Links open the Understand stage; browser Back returns to the saved question and track. These are optional learning aids and do not change attempt status.

Prerequisite knowledge is also supported by the ordering: each track's *starting point* states what to know first, and concepts appear before the questions that combine them. For example, Master SQL Joins reaches the three-grain reconciliation only after anti-joins, self joins and two-grain fan-out.
