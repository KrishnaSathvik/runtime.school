# Python content rules

M01 is the benchmark. A later module is ready when a beginner who has finished only the earlier lessons can follow it, and when the checks below pass. Do not copy a pattern from M01 that these rules reject.

The checks catch untaught syntax. They do not catch a confusing explanation. Read every new lesson once as someone who has never programmed.

## One idea

Each lesson has one `focus`. The concepts in `teaches` are the pieces of that idea, not a second topic.

A lesson contains:

- two short programs the learner can run (an error example counts when the lesson is about a mistake)
- one guided try-it
- two challenges the learner solves without help
- a concept check, including one prediction of real output
- three hints and a short review

The third hint names the missing idea. It does not contain a line the learner still has to write. Only Answer shows the finished program.

Do not show a later feature, even as a preview, unless this lesson teaches it and an exercise uses it.

## Practice

Easy questions repeat a concept the lesson just taught, with different words.

Medium questions add one twist.

Hard questions combine concepts the learner has already practised. They do not add a behaviour the lessons never explained.

`input()` is not a formatting trick. It is taught in **PY-L02-01**, after assignment, as `name = input("prompt")` on its own line.

## Prerequisites

Every lesson and question lists the concepts it uses (`requires`) and, for a lesson, the concepts it introduces (`teaches`). The catalog is `src/content/python-v2/concepts.ts`. A question's registry prerequisite is the lesson that unlocks it. Every concept it uses must be introduced by that lesson or an earlier one.

Module numbers are not an unlock. A question in M01 can still depend on a lesson the learner has not reached.

`tests/python-v2-beginner.test.ts` walks authored lessons in order and flags:

- a concept, call, or keyword that appears before its lesson
- `...` (Ellipsis) used as a blank
- a hint that contains the unfinished lines of the answer
- a question whose unlock is earlier than the concepts it declares

When a later module is authored, the same test includes it. Placeholder concepts for modules that are not written yet already point at that module's first lesson, so new code cannot use `if`, `def`, `import`, and the rest early. Replace a placeholder with finer concepts when that module is written.

## What has to stay stable

Lesson and question ids (`PY-L01-01`, `PY-Q01-02`, …) are what saved progress uses. Do not renumber them. Slugs are URLs; keep them unless a redirect is added.

## Before calling a module done

Run the content gate and the beginner simulation. Every example, starter, answer, and prediction must match real Python output, including spaces and blank lines. The starter must fail. The reference answer must pass. Then read the module once as a beginner.
