"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SYNTAX_CONCEPTS } from "@/content/syntax-notes";
import { datasetName, toolDataset } from "@/content/tools/datasets";
import { Shell } from "../Shell";
import { RunCell } from "../Cells";
import { Select } from "../Select";
import { SqlCode } from "../SqlCode";

const DIALECTS = [
  ["SQLite", "sqlite", "runs here"],
  ["PostgreSQL", "postgres", "reference"],
  ["SQL Server", "sqlserver", "reference"],
] as const;

/** One concept, three dialects, on a canonical dataset. The SQLite version runs for real. */
export function Syntax() {
  const params = useSearchParams();
  const router = useRouter();
  const c = SYNTAX_CONCEPTS.find((x) => x.id === params.get("concept")) ?? SYNTAX_CONCEPTS[0];

  return (
    <Shell path={[{ label: "sql" }, { label: "syntax" }, { label: c.id }]} section="tools" status={["SQL", "compare syntax", `${SYNTAX_CONCEPTS.length} concepts`, "only SQLite runs here"]}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="sx-title">
            <p className="rx-prompt-line"><b>compare syntax</b> one concept · three SQL dialects</p>
            <h1 className="rx-task-title">Compare Syntax</h1>
            <p className="rx-prose" style={{ margin: "10px 0" }}>See how the same SQL concept is written in SQLite, PostgreSQL and SQL Server.</p>
            <Select
              id="sx-choice"
              label="concept"
              value={c.id}
              onChange={(v) => router.replace(`/sql/syntax?concept=${v}`, { scroll: false })}
              options={SYNTAX_CONCEPTS.map((x) => ({ value: x.id, label: x.title }))}
            />
            <h2 id="sx-title" className="rx-task-title" style={{ marginTop: 26, fontSize: "1.5rem" }}>
              {c.title}
              {!c.runs && <span className="rx-tag" style={{ marginLeft: 12, verticalAlign: 4 }}>reference</span>}
            </h2>
            <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{c.purpose}</p>
            <p className="rx-label">what differs</p>
            <p className="rx-prose" style={{ marginTop: 0 }}>{c.difference}</p>
            <p className="rx-label">at a glance</p>
            <div className="rx-table-wrap" style={{ padding: 0 }}>
              <table className="rx-table rx-compare rx-glance">
                <thead><tr><th>dialect</th><th>how it is written</th></tr></thead>
                <tbody>
                  {DIALECTS.map(([label, key]) => <tr key={key}><td>{label}</td><td>{c.glance[key]}</td></tr>)}
                </tbody>
              </table>
            </div>
            <p className="rx-label">in Runtime</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>
              {c.runs
                ? `The SQLite version runs for real in the editor under the examples${c.runs === "lab" ? ", in a disposable copy" : ""}. PostgreSQL and SQL Server are shown for reference; they do not run here.`
                : "SQLite has no direct equivalent, so nothing runs here. The three examples are for reading and comparison."}
            </p>
          </article>
          <section className="rx-work rx-lesson-work rx-stack-work" aria-label="Dialect examples">
            <p className="rx-small" style={{ marginTop: 0 }}>Example dataset: <b>{datasetName(c.dataset)}</b></p>
            {/* The three dialects get the same height (the longest example's), so none is squeezed. */}
            <div className="rx-equal-rows">
              {DIALECTS.map(([label, key, tag]) => (
                <section key={key} className="rx-cell" aria-label={label}>
                  <div className="rx-cell-head"><span className="name">{label}</span><span className="acts mono">{c.runs || key !== "sqlite" ? tag : "reference"}</span></div>
                  <div className="rx-cell-in"><SqlCode source={c.examples[key]} label={label} /></div>
                </section>
              ))}
            </div>
            {c.runs ? (
              <>
                <p className="rx-label">run the sqlite version</p>
                <RunCell key={c.id} query={c.examples.sqlite} name="sqlite.sql" allowWrites={c.runs === "lab"} seedSql={toolDataset(c.dataset).seed} />
              </>
            ) : (
              <p className="rx-small">SQLite has no direct equivalent, so there is nothing to run here.</p>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}
