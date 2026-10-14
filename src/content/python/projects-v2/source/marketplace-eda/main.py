import json
import pandas as pd
from analysis import export_analysis

def main():
    print(json.dumps(export_analysis(pd.read_csv('orders.csv'),pd.read_csv('customers.csv'),pd.read_csv('products.csv')),indent=2))

if __name__=='__main__':main()
