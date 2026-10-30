# Canonical 90-lesson mapping (v4 adoption of v3 lesson IDs)

> Status: planning inventory, not runnable published content. Lesson titles/assignments originate from the supplied v3 workbook; retaining IDs is intentional. Module order is provisional until prerequisite audit.

## M01 — Spark Fundamentals

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L001 | What Is Apache Spark and PySpark? | D11 | Q0001–Q0005 |
| L002 | Driver, Executors, Clusters and Tasks | D15 | Q0006–Q0010 |
| L003 | SparkSession and SparkContext | D11 | Q0011–Q0015 |
| L004 | Transformations, Actions and Lazy Evaluation | D01 | Q0016–Q0020 |
| L005 | RDDs vs DataFrames | D15 | Q0021–Q0025 |
| L006 | Spark Execution Lifecycle | D07 | Q0026–Q0030 |

## M02 — DataFrame Foundations

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L007 | Creating DataFrames | D03 | Q0031–Q0035 |
| L008 | Exploring DataFrames and Schemas | D01 | Q0036–Q0040 |
| L009 | Selecting and Aliasing Columns | D11 | Q0041–Q0045 |
| L010 | Filtering with Conditions | D01 | Q0046–Q0050 |
| L011 | Sorting, Distinct and Limits | D05 | Q0051–Q0055 |
| L012 | Adding, Renaming and Dropping Columns | D03 | Q0056–Q0060 |

## M03 — Data Types and Expressions

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L013 | Spark Data Types and StructType | D04 | Q0061–Q0065 |
| L014 | Casting and Numeric Precision | D02 | Q0066–Q0070 |
| L015 | String Functions and Regex | D01 | Q0071–Q0075 |
| L016 | Numeric and Mathematical Functions | D07 | Q0076–Q0080 |
| L017 | Conditional Expressions | D02 | Q0081–Q0085 |
| L018 | Dates, Timestamps and Time Zones | D13 | Q0086–Q0090 |

## M04 — Data Cleaning and Quality

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L019 | Null, NaN and Missing Values | D13 | Q0091–Q0095 |
| L020 | Exact and Key-Based Deduplication | D01 | Q0096–Q0100 |
| L021 | Standardization and Normalization | D03 | Q0101–Q0105 |
| L022 | Detecting Invalid Records | D02 | Q0106–Q0110 |
| L023 | Data Quality Rules and Contracts | D04 | Q0111–Q0115 |
| L024 | Quarantine and Reconciliation | D08 | Q0116–Q0120 |

## M05 — Joins and Set Operations

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L025 | Inner and Outer Joins | D01 | Q0121–Q0125 |
| L026 | Left Semi and Left Anti Joins | D02 | Q0126–Q0130 |
| L027 | Self Joins and Cross Joins | D03 | Q0131–Q0135 |
| L028 | Composite and Conditional Joins | D08 | Q0136–Q0140 |
| L029 | Union, Intersect and Except | D14 | Q0141–Q0145 |
| L030 | Join Cardinality and Duplicate Rows | D01 | Q0146–Q0150 |

## M06 — Aggregations and Windows

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L031 | GroupBy and Aggregate Functions | D01 | Q0151–Q0155 |
| L032 | Conditional Aggregations and Pivot | D12 | Q0156–Q0160 |
| L033 | Ranking Window Functions | D03 | Q0161–Q0165 |
| L034 | Lag, Lead and Change Analysis | D10 | Q0166–Q0170 |
| L035 | Running Totals and Moving Windows | D02 | Q0171–Q0175 |
| L036 | Session and Consecutive-Event Analysis | D05 | Q0176–Q0180 |

## M07 — Complex and Nested Data

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L037 | Reading and Parsing Nested JSON | D06 | Q0181–Q0185 |
| L038 | Structs and Nested Fields | D04 | Q0186–Q0190 |
| L039 | Arrays and Explode | D01 | Q0191–Q0195 |
| L040 | Maps and Dynamic Attributes | D15 | Q0196–Q0200 |
| L041 | Higher-Order Array Functions | D06 | Q0201–Q0205 |
| L042 | Flattening Complex Event Payloads | D09 | Q0206–Q0210 |

## M08 — Ingestion and Storage

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L043 | CSV Ingestion and Read Options | D03 | Q0211–Q0215 |
| L044 | JSON, JSONL and Malformed Records | D15 | Q0216–Q0220 |
| L045 | Parquet and ORC | D07 | Q0221–Q0225 |
| L046 | XML, Avro and Schema Handling | D14 | Q0226–Q0230 |
| L047 | Partitioned Files and Write Modes | D13 | Q0231–Q0235 |
| L048 | JDBC and Multi-Source Ingestion | D14 | Q0236–Q0240 |

