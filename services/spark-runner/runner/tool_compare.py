"""Host-side, duplicate-sensitive comparison of bounded complete tool results."""
from collections import Counter
import json

MAX_ROWS = 10000
MAX_BYTES = 2 * 1024 * 1024

def compare(a, b, ordered=False):
    if any(x.get('status') != 'ok' or x.get('truncated') or x.get('complete') is not True for x in (a, b)):
        return {'verdict': 'not-verified', 'message': 'Not fully verified: one approach failed or exceeded the complete-result limit.'}
    # Column order, names and Spark types are contractual; nullability is shown separately, not treated as a value difference.
    schema = lambda x: [(f['name'], f['type']) for f in x.get('schema', [])]
    if schema(a) != schema(b): return {'verdict': 'different', 'message': 'Schemas differ: column names, order or Spark types do not match.'}
    rows = lambda x: [json.dumps(r, sort_keys=True, ensure_ascii=True, separators=(',', ':')) for r in x.get('rows', [])]
    ar, br = rows(a), rows(b)
    equal = ar == br if ordered else Counter(ar) == Counter(br)
    missing, additional = Counter(ar)-Counter(br), Counter(br)-Counter(ar)
    return {'verdict': 'equivalent' if equal else 'different', 'message': 'Complete results agree, including duplicate counts and nulls.' if equal else 'Complete results differ.', 'only_a': [json.loads(r) for r in list(missing.elements())[:10]], 'only_b': [json.loads(r) for r in list(additional.elements())[:10]]}
