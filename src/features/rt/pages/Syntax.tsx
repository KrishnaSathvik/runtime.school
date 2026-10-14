"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { dialectGuide } from "@/content";
import { REFERENCE_ONLY_CONCEPTS, syntaxNotes } from "@/content/syntax-notes";
import { Shell } from "../Shell";
import { RunCell } from "../Cells";
import { Select } from "../Select";
import { SqlCode } from "../SqlCode";

const conceptId = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
// [label, column in dialectGuide, position in syntaxNotes.examples]
const DIALECTS = [["SQLite", 1, 0, "runs here"], ["PostgreSQL", 3, 2, "reference"], ["SQL Server", 2, 1, "reference"]] as const;

/** One concept, three dialects. The SQLite version runs for real. */
export function Syntax() {
  const params = useSearchParams();
  const router = useRouter();
  const row = dialectGuide.find((r) => conceptId(r[0]) === params.get("concept")) ?? dialectGuide[0];
  const note = syntaxNotes[row[0]];
  const sqlite = note?.examples?.[0] ?? row[1];

  return (
    <Shell path={[{ label: "sql" }, { label: "syntax" }, { label: conceptId(row[0]) }]} section="tools" status={["SQL", "syntax reference", `${dialectGuide.length} concepts`, "only SQLite runs here"]}>
      <div className="rx-task rx-lesson">
        <div className="rx-task-split">
          <article className="rx-brief" aria-labelledby="sx-title">
            <p className="rx-prompt-line"><b>syntax</b> one concept, three dialects · {dialectGuide.length} concepts</p>
            <Select
              id="sx-choice"
              label="concept"
              value={conceptId(row[0])}
              onChange={(v) => router.replace(`/sql/syntax?concept=${v}`, { scroll: false })}
              options={dialectGuide.map((r, i) => ({ value: conceptId(r[0]), label: `${String(i + 1).padStart(2, "0")} · ${r[0] === "Stored procedure" ? "Stored procedures" : r[0]}` }))}
            />
            <h1 id="sx-title" className="rx-task-title" style={{ marginTop: 22 }}>
              {row[0]}
              {REFERENCE_ONLY_CONCEPTS.has(row[0]) && <span className="rx-tag" style={{ marginLeft: 12, verticalAlign: 6 }}>reference</span>}
            </h1>
            {note?.purpose && <p className="rx-lead" style={{ fontSize: "1.05rem", marginTop: 8 }}>{note.purpose}</p>}
            {note?.difference && (
              <>
                <p className="rx-label">what differs</p>
                <p className="rx-prose" style={{ marginTop: 0 }}>{note.difference}</p>
              </>
            )}
            <p className="rx-label">at a glance</p>
            <div className="rx-table-wrap" style={{ padding: 0 }}>
              <table className="rx-table rx-compare rx-glance">
                <thead><tr><th>dialect</th><th>how it is written</th></tr></thead>
                <tbody>
                  <tr><td>SQLite</td><td>{row[1]}</td></tr>
                  <tr><td>PostgreSQL</td><td>{row[3]}</td></tr>
                  <tr><td>SQL Server</td><td>{row[2]}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="rx-label">in Runtime</p>
            <p className="rx-prose" style={{ marginTop: 0, fontSize: 15 }}>
              {note?.sqlite
                ? `The SQLite version runs for real on the right${note.sqlite === "lab" ? " in a temporary database" : ""}. PostgreSQL and SQL Server are shown for reference; they do not run here.`
                : "SQLite has no direct equivalent, so nothing runs here. The three examples are for reading and comparison."}
            </p>
          </article>
          <section className="rx-work rx-lesson-work" aria-label="Dialect examples">
            {DIALECTS.map(([label, col, ex, tag], i) => (
              <section key={label} className="rx-cell" aria-label={label} style={i === 0 ? { marginTop: 0 } : undefined}>
                <div className="rx-cell-head"><span className="name">{label}</span><span className="acts mono">{tag}</span></div>
                <div className="rx-cell-in"><SqlCode source={note?.examples?.[ex] ?? row[col]} label={label} /></div>
              </section>
            ))}
            {note?.sqlite ? (
              <>
                <p className="rx-label">run the sqlite version</p>
                <RunCell key={row[0]} query={sqlite} name="sqlite.sql" allowWrites={note.sqlite === "lab"} />
                <Link href={note.sqlite === "lab" ? "/sql/lab" : "/sql/playground"} className="rx-btn">
                  Try it in {note.sqlite === "lab" ? "Database Lab" : "SQL Playground"} →
                </Link>
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
