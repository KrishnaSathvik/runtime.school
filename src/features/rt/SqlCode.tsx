import { Fragment } from "react";
import { highlightSql, type SqlTokenKind } from "./sql-highlight";

function tokenClass(kind: SqlTokenKind): string | null {
  switch (kind) {
    case "text":
      return null;
    case "kw":
      return "rx-tok-kw";
    case "fn":
      return "rx-tok-fn";
    case "str":
      return "rx-tok-str";
    case "num":
      return "rx-tok-num";
    case "com":
      return "rx-tok-com";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

/** A read-only SQL snippet painted with the editor tokens. */
export function SqlCode({ source, label }: { source: string; label?: string }) {
  return (
    <pre tabIndex={0} aria-label={label}>
      {highlightSql(source).map((part, index) => {
        const className = tokenClass(part.kind);
        return className ? (
          <span key={index} className={className}>{part.text}</span>
        ) : (
          <Fragment key={index}>{part.text}</Fragment>
        );
      })}
    </pre>
  );
}
