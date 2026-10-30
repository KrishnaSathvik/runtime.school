# Sources, notes, caveats and verification

This handoff contains the **original 10 uploaded PDFs unchanged** under `references/uploaded_pdfs/`, plus the original XLSX/CSV under `planning/`. The URL resources are external references: this ZIP contains links, **not downloaded mirrors** of Databricks documentation, third-party GitHub code, or the full private chat transcript.

## Web references provided by the user

- https://docs.databricks.com/aws/en/pyspark/basics — primary modern Databricks beginner API/examples guide; Databricks-only features (`samples.tpch`, `dbutils`, UC volumes) must be adapted if running upstream Apache Spark.
- https://github.com/spark-examples/pyspark-examples — third-party code examples for API inspiration; verify API correctness/version and licensing before reuse; don't bulk-copy challenges or authors' text.

## Key authoritative docs reviewed for implementation

- https://spark.apache.org/docs/4.0.0/api/python/getting_started/install.html — Spark 4.0 environment (Java 17+).
- https://spark.apache.org/docs/latest/spark-connect-overview.html — Spark Connect limitations including RDD/SparkContext.
- https://spark.apache.org/docs/latest/api/python/getting_started/testing_pyspark.html — `assertDataFrameEqual`, `assertSchemaEqual` and testing patterns.
- https://spark.apache.org/docs/latest/running-on-kubernetes.html — future multi-node Spark.
- https://docs.delta.io/releases/ — Spark/Delta version compatibility.
- https://docs.delta.io/latest/delta-update.html — Delta operations and MERGE (verify per current version).
- https://spark.apache.org/docs/latest/streaming/index.html — Structured Streaming semantics.

## PDFs uploaded: descriptive labels (filenames preserved)

1. `file_A90054FA-7A70-4010-AD96-A3EC70A580DC.pdf` — 127-page 100+ Apache Spark notes; interview-style Q&A, DataFrames, joins, RDDs, partitioning; mixed code quality; PDF text.
2. `Learn_Spark_in_30_days_1739396083.pdf` — 32-page 30-day introductory progression (image pages), RDD, DataFrames, SQL, UDF, optimization, MLlib, streaming; useful outline, not accepted engine specification.
3. `file_E848A19D-4966-4E7A-B058-7A311C228C08.pdf` — 8-page "Stop Partitioning Everything" Fabric-specific field note; visual-only; useful optimization scenario, not universal rule.
4. `Pyspark_1739410372.pdf` — 31-page older PySpark/RDD/DataFrame guide; mentions Spark 2.2/Python 2; useful historical ideas but syntax/compatibility are outdated.
5. `file_70241F1A-FA48-4EDD-B42A-35F78260ACD1.pdf` — 8-page "Bronze, Silver, Gold Need Different Optimization" Fabric/Direct Lake field note; platform-specific V-Order suggestions, not generic open-source Spark rules.
6. `Spark_Optimization_1642434779.pdf` — 7-page performance notes (2021): executor sizing, skew, salting, caching, partitioning, memory; treat numerical guidelines as hypotheses to measure.
7. `file_523472DF-F1B8-4B07-B041-A8D9354DA652.pdf` — 6-page migration case study of on-prem ETL to Azure Databricks/Delta lakehouse; inspiration for system-project milestones; not a source of reusable private enterprise data.
8. `file_DE13AAD7-FBB1-4732-932D-4D6B74D47516.pdf` — 73-page PySpark Power Guide; overlaps with 31-page PySpark notes; avoid double-counting repeated material as distinct topic coverage.
9. `How_to_Work_with_Apache_Spark_and_Delta_Lake_1758717156.pdf` — 40-page ingestion, Delta, MERGE, CDC and Structured Streaming guide; code examples are explanatory, not certified runnable.
10. `file_037E176D-593C-49BD-94C4-398BE1073310.pdf` — 12-page "PySpark Essentials: From DataFrames to Performance" cheat sheet; common joins, caching, `spark-submit`, plans, limits; needs nuanced validation.

## Important technical corrections / red flags (do not copy mistakes)

- Early PDFs claim Python 2 compatibility and Spark 2.2 shell examples — **obsolete** as the target engine. Re-author examples for pinned modern PySpark version.
- Some RDD vs DataFrame examples mix Python and Scala, sometimes mention Scala-only GraphX; never claim a Scala API is a PySpark API.
- Statements "PySpark always faster than pandas", "one executor per worker", "optimal 2–3 × number of executors", "max five cores per executor", and "one action = exactly one Spark job" are oversimplifications/false universals. Teach actual semantics and verify plans/UI.
- `repartition()` does not automatically make any join faster; `coalesce()` typically narrows partitions, but Spark scheduling/optimizer behavior and data layout matter. `broadcast()` is not always faster.
- Fabric V-Order and Direct Lake optimizations are **Microsoft Fabric-specific** and may not exist in Apache Spark/Delta OSS. "Gold must always use V-Order", "one partition column only", or "1 GB minimum" are not universally true.
- `merge` code in third-party notes may use invalid parameter shape; use version-verified `DeltaTable.alias(...).merge(...).whenMatched...execute()` and test it.
- Checkpointing alone does not make *every* sink exactly-once; side effects in `foreachBatch` may require idempotent semantics, sink guarantees matter.
- `toPandas()/collect()` on unbounded input may exhaust driver. Control sample sizes.
- Nested XML, Kafka, Avro, MLlib and Delta require dependency/runtime/connector verification; do not promise enabled tooling purely from a PDF mention.
- Notes and slides belong to third-party creators; use as references, not copied copyrighted lesson text or code/graphics in a published product.

## Dataset licensing and acquisition cautions

- D01 Olist: historical discussion flagged non-commercial constraints; obtain precise current license/permission before commercial use, otherwise generate a custom legally usable retail dataset.
- D05 MovieLens: GroupLens documentation restricts some datasets' commercial use and/or redistribution. See https://files.grouplens.org/datasets/movielens/ml-latest-README.html and relevant per-version README.
- D03 MySQL Employees: repository states CC BY-SA 3.0: https://github.com/datacharmer/test_db ; preserve attribution, assess share-alike.
- D04 Synthea generator: Apache 2.0 software; confirm outputs' terminology and export licenses: https://github.com/synthetichealth/synthea .
- D07 NYC TLC: https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page publishes monthly Parquet and warns records have source/data-quality limitations.
- D09 UCI power consumption: https://archive.ics.uci.edu/dataset/235/individual+household+electric+power+consumption (verify data license and time-zone semantics).
- D10 Market data: Alpha Vantage/API terms may limit caching/redistribution. Prefer generated prices for packaged public examples until cleared.
- D13 NOAA: https://www.ncei.noaa.gov/ (specific product terms/provenance).
- D14 AdventureWorks: https://learn.microsoft.com/en-us/sql/samples/adventureworks-install-configure (check download conditions).

Source-derived topics are evidence for scope, **not proof** that example code compiles today or that rights are cleared. Any external verification above is separate from the user's uploaded files and prior discussion.