## M09 — Advanced PySpark APIs

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L049 | RDD Map, Filter and FlatMap | D15 | Q0241–Q0245 |
| L050 | Key-Value RDDs and ReduceByKey | D15 | Q0246–Q0250 |
| L051 | Python UDFs and Built-In Alternatives | D01 | Q0251–Q0255 |
| L052 | Pandas UDFs and Arrow | D10 | Q0256–Q0260 |
| L053 | mapInPandas and Batch Processing | D09 | Q0261–Q0265 |
| L054 | ML Feature Preparation | D05 | Q0266–Q0270 |

## M10 — Spark Execution and Performance

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L055 | Jobs, Stages, Tasks and DAGs | D07 | Q0271–Q0275 |
| L056 | Explain Plans and Catalyst | D01 | Q0276–Q0280 |
| L057 | Shuffles and Partitioning | D07 | Q0281–Q0285 |
| L058 | Broadcast Joins and AQE | D08 | Q0286–Q0290 |
| L059 | Data Skew and Salting | D15 | Q0291–Q0295 |
| L060 | Cache, Persist and Memory Tradeoffs | D05 | Q0296–Q0300 |

## M11 — Delta Lake

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L061 | Delta Tables and Transaction Logs | D14 | Q0301–Q0305 |
| L062 | ACID Transactions and Time Travel | D02 | Q0306–Q0310 |
| L063 | Delta MERGE and Upserts | D08 | Q0311–Q0315 |
| L064 | Change Data Capture | D14 | Q0316–Q0320 |
| L065 | Schema Evolution and Enforcement | D04 | Q0321–Q0325 |
| L066 | Compaction, Layout and Retention | D07 | Q0326–Q0330 |

## M12 — Structured Streaming

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L067 | Streaming DataFrames and Micro-Batches | D06 | Q0331–Q0335 |
| L068 | Streaming Sources, Sinks and Triggers | D09 | Q0336–Q0340 |
| L069 | Event-Time Windows | D12 | Q0341–Q0345 |
| L070 | Watermarks and Late Events | D09 | Q0346–Q0350 |
| L071 | Stream-Static and Stream-Stream Joins | D06 | Q0351–Q0355 |
| L072 | Checkpoints, State and Recovery | D15 | Q0356–Q0360 |

## M13 — Data Engineering Pipelines

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L073 | Bronze, Silver and Gold Architecture | D04 | Q0361–Q0365 |
| L074 | Incremental Batch Processing | D08 | Q0366–Q0370 |
| L075 | Slowly Changing Dimensions | D14 | Q0371–Q0375 |
| L076 | Data Contracts and Quality Gates | D02 | Q0376–Q0380 |
| L077 | Pipeline Dependencies and Orchestration | D08 | Q0381–Q0385 |
| L078 | Pipeline Unit and Integration Testing | D04 | Q0386–Q0390 |

## M14 — Production and Reliability

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L079 | spark-submit and Deployment Modes | D15 | Q0391–Q0395 |
| L080 | Executor, Driver and Memory Configuration | D07 | Q0396–Q0400 |
| L081 | Logging, Metrics and Spark UI | D15 | Q0401–Q0405 |
| L082 | Failure Handling and Retries | D08 | Q0406–Q0410 |
| L083 | Idempotency and Safe Backfills | D02 | Q0411–Q0415 |
| L084 | Observability and SLA Monitoring | D15 | Q0416–Q0420 |

## M15 — Advanced Engineering and MLlib

| Lesson | Title | Dataset(s) | Question seeds |
|---|---|---|---|
| L085 | Benchmarking and Profiling | D07 | Q0421–Q0425 |
| L086 | File Layout and Small-File Optimization | D14 | Q0426–Q0430 |
| L087 | Stateful Streaming Patterns | D09 | Q0431–Q0435 |
| L088 | MLlib Pipelines and Estimators | D05 | Q0436–Q0440 |
| L089 | Distributed Feature Engineering | D10 | Q0441–Q0445 |
| L090 | Integrating a Production Data Platform | D01+D14 | Q0446–Q0450 |

## Scope and readiness

- 15 modules × 6 lessons = 90 lessons.
- Each lesson has 5 mapped question IDs in the legacy spreadsheet, but **not all question roles should be coding challenges**. Modules about architecture, deployment or performance need interactive traces, explain-plan questions, lab instructions, or quizzes instead.
- Validate prerequisite ordering, including windows/aggregations prerequisites and MLlib topics.
- The latest project list is in `PROJECTS_10_v4.md`, not the old project tab in the original v3 workbook.
