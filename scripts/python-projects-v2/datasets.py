from build import milestone, csv_text, jt, jl
import random
from datetime import date,timedelta,datetime,timezone

def retail():
    rng=random.Random(2102)
    products=[{'sku':f'P{i:03}','name':f'Product {i}','category':['home','office','outdoor'][i%3],'price_cents':rng.randrange(100,9000,25)} for i in range(64)]
    orders=[]
    for i in range(48):
        items=[{'sku':rng.choice(products)['sku'],'quantity':rng.randint(1,4)} for _ in range(1+i%4)]
        if i%11==0:items[0]['quantity']=-1
        elif i%13==0:items[0]['sku']='missing'
        elif i%17==0:items[0]['quantity']=True
        orders.append({'id':f'O{i:03}','status':'refunded' if i%7==0 else 'cancelled' if i%9==0 else 'paid','items':items})
    config={'slug':'retail-order-engine','title':'Retail Checkout & Order Processing','level':'Beginner–Intermediate','analytical':False,'seed':2102,'packages':[],
      'objective':'Deliver a catalog-driven checkout engine with validated carts, discounts, tax, cancellation/refund accounting and receipts.',
      'scenario':'A small retailer needs the same pricing rules applied consistently to online cart scenarios. Finance needs to distinguish gross sales, full refunds and net paid revenue.',
      'generation':'Seed 2102 creates 64 products and 48 carts with one to four lines. Cases divisible by 11 have negative quantity, 13 unknown SKU, 17 boolean quantity (in that order); statuses include refunds every 7th case and cancellations every 9th remaining case. Amounts are integer cents.',
      'purposes':{'catalog.json':'Product IDs, categories and authoritative prices.','carts.json':'Paid, cancelled, refunded and malformed order scenarios.','pricing_rules.json':'Inclusive discount threshold and integer percentage rates.'},
      'artifacts':['orders.json','rejected.json','summary.json','receipts.txt'],'interpretation':'',
      'milestones':[
       milestone(1,'Price a reusable cart','Implement price_cart in checkout.py.',['Catalog prices are authoritative. Raise ValueError for unknown SKU, invalid price or nonpositive/noninteger quantity; booleans are invalid.','Discount threshold is inclusive; tax follows discount. Round integer percentages half up.','Return subtotal, discount, tax and total in cents; empty cart totals zero.'],'pricing'),
       milestone(2,'Handle the order lifecycle','Implement process_orders.',['Validate every order, including cancellations and refunds.','Paid orders contribute total to net_cents; cancelled/refunded orders contribute zero.','Retain rejected order ID, source_index and reason invalid order.'],'lifecycle'),
       milestone(3,'Reconcile sales and refunds','Implement order_summary.',['Gross includes paid and fully refunded orders; refunded_cents reverses refunds.','Reconcile IDs across accepted and rejected inputs.','Report input, accepted, rejected, gross_cents, refunded_cents, net_cents and accounted_for.'],'reconciliation'),
       milestone(4,'Deliver receipts and tested code','Implement export_orders and run the entire project.',['Export deterministic JSON (indent=2, sorted keys).','Receipt format is documented in export_orders.','All inputs must reconcile and the complete program must pass acceptance.'],'delivery')]}
    return config,{'catalog.json':jt(products),'carts.json':jt(orders),'pricing_rules.json':jt({'threshold_cents':5000,'discount_percent':10,'tax_percent':8})}

