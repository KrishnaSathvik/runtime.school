import pandas as pd
from analysis import clean_orders,join_dimensions,summarize

def cleaning():
    source=pd.DataFrame({'order_id':['a','a','b','c','d'],'cents':[100,999,None,-1,250]})
    result=clean_orders(source)
    assert result['order_id'].tolist()==['a','d'] and result['cents'].tolist()==[100,250]
    assert len(source)==5 and source['cents'].isna().sum()==1
    return True

def joins():
    clean=pd.DataFrame({'order_id':['a','b'],'customer_id':['c1','missing'],'product_id':['p1','missing'],'date':['2026-01-01']*2,'cents':[100,200]})
    customers=pd.DataFrame({'customer_id':['c1'],'cohort':['2026-01']});products=pd.DataFrame({'product_id':['p1'],'category':['home']})
    joined=join_dimensions(clean,customers,products)
    assert len(joined)==2 and joined['cents'].sum()==300 and joined.iloc[1]['cohort']=='unknown' and joined.iloc[1]['category']=='unknown'
    try:join_dimensions(clean,pd.concat([customers,customers]),products)
    except pd.errors.MergeError:pass
    else:raise AssertionError('Duplicate dimension rows must fail')
    return True

def metrics():
    joined=pd.DataFrame({'order_id':['a','b','c'],'customer_id':['c1','c1','c9'],'date':['2026-01-01','2026-02-01','2026-01-02'],'cents':[100,200,300],'cohort':['2026-01','2026-01','unknown'],'category':['home','home','unknown']})
    summary,cohorts=summarize(joined)
    assert summary=={'orders':3,'revenue_cents':600,'customers':2,'repeat_customers':1,'unknown_customer_orders':1,'unknown_product_orders':1,'median_order_cents':200.0}
    assert int(cohorts['revenue_cents'].sum())==600 and len(cohorts)==3
    return True

def chart():
    from charts import cohort_chart
    from pathlib import Path
    cohort_chart(pd.DataFrame({'cohort':['new','unknown'],'month':['2026-01','2026-01'],'revenue_cents':[100,200]}))
    assert '<svg' in Path('cohorts.svg').read_text()
    if Path('cohorts.csv').exists():cohort_chart(pd.read_csv('cohorts.csv'))
    return True

def delivery():return verify_artifacts()
