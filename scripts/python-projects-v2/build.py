"""Generate deterministic Project V2 datasets, manifests and independently runnable reference bundles.
Run with Python with pandas/matplotlib installed; never touches V1 content or learner storage.
"""
import ast, csv, hashlib, io, json, os, random, subprocess, sys, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'src/content/python/projects-v2/source'

def csv_text(rows, fields):
    out=io.StringIO(newline='');w=csv.DictWriter(out,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(rows);return out.getvalue()
def jt(v): return json.dumps(v,sort_keys=True,indent=2)
def jl(v): return '\n'.join(json.dumps(x,sort_keys=True) if not isinstance(x,str) else x for x in v)+'\n'
def starter(source):
    tree=ast.parse(source)
    for node in tree.body:
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):
            doc=ast.get_docstring(node) or 'Implement this function using the milestone requirements.'
            node.body=[ast.Expr(value=ast.Constant(doc)),ast.Raise(exc=ast.Call(func=ast.Name(id='NotImplementedError',ctx=ast.Load()),args=[ast.Constant('Implement '+node.name)],keywords=[]))]
    return ast.unparse(ast.fix_missing_locations(tree))+'\n'
CANONICAL='''
def canonical_artifact(path,text):
    import json,csv,io
    if path.endswith('.json'):return json.dumps(json.loads(text),sort_keys=True,separators=(',',':'))
    if path.endswith('.csv'):return json.dumps(list(csv.DictReader(io.StringIO(text))),sort_keys=True,separators=(',',':'))
    return text
'''
exec(CANONICAL)
VERIFY=CANONICAL+'''\ndef verify_artifacts():
    import hashlib, json
    from pathlib import Path
    expected=json.loads(Path('_expected.json').read_text())
    for path, digest in expected['sha256'].items():
        assert Path(path).is_file(), 'Missing artifact: '+path
        text=Path(path).read_text()
        assert hashlib.sha256(canonical_artifact(path,text).encode()).hexdigest()==digest, 'Artifact content differs: '+path
    for path in expected['charts']:
        text=Path(path).read_text()
        assert '<svg' in text and len(text)>1000, 'Missing or empty SVG chart'
    return True
'''

def build_project(config, files):
    slug=config['slug'];folder=SOURCE/slug
    reference={p.name:p.read_text() for p in folder.glob('*.py') if p.name!='checks.py'}
    main=reference['main.py'];editable={name:(text if name=='main.py' else starter(text)) for name,text in reference.items()}
    checks=(folder/'checks.py').read_text()+VERIFY
    all_functions=[c['function'] for m in config['milestones'] for c in m['checks']]
    unittest_code='import unittest\nimport _acceptance\n\nif __name__ == "__main__":\n    suite = unittest.TestSuite(unittest.FunctionTestCase(getattr(_acceptance, name)) for name in '+repr(all_functions)+')\n    result = unittest.TextTestRunner(verbosity=2).run(suite)\n    raise SystemExit(0 if result.wasSuccessful() else 1)\n'
    with tempfile.TemporaryDirectory() as tmp:
        work=Path(tmp)
        for name,text in {**files,**reference}.items(): (work/name).write_text(text)
        subprocess.run([sys.executable,'main.py'],cwd=work,check=True,stdout=subprocess.DEVNULL)
        expected={'sha256':{},'charts':[]}
        for name in config['artifacts']:
            text=(work/name).read_text()
            assert len(text)<200000,(slug,name,len(text))
            if name.endswith('.svg'):expected['charts'].append(name)
            else:expected['sha256'][name]=hashlib.sha256(canonical_artifact(name,text).encode()).hexdigest()
        for name,text in {'_expected.json':jt(expected),'_acceptance.py':checks,'test_project.py':unittest_code}.items(): (work/name).write_text(text)
        subprocess.run([sys.executable,'test_project.py'],cwd=work,check=True)
        invariants={name:json.loads((work/name).read_text()) for name in config['artifacts'] if name in ['quality.json','summary.json','manifest.json','metrics.json','findings.json']}
    datasets=[]
    for name,text in files.items():
        if name.endswith('.csv'):
            parsed=list(csv.DictReader(io.StringIO(text)));schema=', '.join(parsed[0]) if parsed else text.splitlines()[0];sample=csv_text(parsed[:5],list(parsed[0])) if parsed else text
        elif name.endswith('.jsonl'):
            parsed=text.splitlines();schema=config.get('jsonl_schema','JSON object per line; malformed lines intentionally included');sample='\n'.join(parsed[:5])
        else:
            value=json.loads(text);parsed=value if isinstance(value,list) else [value];schema=', '.join(parsed[0]) if parsed and isinstance(parsed[0],dict) else 'JSON values';sample=jt(parsed[:5] if isinstance(value,list) else value)
        datasets.append({'path':name,'format':name.rsplit('.',1)[-1],'rows':len(parsed),'schema':schema,'purpose':config['purposes'].get(name,''),'sample':sample})
    protected={**files,'_acceptance.py':checks,'_expected.json':jt(expected),'test_project.py':unittest_code}
    readme=f"# {config['title']}\n\n{config['objective']}\n\nRevision: 2.0.0; deterministic seed: {config['seed']}.\n\n{config['generation']}\n\nRun `python main.py`, then `python test_project.py`.\nDependencies: {', '.join(config['packages']) or 'Python standard library'}.\nInput files are read-only in Runtime. Edit the Python source files.\n"
    protected['README.md']=readme
    return {**{k:v for k,v in config.items() if k not in ['purposes','jsonl_schema']},'revision':'2.0.0','ref':'python:project:'+slug,'files':protected,'starters':editable,'reference':reference,'datasets':datasets,'invariants':invariants,'acceptance':[c for m in config['milestones'] for c in m['checks']]}

