import csv,json
from reporting import export_report

def main():
    def read(name):
        with open(name,newline='') as f:return list(csv.DictReader(f))
    products={r['product']:r['category'] for r in read('products.csv')}
    print(json.dumps(export_report(read('orders.csv'),products,read('payments.csv'),read('returns.csv')),indent=2))

if __name__=='__main__':main()
