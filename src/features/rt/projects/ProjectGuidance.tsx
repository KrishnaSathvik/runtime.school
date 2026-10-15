import { ListChecks } from "lucide-react";

export function MetricDefinitions({ definitions }: { definitions: string[] }) {
  return <div className="project-metrics">{definitions.flatMap(d => d.split(/(?:;\s+|\.\s+)(?=[a-z][a-z_]+\s*=)/)).map((definition, i) => {
    const match = definition.match(/^([^:=]{1,50})\s*[:=]\s*([\s\S]+)$/);
    return <div key={i}>{match ? <><strong>{match[1].trim()}</strong><p>{match[2]}</p></> : <p>{definition}</p>}</div>;
  })}</div>;
}
export function DataNotes({ text }: { text: string }) {
  return <section className="project-data-notes"><h3><ListChecks size={20} aria-hidden="true" />Before you analyze</h3><ul>{text.split(/(?<=[.!?])\s+(?=[A-Z])/).map((note, i) => <li key={i}>{note}</li>)}</ul></section>;
}
