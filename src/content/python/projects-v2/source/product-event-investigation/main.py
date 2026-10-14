import json
from pathlib import Path
from analytics import export_analysis

def main():
    lines=Path('events.jsonl').read_text().splitlines()
    schema=json.loads(Path('event_schema.json').read_text())
    print(json.dumps(export_analysis(lines,schema['required']),indent=2))

if __name__=='__main__':main()
