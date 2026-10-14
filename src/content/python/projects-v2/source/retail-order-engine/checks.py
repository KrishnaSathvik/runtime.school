from checkout import price_cart,process_orders,order_summary

def pricing():
    catalog={'x':{'price_cents':125},'y':{'price_cents':1000}}
    rules={'threshold_cents':1000,'discount_percent':10,'tax_percent':8}
    assert price_cart([{'sku':'x','quantity':2}],catalog,rules)=={'subtotal':250,'discount':0,'tax':20,'total':270}
    assert price_cart([{'sku':'y','quantity':1}],catalog,rules)['total']==972
    assert price_cart([],catalog,rules)['total']==0
    assert price_cart([{'sku':'x','quantity':1}],catalog,{**rules,'tax_percent':10})['tax']==13
    for items in [[{'sku':'bad','quantity':1}],[{'sku':'x','quantity':True}],[{'sku':'x','quantity':0}],[{'sku':'x','quantity':-1}]]:
        try:price_cart(items,catalog,rules)
        except ValueError:pass
        else:raise AssertionError('Invalid cart accepted')
    return True

def lifecycle():
    catalog={'x':{'price_cents':1000}};rules={'threshold_cents':99999,'discount_percent':0,'tax_percent':0}
    orders=[{'id':str(i),'status':s,'items':[{'sku':'x','quantity':1}]} for i,s in enumerate(['paid','refunded','cancelled','invalid'])]
    accepted,rejected=process_orders(orders,catalog,rules)
    assert [r['net_cents'] for r in accepted]==[1000,0,0] and rejected==[{'id':'3','source_index':3,'reason':'invalid order'}]
    assert orders[0]['items']==[{'sku':'x','quantity':1}]
    return True

def reconciliation():
    orders=[{'id':'a'},{'id':'b'},{'id':'c'}]
    accepted=[{'id':'a','status':'paid','total':100,'net_cents':100},{'id':'b','status':'refunded','total':40,'net_cents':0}]
    result=order_summary(orders,accepted,[{'id':'c'}])
    assert result['gross_cents']==140 and result['refunded_cents']==40 and result['net_cents']==100 and result['accounted_for']
    assert not order_summary(orders,accepted,[{'id':'b'}])['accounted_for']
    return True

def delivery():return verify_artifacts()
