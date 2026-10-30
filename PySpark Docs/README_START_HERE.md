# runtime.school — PySpark End-to-End Build Handoff (v4)

A self-contained **planning and agent-instruction archive**, created 2026-10-23, synthesizing the PySpark conversation and user-provided sources. This is not the live source repo and does not include full raw external source datasets, downloaded GitHub repositories, or a literal chat transcript.

## Start here

1. Read `instructions/AGENTS.md` fully and follow its ordered links.
2. Inspect existing runtime.school source repo separately; match conventions before editing.
3. Use `planning/canonical_lessons_v4.csv`, `planning/dataset_registry_v4.csv`, `planning/canonical_projects_v4.csv` as canonical planning relationships.
4. Treat `planning/question_seeds_v4_REQUIRES_AUTHORING.csv` as **unwritten**, `not_executed` question prompts. The original `runtime_pyspark_master_mapping_v3.xlsx` and `runtime_pyspark_question_mapping_v3.csv` are archived, not authoritative where v4 differs.
5. Use `references/uploaded_pdfs/` and `references/WEB_LINKS.md` as educational resources, not code to paste into production.

## What is contained

- Ten original uploaded reference PDFs, bytes preserved unchanged.
- Original v3 Excel workbook and 450-row CSV.
- Canonical v4 mapping CSVs for all 90 lessons, all 450 draft question IDs, all 15 datasets and ten latest projects.
- Agent instructions covering topics, progression, content creation, source acquisition/licensing, tools/UI, runtime isolation/security, grading, projects, QA, and phased build milestones.
- `MANIFEST.json` with SHA-256 hashes of packaged files for audit.

## Product scope

15 modules · 90 planned lessons · 450 planned question slots · 10 planned projects · 15 dataset domains · 92 planned tables/streams · 6 integrated tools · one isolated real PySpark runtime.

No claim is made that these planned assets are already implemented. Source datasets and an actual Spark grader must be built/validated in the project repository.
