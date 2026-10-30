"""Trusted orchestration for tools: same fixtures, sandbox and cancellation as course execution."""
from __future__ import annotations
import json
import threading
from . import api, sandbox
from .tool_compare import compare


def context(body):
    dataset = body.get('dataset')
    if dataset not in api.PLAYGROUND: raise api.ItemError('Unknown tool dataset.')
    version, editions = api.PLAYGROUND[dataset]
    if body.get('version') != version: raise api.ItemError('Dataset changed. Reload the page before running.')
    edition = body.get('edition', 'practice')
    if edition not in editions: raise api.ItemError('That dataset edition is unavailable.')
    manifest = api._manifest(dataset, version)
    tables = {t: api.FIXTURES / dataset / version / m['file'] for t, m in manifest['editions'][edition].items()}
    return {'mode': 'tool', 'inputs': list(tables), 'schemas': manifest['schemas'], 'preview_rows': 100}, {'tool': tables}


def execute(body, cancel: threading.Event | None = None, on_event=None):
    job, inputs = context(body)
    action = body.get('action')
    if action not in ('sql', 'plan', 'compare', 'pipeline', 'stream', 'benchmark'): raise api.ItemError('Unknown tool action.')
    if action in ('pipeline', 'stream', 'benchmark'):
        from .tool_scenarios import execute_scenario
        return execute_scenario(body, job, inputs, cancel, on_event)
    language = body.get('language', 'sql' if action == 'sql' else 'python')
    if language not in ('sql', 'python'): raise api.ItemError('Choose SQL or PySpark.')
    job.update(tool_mode=language, plans=action in ('plan', 'compare'), complete=action == 'compare')
    def run(code, lang):
        if cancel is not None and cancel.is_set(): return {'status': 'cancelled', 'cases': []}
        return sandbox.execute({**job, 'tool_mode': lang}, code, inputs, sandbox.Limits(timeout_s=90), cancel, on_event=on_event)
    first = run(body['code'], language)
    sides = [first]
    verdict = None
    if action == 'compare' and first.get('status') != 'cancelled':
        language_b = body.get('language_b', language)
        if language_b not in ('sql', 'python'): raise api.ItemError('Choose SQL or PySpark for B.')
        second = run(body.get('code_b', ''), language_b)
        sides.append(second)
        def full(r):
            case = r.get('cases', [{}])[0] if r.get('cases') else {}
            frames = case.get('frames', [])
            return frames[-1] if case.get('status') == 'ok' and len(frames) == 1 else {'status': 'error'}
        verdict = compare(full(first), full(second), body.get('ordered') is True)
        verdict['task_correctness'] = 'Not checked: this scratch comparison has no independent task oracle.'
        if body.get('scenario') == 'api-sql' and body['dataset'] == 'PS-D01':
            expected = run('SELECT status, COUNT(*) AS count FROM orders GROUP BY status', 'sql')
            if expected.get('status') == 'cancelled':
                sides.append(expected)
            else:
                checks = [compare(full(side), full(expected), False)['verdict'] for side in sides]
                verdict['task_correctness'] = 'Both satisfy the task: count every order by status.' if checks == ['equivalent', 'equivalent'] else 'Not fully verified against the task reference.' if 'not-verified' in checks else 'Task correctness failed: at least one approach does not count every order by status.'
    # Only bounded previews cross the API; complete rows were used for host-side comparison.
    for side in sides:
        side.pop('container', None)
        for case in side.get('cases', []):
            for f in case.get('frames', []):
                f['rows'] = f.get('rows', [])[:100]
                f['truncated'] = f.get('truncated', False) or f.get('row_count', 0) > 100
    return {'mode': 'tool', 'status': 'cancelled' if any(s.get('status') == 'cancelled' for s in sides) else first.get('status', 'error'), 'identity': body.get('identity'), 'sides': sides, 'comparison': verdict, 'dataset': body['dataset'], 'version': body['version'], 'edition': body['edition']}
