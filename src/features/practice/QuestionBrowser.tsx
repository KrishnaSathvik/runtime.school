"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { bankBySlug, DIFFICULTIES, DIFFICULTY_LABEL, topicLabel } from "@/content/question-bank";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { saveBrowserSequence } from "./BrowserNavigation";
import { DifficultyBadge } from "./Badges";
import { statusOf } from "./status";
import {
  browserParams,
  browserUrl,
  questionLink,
  questionPage,
  practiceEntrySlug,
  PAGE_SIZE,
} from "./browser";

/** Practice home: one question list. */
export function QuestionBrowser() {
  const s = useLearning();
  const ready = useHydrated();
  const params = useSearchParams();
  const router = useRouter();
  const normalized = browserParams(new URLSearchParams(params));
  // Problem list shows the independent bank by default (clean numbered set).
  if (!normalized.has("source")) normalized.set("source", "new");
  const { rows, page, pages, visible } = questionPage(normalized, s);
  if (page === 1) normalized.delete("page");
  else normalized.set("page", String(page));
  const url = browserUrl(normalized);
  const continueSlug = practiceEntrySlug(s);
  const continueQuestion = bankBySlug.get(continueSlug);

  useEffect(() => {
    const current = `/practice/questions${params.size ? `?${params}` : ""}`;
    if (ready && current !== url) router.replace(url, { scroll: false });
  }, [ready, params, router, url]);

  const change = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    if (value === "all" || value === "") p.delete(key);
    else p.set(key, value);
    if (key !== "page") p.delete("page");
    if (!p.has("source")) p.set("source", "new");
    router.push(browserUrl(p), { scroll: false });
  };

  return (
    <div className="canvas practice-page">
      {/* Same front-page structure as Learn and Projects: header, continue card, list. */}
      <PageHeader
        title="Sharpen your SQL."
        description="Solve standalone questions on real sample data. Each answer is checked against the expected result, and nothing here affects your lessons."
      />

      {ready && continueQuestion && (
        <section className="continue-learning" aria-label="Continue practice">
          <div className="continue-learning-copy">
            <p className="continue-learning-kicker">
              {s.lastQuestion ? "Pick up where you left off" : "Begin here"}
            </p>
            <p className="continue-learning-title">{continueQuestion.title}</p>
          </div>
          <Link className="btn primary continue-learning-cta" href={`/practice/${continueSlug}`}>
            {s.lastQuestion ? "Continue" : "Start"}
            <ArrowRight size={16} aria-hidden />
          </Link>
        </section>
      )}

      <header className="problem-list-header">
        <div className="problem-list-title-row">
          <h2>All questions</h2>
          {ready && (
            <span className="metadata" role="status">
              {rows.length} questions
            </span>
          )}
        </div>
        <div className="problem-list-controls">
          <input
            aria-label="Search problems"
            className="problem-list-search"
            type="search"
            value={normalized.get("q") ?? ""}
            onChange={(e) => change("q", e.target.value)}
            placeholder="Search…"
          />
          <select
            aria-label="Difficulty"
            className="problem-list-select"
            value={normalized.get("difficulty") ?? "all"}
            onChange={(e) => change("difficulty", e.target.value)}
          >
            <option value="all">Difficulty</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </div>
      </header>

      {!ready ? (
        <p role="status" className="metadata mt-6">
          Loading…
        </p>
      ) : (
        <section aria-label="Questions">
          <div className="problem-list-table" role="table">
            <div className="problem-list-cols" role="row">
              <span role="columnheader">#</span>
              <span role="columnheader">Question</span>
              <span role="columnheader">Difficulty</span>
              <span role="columnheader">Status</span>
            </div>
            {visible.map((q, i) => {
              const n = (page - 1) * PAGE_SIZE + i + 1;
              const status = statusOf(q, s);
              const withHelp =
                q.sourceType === "bank"
                  ? !!s.questions[q.id]?.guidedSolved
                  : s.history.some(
                      (h) =>
                        h.id === q.sourceLessonId &&
                        (h.variant === undefined || h.variant === q.sourceVariant) &&
                        h.ok &&
                        h.guided,
                    );
              return (
                <Link
                  key={q.id}
                  role="row"
                  className="problem-list-row question-row"
                  onClick={() =>
                    saveBrowserSequence(
                      url,
                      rows.map((row) => row.id),
                    )
                  }
                  href={questionLink(q, url)}
                >
                  <span className="problem-list-num" role="cell">{String(n).padStart(2, "0")}</span>
                  <span className="problem-list-name" role="cell">
                    <span className="problem-list-title">{q.title}</span>
                    <span className="problem-list-topic">{topicLabel[q.primaryTopic]}</span>
                  </span>
                  <span role="cell">
                    <DifficultyBadge difficulty={q.difficulty} />
                  </span>
                  <span role="cell" className={`problem-list-state state-${withHelp ? "guided" : status}`}>
                    {status === "solved"
                      ? "Solved"
                      : withHelp || status === "guided"
                        ? "Solved with help"
                        : status === "attempted"
                          ? "In progress"
                          : "Not started"}
                  </span>
                </Link>
              );
            })}
          </div>
          {!rows.length && (
            <p className="py-8 metadata">No problems match. Clear search to see more.</p>
          )}
          <nav aria-label="Question pages" className="problem-list-pager">
            <button
              type="button"
              className="btn"
              disabled={page === 1}
              onClick={() => change("page", String(page - 1))}
            >
              Previous
            </button>
            <span aria-current="page" className="metadata">
              {page} / {pages}
            </span>
            <button
              type="button"
              className="btn"
              disabled={page === pages}
              onClick={() => change("page", String(page + 1))}
            >
              Next
            </button>
          </nav>
        </section>
      )}
    </div>
  );
}
