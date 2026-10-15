# Projects product contract

Locked product contract for the SQL rebuild. The catalog is live under `/sql/projects`.

Work against the **local SQL-rebuild working tree**, not GitHub `main`.

---

## 1. Mode split

| Mode | Learner job |
| --- | --- |
| **Learn** | “Here is how this technique works.” |
| **Practice** | “Can you recognize that this problem needs that technique?” |
| **Project** | “A team has a business problem. Use the data to figure out where it is.” |

Hard rules:

- Projects **do not teach new syntax**.
- Projects **do not name SQL functions** in prompts (`LAG`, `RANK`, etc.).
- Prerequisites are soft capability recommendations, not hard percentage gates.
- Projects exist because there is a good investigation—not because every dataset needs equal representation.

Weather, IoT, and Sports remain Learn/Practice datasets. Optional investigations may come later.

---

## 2. Catalog (locked)

| # | Project | Dataset id | Level | Stages |
| ---: | --- | --- | --- | ---: |
| 1 | Retail Performance Review | `retail` | Beginner | 8 |
| 2 | Airline Reliability Review | `flights` | Beginner | 8 |
| 3 | Urban Mobility Demand | `mobility` | Beginner | 8 |
| 4 | Healthcare Operations | `healthcare` | Intermediate | 9 |
| 5 | Grid Demand & Generation | `energy` | Intermediate | 9 |
| 6 | Engineering Delivery Performance | `developer` | Intermediate | 9 |
| 7 | SaaS Activation & Retention | `saas` | Intermediate | 10 |
| 8 | Payment Reconciliation & Account Integrity | `payments` | Advanced | 10 |
| 9 | Delivery Network Reliability | `logistics` | Advanced | 10 |
| 10 | Build a Trusted Retail Warehouse | `retail` | Advanced | 13 |

Approx. **94 stages** total. Many are Brief / Understand Data / Synthesis / Report rather than SQL checkpoints.

Curriculum placement (soft):

1. After joins & aggregation → Retail Performance  
2–3. After dates / subqueries → Airline, Mobility  
4–6. After windows → Healthcare, Energy, Engineering  
7. After advanced analysis → SaaS  
8–9. After advanced analytics / engineering → Payments, Logistics  
10. After warehouse / DDL lessons → Trusted Retail Warehouse  

---

## 3. Learner flow

```text
PROJECT LIBRARY
  → Brief
  → Understand data
  → Investigate (checkpoint / exploration / build)
  → Synthesize findings
  → Final report (export Markdown)
```

Same shell for Beginner, Intermediate, and Advanced. Difficulty changes scaffolding and stage mix—not layout.

---

## 4. UX shell

### Library

Clean list by level. Each row: title, one-line brief, difficulty, dataset, progress if started. No skill dumps, badge walls, or huge illustrations.

### Landing / Brief

Who / situation / ask / data / deliverable. Dataset name (learner-facing). Recommended preparation. Start CTA. Stage list as investigation topics—not “Question 1…N”.

### Understand Data

Composed at runtime later from:

```text
canonical dataset metadata
  + project.relevantTables
  + project-specific data notes
```

Do **not** hand-author full column dictionaries into the project manifest. Schema and project docs must not drift.

### Investigation stage (single column)

```text
Stage title
Business question
Optional context notes
[ Data ] [ Evidence ] [ Hints ] [ Notes ]   ← temporary drawers
SQL editor
Run / Check (when checkpoint)
Results
Finding prompt
Save & continue
```

No permanent three-column IDE.

### Report

Sections from `reportTemplate`. Learner writes summary / recommendation / limitations. Findings attach saved evidence. Export Markdown first; PDF later.

### Mobile

Same vertical stack. Drawers become full-screen sheets.

---

## 5. Stage types

| Type | Role |
| --- | --- |
| `orientation` | Brief or Understand Data |
| `checkpoint` | Required analytical result; semantic validation |
| `exploration` | Open investigation; save evidence + finding |
| `build` | Engineering artifact (DDL/DML/load/reconcile) |
| `synthesis` | Select findings; write recommendation |
| `report` | Assemble exportable report |

### Stage mix by level

**Beginner** — mostly checkpoints after Brief/Data:

```text
orientation → orientation → checkpoint × N → synthesis → report
```

**Intermediate** — checkpoints + exploration:

```text
orientation → orientation → checkpoint / exploration mix → synthesis → report
```

**Advanced** — exploration + build heavy:

```text
orientation → orientation → exploration / checkpoint / build mix → synthesis → report
```

Trusted Retail Warehouse uses several `build` stages.

---

## 6. Validation (typed union)

Compile-time shape lives in `src/content/projects/types.ts`.

```ts
| { kind: "none" }
| {
    kind: "checkpoint";
    expectedColumns: string[];
    grain: string;
    ordered: boolean;
    referenceId: string;   // hidden; never learner-visible
    invariants?: string[];
  }
| { kind: "exploration"; minimumEvidence: number }
```

- Validate **result grain / columns / correctness**, not SQL text.
- Multiple valid SQL approaches are allowed when they produce the required evidence.
- Exploration stages do not have a single canonical result.

---

## 7. Stage completion

A green SQL check does **not** automatically complete a stage.

```ts
completion: {
  requiresValidation: boolean;
  requiresFinding: boolean;
  requiresEvidence: boolean;
}
```

Typical patterns:

