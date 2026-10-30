# AGENTS.md — runtime.school PySpark Build Agent (canonical handoff v4)

> **Mission:** Implement a real, safe, understandable, interactive PySpark track inside the existing runtime.school platform, preserving the existing SQL and Python tracks. Deliver an integrated Learn → Practice → Projects → Tools experience grounded in **15 reusable dataset domains**, not a disconnected stack of tutorial pages.
>
> **Status:** This archive is an exhaustive **planning handoff** synthesizing the conversation and uploaded references. It does *not* include the live runtime.school source repository, actual dataset downloads or a finished Spark engine. Do not claim content/features exist until you inspect and test the repo.

## 0. Read these files first, in order

1. `instructions/DECISIONS_AND_CONFLICTS.md` — resolved version precedence and limitations.
2. `instructions/LESSONS_90_v4.md` — complete IDs L001–L090, datasets and mapped Q ranges.
3. `instructions/DATASETS_15_v4.md` — 15 domains, 92 planned tables/streams, acquisition/legal and fixture design.
4. `instructions/PROJECTS_10_v4.md` — **latest** 3+4+3 projects P01–P10 (supersedes older workbook project tab).
5. `instructions/QUESTION_AUTHORING_v4.md` — 450 seed IDs and strict question-oracle review gates.
6. `instructions/TOOLS_AND_LEARNER_FLOW_v4.md` — coherent lesson/practice/project/tool UI flows.
7. `instructions/ENGINE_AND_SECURITY_v4.md` — real Spark execution, data isolation, grading and resource policies.
8. `instructions/IMPLEMENTATION_PLAN_AND_GATES.md` — sequence, test gates and release criteria.
9. `instructions/REFERENCE_AUDIT_AND_SOURCES.md` — links, source list, known errors and licensing cautions.
10. Planning CSV/XLSX; source PDFs as *references* (not instructions to follow blindly).

## 1. Scope and product targets

- **15 modules × 6 lessons = 90 guided lessons**.
- **450 mapped question ID slots (Q0001–Q0450)**, target genuine practice breadth. The 450 existing spreadsheet briefs are **NOT written or tested exercises**; author and verify one by one in quality-controlled batches. Conceptual topics should use appropriate trace/plan/concept exercises instead of forced coding.
- **15 reusable datasets D01–D15, 92 proposed table/stream names**, not 92 files already acquired.
- **10 latest projects P01–P10:** Beginner P01 Retail, P02 HR, P03 Education; Intermediate P04 Banking, P05 Movies, P06 Taxi+Weather, P07 Healthcare; Advanced P08 Logistics+ERP CDC, P09 Clickstream+Ads, P10 IoT+Logs.
- **6 shared tools:** Playground, Datasets Explorer, Spark SQL Lab, Query Plans & Performance Lab, Compare Approaches, Pipeline & Streaming Lab.
- **One real, isolated PySpark execution backend** with DataFrame correctness, stateful pipeline and engineering benchmark grading adapters.

Targets are content *scope*, not delivery deadlines, accepted test counts or promises of readiness. No quantity target justifies filler or shallow duplication.

## 2. Fundamental rules

- **Authentic learning, no fake Spark:** Python code must execute on real JVM-backed Apache Spark. Do not simulate PySpark with Pandas, DuckDB, static fixtures, or a custom parser and present it as equivalent.
- **Dataset alignment:** every dataset table and event has a consistent business meaning/schema/version; Learn uses a small understandable slice, Practice uses distinct business problems + edge cases, Projects integrate those exact domain assets and skills, Tools act on the same fixture/version.
- **Teach before testing:** prerequisite graph must ensure concepts and APIs are introduced before they're needed; show linked lessons in practice/projects.
- **Question integrity:** precise question statement, schema, shown data, expected output and authoritative solution all agree; run hidden edge cases in actual Spark; accept correct alternative implementations and preserve duplicates/order semantics.
- **Project authenticity:** milestones produce meaningful artifacts and validation; no "mini project" that is just one prior practice query renamed.
- **Infrastructure security:** isolate untrusted Python from API, grader, host, other learners; no public execution before sandbox threat-model and adversarial testing. Never let learner code read hidden tests or reference solutions.
- **Licenses & provenance:** third-party PDFs/GitHub/tutorial examples guide topic discovery only; write original text/code/problems, do not publish copyrighted assets; don't redistribute restricted Olist/MovieLens/market data without permission.
- **Technical correctness:** version-pin Spark/Delta; distinguish upstream Spark vs Databricks vs Microsoft Fabric-specific capabilities; don't cargo-cult optimization rules from PDFs.
- **Existing platform stability:** inspect repository first, maintain SQL/Python success, no destructive schema changes, no unexpected commits, pushes, deployments or long-running paid infra without explicit authorization.
- **Evidence-first reporting:** always document what was built, precisely what tests actually ran and passed, risks, and what remains planned.

## 3. Canonical IDs and course taxonomy

Read the full 90-row mapping in `LESSONS_90_v4.md` and CSV. Modules are:

M01 Spark Fundamentals; M02 DataFrame Foundations; M03 Data Types & Expressions; M04 Data Cleaning & Quality; M05 Joins & Set Operations; M06 Aggregations & Windows; M07 Complex & Nested Data; M08 Ingestion & Storage; M09 Advanced PySpark APIs; M10 Spark Execution & Performance; M11 Delta Lake; M12 Structured Streaming; M13 Data Engineering Pipelines; M14 Production & Reliability; M15 Advanced Engineering & MLlib.

