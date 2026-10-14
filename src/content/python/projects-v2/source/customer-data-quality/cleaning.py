"""Customer quality transformations. Never mutate the source records."""
def normalize_customer(record):
    """Return a copied dict: strip/title name and strip/lower email when strings; preserve other fields."""
    result = dict(record)
    for key, transform in [('name', str.title), ('email', str.lower)]:
        if isinstance(result.get(key), str):
            result[key] = transform(result[key].strip())
    return result

def clean_customers(records, rules):
    """Return (clean, rejected). Required fields must be nonempty strings; email needs one @ and allowed domain.
    First valid ID/email wins. Rejections retain source index, original record and reason (missing field,
    invalid email, blocked domain, duplicate id, duplicate email). Missing fields take priority.
    """
    clean, rejected, ids, emails = [], [], set(), set()
    for index, source in enumerate(records):
        row = normalize_customer(source)
        reason = None
        if any(not isinstance(row.get(k), str) or not row[k] for k in rules['required']):
            reason = 'missing field'
        elif row['email'].count('@') != 1 or not all(row['email'].split('@')) or any(c.isspace() for c in row['email']):
            reason = 'invalid email'
        elif row['email'].split('@')[1] in rules['blocked_domains']:
            reason = 'blocked domain'
        elif row['id'] in ids:
            reason = 'duplicate id'
        elif row['email'] in emails:
            reason = 'duplicate email'
        if reason:
            rejected.append({'source_index': index, 'record': dict(source), 'reason': reason})
        else:
            clean.append({**row, 'source_index': index})
            ids.add(row['id']); emails.add(row['email'])
    return clean, rejected

def quality_report(records, clean, rejected):
    """Reconcile every source position exactly once and count rejection reasons; do not rely on unique IDs."""
    from collections import Counter
    positions = [r['source_index'] for r in clean + rejected]
    return {'input': len(records), 'accepted': len(clean), 'rejected': len(rejected),
            'accounted_for': sorted(positions) == list(range(len(records))),
            'reasons': dict(sorted(Counter(r['reason'] for r in rejected).items()))}

def export_quality(records, rules):
    """Write clean.json, rejected.json, quality.json; return the report. Use indent=2 and sort_keys=True."""
    import json
    from pathlib import Path
    clean, rejected = clean_customers(records, rules)
    report = quality_report(records, clean, rejected)
    for name, value in [('clean.json', clean), ('rejected.json', rejected), ('quality.json', report)]:
        Path(name).write_text(json.dumps(value, indent=2, sort_keys=True))
    return report