def sales():
    rng=random.Random(2103);orders=[];payments=[];returns=[]
    products=[{'product':f'p{i}','category':['home','office','outdoor'][i%3]} for i in range(24)]
    for i in range(1200):
        row={'id':f'O{i:04}','date':str(date(2026,1,1)+timedelta(days=i%90)),'product':f'p{i%24}','cents':rng.randrange(200,15000,100),'status':'cancelled' if i%9==0 else ' PAID '}
        if i%41==0:row['date']='bad-date'
        elif i%43==0:row['product']='unknown'
        elif i%47==0:row['cents']=-100
        orders.append(row)
        if row['status']!='cancelled':
            payments.append({'order_id':row['id'],'cents':max(0,row['cents'])})
            if i%13==0:returns.append({'order_id':row['id'],'cents':max(0,row['cents'])//2})
    payments.append({'order_id':'orphan','cents':500})
    config={'slug':'csv-sales-analyst','title':'Sales Reporting Pipeline','level':'Intermediate','analytical':True,'seed':2103,'packages':['matplotlib'],
      'objective':'Produce repeatable, reconciled net-sales reports from orders, product categories, payments and returns.',
      'scenario':'Operations and finance disagree because order face values include cancellations and do not subtract returns. Build a report using captured payments for valid paid orders and explain the exclusions.',
      'generation':'Seed 2103 determines amounts for 1,200 orders over 90 days and 24 products. Every 9th order is cancelled; every 41st date is invalid, 43rd product unknown, 47th amount negative (precedence in that order). Eligible every 13th order has a half refund. One payment references an unknown order.',
      'purposes':{'orders.csv':'Transactions requiring normalization and validation.','products.csv':'Product-to-category lookup.','payments.csv':'Captured amounts; includes one orphan payment.','returns.csv':'Partial refunds keyed by order ID.'},
      'artifacts':['clean.csv','daily_revenue.csv','rejected.json','quality.json','revenue.svg'],
      'interpretation':'Report net revenue with evidence from quality.json. Explain excluded orders, the orphan payment, refunds and a limitation of the synthetic 90-day sample. Reference at least one daily pattern from revenue.svg.',
      'milestones':[
       milestone(1,'Validate the order source','Implement clean_orders in reporting.py.',['Parse dates and integer cents; normalize status.','Require known product, first valid unique ID and nonnegative amount.','Preserve source_index and original rejected records.'],'cleaning'),
       milestone(2,'Reconcile payments and returns','Implement revenue_metrics.',['Group valid paid orders by date and category.','Aggregate captured payments and refunds by order ID.','Exclude cancelled, rejected and unmatched orders from revenue; use payments rather than face value.'],'revenue'),
       milestone(3,'Prove row and money balances','Implement reconcile.',['Account for every source position exactly once.','Report gross_cents, refund_cents and net_cents.','Balance gross minus refunds against net.'],'reconciliation'),
       milestone(4,'Visualize daily net revenue','Implement revenue_chart in charts.py.',['Aggregate daily net cents across categories.','Save a labeled line chart to revenue.svg; close the figure.','Do not embed a static example chart.'],'chart'),
       milestone(5,'Deliver a repeatable report','Implement export_report and run main.py.',['Write the CSV column order specified in the function contract with newline \\n.','JSON uses indent=2 and sorted keys.','Verify all outputs and write one final interpretation of the results.'],'delivery')]}
    return config,{'orders.csv':csv_text(orders,['id','date','product','cents','status']),'products.csv':csv_text(products,['product','category']),'payments.csv':csv_text(payments,['order_id','cents']),'returns.csv':csv_text(returns,['order_id','cents'])}

def events():
    rng=random.Random(2104);rows=[];counter=0
    for week in range(8):
        for user in range(140):
            if week<user%3 or (week+user)%5==0 and week!=user%3:continue
            start=datetime(2026,1,5,tzinfo=timezone.utc)+timedelta(weeks=week,days=user%7,hours=10,minutes=user%10)
            actions=['view','cart','view']+(['buy'] if (user+week)%3 else [])
            if (user+week)%17==0:actions=['buy','view','cart']
            for step,action in enumerate(actions):
                rows.append({'id':f'e{counter:05}','user':f'u{user:03}','type':action,'at':(start+timedelta(minutes=step*3)).isoformat()});counter+=1
    rng.shuffle(rows)
    lines=[]
    for i,row in enumerate(rows):
        lines.append(row)
        if i%71==0:lines.append(dict(row))
        if i%113==0:lines.append({'id':f'bad{i}','user':row['user']})
        if i%227==0:lines.append('malformed-json')
    config={'slug':'product-event-investigation','title':'Product Analytics Investigation','level':'Intermediate–Advanced','analytical':True,'seed':2104,'packages':['matplotlib'],
      'objective':'Investigate product activity with validated events, inactivity-based sessions, chronological conversion, weekly retention and a chart.',
      'scenario':'A product team sees a high conversion count but knows event delivery can be duplicated and late. Reconstruct sessions and report defensible metrics, distinguishing event presence from valid purchase sequences.',
      'generation':'Seed 2104 shuffles events for 140 users over eight weeks. User modulo 3 determines first week, modulo 5 creates gaps, modulo 3 creates abandoned sessions, modulo 17 creates buy-before-view sessions. Every 71st source event is duplicated; missing fields are injected every 113th and malformed JSON every 227th. Sessions use a 30-minute inactivity threshold.',
      'jsonl_schema':'id: string, user: string, type: view/cart/buy, at: timezone-aware ISO timestamp',
      'purposes':{'events.jsonl':'Out-of-order activity with deliberate duplicates, incomplete and malformed records.','event_schema.json':'Required event fields.'},
      'artifacts':['summary.json','retention.csv','rejected.json','quality.json','activity.svg'],
      'interpretation':'Cite users, sessions and chronological conversions from summary.json. Explain how duplicates, source ordering and invalid events affect the funnel. Describe one retention pattern and why observed cohorts are not causal evidence.',
      'milestones':[
       milestone(1,'Establish trustworthy events','Implement parse_events.',['Validate required fields, event type and timezone-aware timestamp.','Keep first valid event ID; retain rejected line numbers, raw text and reason invalid or duplicate.','Ignore blank lines, but reconcile every nonblank source line.'],'quality'),
       milestone(2,'Reconstruct sessions','Implement sessionize.',['Sort by user, parsed timestamp and event ID.','A gap strictly greater than 30 minutes starts a session; exactly 30 does not.','Return session id, user and copied events in chronological order.'],'sessions'),
       milestone(3,'Measure conversion and retention','Implement analyze.',['Require a purchase strictly after a view within the same session.','Use Monday weeks; first observed week defines cohort.','Calculate active users, events and cohort-relative retention; rates use six decimals.'],'funnel'),
       milestone(4,'Visualize weekly activity','Implement activity_chart in charts.py.',['Plot calculated weekly active users.','Label axes and save activity.svg.','Close figures to avoid leaking plot state.'],'chart'),
       milestone(5,'Deliver reproducible evidence','Implement export_analysis and run the full project.',['Export calculated metrics, rejection evidence, retention and chart.','Use specified CSV fields/newline and sorted, indented JSON.','Write a final interpretation using verified values and limitations.'],'delivery')]}
    return config,{'events.jsonl':jl(lines),'event_schema.json':jt({'required':['id','user','type','at']})}

def marketplace():
    rng=random.Random(2105)
    customers=[{'customer_id':f'C{i:03}','cohort':f'2026-0{1+i%3}'} for i in range(240)]
    products=[{'product_id':f'P{i:02}','category':['home','office','outdoor','electronics'][i%4]} for i in range(32)]
    orders=[]
    for i in range(2400):
        customer=(180+i-2340) if i>=2340 else rng.randrange(180);month=max(1+customer%3,1+i%6)
        row={'order_id':f'O{i:04}','customer_id':f'C{customer:03}','product_id':f'P{i%32:02}','date':f'2026-{month:02}-{1+i%28:02}','cents':rng.randrange(100,20000,100)}
        if i%37==0:row['cents']=''
        elif i%41==0:row['cents']=-100
        if i%53==0:row['customer_id']='C999'
        if i%67==0:row['product_id']='P99'
        orders.append(row)
        if i%59==0:orders.append(dict(row))
    config={'slug':'marketplace-eda','title':'Marketplace Analytics','level':'Advanced','analytical':True,'seed':2105,'packages':['pandas','matplotlib'],
      'objective':'Analyze customer cohorts, repeat purchasing and revenue coverage with pandas, preserving unmatched orders and delivering data-backed charts.',
      'scenario':'A marketplace wants to understand repeat purchasing and cohort revenue. Customer and product dimensions are incomplete, while the order export has duplicates and missing amounts. Explain what the analysis includes and excludes.',
      'generation':'Seed 2105 chooses customers and amounts for 2,400 base orders across six months, 240 customers and 32 products. The first 180 customers can repeat; the final 60 base orders introduce one-time customers, subject to the same quality exclusions. Every 37th amount is missing, otherwise every 41st negative; every 53rd customer and 67th product is unmatched; every 59th order is duplicated. Order month cannot precede the known customer cohort.',
      'purposes':{'orders.csv':'Order sample with duplicate IDs and missing/negative amounts.','customers.csv':'Customer cohort dimension.','products.csv':'Product category dimension.'},
      'artifacts':['cleaned.csv','cohorts.csv','findings.json','cohorts.svg'],
      'interpretation':'Use findings.json to report revenue, repeat customers and unmatched coverage. Compare at least two cohort/month results. Explain missing-amount exclusions, why unknown cohorts remain, and why this synthetic sample cannot establish real market trends.',
      'milestones':[
       milestone(1,'Clean without erasing the source','Implement clean_orders in analysis.py.',['Keep first order_id, then remove missing/negative cents.','Copy the result and cast cents to integer.','Preserve the original dataframe for quality comparisons.'],'cleaning'),
       milestone(2,'Join without losing revenue','Implement join_dimensions.',['Left join customers and products with many_to_one validation.','Label unmatched cohort/category unknown.','Duplicate dimension keys must raise a merge error.'],'joins'),
       milestone(3,'Measure customer and cohort behavior','Implement summarize.',['Return the documented summary metrics and sorted cohort/month dataframe.','Repeat customers have at least two retained orders.','Include unknown cohorts and reconcile cohort revenue to all cleaned revenue.'],'metrics'),
       milestone(4,'Chart cohort revenue','Implement cohort_chart in charts.py.',['Plot monthly revenue for each cohort including unknown.','Label axes and legend; export cohorts.svg.'],'chart'),
       milestone(5,'Deliver analysis with limitations','Implement export_analysis and run main.py.',['Export cleaned records, cohort summary, findings and chart.','Preserve documented column order and JSON formatting.','Write an evidence-backed final interpretation.'],'delivery')]}
    return config,{'orders.csv':csv_text(orders,['order_id','customer_id','product_id','date','cents']),'customers.csv':csv_text(customers,['customer_id','cohort']),'products.csv':csv_text(products,['product_id','category'])}

def etl():
    rng=random.Random(2106);rows=[]
    for i in range(1500):
        row={'id':f'K{i%420:04}','version':rng.randint(1,5),'cents':rng.randrange(0,10000)}
        if i%29==0:row['cents']=-1
        elif i%31==0:row['version']=True
        elif i%37==0:row.pop('id')
        if i%43==0:row='not-json'
        rows.append(row)
    existing=[{'id':f'K{i:04}','version':1,'cents':100+i} for i in range(200)]
    config={'slug':'reliable-mini-etl','title':'Incremental ETL Pipeline','level':'Advanced','analytical':False,'seed':2106,'packages':[],
      'objective':'Build a replay-safe incremental pipeline with configurable schema validation, deterministic upserts, rejection evidence and a run manifest.',
      'scenario':'Three daily feeds contain repeated entity updates, stale versions and malformed records. Apply them to an existing target without double-counting or losing evidence. Operations must be able to replay the same files safely.',
      'generation':'Seed 2106 generates 1,500 source lines across three ordered batches of 500, updating 420 IDs at versions 1–5. Every 29th amount is negative, otherwise every 31st version is boolean and 37th ID missing. Every 43rd line overrides these with malformed JSON. The initial target contains 200 version-1 records.',
      'jsonl_schema':'id: nonempty string, version: integer >= 1, cents: integer >= 0; intentionally malformed rows included',
      'purposes':{'batch_a.jsonl':'First incremental batch.','batch_b.jsonl':'Second batch; includes updates and stale versions.','batch_c.jsonl':'Third batch; equal versions retain existing values.','existing.csv':'Initial typed target records.','schema.json':'Required fields, numeric bounds and schema version.'},
      'artifacts':['output.csv','rejected.json','manifest.json'],'interpretation':'',
      'milestones':[
       milestone(1,'Parse batches with traceable errors','Implement parse_batches in pipeline.py.',['Keep filename and one-based line number on every parsed value or error.','Ignore blank lines; malformed JSON must not stop the batch.','Process files in supplied order.'],'parsing'),
       milestone(2,'Enforce the data contract','Implement validate_events.',['Use configured fields and minimum values.','Reject booleans where integer values are required.','Retain malformed record shapes in quarantine with original row and source location.'],'validation'),
       milestone(3,'Apply deterministic updates','Implement upsert.',['Highest version wins; existing value wins ties.','Do not mutate either input.','Return id,version,cents records sorted by ID.'],'merging'),
       milestone(4,'Prove replay and reconciliation','Implement reconcile.',['Account for exact source file/line identities.','Replay accepted records against output and require unchanged results.','Report source count, accepted/rejected, output count and total cents.'],'replay'),
       milestone(5,'Deliver the pipeline and manifest','Implement run_pipeline and run main.py.',['Export output.csv, rejected.json and manifest.json with documented formats.','Manifest includes schema_version and reconciled processing evidence.','Run all acceptance tests and download the actual pipeline bundle.'],'delivery')]}
    return config,{'batch_a.jsonl':jl(rows[:500]),'batch_b.jsonl':jl(rows[500:1000]),'batch_c.jsonl':jl(rows[1000:]),'existing.csv':csv_text(existing,['id','version','cents']),'schema.json':jt({'version':1,'required':['id','version','cents'],'min_version':1,'min_cents':0})}
