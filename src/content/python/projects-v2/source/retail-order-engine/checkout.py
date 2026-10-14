"""Catalog-driven checkout with deterministic integer-cent rounding."""
def price_cart(items, catalog, rules):
    """Return subtotal, discount, tax, total cents. Raise ValueError for unknown SKU or nonpositive/noninteger
    quantity (including bool). Catalog is a SKU->product dict; product price is nonnegative integer cents.
    Percentages are integers. Discount threshold is inclusive; tax follows discount; round half up.
    """
    subtotal = 0
    for item in items:
        product = catalog.get(item.get('sku'))
        quantity = item.get('quantity')
        if product is None or type(quantity) is not int or quantity <= 0:
            raise ValueError('invalid cart')
        price = product['price_cents']
        if type(price) is not int or price < 0:
            raise ValueError('invalid price')
        subtotal += price * quantity
    discount = (subtotal * rules['discount_percent'] + 50) // 100 if subtotal >= rules['threshold_cents'] else 0
    tax = ((subtotal - discount) * rules['tax_percent'] + 50) // 100
    return {'subtotal': subtotal, 'discount': discount, 'tax': tax, 'total': subtotal - discount + tax}

def process_orders(orders, catalog, rules):
    """Return (accepted, rejected). Allowed statuses paid/cancelled/refunded. Validate every cart.
    Accepted rows preserve id/status and computed amounts plus net_cents (total only for paid, else 0).
    Rejected rows retain id and source_index with reason 'invalid order'. A refund reverses the full sale.
    """
    accepted, rejected = [], []
    for i, order in enumerate(orders):
        try:
            if order['status'] not in ['paid', 'cancelled', 'refunded']: raise ValueError('status')
            amounts = price_cart(order['items'], catalog, rules)
            accepted.append({'id':order['id'], 'status':order['status'], **amounts, 'net_cents':amounts['total'] if order['status']=='paid' else 0})
        except (ValueError, KeyError, TypeError):
            rejected.append({'id':order.get('id'), 'source_index':i, 'reason':'invalid order'})
    return accepted, rejected

def order_summary(orders, accepted, rejected):
    """Report input/accepted/rejected counts, gross paid+refunded cents, refunded cents, net cents and accounted_for."""
    gross = sum(r['total'] for r in accepted if r['status'] in ['paid', 'refunded'])
    refunded = sum(r['total'] for r in accepted if r['status']=='refunded')
    return {'input':len(orders),'accepted':len(accepted),'rejected':len(rejected), 'gross_cents':gross,
            'refunded_cents':refunded,'net_cents':sum(r['net_cents'] for r in accepted),
            'accounted_for':sorted([r['id'] for r in accepted+rejected])==sorted(r['id'] for r in orders)}

def export_orders(orders, catalog, rules):
    """Write orders.json, rejected.json, summary.json (indent=2, sorted keys) and receipts.txt.
    One receipt line per accepted order: ID | STATUS | Total: $D.CC | Net: $D.CC, followed by newline.
    """
    import json
    from pathlib import Path
    accepted, rejected = process_orders(orders, catalog, rules)
    summary = order_summary(orders, accepted, rejected)
    for name, value in [('orders.json',accepted),('rejected.json',rejected),('summary.json',summary)]:
        Path(name).write_text(json.dumps(value,indent=2,sort_keys=True))
    receipt = ''.join(f"{r['id']} | {r['status']} | Total: ${r['total']//100}.{r['total']%100:02d} | Net: ${r['net_cents']//100}.{r['net_cents']%100:02d}\n" for r in accepted)
    Path('receipts.txt').write_text(receipt)
    return summary
