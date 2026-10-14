# Runtime Python: research and content strategy

**Research snapshot:** October 14, 2026  
**Status:** proposed design, NOT implemented course content  
**Inputs:** 19 uploaded PDFs (17 unique PDF byte sequences), official Python/pandas/NumPy/scikit-learn/Pyodide docs, GitHub repos, Harvard, Helsinki, Google, Kaggle, Exercism and public LinkedIn Learning pages.

## Executive decision

Build a **80-lesson, 12-module Python course** plus **120 separate independent practice briefs**, **6 curated practice tracks**, **2 connected business cases**, and **6 practical projects**. These are editorial targets: no completion claim until each task has original copy, fixtures, solutions, runnable tests and learner review. Preserve the completed `python:variables-and-values` pilot and its stored progress identity. Do not create a giant batch of content directly in the production app.

Python should teach programming first and practical data workflows second. ML, DL, RAG, agents and PySpark get independent subjects, with Python serving as their prerequisite. A lightweight future Python/NumPy/pandas stage is not a claim that Runtime offers a complete Jupyter, cloud, ML or distributed computing environment.

## What emerged from the uploaded PDFs

1. **Foundational completeness** is strong: extensive coverage of variables, strings, operators, lists, tuples, sets, dictionaries, loops, functions, OOP, files, error handling, generators and decorators, though overlapping in many sources.
2. **200+ exercise collection** is the best raw idea bank for independent drills, but it is not a tested specification repository. Some example outputs disagree with the code, and some solutions handle invalid inputs poorly. We extracted themes and wrote new scenario/contract briefs rather than copying the source problem set.
3. **Project compilation** is broad but unsuitable for a browser-first curriculum without adaptation: many examples need PyGame, Selenium, audio devices, filesystem privileges, real logins, or external services. Runtime should prioritize deterministic fixtures that let users learn the programming itself.
4. **Data practice**: the 2016 pandas intro is valuable for coverage but obsolete for code. Pooja Pawar's EDA reference and the multi-library cheat sheet supply topic checklists for inspection, missingness, duplicates, GroupBy, joins, and reporting. Use current official docs to author and test the final examples.
5. **Deep learning material** is a separate future subject. The 2017 book includes useful conceptual ML/DL background, but its Theano-era examples must not be represented as modern Python fundamentals or an available browser runtime.
6. **Licenses matter**: PDFs are references, not a source of copy-pasteable educational content. Distinguish the right to read a PDF from the right to republish lessons, solutions, graphics, test data, or entire pages. Use original Runtime scenarios and authored examples, or explicitly review licenses and attribution requirements when reusing material.

See `uploaded-source-audit.md` for all 19 files and concrete warnings.

## Outside resources and lessons learned

- **Harvard CS50P**: coherent concept dependency chain, including exception handling and tests early rather than treating them as obscure advanced material.
- **Helsinki MOOC**: very high practice density and sequential introductory/advanced parts. Borrow the pedagogical principle of progressive practice, not its copyrighted exercises.
- **Google Python Class**: good compact string/list and word-count exercise flow, but explicitly aimed at people with some programming background. Runtime must be more beginner-friendly in the first module.
- **Exercism**: separating concept exercises from independent practice is particularly relevant to the existing Runtime Learn/Practice boundary. Exercism's repo uses a concept prerequisite graph and an explicit introduction/instructions/hints/test structure.
- **Kaggle Learn**: the short Python course is a useful data-science onramp, not enough to make an absolute beginner strong at programming.
- **LinkedIn Learning**: public beginner and advanced learning paths show audience demand for both practical fundamentals and professional tasks, but LinkedIn's published path catalogs change; no direct LinkedIn private/member data was consulted.
- **Kaggle learntools**: explicit check/hint/solution separation, useful inspiration for Runtime feedback. Avoid coupling Runtime to Kaggle notebooks or test-runner machinery.
- **Python Data Science Handbook**: high-quality topical coverage of NumPy/pandas/plotting/ML; its repo explicitly distinguishes MIT-licensed code from CC BY-NC-ND text, and the original notebooks were tested with Python 3.5.
- **Current package documentation**: always anchor pandas lessons to the current guide, NumPy view/copy rules to current docs, and ML pipeline material to current scikit-learn when those modules are genuinely available.

See `external-source-index.md` for 22 links and each source's role.

## Curriculum architecture and acceptance

The 12 modules are strictly ordered by prerequisites. Each lesson gets one unique stable subject-aware ID, and every guided challenge gets its own stable ID (e.g., `python:lesson:variables-and-values:challenge-1`). An independent problem has a single canonical ID even when it appears in many tracks.

**One guided lesson** must include: (a) clear learner outcome and prerequisites; (b) original prose; (c) executable example and real console output; (d) a four-step walkthrough where useful; (e) a common trap and actual failure; (f) TWO distinct graded challenges appropriate to already-taught concepts; (g) concept checks; (h) assist/hint handling; (i) explicit solution and checking metadata; and (j) completion/continuation. Avoid leading users from variable assignments into untaught functions.

