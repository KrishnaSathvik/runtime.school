"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { COMPARE_CATEGORIES, COMPARISONS, comparisonById, type PyComparison } from "@/content/python-v2/tools/compare";
import { mountsFor, pyManifests } from "@/content/python-v2/datasets";
import { PY_COMPARE_HREF } from "@/content/python-v2/paths";
import { toolDataset } from "@/content/python-v2/tools/friendly";
import { preloadMounts, preloadPython, runPython, type PyRunResult } from "@/engine/python/client";
import { Select } from "@/features/rt/Select";
import { Shell } from "@/features/rt/Shell";
import { packagesFor } from "./handoff";
import { PyCell, pyStatus } from "./ToolParts";
import { Inline } from "./ToolKit";

export type LessonLink = { title: string; href: string };
const LETTERS = ["A", "B", "C"];
const lineOf = (r?: PyRunResult | null) => (r && (r.status === "runtime-error" || r.status === "syntax-error") && r.error.line ? { line: r.error.line, token: 1 } : null);

/** Edited code per approach, kept per comparison in this browser. */
function useApproachDrafts(c: PyComparison) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    try { setDrafts(JSON.parse(localStorage.getItem(`py-compare-${c.id}`) ?? "{}")); } catch { setDrafts({}); }
  }, [c.id]);
  const value = (i: number) => drafts[i] ?? c.approaches[i].code;
  const set = (i: number, v: string) => setDrafts((d) => {
    const next: Record<string, string> = { ...d, [i]: v };
    if (v === c.approaches[i].code) delete next[i];
    try { localStorage.setItem(`py-compare-${c.id}`, JSON.stringify(next)); } catch { /* this visit only */ }
    return next;
  });
  return { value, set, edited: (i: number) => i in drafts };
}

/**
 * T05 Compare Approaches, laid out like SQL Compare Syntax: choose a topic and a comparison on the left and read what
 * differs and when to use each; every approach is on the right, runs on the same input, and shows its real output.
 */
