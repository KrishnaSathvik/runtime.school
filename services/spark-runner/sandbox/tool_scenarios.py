"""Real batch/Delta, checkpoint replay and controlled benchmark operations."""
from __future__ import annotations
import __main__ as h
import json
import statistics
import time
from pathlib import Path
from contextlib import redirect_stdout, redirect_stderr
from tool_runtime import frame, load, sanitize


def run(spark, job, result):
    Path('/tmp/work').mkdir(exist_ok=True)
    out, err = h.Capped(20000), h.Capped(20000)
    got = {'id': 'scenario', 'status': 'ok', 'frames': []}
    result['cases'].append(got)
    try:
        with redirect_stdout(out), redirect_stderr(err):
            tables = load(spark, job)
            if job['action'] == 'benchmark': benchmark(spark, tables, job, result)
            else:
                module = h.load_solution(spark, tables)
                if job['action'] == 'pipeline': pipeline(spark, tables, module, job, result)
                else: stream(spark, tables, module, job, result)
    except Exception as e:
        detail = h.describe(e)
        for k in ('message', 'traceback'):
            if detail.get(k): detail[k] = sanitize(detail[k])
        got.update(status='runtime-error', error=detail)
    got.update(stdout=out.text(), stderr=err.text())


def pipeline(spark, tables, module, job, result):
    scenario = job['scenario']
    delta = scenario['id'] == 'delta-history'
    source = {'retail-cleaning': 'orders', 'delta-history': 'warehouses', 'healthcare-layers': 'claims', 'banking-report': 'transactions'}[scenario['id']]
    current = tables[source]
    result['snapshots'] = []
    for i, fn in enumerate(('bronze', 'silver', 'gold')[:job['step']+1]):
        h.emit('case', f'stage {i+1}: {scenario["stages"][i]}')
        current = getattr(module, fn)(current)
        if delta and i < 2:
            current.write.format('delta').mode('overwrite').save('/tmp/work/warehouses')
            current = spark.read.format('delta').load('/tmp/work/warehouses')
        f = frame(current); f['name'] = scenario['stages'][i]
        result['snapshots'].append({'step': i, 'label': scenario['stages'][i], 'frames': [f]})


def stream(spark, tables, module, job, result):
    from pyspark.sql import functions as F
    scenario = job['scenario']
    source = tables[scenario['table']]
    batches = [r[0] for r in source.select('batch').distinct().orderBy('batch').collect()]
    if len(batches) < 3: raise ValueError('This scenario needs at least three event batches; choose the practice or project edition.')
    root = Path('/tmp/work/stream')
    incoming, checkpoint, sink = root/'input', root/'checkpoint', root/'output'
    incoming.mkdir(parents=True); sink.mkdir()
    failure = {'enabled': False}
    def consume(batch, batch_id):
        if failure['enabled']: raise RuntimeError('Controlled lab failure before committing the sink batch.')
        batch.write.mode('overwrite').parquet(str(sink / str(batch_id)))
    snapshots = []; result['snapshots'] = snapshots
    for i in range(job['step']+1):
        h.emit('case', f'replaying step {i+1}: {scenario["stages"][i]}')
        if i in (0, 1, 3):
            batch = batches[{0: 0, 1: 1, 3: 2}[i]]
            # Publish a completed source file atomically. The input is a real fixture batch, not generated output.
            rows = source.filter(F.col('batch') == F.lit(batch)).toJSON().collect()
            staging = incoming / f'.batch-{i}.json'
            staging.write_text('\n'.join(rows) + '\n'); staging.rename(incoming/f'batch-{i}.json')
        failure['enabled'] = i == 3
        events = spark.readStream.schema(source.schema).option('maxFilesPerTrigger', 1).json(str(incoming))
        transformed = module.transform(events)
        query = transformed.writeStream.foreachBatch(consume).option('checkpointLocation', str(checkpoint)).trigger(availableNow=True).start()
        event = 'Restarted the real query from its checkpoint.' if i in (2, 4) else 'Processed the next source batch.'
        progress = None
        try:
            query.awaitTermination(60)
            if query.isActive: query.stop(); raise TimeoutError('The streaming query exceeded its step budget.')
            if i == 3: raise ValueError('The requested failure did not occur.')
            p = query.lastProgress
            if p: progress = {'batchId': int(p['batchId']), 'numInputRows': int(p['numInputRows']), 'watermark': p.get('eventTime', {}).get('watermark')}
        except Exception:
            if i != 3: raise
            event = 'Controlled failure: this batch has no checkpoint commit. Recovery will retry it.'
        finally:
            if query.isActive: query.stop()
        frames = []
        paths = sorted(sink.glob('[0-9]*'))
        if paths:
            current = spark.read.parquet(*(str(p) for p in paths))
            audit = current.groupBy('batch').count().orderBy('batch') if 'batch' in current.columns else current
            f = frame(audit); f['name'] = 'Committed sink records by arrival batch'; frames.append(f)
        commits = sorted((p.name for p in (checkpoint/'commits').glob('*') if p.name.isdigit()), key=int)
        snapshots.append({'step': i, 'label': scenario['stages'][i], 'frames': frames, 'progress': progress, 'commits': commits, 'event': event})