def milestone(n,title,objective,requirements,function):
    return {'id':f'stage-{n}','title':title,'objective':objective,'requirements':requirements,'checks':[{'id':f'v2-{n}','label':title,'function':function}]}

def customer():
    rng=random.Random(2101);rows=[]
    for i in range(600):
        row={'id':f'C{i:04}','name':f'  customer {i}  ','email':f' USER{i}@EXAMPLE.TEST ','region':rng.choice(['north','south','west'])}
        if i%19==0:row.pop('name')
        elif i%17==0:row['email']='broken-address'
        elif i%13==0:row['email']=f'user{i}@blocked.test'
        elif i%11==0:row['email']=f'user{i-1}@example.test'
        elif i%23==0:row['id']=f'C{i-1:04}'
        rows.append(row)
    rules={'required':['id','name','email'],'blocked_domains':['blocked.test']}
    config={'slug':'customer-data-quality','title':'Customer Data Quality System','level':'Intermediate','analytical':False,'seed':2101,'packages':[],
      'objective':'Build a reusable customer-feed cleaning tool that accounts for every source record and explains every rejection.',
      'scenario':'Two regional exports must be combined before a CRM import. Operations needs reproducible cleaning, configurable validation, duplicate handling and evidence that no record disappeared.',
      'generation':'Seed 2101 selects regions for 600 customers. Divisibility rules inject missing names (19), invalid email (17), blocked domains (13), duplicate emails (11), and conflicting IDs (23), in that precedence order. File A precedes B. Source index is the concatenated zero-based position.',
      'purposes':{'customers_a.json':'First regional feed; process before B.','customers_b.json':'Second feed; duplicates may reference earlier records.','rules.json':'Required fields and blocked email domains.'},
      'artifacts':['clean.json','rejected.json','quality.json'],'interpretation':'',
      'milestones':[
       milestone(1,'Normalize without losing evidence','Implement normalize_customer in cleaning.py.',['Copy each input dictionary; never mutate it.','Normalize string names and emails only.','Preserve extra fields and nonstring values for later validation.'],'normalization'),
       milestone(2,'Validate and quarantine','Implement clean_customers(records, rules).',['Use the configured required fields and blocked domains.','Reject empty/invalid email parts and whitespace inside addresses.','First valid ID/email wins; retain original rejected records with source_index and reason.','Reason precedence: missing field, invalid email, blocked domain, duplicate id, duplicate email.'],'validation'),
       milestone(3,'Reconcile every source position','Implement quality_report.',['Compare source positions, not just record counts or IDs.','Report input, accepted, rejected, accounted_for, and reason counts.','Duplicate source positions must fail reconciliation.'],'reconciliation'),
       milestone(4,'Deliver the complete tool','Implement export_quality, run main.py, then check the complete project.',['Write clean.json, rejected.json and quality.json using indent=2 and sorted keys.','The report must reconcile both feeds.','Run the supplied tests; deliver actual generated files with your code.'],'delivery') ]}
    return config,{'customers_a.json':jt(rows[:300]),'customers_b.json':jt(rows[300:]),'rules.json':jt(rules)}

if __name__=='__main__':
    from datasets import retail, sales, events, marketplace, etl
    projects=[build_project(*factory()) for factory in [customer,retail,sales,events,marketplace,etl]]
    output=ROOT/'src/content/python/projects-v2/catalog.json';output.write_text(jt(projects)+'\n');print('Built',len(projects),'projects')
