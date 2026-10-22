import { Fragment, type ReactNode } from "react";

/** Inline prose: `code` and **bold**. Line breaks inside a paragraph are kept. */
export function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(/(`[^`]+`|\*\*[^*]+\*\*)/g)) {
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const tok = m[0];
    parts.push(tok.startsWith("`") ? <code key={k++}>{tok.slice(1, -1)}</code> : <b key={k++}>{tok.slice(2, -2)}</b>);
    last = at + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return (
    <>
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <Fragment key={`t${i}`}>{p.split("\n").map((line, j) => (j ? [<br key={j} />, line] : line))}</Fragment>
        ) : (
          p
        ),
      )}
    </>
  );
}

const BULLET = /^\s*[-*]\s+/;
const NUMBERED = /^\s*\d+[.)]\s+/;

/** One paragraph: plain lines become a <p>, runs of `- ` or `1. ` lines become a list. */
function Block({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let lines: string[] = [];
  let items: string[] = [];
  let ordered = false;
  const flushText = () => {
    if (lines.length) out.push(<p key={out.length}><Inline text={lines.join("\n")} /></p>);
    lines = [];
  };
  const flushList = () => {
    if (!items.length) return;
    const List = ordered ? "ol" : "ul";
    out.push(<List key={out.length}>{items.map((it, i) => <li key={i}><Inline text={it} /></li>)}</List>);
    items = [];
  };
  for (const line of text.split("\n")) {
    const kind = BULLET.test(line) ? "ul" : NUMBERED.test(line) ? "ol" : null;
    if (kind) {
      flushText();
      if (items.length && ordered !== (kind === "ol")) flushList();
      ordered = kind === "ol";
      items.push(line.replace(kind === "ul" ? BULLET : NUMBERED, ""));
    } else if (items.length && /^\s+\S/.test(line)) {
      items[items.length - 1] += " " + line.trim();
    } else {
      flushList();
      lines.push(line);
    }
  }
  flushText();
  flushList();
  return <>{out}</>;
}

/** Paragraphs separated by blank lines; `- ` and `1. ` lines become lists. */
export function Md({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className ?? "p2-prose"}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <Block key={i} text={p} />
      ))}
    </div>
  );
}
