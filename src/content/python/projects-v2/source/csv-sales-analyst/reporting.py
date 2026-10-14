"""Sales reporting in integer cents, retaining rejected source identities."""
def clean_orders(rows, products):
    """Validate unique id, ISO date, known SKU, nonnegative integer cents and normalized paid/cancelled status.
    Keep first valid ID. Return (clean, rejected); clean includes category and source_index, rejected includes
    original row, source_index, reason='invalid order'. CSV numeric input is text; decimal strings are invalid.
    """
    from datetime import date
    clean,rejected,seen=[],[],set()
    for i,source in enumerate(rows):
        try:
            row=dict(source);row['status']=row['status'].strip().lower()
            date.fromisoformat(row['date']);row['cents']=int(row['cents'])
            if not row['id'] or row['id'] in seen or row['cents']<0 or row['product'] not in products or row['status'] not in ['paid','cancelled']:raise ValueError('invalid')
            row['category']=products[row['product']];row['source_index']=i
            clean.append(row);seen.add(row['id'])
        except (ValueError,KeyError,TypeError):rejected.append({'record':source,'source_index':i,'reason':'invalid order'})
    return clean,rejected

def revenue_metrics(clean, payments, returns):
    """payments/returns rows have order_id and integer cents strings. Aggregate captured/refunded cents by order.
    For paid clean orders only, return sorted daily category rows date,category,gross_cents,refund_cents,net_cents.
    Use captured payment amounts, not order face value; ignore unmatched and cancelled-order payments.
    """
    captured,refunded={},{}
    for row in payments:captured[row['order_id']]=captured.get(row['order_id'],0)+int(row['cents'])
    for row in returns:refunded[row['order_id']]=refunded.get(row['order_id'],0)+int(row['cents'])
    groups={}
    for row in clean:
        if row['status']!='paid':continue
        key=(row['date'],row['category']);gross=captured.get(row['id'],0);refund=refunded.get(row['id'],0)
        metric=groups.setdefault(key,{'date':key[0],'category':key[1],'gross_cents':0,'refund_cents':0,'net_cents':0})
        metric['gross_cents']+=gross;metric['refund_cents']+=refund;metric['net_cents']+=gross-refund
    return [groups[key] for key in sorted(groups)]

def reconcile(rows, clean, rejected, metrics):
    """Return input/clean/rejected, accounted_for by source index, gross/refund/net totals and balanced."""
    gross=sum(r['gross_cents'] for r in metrics);refund=sum(r['refund_cents'] for r in metrics);net=sum(r['net_cents'] for r in metrics)
    return {'input':len(rows),'clean':len(clean),'rejected':len(rejected),'accounted_for':sorted(r['source_index'] for r in clean+rejected)==list(range(len(rows))),
            'gross_cents':gross,'refund_cents':refund,'net_cents':net,'balanced':gross-refund==net}

def export_report(rows, products, payments, returns):
    """Write clean.csv, daily_revenue.csv, rejected.json, quality.json and revenue.svg.
    CSV: newline '\\n', clean fields id,date,product,cents,status,category,source_index;
    metrics fields date,category,gross_cents,refund_cents,net_cents. JSON indent=2 and sorted keys.
    Chart uses daily total net revenue; SVG is a portable generated text artifact.
    """
    import csv,json
    from pathlib import Path
    from charts import revenue_chart
    clean,rejected=clean_orders(rows,products);metrics=revenue_metrics(clean,payments,returns);quality=reconcile(rows,clean,rejected,metrics)
    for name,data,fields in [('clean.csv',clean,['id','date','product','cents','status','category','source_index']),('daily_revenue.csv',metrics,['date','category','gross_cents','refund_cents','net_cents'])]:
        with open(name,'w',newline='') as f:
            w=csv.DictWriter(f,fieldnames=fields,lineterminator='\n');w.writeheader();w.writerows(data)
    Path('rejected.json').write_text(json.dumps(rejected,indent=2,sort_keys=True));Path('quality.json').write_text(json.dumps(quality,indent=2,sort_keys=True))
    revenue_chart(metrics)
    return quality
