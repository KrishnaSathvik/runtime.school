"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  groups,
  lessonsInModule,

} from "@/content";
import {moduleObjectives, lessonSummaries} from "@/content/ux-summaries";
import {courseContinuation, dueLessons} from "@/features/discovery/selectors";
import {lessons} from "@/content";
import { isMastered, useHydrated, useLearning } from "@/lib/learning-state";

export default function LearnPage() {
  const state = useLearning();
  const stats=state.stats;
  const ready=useHydrated();
  const activity=courseContinuation(state);
  const next=activity?.id;
  const due=dueLessons(state);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    return groups
      .map((title, i) => {
        const ls = lessonsInModule(i);
        const done = ls.filter((l) => isMastered(stats[l.id] ?? empty())).length;
        const moduleStatus =
          done === ls.length
            ? "Mastered"
            : done || ls.some((l) => (stats[l.id]?.attempts ?? 0) > 0)
              ? "In progress"
              : "Not started";
        return {
          id: i,
          title,
          description: moduleObjectives[i],
          count: ls.length,
          done,
          moduleStatus,
        };
      })
      .filter((m) => {
        const q = search.toLowerCase();
        const matchesSearch =
          !q ||
          m.title.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          lessonsInModule(m.id).some((l) =>
            `${l.title} ${l.concept}`.toLowerCase().includes(q),
          );
        const matchesStatus = status === "all" || m.moduleStatus === status;
        return matchesSearch && matchesStatus;
      });
  }, [search, status, stats]);

  return (
    <div className="canvas learn-page">

      <h1>Learn SQL by doing.</h1>
      <p className="lead">
        Follow the lessons from your first query to advanced SQL, or pick up where you left off.
      </p>
      {!ready ? <p className="metadata mt-5" role="status">Loading your saved work…</p> : activity ? (
        <section className="mt-5" aria-label="Your next lesson">
          <div className="flex flex-wrap gap-3">
            <Link className="btn primary" href={activity.href}>{activity.returning ? "Continue lesson" : "Start learning"}</Link>
            <Link className="btn ghost" href="/placement">Find my level</Link>
          </div>
          <p className="metadata mt-8">Your next lesson</p>
          <h2 className="mt-2">{lessons[activity.id].title}</h2>
          <p className="metadata mt-2">{lessonSummaries[activity.id]}</p>
          {activity.returning && <p className="metadata mt-2">{activity.stage === "practice" ? `Practice · Challenge ${activity.variant + 1} of 2` : activity.stage === "review" ? "Concept check" : "Understand the concept"}</p>}
        </section>
      ) : <section className="mt-5"><h2>Every lesson mastered</h2><p className="metadata mt-2">Revisit any module below to refresh your skills.</p><Link href="/review" className="btn primary mt-3">Review your learning</Link></section>}
      {ready && due.length > 0 && <p className="mt-5"><Link className="text-[var(--accent)]" href="/review">{due.length} {due.length === 1 ? "lesson" : "lessons"} ready to review →</Link></p>}
      <h2 className="pt-10">Your learning path</h2>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block min-w-[240px] flex-1 text-xs text-[var(--muted)]">
          Search
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="JOIN, NULL, retention…"
            className="mt-1 w-full border-b border-[var(--strong)] bg-transparent py-2 text-sm text-[var(--text)] outline-none"
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="ml-2 rounded border border-[var(--border)] bg-[var(--main)] px-2 py-1.5 text-sm text-[var(--text)]"
          >
            {["all", "Not started", "In progress", "Mastered"].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="learning-path mt-10 border-t border-[var(--border)]">
        {rows.length === 0 && (
          <p className="metadata py-6" role="status">
            No modules match. Clear the search or status filter.
          </p>
        )}
        {rows.map((m) => (
          <Link key={m.id} href={`/learn/${m.id}`} className={`index-row ${ready && next !== undefined && lessons[next].group===m.id ? "current-module" : ""}`} aria-current={ready && next !== undefined && lessons[next].group===m.id ? "location" : undefined}>
            <span className="module-id">
              {String(m.id + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="text-sm font-medium">{m.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                {m.description}
              </div>
            </div>
            <span className="metadata">
              {m.count} lessons{ready ? ` · ${m.moduleStatus}` : ""}
            </span>
            <span className="metadata">
              {ready ? `${m.done}/${m.count}` : "—"}
            </span>
          </Link>
        ))}
      </div>

      <p className="metadata mt-6">
        A lesson is mastered after you solve both of its challenges without
        hints or the answer, and pass its concept check.
      </p>
    </div>
  );
}

function empty() {
  return {
    attempts: 0,
    correct: 0,
    solved: [] as number[],
    last: 0,
    errors: 0,
    check: false,
    legacy: false,
    masteredAt: 0,
    categories: {},
    quizAttempts: 0,
  };
}
