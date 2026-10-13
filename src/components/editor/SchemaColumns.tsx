type Column = {
  name: string;
  type: string;
  key: string | null;
  references?: string;
};

/** One scannable row per column: name, type, PK/FK, optional reference. */
export function SchemaColumns({ columns, className }: { columns: Column[]; className?: string }) {
  if (!columns.length) return null;
  return (
    <ul className={className ? `schema-columns ${className}` : "schema-columns"}>
      {columns.map((c) => (
        <li key={c.name}>
          <code className="schema-name">{c.name}</code>
          <span className="schema-type">{c.type.toLowerCase()}</span>
          <span>
            {c.key ? <span className="schema-key">{c.key}</span> : null}
            {c.references ? <span className="schema-ref">{c.key ? " → " : "→ "}{c.references}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
