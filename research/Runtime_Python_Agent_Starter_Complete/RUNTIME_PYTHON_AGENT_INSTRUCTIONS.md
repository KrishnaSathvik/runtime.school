# Runtime Python — Coding agent kickoff instructions

## Mission
Build Runtime's original Python curriculum using the attached 19 PDF references and the research planning pack. Treat this as curriculum authoring + validation first, not a bulk feature implementation. The PDFs are references, not permission to reproduce copyrighted prose, exercises, solutions, diagrams, or entire projects.

## Read first
1. `research/README.md`, `research/RESEARCH_REPORT.md`, `research/uploaded-source-audit.md`.
2. `research/external-source-index.md` for official docs, GitHub, Google, Harvard, Helsinki, Kaggle and LinkedIn Learning URLs and what each source contributes.
3. `research/CONTENT_STANDARD.md` and `research/IMPLEMENTATION_ORDER.md`.
4. `research/curriculum.json`, `research/practice-bank.json`, `research/projects.json`, and `research/practice-tracks-and-cases.json`.
5. Inspect the **actual local Runtime repository**, current Python pilot branches/worktrees, schemas, routes, grading contracts, tests and feature gates. Never assume the research JSON is an implementation-ready schema.

## Non-negotiable boundaries
- Preserve the existing M1–M4 Python pilot, particularly `python:variables-and-values`, progress `runtime-python-v1`, and current draft/assisted/independent mastery semantics.
- Preserve SQL routes, content, grading, progress (`sql-studio-v1`), and production behavior.
- Do not merge or overwrite concurrent edits in the original working tree. Inspect git status and worktrees; use an isolated branch/worktree. Ask before resolving ambiguous conflicts.
- Keep Python's production execution gate off until isolated-origin security and release acceptance are completed. No deploy, push or production enablement.
- Do not run the full regression suite unless explicitly requested. Run targeted tests for changed content and one focused browser journey.
- Browser worker currently ships only core Pyodide. NumPy/pandas lessons require separate package feasibility, performance, loading, isolation and browser support validation; mark blocked content as planned.
- `input()` has no interactive stdin; prefer deterministic functions, parameters, or fixed fixture data.
- All teaching copy, prompts, hints, solutions, feedback and project datasets must be original. Cite external conceptual sources internally and verify against official modern APIs.

## Phase A — Source and curriculum review (no product changes)
- Inventory all 19 PDFs and note duplicate copies (17 unique byte sequences).
- Cross-check proposed lesson order and prerequisites with official Python documentation and beginner curricula.
- Audit the 80 lesson outlines, 120 practice briefs, six projects, six tracks and two cases for difficulty, duplicates, dependencies, testability and actual runtime support.
- Flag inaccurate/outdated material (e.g., pandas `.ix`, DataFrame `.append`, old deep-learning stacks).
- Produce a concise decision log with any recommended changes; do not silently rewrite the course plan.

## Phase B — Fully author Module 1 only
- Preserve the existing Variables and Values lesson; review its quality and adapt only with explicit compatibility justification.
- Author the remaining Foundations lessons to the `CONTENT_STANDARD.md` contract: explanation, concept example, visible runnable output, misconception, two guided challenges, hints, reference solutions, concept check, grading fixtures and beginner-friendly feedback.
- Write independent practice questions as new identities separate from Learn challenge identities.
- For each graded exercise, specify allowed answer forms, expected values/output, edge cases, hidden tests, type rules, timeouts and assistance behavior. Prefer behavioral tests; narrowly scoped AST requirements only where a teaching objective genuinely needs them.
- Use deterministic local fixture data; no remote API keys, filesystem assumptions or fake datasets presented as real.

## Phase C — Validation and integration
- Validate every example, walkthrough, solution and expected output against the pinned Python runtime, including wrong answers, errors and recovery.
- Verify progress survives reload, and SQL storage remains unchanged.
- Check desktop, mobile, light/dark, keyboard and accessibility on representative lesson/practice states.
- Report only actually executed tests; include failed tests and limitations.
- Prepare a small reviewable diff; do not import all 80 lessons or 120 questions at once.

## Deliverables
- Module 1 authored content and fixture/test definitions in repository-compatible format.
- A mapping from research IDs to stable Runtime lesson/question IDs.
- A source provenance ledger and any copyright/API modernization warnings.
- Targeted test report, screenshots, known limitations and next-module readiness.
- Stop for human review before implementing Module 2 or changing the public subject availability.

## Reference links
See `research/external-source-index.md`; prioritize:
- https://docs.python.org/3.14/
- https://cs50.harvard.edu/python/weeks/
- https://programming-25.mooc.fi/
- https://developers.google.com/edu/python
- https://github.com/exercism/python
- https://github.com/Kaggle/learntools
- https://numpy.org/doc/stable/
- https://pandas.pydata.org/docs/
- https://scikit-learn.org/stable/
