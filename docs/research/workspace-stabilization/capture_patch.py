"""Capture the repair relative to the dirty-tree baseline, never relative to HEAD."""
import difflib
import hashlib
import json
import pathlib
import subprocess
import tarfile

root = pathlib.Path(__file__).resolve().parents[3]
folder = pathlib.Path(__file__).resolve().parent
baseline = json.loads((folder / 'BASELINE.json').read_text())['files']
paths = set(subprocess.check_output(['git', 'ls-files', '-c', '-o', '--exclude-standard', '-z'], cwd=root).decode().split('\0'))
paths.update(baseline)
records, patch = [], []
with tarfile.open(folder / 'snapshots/pre-repair.tar.gz') as archive:
    for name in sorted(paths):
        if not name or name.startswith('docs/research/'):
            continue
        file = root / name
        after = file.read_bytes() if file.is_file() else None
        digest = hashlib.sha256(after).hexdigest() if after is not None else None
        if baseline.get(name) == digest:
            continue
        before = archive.extractfile(name).read() if baseline.get(name) is not None else None
        records.append({'path': name, 'before': baseline.get(name), 'after': digest})
        patch.extend(difflib.unified_diff(
            (before or b'').decode().splitlines(keepends=True),
            (after or b'').decode().splitlines(keepends=True),
            fromfile=f'a/{name}' if before is not None else '/dev/null',
            tofile=f'b/{name}' if after is not None else '/dev/null'))
(folder / 'REPAIR_MANIFEST.json').write_text(json.dumps(records, indent=2) + '\n')
(folder / 'repair.patch').write_text(''.join(patch))
print(f'Captured {len(records)} changed/new source and test files. Research documentation excluded.')
