# Progress, skills and preservation

Investigation: 2026-10-20. **Verified** statements describe local source. All migration and mastery architecture below is a **proposal**, not implemented behavior. No user storage was read or modified.

## Existing models

| Store | Source-verified semantics | Preservation concern |
|---|---|---|
| SQL `sql-studio-v1` | `src/lib/learning-state.ts`: version-3 state, lesson attempts/independent solves, assistance exposures, drafts, stage sessions, questions, project state, reviews, review sessions, placement and practice tracks. | Stable numeric lesson IDs and historical keys must survive new subject-qualified identities. |
| Active SQL project evidence | `src/features/rt/projects/evidence.ts` and `ProjectWorkspace.tsx`: project/stage key prefixes, fingerprints, findings, report sections and current-evidence predicates stored through learning drafts. | Exporting only `LearningState.projects` would miss current project evidence in drafts. |
| Python `runtime-python-v2` | `src/lib/python-progress-v2.ts`: registry IDs, exercise drafts, assistance, independent solves, content versions, concept checks, milestone passes, files and playground state. | `normalizePy2` skips old-version lesson and question records entirely, including their drafts. |
| Earlier Python `runtime-python-v1` | `src/lib/python-progress.ts`: `python:<slug>` references, lesson/items, drafts, attempts, concept checks and mastery. | Active v2 store explicitly does not read this store; no automatic identity equivalence should be assumed. |
| Earlier Python projects `runtime-python-projects-v2` | `src/features/py/projects-v2/state.ts`: files, selected file, milestone, interpretation, snapshots, artifacts and completion checks. | This storage belongs to older project implementation; preserve separately pending explicit mapping. |

SQL hydration guards prevent initial empty state overwriting saved state. `guardedStorage` uses `mergeStorageWrite` from `src/lib/storage-merge.ts`; save failure is exposed through `useDraftSaveFailed`. SQL exports and imports via `exportProgress`, `importProgress`, `validateImport`, `migrateLearning`. Python stores also guard writes until hydration and observe storage events, but their write handlers use direct `localStorage.setItem` and catch errors without an equivalent persistent failure status. **Inference:** concurrent-write and quota UX deserve parity review; this audit did not reproduce loss.

For executable coding assessments, Check can earn assessment credit while plain Run cannot; Python stores and Workbench explicitly separate Run and Check. Concept, prediction, rubric and written submissions can earn their own declared evidence without being forced through an executable Check. SQL independent questions are documented as not granting lesson mastery. SQL tracks reference canonical question records, so a solve counts wherever the question appears without duplicating completion.

SQL `isMastered` requires at least two independently solved variants plus concept check/legacy credit; `milestoneDone` has a parallel legacy numeric-project rule. Active SQL stage projects also use their own evidence predicates and should not be reduced to this older rule. Python `isLessonMastered` checks all supplied challenge IDs plus a concept pass, despite a comment mentioning “both.” The implementation can already accept variable challenge counts.

SQL review intervals are `[1, 3, 7, 21]` days in `REVIEW_DAYS`. Review cycle/session identity and early-review recording exist. This is a real reusable scheduling foundation, not evidence that those exact intervals optimize retention for all learners or subjects.

## Proposed conceptual model

Keep separate meanings instead of introducing a single percent-complete field:

- **Viewed:** opened or read; useful for resume, never proof of understanding.
- **Lesson complete:** the configured required learning activities are complete.
- **Independent solve:** a valid check passed in an attempt without recorded hints/reveal.
- **Assisted solve:** a valid check passed after help; useful success, distinct evidence.
- **Current verification:** a pass applies to this code/file snapshot, runtime, fixture and grader version.
- **Historical achievement:** an earlier version was passed; never erased because content changed.
- **Skill evidence:** references to relevant outcomes, including concept scope, activity type, independence and age.
- **Review due:** a scheduling decision based on evidence and review history, not revocation of achievement.

Conceptual records:

```text
ActivityRef { subjectId, kind, stableId, contentVersion }
Attempt { id, activityRef, startedAt, assistanceExposures, checks[] }
CheckEvidence { id, attemptId, runId, codeSnapshotRef, runtimeVersion,
                datasetRefs, gradingVersion, outcome, occurredAt }
Draft { activityIdentity, files, selectedFile, updatedAt, revision }
Achievement { activityRef, evidenceIds, independent, achievedAt }
SkillEvidence { skillId, activityRef, evidenceId, evidenceType }
ReviewState { targetRef, policyVersion, level, dueAt, history }
PathState { pathId, lastActivityRef }  // completion derived from activities
```

These are conceptual boundaries, not a mandate to install an event broker or store every keystroke. Keep bounded attempt/check history and durable achievement summaries locally. Draft storage may move to IndexedDB only when measured file size or write latency warrants it; retain small progress summaries in existing stores during adaptation.

## Assistance, retry and feedback

Record help exposure within an attempt and retain a historical exposure summary. Resetting the editor may begin a fresh attempt, but does not prove the learner has forgotten a revealed solution. Label the claim “passed without help in this attempt,” not scientifically proven independent mastery. Stronger skill evidence comes from a later changed-data or transfer problem without help.

Keep both assisted and independent success when both occurred; a later assisted attempt must not erase an earlier independent achievement. Errors, timeouts, cancellation and runtime unavailability are distinct: only an evaluated incorrect solution is a failed check. Engine boot errors and cancellations do not count as conceptual failure.

