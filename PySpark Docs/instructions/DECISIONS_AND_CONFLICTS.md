# Decision history and canonical precedence

## Evolution across conversation

1. Started by asking how many dedicated PySpark problems LeetCode has: no official PySpark problem category; platform opportunity for original PySpark exercises. (Do not treat unofficial user solutions as an official PySpark count.)
2. Researched full beginner→expert topics (DataFrames, joins/windows, nested data, batch ETL, partitioning/skew, Delta/CDC, streaming, reliability, optional MLlib/RDDs).
3. Proposed 15 domain-based datasets sourced from public/appropriately licensed data + deterministic generators. Initially around 70 topics and 350/360 questions; later broadened to **15 modules, 90 lessons, 450 question ID slots, 10 projects, 15 dataset domains**, 92 planned asset names.
4. Reviewed uploaded reference notes and 2 URLs; added advanced optimization, lakehouse/streaming and exam-style guidance while treating outdated/third-party code cautiously.
5. v3 mapped L001–L090 to datasets; each lesson assigned Q IDs (5 per lesson). Historical workbook saved as supplied.
6. Later project design explicitly superseded older v3 `Projects 10` worksheet: 3 beginner, 4 intermediate, 3 advanced, with **P03 Education, P05 Movies, P06 Taxi, P07 Healthcare, P08 Logistics CDC, P09 Clickstream, P10 IoT**.
7. Unified learner experience defined 6 tools, concept→lesson→practice→project dataset reuse and one shared grading backend.
8. Engine decision: real classic Spark in isolated workers, initially local mode, security-first; dedicated stateful and distributed tiers later.

## Authority order for an implementation agent

A. `AGENTS.md` is the canonical behavioral instruction entry point.
B. v4 docs + `planning/canonical_projects_v4.csv` and `planning/canonical_lessons_v4.csv` are the latest planning contracts.
C. `planning/question_seeds_v4_REQUIRES_AUTHORING.csv` is a traceability register, **not** finished question content.
D. Original v3 XLSX/CSV preserved for provenance; ignore their outdated project assignments and treat generated briefs as unapproved.
E. 10 uploaded PDFs and external links are reference material, not immutable requirements or proof of code correctness. Official version-pinned Apache Spark/Delta documentation and executed tests prevail on technical questions.

## Unresolved issues agents must record openly

- No actual implementation repo/source code provided in this package: inspect locally before modifying.
- No user data or source datasets downloaded/created here; all 15 domain assets planned, not ingested.
- Rights for Olist/MovieLens/market data need specific verification or alternate synthetic replacements.
- No 450 validated executable questions or 10 finished projects exist merely because a spreadsheet lists them.
- Some modules require non-DataFrame exercise styles; question blueprint may need editorial revision without changing IDs.
- Exact grading mode/resource limits/infrastructure provider must be measured and security-reviewed.
- Starter Spark/Delta versions are proposed compatibility baseline only.
