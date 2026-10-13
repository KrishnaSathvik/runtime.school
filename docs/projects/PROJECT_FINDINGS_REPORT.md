# Projects: business findings and downloadable reports

Branch: `implement-learning-sequence` (local).  
Learn, Practice, and Case Studies frozen. No sixth project, no storage migration, no push or deployment.

## Summary

Projects now treat the existing three-step milestone flow as an investigation that ends in an optional written finding, then a **Draft** or **Complete** downloadable report (Markdown + PDF) built only from checked SQL evidence and the learner’s own notes.

| Check | Result |
| --- | --- |
| Unit | **1046 / 1046** |
| Acceptance | **54 / 54** |
| Shortcuts | **3 / 3** |
| Layout | **756** measurements, **0** failures |
| Sweep | **400** screens, **0** issues |
| Accessibility | **140** axe scans, **0** violations |
| Learner | **34 / 34** |
| Learning | **5 / 5** |
| V4 | **23 / 23** |
| Language | **10 / 10** |
| V5 | **12 / 12** |
| Workspace UX | **4 / 4** |

Screenshots: `docs/projects/screens/`.  
Sample downloads: `docs/projects/examples/`.  
Logs: `docs/acceptance/logs/project-exp-*.log`.

## Original limitations

| Issue | Before |
| --- | --- |
| Findings | Thin “optional notes” with little guidance |
| Evidence | Last check overwrote prior verified results; only 20 rows stored; failed checks could erase success |
| Download | Disabled with weak explanation; Markdown only; no Draft vs Complete labeling |
| Report honesty | Helper text overstated what was exported; no incomplete checklist |
| Product feel | Easy to confuse with “lesson + text box” rather than a business deliverable |

## Updated project flow

```
Projects list
  → Project detail (problem, deliverables, skills, data, milestones, report readiness)
  → Milestone (existing 3 steps)
       1 Understand the task and data
       2 Write and check SQL  (+ What did you find? + evidence)
       3 Finish and continue  (concept check; findings still optional)
  → Next milestone or Project report download
```

No new tabs, no report-writing wizard. Findings remain on the existing finish path.

## How written findings work

- Prompt: **What did you find? (optional)**
- One textarea; guidance covers results, evidence, and business relevance without three required forms
- Autosave via existing `setMilestoneNotes` (`notes`, 20 000 char cap)
- **Do not** affect SQL credit, mastery, or `milestoneDone`
- Learner must write their own text — nothing is generated from expected SQL
- Passing Check answer does **not** mark the finding as factually verified (stated in UI and report)

Verified Check answer SQL and saved result samples appear beside the finding so the learner can cite real evidence.

## Report structure and formats

### Markdown (primary portable format)

Built by `projectReport()` in `src/features/projects/deliverables.ts`:

1. Project title, Draft/Complete label, objective  
2. Dataset and completion counters (SQL milestones, findings, verified checks)  
3. Honesty note on findings vs SQL checks  
4. Incomplete checklist when Draft  
5. Per milestone: status, findings, each challenge’s verified SQL + result table (or explicit gaps)

### PDF (printable companion)

`projectReportPdf()` emits a client-side text PDF (`%PDF-1.4`, Courier). No server document service. Non-ASCII characters are replaced with `?` — prefer Markdown for full fidelity.

### Filenames

`{project-slug}-{draft|complete}-report.{md|pdf}`

Buttons:

- **Download project summary** → Markdown (kept for existing tests and muscle memory)  
- **Download Draft/Complete report PDF** → PDF  

Disabled download always shows why (empty work vs remaining complete-report gaps).

## Draft / final readiness policy

| Kind | Rule |
| --- | --- |
| **Empty** | No saved queries, verified results, or findings → download disabled with explanation |
| **Draft** | Any project work exists, but not every milestone is `milestoneDone` **with** a non-empty finding |
| **Complete** | Every milestone is `milestoneDone` **and** has a non-empty finding |

