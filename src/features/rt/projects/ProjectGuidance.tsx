import { ListChecks } from "lucide-react";

export function DataNotes({ text }: { text: string }) {
  return <section className="project-data-notes"><h3><ListChecks size={20} aria-hidden="true" />Before you analyze</h3><ul>{text.split(/(?<=[.!?])\s+(?=[A-Z])/).map((note, i) => <li key={i}>{note}</li>)}</ul></section>;
}
