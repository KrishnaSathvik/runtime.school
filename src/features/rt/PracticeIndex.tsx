"use client";

import Link from "next/link";
import { bankQuestions, DIFFICULTIES, DIFFICULTY_LABEL, topicLabel } from "@/content/question-bank";
import { questionStatus, useLearning, type QuestionStatus } from "@/lib/learning-state";

const GLYPH: Record<QuestionStatus, string> = { solved: "✓", guided: "◑", attempted: "◐", "not-attempted": "·" };
const STATUS_TEXT: Record<QuestionStatus, string> = { solved: "solved", guided: "solved with help", attempted: "in progress", "not-attempted": "not started" };
const TYPE_TEXT: Record<string, string> = { debug: "fix the query", predict: "predict the result" };

/** Questions grouped by level. Each keeps its Next-order number, so it matches "question N / total" on its task page. */
const GROUPS = DIFFICULTIES.map((d) => ({
  d,
  rows: bankQuestions.map((q, i) => ({ q, n: i + 1 })).filter((r) => r.q.difficulty === d),
})).filter((g) => g.rows.length > 0);

export function PracticeIndex({ currentId, onPick, compact = false }: { currentId?: string; onPick?: () => void; compact?: boolean }) {
  const questions = useLearning((s) => s.questions);
  return (
    <div className={`rx-qindex${compact ? " compact" : ""}`}>
      {GROUPS.map(({ d, rows }) => (
        <section key={d} aria-label={DIFFICULTY_LABEL[d]}>
          <p className="rx-drawer-group mono">{DIFFICULTY_LABEL[d]} · {rows.length}</p>
          <ol className="rx-qindex-list">
            {rows.map(({ q, n }) => {
              const st = questionStatus(questions[q.id]);
              const type = TYPE_TEXT[q.exerciseType ?? "write"];
              return (
                <li key={q.id}>
                  <Link href={`/sql/practice/${q.slug}`} aria-current={q.id === currentId ? "page" : undefined} onClick={onPick}>
                    <span className={`mono g ${st === "solved" ? "ok" : ""}`} aria-hidden="true">{GLYPH[st]}</span>
                    <span className="mono n">{String(n).padStart(2, "0")}</span>
                    <span className="t">
                      {q.title}
                      <span className="sr-only">, {STATUS_TEXT[st]}</span>
                      {(!compact || type) && (
                        <span className="meta">
                          {!compact && topicLabel[q.primaryTopic]}
                          {!compact && type && " · "}
                          {type}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
