from reporting import clean_orders,revenue_metrics,reconcile

def cleaning():
    rows=[{'id':'a','date':'2026-01-01','product':'p','cents':'100','status':' PAID '}, {'id':'b','date':'bad','product':'p','cents':'10','status':'paid'}]
    clean,rejected=clean_orders(rows,{'p':'home'})
    assert len(clean)==1 and clean[0]['status']=='paid' and clean[0]['category']=='home' and clean[0]['cents']==100
    assert rejected[0]['record']==rows[1] and rows[0]['status']==' PAID '
    assert len(clean_orders(rows[:1]*2,{'p':'home'})[1])==1
    assert clean_orders([],{'p':'home'})==([],[])
    return True

def revenue():
    clean=[{'id':'a','date':'2026-01-01','category':'home','status':'paid','cents':999}, {'id':'b','date':'2026-01-01','category':'home','status':'cancelled','cents':99}]
    result=revenue_metrics(clean,[{'order_id':'a','cents':'100'},{'order_id':'a','cents':'50'},{'order_id':'b','cents':'99'},{'order_id':'unknown','cents':'900'}],[{'order_id':'a','cents':'20'}])
    assert result==[{'date':'2026-01-01','category':'home','gross_cents':150,'refund_cents':20,'net_cents':130}]
    return True

def reconciliation():
    report=reconcile([{},{}],[{'source_index':0}],[{'source_index':1}],[{'gross_cents':150,'refund_cents':20,'net_cents':130}])
    assert report['accounted_for'] and report['balanced'] and report['net_cents']==130
    assert not reconcile([{},{}],[{'source_index':0}],[{'source_index':0}],[])['accounted_for']
    return True

def chart():
    from charts import revenue_chart
    from pathlib import Path
    revenue_chart([{'date':'2026-01-01','net_cents':10},{'date':'2026-01-02','net_cents':30}])
    assert '<svg' in Path('revenue.svg').read_text()
    # Restore full-run chart if this check is part of final verification.
    import csv
    if Path('daily_revenue.csv').exists():
        with open('daily_revenue.csv') as f:metrics=[{**r,'net_cents':int(r['net_cents'])} for r in csv.DictReader(f)]
        revenue_chart(metrics)
    return True

def delivery():return verify_artifacts()
