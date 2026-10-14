import json,csv
from pathlib import Path
from pipeline import run_pipeline

def main():
    schema=json.loads(Path('schema.json').read_text())
    with open('existing.csv',newline='') as f:
        existing=[{'id':r['id'],'version':int(r['version']),'cents':int(r['cents'])} for r in csv.DictReader(f)]
    batches={name:Path(name).read_text() for name in ['batch_a.jsonl','batch_b.jsonl','batch_c.jsonl']}
    print(json.dumps(run_pipeline(batches,existing,schema),indent=2))

if __name__=='__main__':main()
