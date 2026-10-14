"""Marketplace order quality, customer cohorts and repeat-purchase evidence."""
def clean_orders(orders):
    """Return a copy keeping first order_id, dropping missing/negative cents, then casting cents to int.
    Source dataframe must be unchanged. Source dates are valid ISO dates.
    """
    clean=orders.drop_duplicates('order_id',keep='first').dropna(subset=['cents']).copy()
    clean=clean.loc[clean['cents']>=0].copy();clean['cents']=clean['cents'].astype(int)
    return clean

def join_dimensions(clean, customers, products):
    """Left join customer_id -> cohort and product_id -> category with many_to_one validation.
    Fill missing cohort/category with 'unknown'; retain every clean order and original revenue.
    """
    joined=clean.merge(customers,on='customer_id',how='left',validate='many_to_one').merge(products,on='product_id',how='left',validate='many_to_one')
    joined['cohort']=joined['cohort'].fillna('unknown');joined['category']=joined['category'].fillna('unknown')
    return joined

def summarize(joined):
    """Return (summary, cohorts). cohorts DataFrame columns cohort,month,orders,revenue_cents; sorted cohort/month.
    Summary: orders,revenue_cents,customers,repeat_customers,unknown_customer_orders,unknown_product_orders,
    median_order_cents (float). Repeat customers have at least two orders; unknown IDs still count individually.
    """
    import pandas as pd
    work=joined.copy();work['month']=pd.to_datetime(work['date']).dt.strftime('%Y-%m')
    cohorts=work.groupby(['cohort','month'],as_index=False).agg(orders=('order_id','count'),revenue_cents=('cents','sum')).sort_values(['cohort','month']).reset_index(drop=True)
    summary={'orders':len(work),'revenue_cents':int(work['cents'].sum()),'customers':int(work['customer_id'].nunique()),
             'repeat_customers':int((work.groupby('customer_id').size()>=2).sum()),'unknown_customer_orders':int((work['cohort']=='unknown').sum()),
             'unknown_product_orders':int((work['category']=='unknown').sum()),'median_order_cents':float(work['cents'].median()) if len(work) else 0.0}
    return summary,cohorts

def export_analysis(orders, customers, products):
    """Write joined data to cleaned.csv (no index), cohorts.csv (no index), findings.json (sorted keys,
    indent=2) and cohorts.svg. Original order columns precede cohort/category. Use newline '\\n'.
    """
    import json
    from pathlib import Path
    from charts import cohort_chart
    clean=clean_orders(orders);joined=join_dimensions(clean,customers,products);summary,cohorts=summarize(joined)
    joined.to_csv('cleaned.csv',index=False,lineterminator='\n');cohorts.to_csv('cohorts.csv',index=False,lineterminator='\n')
    Path('findings.json').write_text(json.dumps(summary,indent=2,sort_keys=True));cohort_chart(cohorts)
    return summary
