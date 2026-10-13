# Task pane clarity — design

**Date:** 2026-10-12  
**Status:** Approved

## Problem

Practice question sections (Your task, Required output, Expected output, Tables and sample data) lack clear visual separation. Schema under each table reads as one wrapped run-on line (`id integer PK name text…`), so column names, types, and keys are hard to scan.

## Decision

**Approach 1 — Structured scan** (approved): strengthen section hierarchy without cards; stack schema as one column per row.

## Design

### Sections (practice task pane)

- Keep existing eyebrow labels and copy.
- Slightly stronger eyebrows in `.task-pane` (readable size/weight).
- More space between blocks; thin top border on each section after the first.
- No new card chrome, pill clusters, or colored decorative badges.

### Required output

- Keep column name chips (`inline-code`).
- Optional short cue under the eyebrow: “Columns to return” only if it stays quiet metadata.

### Schema (practice + lessons)

- One column per line (vertical list, not flex-wrap row).
- Per row: mono **name**, muted **type**, accent **PK** / **FK**, optional `→ references`.
- Same pattern in `QuestionWorkspace` and `TableInspector`.

### Out of scope

- Content/copy rewrites of prompts.
- Changing grading, datasets, or editor theme.
- Heavy mini-schema data tables.

## Success

A new learner can tell where each section starts and read `employees` columns as name / type / key without decoding a single wrapped string.
