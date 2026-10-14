import json
from pathlib import Path
from checkout import export_orders

def main():
    products=json.loads(Path('catalog.json').read_text())
    orders=json.loads(Path('carts.json').read_text())
    rules=json.loads(Path('pricing_rules.json').read_text())
    print(json.dumps(export_orders(orders,{p['sku']:p for p in products},rules),indent=2))

if __name__=='__main__':
    main()
