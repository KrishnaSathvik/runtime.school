# Reference review and applied improvements

2026-10-14. Sources supplied by the user: an analysis of Data with Baraa's beginner Python video,
a reposted personal account of building 50 projects, screenshots of roadmap.sh's intermediate and
advanced project catalog, and https://github.com/topics/python.

The video analysis was reviewed as supplied text, not as a claim that every frame or transcript was
independently watched. The repost's hiring and career claims are personal anecdotes, not evidence
that completing a particular number of projects makes someone job-ready.

## What changed

| Reference insight | Existing coverage or gap | Applied improvement |
|---|---|---|
| A visible progression from basic values to reusable programs | The course already follows this order, but its home page was a long lesson list | A short learn → practice → build routine, with a direct module-filtered practice link beneath every module |
| Learners need time to apply what they study | Projects had milestone counts but little planning guidance | Explicit estimates in short work sessions; reminders that drafts survive stopping after a milestone |
| Difficulty filters help people choose a project | All six projects were listed together | Beginner/intermediate/advanced, skill, and text filters with a clear empty state and reset |
| Explain what a project produces | Outputs existed, but catalog readers could not see them | Exact output filenames, source and checked-summary expectations in the catalog and project overview |
| Guidance matters more than a long idea list | Preparation was implicit | Links to relevant taught lessons and per-lesson mastery status from existing saved progress; projects remain open to learners who prefer to try first |
| Building a portfolio includes explaining decisions | Grading verifies behavior, not the learner's explanation | Project-specific reflection prompts about boundary inputs, reconciliation, uncertainty and tradeoffs; explicitly not automatically graded |
| Open-source examples help continued learning | Browser projects are deliberately bounded | Links to GitHub's Python topic and roadmap.sh, with a concise README/setup/tests/license reading checklist and clear external-resource labeling |

The catalog keeps Runtime's current type, colors and list layout. Difficulty, skills and deliverables
are factual metadata on the six existing runnable projects, not decorative badges or fabricated community
participation counts. Work-session durations are editorial estimates, not observed completion times.

## What was already covered

The supplied video analysis emphasizes several common misconceptions. Existing executable lessons
already cover them:

- `list-slicing-copying-and-sorting`: assignment versus copying; shallow copying; `sort()` mutates and
  returns `None`, while `sorted()` returns a new list.
- `nested-records-and-collections`: nested objects shared by shallow copies, with deep-copy examples.
- `scope-and-mutable-arguments`: mutation versus rebinding.
- `membership-and-none-checks`: membership and checking `None`.
- `dataclasses-and-type-hints`: annotations are not enforced by Python at runtime.
- `csv-rows-and-headers`: real CSV parsing rather than splitting arbitrary CSV on commas.

No duplicate lessons or unverified replacement examples were added. The shipped interpreter remains
Python 3.14; release-version claims in external material do not change its version label.

## Ideas retained for later

Live REST services, authentication, Docker, Celery, network proxies, real-time servers, Selenium desktop
automation and paid AI API integrations need a different execution/setup experience. They are not
represented as available in-browser exercises. The current offline API-shaped data lesson remains
accurately labeled. ML and scikit-learn remain reserved for the future ML subject.

A future expansion could add a small habit/expense tracker, a repository-reading exercise, or a
separately supported backend path. This change improves discovery and guidance for the validated
inventory rather than importing an ungraded catalog of 50 project titles.

## Sources and reuse

- [roadmap.sh Python projects](https://roadmap.sh/python/projects), inspected 2026-10-14: difficulty-based
  project discovery and explicit project categories.
- [GitHub Python topic](https://github.com/topics/python), inspected 2026-10-14: a broad repository-discovery
  page, not a sequenced curriculum or a guarantee that a package runs in Pyodide.
- User-supplied Baraa video analysis: instructional sequence and conceptual-pitfall review.
- User-supplied project-building account: learner motivation, guidance needs and small practical projects.

No source prose, repository code, third-party datasets, or project solutions were copied into lessons.
External links are optional further exploration; no packages or remote integrations were installed.

## Verification

- All 48 focused case/project tests pass in real Pyodide. Every advertised output filename is now
  checked against the actual files produced by its reference solution; all preparation links resolve.
- Application TypeScript and changed-file ESLint checks pass.
- `tests/e2e/python-discovery.mjs` exercises combined filters, reset/empty state, preparation links,
  old lesson-only save compatibility, mastery indicators, and module-filtered practice navigation.
  All four desktop/mobile × light/dark modes passed, with zero axe violations on the catalog and
  preparation views and no catalog horizontal overflow. Eight screenshots and
  [results](screens/discovery/results.json) are in `screens/discovery/`.
- Existing question/project progress identities, SQL routes/storage, and the production Python gate
  are unchanged. No SQL regression suite, push, or deployment is part of this change.
