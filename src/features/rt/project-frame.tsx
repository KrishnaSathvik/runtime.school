"use client";

/**
 * The project frame every subject shares (SQL, Python, PySpark), so their projects read the same way:
 * - `ProjectOverview`: the page a project opens on. Desktop is two equal columns. The task, what you'll produce and
 *   the steps stack on the left. The data stacks on the right, with tables and relationships as their own sections
 *   when a project has them. Helpful preparation sits under the steps for SQL and PySpark, and under the data for Python.
 * - `ProjectStepBar`: Python's numbered step row, shown once the learner is working: Overview, every step, Review.
 * - `ProjectReview`: the end page. The project in five questions, and what to keep.
 * Styles: `pf-*` and Python's `p2-*` in src/app/python/p2.css (loaded by every subject's project pages).
 */
import Link from "next/link";
import type { ReactNode } from "react";

export type FrameStep = {
  key: string;
  number: number;
  /** The step's full title (overview and review lists). */
  title: string;
  /** A short name for the step bar. */
  label: string;
  summary?: string;
  done: boolean;
  /** Absent for a step that can't be opened yet. */
  onOpen?: () => void;
};
export type FrameOutput = { name: string; about: string };
export type FrameLink = { href: string; label: string };

/** "Start the project →" before any progress, "Continue →" after. */
/** A file or table name in code type; a plain-words output ("Control totals") in bold. */
const OutputName = ({ name }: { name: string }) => (/\s/.test(name) ? <b>{name}</b> : <code>{name}</code>);

export const startLabel = (started: boolean) => (started ? "Continue →" : "Start the project →");

