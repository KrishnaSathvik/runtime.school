# Real PySpark engine — implementation specification

## Decision

Build one **real classic PySpark execution service** for runtime.school. Not a custom interpreter, not Pyodide/DuckDB pretending to be Spark, and not a shared Python kernel for arbitrary public code. Frontend stays Next.js; independent backend/service executes isolated Spark jobs. A future distributed Kubernetes Spark tier is for cluster-specific labs. Spark Connect is optional because it does not support RDD or SparkContext APIs in the required classic curriculum.

### Proposed, not pre-certified version baseline

Start compatibility testing on Python 3.11 + Java 17 + PySpark/Spark 4.0.1 + delta-spark 4.0.1 in a pinned container. As of reviewed official Delta compatibility, 4.0.1 targets Spark 4.0.x. Pin actual image digest, package hashes and verified JVM/python/native deps **after** end-to-end tests. Do not assume this is the newest Spark release or that every advanced connector is included. Check module-specific dependencies for Kafka/Avro/XML/Arrow/Delta and versions before authoring runnable tasks.

### Logical architecture

```
Next.js runtime.school (Learn, Practice, Projects, Tools)
  -> authenticated POST /api/spark/jobs (Next.js proxy or separate service)
  -> FastAPI: authorization, question/dataset resolver, rate limit, job metadata
  -> durable queue/scheduler: quotas, dispatch, cancellation, status, TTL
  -> trusted sandbox supervisor: hardened per-job execution isolation
  -> private classic PySpark worker (JVM + Python, master=local[2] initially)
       ↳ read-only approved versioned fixture mounts
       ↳ private ephemeral writable working path
       ↳ untrusted student script loaded only inside sandbox
       ↳ trusted grader isolated from student visibility
  -> structured bounded result (preview, schema, test verdict, logs, metrics)
  -> status API / events back to frontend
```

### Three execution tiers

A. Standard local Spark for introductory/normal DataFrame tasks. B. Stateful or higher-resource Spark for project ETL, Delta, CDC and controlled Structured Streaming. C. Distributed Spark on Kubernetes for genuine network shuffle, executor failure and production tuning; do not infer multi-node performance from local mode.

### Proposed API

- `POST /api/spark/jobs`: body `{mode:"run"|"submit"|"playground"|"benchmark", question_id?, lesson_id?, project_id?, code, dataset_fixture_id?}`. Backend resolves **trusted** dataset/version and maximum resource policy, not arbitrary paths or image names from client.
- `GET /api/spark/jobs/{job_id}`: status queued/starting/running/completed/failed/cancelled, capped output and errors.
- `DELETE /api/spark/jobs/{job_id}`: cancel process tree, child JVMs, ephemeral storage and queued work.
- Internal results stored by run/user/course/dataset version with TTL; progress in durable database.

### Runner contract

1. Authenticate/authorize and rate limit user. Parse immutable `question_id` and permitted mode.
2. Get expected entry point (`solve`) and argument tables from signed trusted manifest.
3. Create a fresh isolated namespace/process environment with pinned image, no sensitive secrets, resource limits and no public egress.
4. Load read-only Spark DataFrames. Execute user code inside worker only; do not use an API-side `exec`.
5. Materialize results safely with bounded previews; never call unbounded `.collect()`/`.toPandas()` for grading.
6. On Run, show visible samples, schema, stdout/stderr truncated with actionable messages. On Submit, run private fixtures in fully separate scratch states; do not expose private reference solutions, fixture content or expected results.
7. Grade exact column names/types, multiset row contents, row multiplicities, order only if specified; inspect table/file side effects for pipeline tasks, state/checkpoint behavior for streaming, controlled metrics for optimization.
8. Persist run metadata; enforce cleanup; on error/cancel/timeout, terminate full Spark JVM/Python process tree and child resources.

### Security gate: absolutely required for production

A normal Docker image alone is **not** a sufficient public multi-tenant security boundary. Use hardened sandboxing such as microVM or carefully secured gVisor-style isolation, rootless/nonprivileged operation, restrictive seccomp/AppArmor where available, no host mounts or Docker socket, no cloud metadata/credentials, network denied by default with carefully scoped internal Spark sockets if needed, read-only approved input assets, writable ephemeral scratch capped in size, per-job PID/memory/CPU/disk/time/output quotas. Ensure users cannot access grader/reference/other learners. Fuzz isolation before public release. Perform threat model and penetration tests.

Suggested **experimental** limits only (tune with measurement): local[2], 2 vCPU, 4GiB RAM, ordinary Run 45s, Submit ~90s policy across tests, max 100 displayed rows, one active job per user; separate policy for stateful/project jobs. Account for Spark startup and JVM memory overhead. Add queue quota and paid infrastructure cost controls.

### State and streaming semantics

- Every project run owns private Delta directories and transaction log; use immutable fixtures/seeded batches.
- Controlled event batches: deliberate event time vs arrival time, watermark rules, late records and window results.
- Checkpoints owned by one project run, not shared across users/tests. Validate stop/restart/replay idempotency and exactly-once claims with sink semantics (don't claim all sinks are exactly once).
- CDC exercises: sequence/revision order, upserts/deletes, late corrections, SCD2 validity windows, dedup before MERGE as required.
- Separate performance workers from interactive beginner jobs; judge plan quality and repeated measured results only under controlled matched environment. Always verify equal answers first.

### Data persistence / deployment

- Next.js web frontend can remain on Vercel.
- FastAPI may be on a conventional backend provider; server used for API is **not** the sandbox platform by default.
- Redis or compatible queue as a design option; Postgres for durable jobs/progress; S3-compatible private object store for immutable fixture hashes and artifacts.
- Use tracing/metrics, queue depth, startup latency p50/p95, errors/timeouts, memory/CPU utilization, $/job, abuse alerts, and audit logs.
- Do not assume Render/Vercel automatically provide per-job hardened sandboxes; verify infra features first. Avoid granting learners external network access simply to read datasets.

### Acceptance tests

- Real Spark DataFrame joins work in isolated local runner; no fake output.
- Correct solution passes visible + hidden cases; intentionally incorrect solution fails; grader hidden data protected.
- Runtime exceptions/timeouts/OOM/cancellation are safely reported and cleaned up.
- Concurrent learners have zero data/state leakage; no egress/host access.
- Code paths work under mobile UI with keyboard and screen reader consideration.
- Streaming and Delta only advertised as executable when their actual tests run; multi-node tuning deferred to dedicated tier.
