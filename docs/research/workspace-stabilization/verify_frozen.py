#!/usr/bin/env python3
"""Read-only freeze verification. No builds, generators, imports of app code, or writes."""
import hashlib
import json
from pathlib import Path
import re
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

def digest(data):
    return hashlib.sha256(data).hexdigest()

def chunk(text, spec):
    start = text.index(spec['start'])
    end = text.index(spec['end'], start)
    return text[start:end]

# The two result response sites may add expectedTotal beside total. Only this
# exact additive expression is exempt; existing result/grade fields still freeze.
def without_expected_total(text):
    return re.sub(r',\s*expectedTotal:\s*expected\s*\?\s*expected\.values\.length\s*:\s*(?:null|undefined)', '', text)

def verify():
    manifest = json.loads((HERE / 'FROZEN_CONTRACTS.json').read_text())
    failures = []
    for path, record in manifest['files'].items():
        p = ROOT / path
        if not p.is_file(): failures.append({'path': path, 'reason': 'missing'})
        elif digest(p.read_bytes()) != record['sha256']:
            failures.append({'path': path, 'reason': 'bytes changed'})
    for prefix, expected in manifest['directory_membership'].items():
        actual = sorted(str(p.relative_to(ROOT)) for p in (ROOT / prefix).rglob('*') if p.is_file())
        if actual != expected:
            failures.append({'path': prefix, 'reason': 'file membership changed',
                             'added': sorted(set(actual)-set(expected)),
                             'removed': sorted(set(expected)-set(actual))})
    worker = manifest['worker']
    p = ROOT / worker['path']
    text = p.read_text() if p.exists() else ''
    for name, spec in worker['semantic_chunks'].items():
        try: matches = digest(chunk(text, spec).encode()) == spec['sha256']
        except ValueError: matches = False
        if not matches: failures.append({'path': worker['path'], 'reason': 'semantic chunk changed', 'chunk': name})
    baseline = (ROOT / worker['baseline_copy']).read_text()
    if text == baseline:
        worker_status = 'unchanged'
    elif without_expected_total(text) == baseline:
        worker_status = 'only allowlisted expectedTotal response metadata added'
    else:
        worker_status = 'non-allowlisted difference; review required'
        failures.append({'path': worker['path'], 'reason': worker_status})
    print(json.dumps({'verified_files': len(manifest['files']), 'worker': worker_status,
                      'failures': failures, 'passed': not failures}, indent=2))
    return 1 if failures else 0

if __name__ == '__main__':
    sys.exit(verify())