Do not rename published IDs or use v3 project mappings after this point without explicit versioned migration.

## 4. Dataset registry and sourcing

Datasets:

D01 Retail; D02 Banking; D03 HR; D04 Healthcare; D05 Movies; D06 Clickstream; D07 NYC Taxi; D08 Logistics; D09 IoT; D10 Markets; D11 Education; D12 Ads; D13 Weather; D14 ERP/CRM; D15 Logs.

Preferred sources: Olist (license hold) or own retail synthetic; own ledger generator; Employees dataset CC BY-SA 3.0; Synthea; MovieLens (commercial permission risk) or own movies simulation; event generators; NYC TLC Parquet; supply-chain generator; UCI electric-power sensor readings and derived devices; licensed market API or synthetic; synthetic education/ads; NOAA weather; AdventureWorks + controlled CDC; synthetic logs/traces. All sources require data dictionary, checksums, immutable versions, business rules, legal status and reproducible fixtures. Actual planned table names per domain appear in `DATASETS_15_v4.md`.

## 5. Questions and grading

Use Q0001–Q0450 as stable planned IDs linked to their lesson, module and dataset. Five roles (foundation/business/edge/debug/integration) are a scaffold, not a straitjacket. Validate that an exercise actually suits its concept: intro and cluster concepts may be diagnostic rather than DataFrame-return coding. Never use legacy generated briefs as authoritative problem statements.

Build a private, tested oracle and 6–10+ meaningful hidden fixtures per coding challenge as justified. Require deterministic input/output, exact schema/rows/multiplicity, defined timezone/Decimal behavior, and safe bounded materialization. `Run` tests visible fixtures and shows bounded preview; `Submit` runs hidden fixtures and returns feedback without leaking private answers. Use `pyspark.testing` comparators where appropriate, but verify behavior and tolerances.

## 6. Projects

See `PROJECTS_10_v4.md` for deliverables/prerequisites. Respect **latest** project ID assignment:

- Beginner: P01 Retail Sales Data Explorer (D01); P02 Employee & Payroll Analytics (D03); P03 Learning Platform Activity Analytics (D11).
- Intermediate: P04 Banking Reconciliation (D02); P05 Movie Feature Pipeline (D05); P06 NYC Taxi & Weather Performance (D07+D13); P07 Healthcare Claims Lakehouse (D04).
- Advanced: P08 Logistics CDC & Warehouse History (D08+D14); P09 Real-Time Clickstream & Attribution (D06+D12); P10 IoT Monitoring & Recovery (D09+D15).

D10 Markets has strong independent advanced practice and optional future feature mini-project; it is not forced into an unrelated project simply to use all 15 domains.

## 7. Unified tools and UX

Keep Learn, Practice, Projects and Tools navigable independently; Continue is a separate prominent resume shortcut. Every lesson explains business context, the dataset slice, prerequisites, runnable code and next practice. Every practice shows exact input/output and accepts independent solutions. Every project has a multi-milestone brief, context, recoverable progress and defined artifacts. Every tool uses the shared engine and dataset version, with real metrics/output only. Align with existing SQL/Python editor layout and error feedback quality.

## 8. Execution platform

Implement Next.js frontend → FastAPI execution API → queued job scheduler → strongly isolated short-lived classic PySpark worker → data fixtures + protected grader → structured result. Python 3.11 / Java 17 / Spark 4.0.1 / Delta 4.0.1 is a candidate baseline **subject to tested compatibility**, not a universal latest claim. Start local[2] for basic DataFrame work; add stateful workers for Delta and streaming; use true distributed Spark/Kubernetes later only for verified multi-node labs. Spark Connect cannot cover the RDD/SparkContext syllabus.

No learner code on Vercel or inside the FastAPI web process. Hardened sandboxes must block unauthorized disk/network/process access, cap memory/CPU/time/output, isolate secrets and private tests, support cancellation, cleanup and abuse quotas. Full details in `ENGINE_AND_SECURITY_v4.md`.

## 9. Immediate execution directive for the coding agent

**Do not implement all 450 questions or all 15 datasets at once.** First audit the actual repo, write a minimal integration plan, then build the narrow end-to-end slice:

1. D01 license-safe versioned Retail schema + deterministic lesson/hidden fixtures.
2. Real, securely isolated Spark `solve` job: `Run`, `Submit`, error + timeout + cancellation, `assertDataFrameEqual`-style verification.
3. One guided D01 lesson using two related tables and understandable example rows.
4. One original D01 practice question with 6–10 checked edge cases and exact expected output.
5. One P01 Retail project milestone using the same dataset and skill.
6. Dataset Explorer + Playground/SQL Lab deep links to that same fixture; clarify what other labs are not yet live.
7. Test user flow across desktop/mobile, regression-test SQL/Python, report exact results.

Then a 25-question pilot involving D01, D02, D03, D06. Expand only when each preceding quality gate passes. Check off phase items in `IMPLEMENTATION_PLAN_AND_GATES.md` as evidence accumulates.

## 10. Reporting format

For each increment report **changed files**, **feature/dataset/lesson IDs**, **actual test commands and outcomes**, **unverified claims/deferred capabilities**, **security/legal status**, and **what is ready next**. Never say something is complete because it has a spreadsheet row or a syntactically plausible code example.
