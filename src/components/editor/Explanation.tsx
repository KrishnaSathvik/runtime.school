import { CircleAlert, TriangleAlert } from "lucide-react";
import { explainError, type Explanation } from "@/engine/explain";

export function SqlError({ error, query }: { error: string; query: string }) {
  return <ExplanationView explanation={explainError(error, query)} />;
}

/** Renders inline `code` spans from explanation text. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("`") && p.endsWith("`") ? (
          <code key={i} className="inline-code">
            {p.slice(1, -1)}
          </code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ExplanationView({ explanation }: { explanation: Explanation }) {
  const Icon = explanation.kind === "error" ? CircleAlert : TriangleAlert;
  return (
    <div className={`explanation ${explanation.kind}`}>
      <p className="explanation-title">
        <Icon size={15} strokeWidth={2} aria-hidden />
        <Rich text={explanation.title} />
      </p>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
        <Rich text={explanation.detail} />
      </p>
      <p className="mt-2 text-sm">
        <strong>Try this: </strong>
        <Rich text={explanation.next} />
      </p>
      {explanation.technical && explanation.technical !== explanation.detail && (
        <details className="mt-2">
          <summary className="metadata cursor-pointer">Technical details</summary>
          <pre className="sql-mono mt-1 whitespace-pre-wrap text-xs text-[var(--text-secondary)]">
            {explanation.technical}
          </pre>
        </details>
      )}
    </div>
  );
}
