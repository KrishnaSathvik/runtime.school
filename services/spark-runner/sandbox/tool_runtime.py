"""Real Spark tool actions inside the existing sandbox. All previews and plans are bounded."""
from __future__ import annotations
import __main__ as h
import json
import re
import time
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
from tool_policy import statements, validate

MAX_ROWS, MAX_BYTES = 10000, 2 * 1024 * 1024

def sanitize(text):
    text = re.sub(r'/(?:data|job|tmp|opt|usr|home)/[^\s,;\]\)\'"]+', '<workspace>', text)
    text = re.sub(r'plan_id=\d+', 'plan_id=#', text)
    return re.sub(r'#\d+[L]?', '#', text)[:40000]

def plan(df, initial=None):
    qe = df._jdf.queryExecution()
    def tree(node, depth=0):
        if depth > 12: return {'name': 'More operators', 'children': []}
        name = node.nodeName()
        if name == 'AdaptiveSparkPlan': return {'name': name, 'children': [tree(node.executedPlan(), depth+1)]}
        if name.endswith('QueryStage'):
            return {'name': name, 'children': [tree(node.plan(), depth+1)]}
        children = node.children()
        return {'name': name, 'children': [tree(children.apply(i), depth+1) for i in range(min(children.size(), 30))]}
    executed = qe.executedPlan()
    return {'logical': sanitize(qe.logical().toString()), 'optimized': sanitize(qe.optimizedPlan().toString()), 'initial': sanitize(initial or executed.toString()), 'executed': sanitize(executed.toString()), 'tree': tree(executed), 'provenance': 'this-run', 'metrics_available': False}

def frame(df, complete=False, plans=False):
    from pyspark.sql import DataFrame
    if not isinstance(df, DataFrame): raise TypeError('Keep your output DataFrame in result, for example result = orders.filter(...).')
    initial = df._jdf.queryExecution().executedPlan().toString() if plans else None
    rows, more = h.rows_of(df, MAX_ROWS if complete else 100)
    size = len(json.dumps(rows).encode())
    if size > MAX_BYTES: rows, more = [], True
    got = {'name': 'result', 'schema': h.schema_of(df), 'rows': rows, 'truncated': more, 'complete': complete and not more, 'row_count': len(rows) if complete and not more else df.count(), 'status': 'ok'}
    if plans: got['plan'] = plan(df, initial)
    return got

def load(spark, job):
    case = job['cases'][0]
    tables = {n: h.read_table(spark, spec) for n, spec in case['tables'].items()}
    for n, df in tables.items(): df.createOrReplaceTempView(n)
    return tables

def run(spark, job, result):
    Path('/tmp/work').mkdir(exist_ok=True)
    out, err = h.Capped(20000), h.Capped(20000)
    got = {'id': 'tool', 'status': 'ok', 'frames': []}
    result['cases'].append(got)
    t = time.perf_counter()
    try:
        with redirect_stdout(out), redirect_stderr(err):
            tables = load(spark, job)
            if job['tool_mode'] == 'sql':
                for index, (sql, line) in enumerate(statements(h.SOLUTION.read_text())):
                    h.emit('case', f'statement {index+1}')
                    try:
                        validate(sql)
                        df = spark.sql(sql)
                        if len(df.schema):
                            if len(got['frames']) >= 5: raise ValueError('A run can return up to five result tables.')
                            f = frame(df, job.get('complete', False), job.get('plans', False))
                            f['name'] = f'Statement {index+1}'
                            got['frames'].append(f)
                    except Exception as e:
                        detail = h.describe(e); detail['line'] = line; detail['message'] = f'Statement {index+1}: ' + detail['message']
                        got.update(status='runtime-error', error=detail); break
            else:
                module = h.load_solution(spark, tables)
                if not hasattr(module, 'result'): raise TypeError('Assign a DataFrame to result so this tool can inspect it.')
                got['frames'].append(frame(module.result, job.get('complete', False), job.get('plans', False)))
    except Exception as e:
        got.update(status='runtime-error', error=h.describe(e))
    got.update(stdout=out.text(), stderr=err.text(), ms=h.ms(t))
    # Paths and plan internals should never expose host/sandbox filesystem details in this tool.
    if got.get('error'):
        for k in ('message', 'traceback', 'text'):
            if got['error'].get(k): got['error'][k] = sanitize(got['error'][k])