def benchmark(spark, tables, job, result):
    from pyspark.sql import functions as F
    n = job['size']
    t = time.perf_counter()
    spark.conf.set('spark.sql.autoBroadcastJoinThreshold', -1)
    spark.conf.set('spark.sql.adaptive.enabled', False)
    if job['scenario']['id'] == 'broadcast':
        keys = [r[0] for r in tables['taxi_zones'].select('zone_id').orderBy('zone_id').collect()]
        fixtures = spark.range(n).select(F.col('id').alias('trip_id'), F.element_at(F.array(*[F.lit(k) for k in keys]), ((F.col('id') % len(keys))+1).cast('int')).alias('pickup_zone_id'), (F.col('id') % 100).alias('fare_units'))
        fixtures.write.mode('overwrite').parquet('/tmp/work/benchmark')
        source = spark.read.parquet('/tmp/work/benchmark')
        lookup = tables['taxi_zones'].select(F.col('zone_id').alias('pickup_zone_id'), 'borough')
        def approach_a(): return source.join(F.broadcast(lookup), 'pickup_zone_id').groupBy('borough').agg(F.sum('fare_units').alias('total')).orderBy('borough')
        def approach_b(): return source.join(lookup.hint('merge'), 'pickup_zone_id').groupBy('borough').agg(F.sum('fare_units').alias('total')).orderBy('borough')
    else:
        fixtures = spark.range(n).select(F.col('id').alias('request_id'), ((F.col('id') % 5)*100+100).cast('int').alias('status_code'))
        fixtures.write.mode('overwrite').parquet('/tmp/work/benchmark')
        source = spark.read.parquet('/tmp/work/benchmark')
        is_error = F.udf(lambda status: status >= 400, 'boolean')
        def approach_a(): return source.select((F.col('status_code') >= 400).alias('error')).groupBy('error').count().orderBy('error')
        def approach_b(): return source.select(is_error('status_code').alias('error')).groupBy('error').count().orderBy('error')
    preparation = h.ms(t)
    # Verify the entire small aggregate before timing; collect this evidence separately from the measured action.
    t = time.perf_counter()
    a_rows, b_rows = approach_a().collect(), approach_b().collect()
    if a_rows != b_rows: raise ValueError('The benchmark approaches disagree; no timing comparison is available.')
    collection = h.ms(t)
    # Fixed materialization forces every output column without transferring result rows to the driver.
    def materialize(fn):
        start = time.perf_counter(); fn().write.format('noop').mode('overwrite').save(); return h.ms(start)
    materialize(approach_a); materialize(approach_b)
    reps = []
    for i in range(5):
        h.emit('case', f'measuring repetition {i+1} of 5')
        values = {}
        for label, fn in ([('a', approach_a), ('b', approach_b)] if i % 2 == 0 else [('b', approach_b), ('a', approach_a)]):
            spark.catalog.clearCache(); values[label] = materialize(fn)
        reps.append(values)
    ma, mb = statistics.median(x['a'] for x in reps), statistics.median(x['b'] for x in reps)
    spread = max(max(x[s] for x in reps)-min(x[s] for x in reps) for s in ('a', 'b'))
    verdict = 'No reliable difference in this run' if abs(ma-mb) <= max(spread, .1 * max(ma, mb)) else f'{"A" if ma < mb else "B"} had the lower median in this run'
    result['benchmark'] = {'repetitions': reps, 'median_a': ma, 'median_b': mb, 'verdict': verdict, 'startup_ms': result['timings']['spark_start_ms'], 'preparation_ms': preparation, 'collection_ms': collection, 'action': 'Materialize the complete aggregate through Spark’s no-op sink; five alternating repetitions after warm-up. This is local-mode evidence, not a cluster speed claim.', 'rows': n, 'cores': 2, 'correctness': 'Complete aggregate results agreed before timing. Fixture derived deterministically from row IDs; no timing includes fixture generation.'}
