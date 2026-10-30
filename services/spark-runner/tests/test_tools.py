"""Focused tools gate. Run pure policy checks normally; SPARK_TOOLS_LIVE=1 adds real container cases."""
import importlib.util
import json
import os
import sys
import threading
import time
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT/'sandbox'))
from runner import tools, sandbox, api
from runner.tool_compare import compare
from tool_policy import statements, validate

class Policy(unittest.TestCase):
    def test_split_quotes_comments(self):
        self.assertEqual(len(statements("SELECT ';' AS value; /* a; /* inner */ */ SELECT 2 -- ;\n;")), 2)
        for source in ("SELECT 'oops", 'SELECT 1 /* oops'):
            with self.assertRaises(ValueError): statements(source)
    def test_policy(self):
        for source in ('SELECT COUNT(*) FROM orders', "CREATE TABLE x USING parquet AS SELECT * FROM orders", "SELECT * FROM parquet.`/tmp/work/x`"):
            validate(source)
        for source in ("SELECT reflect('java.lang.System', 'getenv')", "SELECT `java_method`('x', 'y')", "CREATE FUNCTION x AS 'a'", "SET spark.driver.extraJavaOptions='x'", "ADD JAR '/tmp/x'", "CREATE TABLE x USING jdbc", "SELECT * FROM parquet.`/data/x`", "CREATE TABLE x USING parquet LOCATION '/tmp/work/../x'", "SELECT read_files('s3://x')"):
            with self.subTest(source=source), self.assertRaises(ValueError): validate(source)
    def test_exact_duplicates_and_schema(self):
        def f(rows, dtype='int', complete=True): return dict(status='ok', schema=[dict(name='v',type=dtype)], rows=rows,complete=complete)
        self.assertEqual(compare(f([[1],[1],[None]]),f([[None],[1],[1]]))['verdict'], 'equivalent')
        self.assertEqual(compare(f([[1],[1]]),f([[1]]))['verdict'],'different')
        self.assertEqual(compare(f([[1]]),f([[1]],'bigint'))['verdict'],'different')
        self.assertEqual(compare(f([[1]],complete=False),f([[1]]))['verdict'],'not-verified')
        self.assertEqual(compare(f([[1],[2]]),f([[2],[1]]),True)['verdict'],'different')
    def test_cancelled_waiter_does_not_leak_capacity(self):
        scheduler = sandbox.ContainerScheduler(1)
        cancel = threading.Event(); cancel.set()
        with scheduler.slot(cancel=cancel) as acquired: self.assertFalse(acquired)
        with scheduler.slot() as acquired: self.assertTrue(acquired)
        self.assertEqual(scheduler.active,0)
    def test_exclusive_waiter_blocks_new_jobs(self):
        scheduler = sandbox.ContainerScheduler(2)
        order = []; entered = threading.Event()
        def exclusive():
            with scheduler.slot(True): order.append('exclusive'); entered.set(); time.sleep(.02)
        def shared():
            with scheduler.slot(): order.append('shared')
        with scheduler.slot():
            a = threading.Thread(target=exclusive); a.start()
            while not scheduler.waiting: time.sleep(.001)
            b = threading.Thread(target=shared); b.start()
            self.assertFalse(entered.wait(.02))
        a.join(); b.join()
        self.assertEqual(order,['exclusive','shared'])
    def test_delta_detection_ignores_variables_and_comments(self):
        import harness
        for source in ('delta = 1', '# import delta\ndelta = 1', 'print("delta is a variable")'):
            self.assertFalse(harness.uses_delta({}, source), source)
        for source in ('from delta.tables import DeltaTable', 'data.write.format("delta")', 'spark.sql("CREATE TABLE x USING DELTA AS SELECT 1")'):
            self.assertTrue(harness.uses_delta({}, source), source)
    def test_rejects_stale_versions(self):
        with self.assertRaises(api.ItemError): tools.context(dict(dataset='PS-D01',version='0.0.0',edition='lesson'))