**One independent practice question** needs: unique title and clear problem statement, function signature OR expected program variables/stdout, input constraints, visible examples, nontrivial edge cases, accepted result representation, grader comparison policy, validation tests (including hidden variants), helpful feedback/hints and a validated reference implementation. A title and brief alone is *not* a ready-to-ship question.

**One project** must have: business problem, skills, dataset sources with immutable versions, data dictionary, meaningful milestone dependencies, evidence from checked Python, a reproducible run and genuine export artifacts. Never fabricate a project insight or treat a draft function as passed. Project findings should be learner-authored when conclusions aren't directly testable.

**Question format targets (guidance, not quota):** Write Code ~65%; Debug Code ~20%; Predict Output ~15%. Problems should vary by outcome and level of abstraction, not only by names/numbers. Prefer a few more meaningful cases and robust feedback over a high count of look-alike problems.

## One critical grading rule

For function-based problems, include several representative and boundary input cases; output from a single fixed example is not enough. For beginner assignment problems, if the objective is *use variables to calculate total*, a narrow structural condition may be appropriate in addition to variable/output checking, provided it accepts legitimate equivalent code and the requirement is explained. Do not grade entire source code by string matching.

Client-side hidden tests and local progress are educational feedback, not secure professional certification. A browser runner is not a secure execution sandbox. Preserve the current production gate and implement an isolated execution origin before making unrestricted public Python execution possible.

## Pyodide/runtime constraints

The pilot currently uses pinned Pyodide 314.0.7 and ships only the core interpreter. **NumPy and pandas are not available just because they appear on Pyodide's package-support list.** They must be separately version-pinned, hosted or loaded through an approved package mechanism, tested for memory/performance/cold-start, and wired to fixture-loading/serializer/grader adapters. Introduce them only at PY10/PY11. Python `input()` is not interactive in the current runtime; any old exercise using `input()` must be redesigned with explicit function parameters or preloaded fixtures.

The 5-second execution limit currently begins after load. Larger data-EDA tasks might need a bounded dedicated policy AFTER they are benchmarked; don't silently raise timeouts or sacrifice new-interpreter isolation. Large datasets, arbitrary internet APIs, file uploads, real credentials, GPU training, and distributed Spark belong to explicit later runtime plans, not the default Python course.

## Prioritized publishing sequence

**P0 — Preserve and harden pilot:** Review the Variables and Values lesson, immediate Check feedback, false-positive hardcoded total, source origin isolation gate, mobile keyboard. Preserve existing M1–M4 commits and don't merge overlapping SQL/Python workspace edits blindly.

**P1 — Genuine beginner path:** Author and test lessons PY01 through PY03 with exercises. Publish only after original prose, two graded challenges, concept checks, targeted Pyodide runs, and browser review.

**P2 — Python programming complete enough for practical work:** Add PY04–PY08; ship independent practice by module, introduce project 1 then projects 2–4 when their prerequisites are met. Offer meaningful connected cases.

**P3 — Professional Python:** Add PY09 and selected pattern work. Introduce advanced interview tracks from existing mastered concepts (without doubling solve credit).

**P4 — Data specialization:** Implement validated NumPy/pandas package loading, then PY10 and PY11 with small reusable datasets. Finish project 5. Do not start ML course implementation merely because pandas works.

**P5 — Data pipeline outcomes:** PY12, project 6, data-engineering track, then a proper subject release quality review.

## Known gaps that require an engineering task, not just writing

- Multi-file learner code (for `.py` modules and projects) and project artifact exports are not part of the pilot.
- CSV/JSON fixture mounting per new interpreter needs its own contract; fixtures must be deterministic and immune to prior-run mutations.
- NumPy/pandas availability requires packaging and execution changes; not supported by the current core-only production bundle.
- Pinned runtime platform: isolate executor in different origin before public access.
- Current Python code drafts and mastery are local; subject-aware backup/import and multi-device sync require their own integration decisions. The Python M4 pilot has per-subject local progress, not a full shared cloud account.
- Human quality review remains necessary for explanations, common mistakes, test feedback, keyboard experience and accessibility.

## What's in this pack

`curriculum.json` - proposed 12 modules and 80 lesson shells; the first lesson marked implemented-pilot.  
`practice-bank.json` - 120 original independent task *briefs* with topic, contract and edge cases (not shipped solutions/tests).  
`practice-tracks-and-cases.json` - six track curation definitions and two original business cases.  
`projects.json` - six multi-milestone, dataset-driven projects.  
`uploaded-source-audit.md` / `.json` - all 19 uploaded PDFs including duplication and reliability warnings.  
`external-source-index.md` / `.json` - verified public source links, relevance and licensing notes.  
`CONTENT_STANDARD.md` - exact authoring fields and acceptance criteria.  
`IMPLEMENTATION_ORDER.md` - staged content rollout without changing the SQL experience.