function Preparation({ links }: { links: FrameLink[] }) {
  if (links.length === 0) return null;
  return (
    <>
      <h2>Helpful preparation</h2>
      <p className="pf-note">Lessons that help with this project. Not required: open any step whenever you like.</p>
      <ul className="pf-prep">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}><span>{l.label}</span><span className="pf-prep-go" aria-hidden="true">Lesson →</span></Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function ProjectOverview({ banner, task, started, onStart, outputs, steps, data, tables, relationships, problems, preparation, preparationSide = "left" }: {
  banner?: ReactNode;
  task: ReactNode;
  started: boolean;
  onStart?: () => void;
  outputs: FrameOutput[];
  steps: FrameStep[];
  data: ReactNode;
  /** Table cards, their own section on the right. SQL and PySpark. */
  tables?: ReactNode;
  /** How those tables join, their own section on the right. Omitted when there are none. */
  relationships?: ReactNode;
  problems: string[];
  preparation: FrameLink[];
  /** SQL and PySpark keep this under the steps. Python keeps it with the data. */
  preparationSide?: "left" | "right";
}) {
  const prep = <Preparation links={preparation} />;
  return (
    <article className="p2-brief pf-brief">
      {banner}
      <div className="p2-brief-grid pf-overview">
        <div>
          <h2>Your task</h2>
          <div className="pf-text">{task}</div>
          {onStart && <button type="button" className="rx-btn amber" onClick={onStart}>{startLabel(started)}</button>}
          <h2>You&apos;ll produce</h2>
          <ul className="p2-files-note">
            {outputs.map((o) => <li key={o.name}><OutputName name={o.name} /> <span>{o.about}</span></li>)}
          </ul>
          <h2>The steps</h2>
          <StepList steps={steps} />
          {preparationSide === "left" && prep}
        </div>
        <div>
          <h2>The data</h2>
          {data}
          {tables && (
            <>
              <h2>Tables</h2>
              {tables}
            </>
          )}
          {relationships && (
            <>
              <h2>Relationships</h2>
              {relationships}
            </>
          )}
          {problems.length > 0 && (
            <>
              <h2>What&apos;s wrong with it</h2>
              <Problems items={problems} />
            </>
          )}
          {preparationSide === "right" && prep}
        </div>
      </div>
    </article>
  );
}

function StepList({ steps, doneWord = "done" }: { steps: FrameStep[]; doneWord?: string }) {
  return (
    <ol className="p2-steps pf-steps">
      {steps.map((s) => (
        <li key={s.key}>
          {s.onOpen ? <button type="button" onClick={s.onOpen}>{s.title}</button> : <b>{s.title}</b>}
          {s.done && <span className="pf-done"> ✓ {doneWord}</span>}
          {s.summary && <p className="pf-summary">{s.summary}</p>}
        </li>
      ))}
    </ol>
  );
}

function Problems({ items }: { items: string[] }) {
  return <ul className="p2-files-note pf-problems">{items.map((x) => <li key={x}>{x}</li>)}</ul>;
}

/** Python's step row: Overview, every step (number, or ✓ once passed), and Review. `current` is a step key. */
export function ProjectStepBar({ steps, current, onOverview, onReview }: { steps: FrameStep[]; current: string; onOverview: () => void; onReview?: () => void }) {
  return (
    <ol className="p2-rail" aria-label="Steps">
      <li className={`p2-step overview ${current === "overview" ? "now" : ""}`}>
        <button type="button" className="t" aria-current={current === "overview" ? "step" : undefined} onClick={onOverview}>Overview</button>
      </li>
      {steps.map((s) => (
        <li key={s.key} className={`p2-step ${s.key === current ? "now" : s.done ? "done" : ""}`}>
          <span className="n" aria-hidden="true">{s.done && s.key !== current ? "✓" : s.number}</span>
          {s.onOpen ? (
            <button type="button" className="t" title={s.title} aria-label={`Step ${s.number}: ${s.title}${s.done ? " (done)" : ""}`} aria-current={s.key === current ? "step" : undefined} onClick={s.onOpen}>{s.label}</button>
          ) : (
            <span className="t pf-locked" title={s.title}>{s.label}</span>
          )}
        </li>
      ))}
      {onReview && (
        <li className={`p2-step overview ${current === "review" ? "now" : ""}`}>
          <button type="button" className="t" aria-current={current === "review" ? "step" : undefined} onClick={onReview}>Review</button>
        </li>
      )}
    </ol>
  );
}

/** A piece of the learner's work: a file, an output table, a saved finding. `ok` once it's in place. */
export type ReviewWork = { key: string; name: string; about: ReactNode; ok: boolean };
export type ReviewReference = { key: string; title: string; body: ReactNode };

/**
 * The end of a project: the work the learner built (and the download), and once every step passes, "Project complete"
 * and a reference answer to compare with. The same page in every subject. Progress is in the step bar, lessons on the
 * overview, so neither is repeated here.
 */
export function ProjectReview({ complete, finishedOn, actions, workTitle, work, workNote, references, referencesNote, nextProject }: {
  complete: boolean;
  finishedOn?: string;
  /** Download your work, and any subject's own buttons (SQL: preview the report). */
  actions: ReactNode;
  workTitle: string;
  work: ReviewWork[];
  workNote?: ReactNode;
  references: ReviewReference[];
  /** What a reference answer is, and that any passing answer is right. */
  referencesNote: string;
  nextProject?: FrameLink;
}) {
  return (
    <article className="p2-brief pf-brief pf-review">
      {complete && (
        <div className="p2-complete pf-status" role="status">
          <p><b>Project complete.</b> {finishedOn ? `Every step passed. Finished ${finishedOn}.` : "Every step passed."}</p>
          {nextProject && <div className="p2-complete-acts"><Link className="p2-btn primary" href={nextProject.href}>Next project: {nextProject.label} →</Link></div>}
        </div>
      )}
      <div className="p2-brief-grid">
        <div>
          <h2>{workTitle}</h2>
          <ul className="pf-work">
            {work.map((w) => (
              <li key={w.key}>
                <span className={`p2-mark ${w.ok ? "pass" : "not-run"}`} aria-hidden="true">{w.ok ? "✓" : "◌"}</span>
                <div><OutputName name={w.name} /><div className="pf-meta">{w.about}</div></div>
              </li>
            ))}
          </ul>
          {workNote && <p className="pf-note">{workNote}</p>}
          {actions && <div className="p2-complete-acts pf-actions">{actions}</div>}
        </div>
        <div>
          <h2>Compare with a reference answer</h2>
          {complete ? (
            <>
              <p className="pf-note">{referencesNote}</p>
              <div className="pf-refs">
                {references.map((r) => (
                  <details key={r.key} className="pf-ref">
                    <summary>{r.title}</summary>
                    <div className="pf-ref-body">{r.body}</div>
                  </details>
                ))}
              </div>
            </>
          ) : (
            <p className="pf-note">Reference answers open here once every step passes, so you can compare them with your own.</p>
          )}
        </div>
      </div>
    </article>
  );
}