Do not require two challenges universally. Preserve existing SQL completion rules for existing content; future lesson policies can name required assessment activity IDs and concept checks. Short introductory lessons can require fewer independent tasks; complex concepts may require multiple distinct contexts. Policy version belongs in achievements so a rule change does not silently invalidate old completion.

## Skills and review

Build a small skill taxonomy from existing SQL topic IDs (`src/content/question-bank/topics.ts`) and Python concept metadata (`src/content/python-v2/concepts.ts`), with subject-qualified IDs. Map activities to skills without merging unrelated similarly named topics. Cross-subject paths can connect a shared idea such as aggregation while retaining SQL grouping and Python grouping as distinct executable skills.

Initially show transparent states: not yet practiced, practiced with help, demonstrated independently, review due. Avoid a pseudo-precise “87% mastery” score without validation. A single familiar answer is weaker evidence than independent transfer across contexts; project evidence can corroborate but should not automatically mark every tagged skill mastered.

Reuse the SQL review scheduling concept behind an adapter. Preserve existing dates and history. Introduce policy versions for future changes, with timezone-safe timestamps and explicit early-review behavior. Review recommendations should be dismissible and coexist with an experienced learner’s direct navigation. Labs generate resume history and artifacts; free exploration alone earns no assessed mastery. A guided lab checkpoint may produce evidence if it has an explicit activity contract.

## Project checkpoints and evidence freshness

Keep draft files and historic milestone passes separately. Active Python milestones store `passedAt`, `assisted`, `checks`; they do not bind each pass to a file hash. Editing a shared module after passing a step must not continue to imply the current project passes every prior requirement.

Follow the existing SQL evidence-fingerprint pattern and older Python project snapshot pattern: show “Passed on an earlier version” when files differ; retain the achievement and artifacts; require cumulative checks against current files before final verified delivery. A written interpretation is learner-authored evidence evaluated against a rubric, not a deterministic correctness score unless an objective check exists.

A checkpoint includes source snapshot, fixture/runtime/grader identity, milestone outcomes and exportable artifacts. Do not persist unbounded result tables inside progress. Keep metadata and bounded previews; larger artifacts need explicit storage policy. Restoring an unfinished activity should recover draft and selected context even when engine output cannot be restored.

## Non-destructive migration contract

1. Inventory all known keys and their versions using explicit store adapters; never infer equivalence from titles or list position.
2. Provide a complete backup/export including raw historical payloads and source schema versions. Existing SQL export is useful but not automatically an export of every Python store.
3. Map stable numeric SQL IDs to qualified aliases; preserve original IDs in provenance. Map old Python content only when reviewed correspondence exists; retain unmapped records in a legacy archive.
4. Separate drafts from version-specific achievements. A newer content version marks old credit historical or reassessment-needed, while the old draft remains recoverable with a compatibility notice.
5. Write a new migration output without deleting old keys. Validate counts, drafts, assistance states, review dates, project findings and independent solves. Repeat migration idempotently.
6. Read through the adapter first; introduce new writes by bounded surface. Maintain a rollback path and clear local-save status. Do not update SQL mastery semantics as a side effect of storage conversion.
7. Do not delete legacy storage until explicit retirement criteria and user export are available.

Future acceptance fixtures must include corrupted/partial JSON, quota failure, pre-hydration writes, two tabs editing separate activities and the same draft, version upgrades, unrecognized IDs, old project evidence, completed reviews and repeated import. Prefer retaining conflicting drafts with a recoverable copy over silently choosing a winner. Use snapshot hashes/revisions for draft conflicts and merge achievement evidence by identity, not merely the latest timestamp.

## Optional synchronization

Accounts, paid plans, leaderboards, certificates and AI tutoring are not prerequisites. Local learning remains available without login. A future synchronization service should accept versioned snapshots/evidence, preserve both sides of draft conflicts, support export/delete and avoid treating client-supplied achievements as tamper-proof certification. Remote authoritative assessment is a separate requirement from convenient cross-device sync.

## Decision record

| Recommendation | Problem / evidence | Alternative and tradeoff | Compatibility / complexity / timing |
|---|---|---|---|
| Shared conceptual progress facade | SQL and active/legacy Python stores differ materially. | Immediate single-store rewrite risks loss; permanently separate product semantics duplicate work. | Read adapters preserve all keys first; medium; next. |
| Preserve history on content changes | `normalizePy2` drops old-version records. | Drop old records is simple; treating old passes as current is misleading. Archive and reassess costs storage/UI explanation. | Preserve drafts and original achievement versions; medium; now requirement before next migration. |
| Snapshot-bound current checks | SQL evidence already uses fingerprints; Python milestone passes lack source binding. | Clear everything on edit destroys useful historical work; keep green state misleads. | Add stale label and final cumulative verification; medium; next. |
| Transparent skills and review | SQL topic IDs, review schedule and assistance already exist. | Numeric mastery model looks precise but lacks calibration. | Keep current SQL history/rules; medium; next. |
| Surface save failures consistently | SQL exposes save failures; Python storage catches silently. | Silent in-memory fallback allows continued work but risks user assuming durability. | Reuse save-state presentation; low-medium; now priority. |
| Optional sync later | Current local persistence supports core learning. | Mandatory accounts add friction and operational cost. | No account migration required for V2; high if added; later. |

Related: [current state](01_CURRENT_STATE_AUDIT.md), [datasets](08_DATASET_ARCHITECTURE.md), [grading](07_GRADING_SYSTEM.md).