export function Comparator({ lessons }: { lessons: Record<string, LessonLink> }) {
  const params = useSearchParams();
  const router = useRouter();
  const c: PyComparison = comparisonById(params.get("c") ?? params.get("concept")) ?? COMPARISONS[0];
  const drafts = useApproachDrafts(c);
  const mounts = useMemo(() => (c.data ? mountsFor(pyManifests[c.data.dataset].editions[c.data.size ?? "starter"].ref, c.data.files) : []), [c]);
  const [runs, setRuns] = useState<{ id: string; results: (PyRunResult | null)[] }>({ id: c.id, results: [] });
  const [busy, setBusy] = useState<number | null>(null);
  const autoRan = useRef<string | null>(null);
  const go = (id: string) => router.replace(`${PY_COMPARE_HREF}?c=${id}`, { scroll: false });

  // Each run gets a token; a newer run (another comparison opened, Run pressed again) supersedes older ones,
  // so a stale run never overwrites the busy state or results of the current one.
  const runToken = useRef(0);
  async function runOne(i: number, id = c.id, token = ++runToken.current): Promise<boolean> {
    setBusy(i);
    const res = await runPython(drafts.value(i), { packages: [...new Set([...c.packages, ...packagesFor(drafts.value(i))])], mounts, timeoutMs: 20000 });
    if (res.status === "superseded" || token !== runToken.current) return false;
    setRuns((prev) => {
      const results = prev.id === id ? [...prev.results] : [];
      results[i] = res;
      return { id, results };
    });
    setBusy(null);
    return res.status !== "stopped";
  }
  async function runAll() {
    const token = ++runToken.current;
    const id = c.id;
    setRuns({ id, results: [] });
    for (let i = 0; i < c.approaches.length; i++) if (!(await runOne(i, id, token))) break;
    if (token === runToken.current) setBusy(null);
  }

  // Real outputs straight away: every approach runs when a comparison opens.
  useEffect(() => {
    preloadPython(c.packages);
    preloadMounts(mounts);
    if (autoRan.current === c.id) return;
    autoRan.current = c.id;
    const t = setTimeout(() => void runAll(), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per comparison
  }, [c.id]);

  const r = runs.id === c.id ? runs.results : [];
  const done = c.approaches.every((_, i) => r[i]);
  const ok = done && r.every((x) => x?.status === "ok");
  const outs = r.map((x) => (x && "stdout" in x ? x.stdout : ""));
  const allSame = ok && outs.every((o) => o === outs[0]);
  const edited = c.approaches.some((_, i) => drafts.edited(i));
  const linked = c.lessons.filter((id) => lessons[id]);
  const inCat = COMPARISONS.filter((x) => x.category === c.category);
  const d = c.data ? toolDataset(c.data.dataset) : null;

  return (
    <Shell subject="python" section="tools" path={[{ label: "python", href: "/python" }, { label: "compare" }, { label: c.title }]} status={pyStatus("compare approaches", c.data?.dataset)}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="cmp-title">
            <p className="rx-prompt-line"><b>compare approaches</b> one problem · {c.approaches.length === 3 ? "three" : "two"} ways</p>
            <h1 className="rx-task-title">Compare Approaches</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>The same problem solved different ways in Python, run on the same input, with what really differs and when to use each.</p>
            <Select id="cmp-topic" label="topic" value={c.category} onChange={(cat) => go(COMPARISONS.find((x) => x.category === cat)!.id)} options={COMPARE_CATEGORIES.map((cat) => ({ value: cat, label: `${cat} (${COMPARISONS.filter((x) => x.category === cat).length})` }))} />
            <Select id="cmp-choice" label="comparison" value={c.id} onChange={go} options={inCat.map((x) => ({ value: x.id, label: x.title }))} />

            <h2 id="cmp-title" className="rx-task-title" style={{ marginTop: 26, fontSize: "1.5rem" }}>
              {c.title}
              {c.outputs === "differ" && <span className="rx-tag amber" style={{ marginLeft: 12, verticalAlign: 4 }}>behaves differently</span>}
            </h2>
            <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{c.problem}</p>

            <p className="rx-label">what differs</p>
            <p className="rx-prose" style={{ marginTop: 0 }}><Inline text={c.differences} /></p>

            <p className="rx-label">at a glance</p>
            <div className="rx-table-wrap" style={{ padding: 0 }}>
              <table className="rx-table rx-compare rx-glance p2-glance">
                <thead><tr><th>approach</th><th>use it when</th></tr></thead>
                <tbody>{c.approaches.map((a, i) => <tr key={i}><td>{LETTERS[i]} · {a.label}</td><td><Inline text={a.when} /></td></tr>)}</tbody>
              </table>
            </div>

            {c.edgeCases && <p className="rx-note" style={{ fontSize: 15 }}><strong>Watch out:</strong> <Inline text={c.edgeCases} /></p>}

            <p className="rx-label">the outputs</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }} aria-live="polite">
              {!done ? (busy !== null ? `Running ${LETTERS[busy]}…` : "Each approach runs on the same input.")
                : !ok ? "One approach stopped with an error, so the outputs can't be compared."
                : allSame ? `✓ ${c.approaches.length === 2 ? "Both" : "All"} printed exactly the same output.`
                : c.outputs === "differ" && !edited ? "≠ The outputs differ, as expected: that difference is the point of this comparison."
                : `✗ The outputs are different${edited ? " (you've edited the code)" : ""}.`}
            </p>

            <p className="rx-label sec">concepts</p>
            <p style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: 0 }}>{c.concepts.map((x) => <span key={x} className="rx-tag">{x}</span>)}</p>
            {linked.length > 0 && (
              <>
                <p className="rx-label">learn it</p>
                <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>{linked.map((id, i) => <span key={id}>{i ? " · " : ""}<Link href={lessons[id].href}>{lessons[id].title}</Link></span>)}</p>
              </>
            )}
            <p className="rx-label">related comparisons</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>{c.related.map((id, i) => <span key={id}>{i ? " · " : ""}<Link href={`${PY_COMPARE_HREF}?c=${id}`} scroll={false}>{comparisonById(id)!.title}</Link></span>)}</p>
          </article>

          <section className="rx-work rx-lesson-work py-stack" aria-label="Approaches">
            {d && <p className="rx-small" style={{ marginTop: 0 }}>Uses the <b>{d.name}</b> dataset.</p>}
            {c.approaches.map((a, i) => (
              <PyCell
                key={`${c.id}-${i}`}
                name={`${LETTERS[i]} · ${a.label}`}
                value={drafts.value(i)}
                onChange={(v) => drafts.set(i, v)}
                onRun={() => void runOne(i)}
                busy={busy === i}
                result={r[i] ?? null}
                minHeight="90px"
                errorLine={lineOf(r[i])}
                footer={drafts.edited(i) ? <button type="button" className="rx-btn ghost" onClick={() => drafts.set(i, a.code)}>Reset</button> : undefined}
              />
            ))}
          </section>
        </div>
      </div>
    </Shell>
  );
}
