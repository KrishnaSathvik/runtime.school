import json
from pathlib import Path
from cleaning import export_quality

def main():
    records = json.loads(Path('customers_a.json').read_text()) + json.loads(Path('customers_b.json').read_text())
    rules = json.loads(Path('rules.json').read_text())
    report = export_quality(records, rules)
    print(json.dumps(report, indent=2))

if __name__ == '__main__':
    main()
