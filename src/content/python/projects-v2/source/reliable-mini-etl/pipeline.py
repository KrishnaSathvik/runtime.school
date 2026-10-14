"""Incremental batch processing with source evidence and deterministic replay."""
def parse_batches(batches):
    """batches maps filename to text in processing order. Parse each nonblank line independently.
    Return (parsed, errors). Parsed entries: file,line (1-based),row. Errors: file,line,raw,reason='invalid JSON'.
    """
    import json
    parsed,errors=[],[]
    for name,text in batches.items():
        for number,line in enumerate(text.splitlines(),1):
            if not line.strip():continue
            try:parsed.append({'file':name,'line':number,'row':json.loads(line)})
            except ValueError:errors.append({'file':name,'line':number,'raw':line,'reason':'invalid JSON'})
    return parsed,errors

def validate_events(parsed, schema):
    """Require dictionary with schema.required fields, nonempty string id, integer version >= min_version
    and integer cents >= min_cents. Booleans are not integers. Return accepted entries and rejected entries
    retaining file,line,row and adding reason='invalid schema'. Extra keys are allowed.
    """
    accepted,rejected=[],[]
    for entry in parsed:
        row=entry['row']
        valid=isinstance(row,dict) and all(k in row for k in schema['required'])
        valid=valid and isinstance(row['id'],str) and bool(row['id']) and type(row['version']) is int and row['version']>=schema['min_version'] and type(row['cents']) is int and row['cents']>=schema['min_cents']
        if valid:accepted.append(dict(entry))
        else:rejected.append({**entry,'reason':'invalid schema'})
    return accepted,rejected

def upsert(base, incoming):
    """Return copied records sorted by ID. Highest version wins; equal versions retain the existing value.
    Process incoming in source order and do not mutate either input. Output only id,version,cents fields.
    """
    result={row['id']:{key:row[key] for key in ['id','version','cents']} for row in base}
    for row in incoming:
        if row['id'] not in result or row['version']>result[row['id']]['version']:
            result[row['id']]={key:row[key] for key in ['id','version','cents']}
    return [result[key] for key in sorted(result)]

def reconcile(batches, accepted, quarantined, errors, output):
    """Return source_lines,accepted,rejected,accounted_for,replay_ok,output_rows,total_cents.
    Reconcile exact (file,line) identities across groups; verify applying accepted rows again changes nothing.
    """
    positions=[(name,n) for name,text in batches.items() for n,line in enumerate(text.splitlines(),1) if line.strip()]
    observed=[(r['file'],r['line']) for r in accepted+quarantined+errors]
    return {'source_lines':len(positions),'accepted':len(accepted),'rejected':len(quarantined)+len(errors),
            'accounted_for':sorted(positions)==sorted(observed),'replay_ok':upsert(output,[e['row'] for e in accepted])==output,
            'output_rows':len(output),'total_cents':sum(r['cents'] for r in output)}

def run_pipeline(batches, existing, schema):
    """Write output.csv (id,version,cents, newline '\\n'), rejected.json ({schema:[...],parse:[...]}),
    manifest.json (reconcile report plus schema_version). JSON uses indent=2, sorted keys. Return manifest.
    """
    import csv,json
    from pathlib import Path
    parsed,errors=parse_batches(batches);accepted,quarantined=validate_events(parsed,schema)
    output=upsert(existing,[entry['row'] for entry in accepted]);manifest={**reconcile(batches,accepted,quarantined,errors,output),'schema_version':schema['version']}
    with open('output.csv','w',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=['id','version','cents'],lineterminator='\n');writer.writeheader();writer.writerows(output)
    Path('rejected.json').write_text(json.dumps({'schema':quarantined,'parse':errors},indent=2,sort_keys=True))
    Path('manifest.json').write_text(json.dumps(manifest,indent=2,sort_keys=True))
    return manifest
