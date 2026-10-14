from pipeline import parse_batches,validate_events,upsert,reconcile

def parsing():
    parsed,errors=parse_batches({'a.jsonl':'{"id":"a"}\n\nbroken\n','b.jsonl':'[]\n'})
    assert parsed==[{'file':'a.jsonl','line':1,'row':{'id':'a'}},{'file':'b.jsonl','line':1,'row':[]}]
    assert errors==[{'file':'a.jsonl','line':3,'raw':'broken','reason':'invalid JSON'}]
    return True

def validation():
    schema={'required':['id','version','cents'],'min_version':1,'min_cents':0}
    rows=[{'id':'a','version':1,'cents':0},{'id':'b','version':True,'cents':0},{'id':'','version':1,'cents':1},{'id':'c','version':1,'cents':-1},[]]
    entries=[{'file':'x','line':i+1,'row':r} for i,r in enumerate(rows)]
    accepted,rejected=validate_events(entries,schema)
    assert accepted==entries[:1] and len(rejected)==4 and all(r['reason']=='invalid schema' for r in rejected)
    assert validate_events(entries[:1],{**schema,'min_cents':10})[0]==[]
    return True

def merging():
    base=[{'id':'b','version':2,'cents':100}];incoming=[{'id':'b','version':2,'cents':999},{'id':'a','version':1,'cents':50},{'id':'b','version':1,'cents':1}]
    output=upsert(base,incoming)
    assert output==[{'id':'a','version':1,'cents':50},{'id':'b','version':2,'cents':100}]
    assert upsert(output,incoming)==output and base[0]['cents']==100 and len(incoming)==3
    return True

def replay():
    batches={'x':'one\ntwo\n'};accepted=[{'file':'x','line':1,'row':{'id':'a','version':1,'cents':10}}];errors=[{'file':'x','line':2}]
    output=[{'id':'a','version':1,'cents':10}];report=reconcile(batches,accepted,[],errors,output)
    assert report['accounted_for'] and report['replay_ok'] and report['total_cents']==10
    assert not reconcile(batches,accepted,[],[{'file':'x','line':1}],output)['accounted_for']
    return True

def delivery():return verify_artifacts()