@unittest.skipUnless(os.environ.get('SPARK_TOOLS_LIVE') == '1','set SPARK_TOOLS_LIVE=1 for real Spark')
class Live(unittest.TestCase):
    def run_tool(self, **changes):
        body = dict(action='sql',dataset='PS-D01',version=api.PLAYGROUND['PS-D01'][0],edition='lesson',code='SELECT status, COUNT(*) AS count FROM orders GROUP BY status',identity='gate')
        body.update(changes)
        result = tools.execute(body)
        self.assertEqual(result['status'],'ok',result)
        for side in result['sides']:
            self.assertEqual(side['status'],'ok',side)
            for case in side.get('cases',[]): self.assertEqual(case['status'],'ok',case)
        return result
    def test_sql_and_dataframe_complete_comparison(self):
        r = self.run_tool(action='compare',language='sql',language_b='python',code_b="result = orders.groupBy('status').count()")
        self.assertEqual(r['comparison']['verdict'],'equivalent')
        self.assertIn('Not checked',r['comparison']['task_correctness'])
    def test_sql_state_and_errors(self):
        r = self.run_tool(code='CREATE TEMP VIEW mine AS SELECT * FROM orders; SELECT COUNT(*) AS n FROM mine')
        self.assertEqual(r['sides'][0]['cases'][0]['frames'][-1]['rows'],[[12]])
        r = tools.execute(dict(action='sql',dataset='PS-D01',version=api.PLAYGROUND['PS-D01'][0],edition='lesson',code='SELECT * FROM mine',identity='gate'))
        self.assertNotEqual(r['status'],'ok')
    def test_same_wrong_results_fail_task_contract(self):
        code = "result = orders.groupBy('status').count().limit(0)"
        r = self.run_tool(action='compare', language='python', language_b='python', scenario='api-sql', code=code, code_b=code)
        self.assertEqual(r['comparison']['verdict'], 'equivalent')
        self.assertIn('failed', r['comparison']['task_correctness'])
    def test_plan_is_real_and_sanitized(self):
        r = self.run_tool(action='plan',language='python',code="result = orders.groupBy('status').count()")
        p = r['sides'][0]['cases'][0]['frames'][0]['plan']
        self.assertIn('Aggregate',p['optimized'])
        self.assertNotIn('/data/',str(p))
    def test_curated_sql_experiments(self):
        catalog = json.loads((api.REPO/'src/content/pyspark/tool-catalog.json').read_text())
        for e in catalog['sql']:
            with self.subTest(e=e['id']): self.run_tool(dataset=e['dataset'],version=api.PLAYGROUND[e['dataset']][0],code=e['sql'])
    def test_domain_examples(self):
        # One real Spark run per domain, using the same verified grouping columns as the UI catalog.
        import re
        source = (api.REPO/'src/content/pyspark/tool-examples.ts').read_text()
        for dataset, table, group in re.findall(r'"(PS-D\d+)": \{[^\n]*table: "(\w+)", group: "(\w+)"',source):
            with self.subTest(dataset=dataset): self.run_tool(dataset=dataset,version=api.PLAYGROUND[dataset][0],code=f'SELECT {group}, COUNT(*) AS count FROM {table} GROUP BY {group}')
    def test_curated_comparisons(self):
        catalog = json.loads((api.REPO/'src/content/pyspark/tool-catalog.json').read_text())
        different = {'duplicates', 'join-types', 'aggregate-window'}
        for e in catalog['compare']:
            with self.subTest(e=e['id']):
                r = self.run_tool(action='compare', dataset=e['dataset'], version=api.PLAYGROUND[e['dataset']][0], edition='practice', language='python', language_b='python', scenario=e['id'], code=e['a'], code_b=e['b'])
                self.assertEqual(r['comparison']['verdict'], 'different' if e['id'] in different else 'equivalent')
    def test_pipeline_and_delta(self):
        catalog = json.loads((api.REPO/'src/content/pyspark/tool-catalog.json').read_text())
        for e in catalog['pipeline']:
            with self.subTest(e=e['id']):
                r=self.run_tool(action='pipeline',dataset=e['dataset'],version=api.PLAYGROUND[e['dataset']][0],scenario=e['id'],step=2,code=e['code'])
                self.assertEqual(len(r['snapshots']),3)
    def test_stream_replay_recovery(self):
        e=json.loads((api.REPO/'src/content/pyspark/tool-catalog.json').read_text())['stream'][0]
        r=self.run_tool(action='stream',dataset=e['dataset'],version=api.PLAYGROUND[e['dataset']][0],edition='practice',scenario=e['id'],step=4,code=e['code'])
        s=r['snapshots'];self.assertEqual(len(s),5)
        self.assertEqual(s[1]['frames'],s[2]['frames'])
        self.assertEqual(s[2]['commits'],s[3]['commits'])
        self.assertGreater(len(s[4]['commits']),len(s[3]['commits']))
    def test_additional_iot_and_million_row_benchmark(self):
        catalog = json.loads((api.REPO/'src/content/pyspark/tool-catalog.json').read_text())
        e = catalog['stream'][1]
        r = self.run_tool(action='stream', dataset=e['dataset'], version=api.PLAYGROUND[e['dataset']][0], edition='practice', scenario=e['id'], step=4, code=e['code'])
        self.assertEqual(len(r['snapshots']), 5)
        self.assertEqual(r['snapshots'][1]['frames'], r['snapshots'][2]['frames'])
        e = catalog['benchmark'][1]
        r = self.run_tool(action='benchmark', dataset=e['dataset'], version=api.PLAYGROUND[e['dataset']][0], scenario=e['id'], size=1000000, code='')
        self.assertEqual(r['benchmark']['rows'], 1000000)
        self.assertEqual(len(r['benchmark']['repetitions']), 5)
    def test_benchmark(self):
        e=json.loads((api.REPO/'src/content/pyspark/tool-catalog.json').read_text())['benchmark'][0]
        r=self.run_tool(action='benchmark',dataset=e['dataset'],version=api.PLAYGROUND[e['dataset']][0],scenario=e['id'],size=100000,code='')
        self.assertEqual(len(r['benchmark']['repetitions']),5)
        self.assertTrue(all(x['a']>0 and x['b']>0 for x in r['benchmark']['repetitions']))

if __name__ == '__main__': unittest.main()