| Stage | Validation | Finding | Evidence |
| --- | --- | --- | --- |
| orientation | no | no | no |
| beginner checkpoint | yes | yes | yes |
| advanced exploration | no | yes | yes |
| synthesis / report | no | (report fields) | as required by template |

Project completion by level:

- **Beginner:** required checkpoints + findings + recommendation  
- **Intermediate:** required checkpoints + selected evidence + findings + report  
- **Advanced:** validation requirements + evidence + final artifact + findings/recommendation or engineering handoff  

---

## 8. Evidence contract

Conceptual type (also in `types.ts` for compile-time clarity; persistence wiring is later):

```ts
type ProjectEvidence = {
  id: string;
  projectId: string;
  stageId: string;
  datasetId: string;
  datasetVersion: number;
  sql: string;
  resultColumns: string[];
  resultRows: unknown[][];
  finding: string;
  savedAt: string;
  queryFingerprint: string;
  stale: boolean;
};
```

Learners see the dataset **name** only (e.g. Online Retail). Version is internal so evidence from an older revision can be identified if data changes.

### Evidence becomes stale when

- saved SQL changes,
- the attached result no longer corresponds to the SQL,
- the project switches dataset version,
- a checkpoint is re-run and produces a materially different result.

Changing **only** the written finding does **not** make SQL evidence stale.

---

## 9. Metric semantics

Every graded metric must define denominator and exclusions in the manifest.

Examples:

- **Cancellation rate** = cancelled scheduled flights / scheduled flights  
- **Average delay** = only among flights with known delay; cancellations are **not** zero delay  
- **Net line value** (retail) = `quantity * unit_price_gbp`; not a payment ledger  
- **Activation** (SaaS) = project-specific windowed definition  
- **Unresolved payment** = exact lifecycle definition  

Where definitions live:

- Project-global **Metric definitions** section when shared across stages  
- `scaffolding.metricDefinitions` for Beginner checkpoints  
- `validation.invariants` when the grader must enforce them  

Advanced projects may allow analytical judgment **only where the manifest says so**.

---

## 10. Scaffolding by level

| Level | Learner gets |
| --- | --- |
| Beginner | Ordered stages, relevant tables, metric definitions, expected grain/columns, 2–3 progressive hints |
| Intermediate | Business question, data notes, 1–2 conceptual hints |
| Advanced | Business requirement; few or no procedural hints |

Hints never reveal full SQL on first reveal.

---

## 11. Content schema

Authoritative TypeScript: [`src/content/projects/types.ts`](../../src/content/projects/types.ts).

Human-readable stage content: [`PROJECT_MANIFEST.md`](./PROJECT_MANIFEST.md).

Manifest ↔ types must stay 1:1. Do not invent alternate validation, completion, report, or evidence shapes during implementation.

### Dataset version field

`Project.datasetVersion` and `ProjectEvidence.datasetVersion` are `number` in the project contract.

Canonical `DatasetRef.datasetVersion` today is a string (e.g. `"1.0.0"`). Mapping between catalog string versions and project numeric revision is an implementation concern for a later phase. For this catalog lock, all projects use `datasetVersion: 1` corresponding to current `"1.0.0"` packages.

### Editions

Projects use the same **canonical dataset identity**. Prefer the larger project-sized edition at runtime later. Do not invent a separate “Flights Project Edition” product identity.

---

## 12. Report template

```ts
type ProjectReportSection = {
  id: string;
  title: string;
  prompt: string;
  required: boolean;
  allowEvidence: boolean;
};
```

Typical sections: executive summary, key findings (with evidence), recommendation, method/limitations. Warehouse uses an engineering handoff section instead of a pure commercial recommendation.

---

## 13. Non-goals (product)

- No mandatory Learn gating by course percentage  
- No one-project-per-dataset quota  
- No teaching new SQL syntax inside Projects  
- No PDF export yet (Markdown is the initial export)  

---

## 14. Success criteria

1. This file is the locked product contract.  
2. `PROJECT_MANIFEST.md` specifies all ~94 stages with metrics, validation, and completion.  
3. `src/content/projects/types.ts` matches the manifest 1:1.  
4. The catalog is the only Projects UX under `/sql/projects`.

## 15. Typed catalog + live surface

Content modules:

- [`src/content/projects/beginner.ts`](../../src/content/projects/beginner.ts)
- [`src/content/projects/intermediate.ts`](../../src/content/projects/intermediate.ts)
- [`src/content/projects/advanced.ts`](../../src/content/projects/advanced.ts)
- [`src/content/projects/index.ts`](../../src/content/projects/index.ts) — `projects` export + `LOCKED_STAGE_COUNTS`

Invariant tests: `tests/projects-catalog.test.ts`, `tests/projects-routes.test.ts`, `tests/projects-workspace.test.ts`, `tests/projects-references.test.ts`.

Canonical routes:

- `/sql/projects` → library ([`ProjectLibrary.tsx`](../../src/features/rt/projects/ProjectLibrary.tsx))
- `/sql/projects/<id>` → workspace ([`ProjectWorkspace.tsx`](../../src/features/rt/projects/ProjectWorkspace.tsx))
- `/sql/projects/library` and `/sql/projects/library/<id>` → permanent redirects
- Old guided milestone/report URLs → `/sql/projects` (or mapped catalog id)
- Retired investigation IDs → replacement catalog projects

Also wired: evidence persistence + stale-on-SQL-change; checkpoint grading via hidden `referenceId` SQL; structural column fallback.

Still pending: PDF export; warehouse writable-lab grading (warehouse refs currently grade source-equivalent metrics).