`milestoneDone` is unchanged: both challenges solved without hints + concept check (or legacy). Learners may advance without writing findings; that only blocks **Complete** labeling.

## Evidence provenance

**Choice: persist verified Check evidence; do not silently replace it.**

On successful Check answer, store `{ ok, guided, sql, columns, values, time, rowCount, truncated? }`.  
On a later failed check, keep the prior verified result; update `queries[v]` as the last attempted draft. Reports prefer verified `sql` and call out draft drift.

| Rule | Behavior |
| --- | --- |
| Run query vs Check answer | Only Check answer creates verified evidence |
| Row storage | Up to **100** rows; `truncated` + `rowCount` when larger (was silent 20) |
| Old backups | Results without `sql` still export using saved `queries` + tables |
| Re-execution at download | Not used — avoids async worker dependence; evidence is what was checked |

Limitations: truncated large results are labeled, not silently presented as complete; PDF is Latin-1–safe text only.

## Storage compatibility

No migration. Additive fields on existing `results[v]` objects (`sql`, `truncated`, `rowCount`). Notes, drafts, graders, project IDs, milestone lesson IDs, Learn/Practice/Case progress unchanged. Older backups import as before.

## Actual downloadable examples

| File | What it shows |
| --- | --- |
| `examples/video-product-analytics-draft-report.md` | Fresh learner: 1 verified check + finding → Draft |
| `examples/video-product-analytics-draft-report.pdf` | Same content as PDF (`%PDF-1.4`) |
| `examples/project-0-export.md` … `project-4-export.md` | Learner-suite exports for all five projects (2 milestones each, Draft) |

## Screenshots

| File | View |
| --- | --- |
| `01-projects-index-dark-1440.png` | Projects list |
| `02-video-overview-empty-dark-1440.png` | Empty report + disabled download explained |
| `03-video-milestone-findings-dark-1440.png` | Findings editor in milestone |
| `04-video-checked-with-finding-dark-1440.png` | Evidence after Check answer |
| `05-video-draft-report-ready-dark-1440.png` | Draft report section |
| `06-video-overview-light-1440.png` | Light theme |
| `07-crm-overview-light-1440.png` | CRM + ERP overview |
| `08-video-overview-mobile-390.png` | Mobile |

## Changed / added tests

| Test | Why |
| --- | --- |
| `tests/project-findings.test.ts` (new) | Empty/draft/complete readiness; stale-evidence preservation; truncation; MD+PDF for all five projects |
| `tests/projects.test.ts` | Report counters / Draft label |
| Acceptance / learner / v5 / language | Findings label `What did you find?`; report heading; milestone counter wording |

Grading and mastery assertions were not relaxed.

## Source files (this phase)

| Path | Role |
| --- | --- |
| `src/features/projects/deliverables.ts` | Readiness, MD, PDF, persistence helpers |
| `src/features/projects/FindingEditor.tsx` | Finding UX + evidence |
| `src/app/projects/[projectId]/page.tsx` | Overview + report downloads |
| `src/app/projects/page.tsx` | List copy |
| `src/features/lesson/LessonWorkspace.tsx` | Wire FindingEditor into steps 2–3 |
| `src/lib/learning-state.ts` | Verified-result write rules |
| `tests/project-findings.test.ts` | Dedicated coverage |

## Remaining limitations

- Complete reports for all 30 milestones still require the learner to finish every milestone and write each finding (by design).
- PDF is a simple text companion; rich Unicode and complex tables belong in Markdown.
- Result previews in the finding panel show the first 8 rows; the report uses up to 100 stored rows with truncation labels.
- A beginner-friendly sixth project is out of scope for this pass.
- End-to-end product review (Learn → Practice → Case Studies → Projects → Progress/Tools) is the recommended next step, not another large feature sprint.

## Success check

A learner can check real SQL, write their own evidence-backed finding without a forced extra course stage, download a clearly labeled **Draft** report as soon as work exists, and earn a **Complete** report only when every milestone’s SQL and findings are present — without fabricated metrics or unverified SQL presented as checked.
