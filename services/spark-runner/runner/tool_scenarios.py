"""Pinned public scenario definitions; caller cannot supply paths, schemas or execution flags."""
import json
from . import api, sandbox
CATALOG = api.REPO / 'src/content/pyspark/tool-catalog.json'


def execute_scenario(body, job, inputs, cancel, on_event):
    action = body['action']
    group = 'pipeline' if action == 'pipeline' else action
    entries = json.loads(CATALOG.read_text())[group]
    scenario = next((x for x in entries if x['id'] == body.get('scenario')), None)
    if scenario is None or scenario['dataset'] != body['dataset']: raise api.ItemError('Choose a scenario for its pinned dataset.')
    step = body.get('step', 0)
    if not isinstance(step, int) or not 0 <= step < len(scenario.get('stages', [0])): raise api.ItemError('Invalid scenario step.')
    size = body.get('size', 100000)
    if size not in (100000, 1000000): raise api.ItemError('Benchmark sizes are 100,000 or 1,000,000 rows.')
    job.update(mode='scenario', tool_mode='python', action=action, scenario=scenario, step=step, size=size, delta=scenario['id'] == 'delta-history', shuffle_partitions=2)
    result = sandbox.execute(job, body['code'], inputs, sandbox.Limits(timeout_s=180 if action in ('stream', 'benchmark') else 120), cancel, on_event=on_event, exclusive=action == 'benchmark')
    return {'mode': 'tool', 'status': result['status'], 'identity': body['identity'], 'sides': [{'status': result['status'], 'error': result.get('error'), 'cases': result.get('cases', []), 'timings': result.get('timings'), 'pids_peak': result.get('pids_peak')}], 'snapshots': result.get('snapshots'), 'benchmark': result.get('benchmark')}
