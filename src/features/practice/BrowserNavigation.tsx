"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { allQuestions, bankQuestions } from "@/content/question-bank";
import { WorkspaceToolbar } from "@/components/layout/WorkspaceHeading";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { filteredQuestions, questionLink, safeBrowserReturn } from "./browser";

export function saveBrowserSequence(back: string, ids: string[]) {
  try {
    sessionStorage.setItem(`sql-browser:${back}`, JSON.stringify(ids));
  } catch {
    /* Navigation still works when session storage is unavailable. */
  }
}

function bankHref(id: string) {
  const q = bankQuestions.find((item) => item.id === id);
  return q ? `/practice/${q.slug}` : null;
}

export function BrowserNavigation({
  questionId,
  nextOnly = false,
}: {
  questionId: string;
  nextOnly?: boolean;
}) {
  const params = useSearchParams();
  const ready = useHydrated();
  const raw = params.get("return");
  const back = safeBrowserReturn(raw);
  const [ids, setIds] = useState<string[]>(() => bankQuestions.map((q) => q.id));

  useEffect(() => {
    if (!ready) return;
    if (!raw) {
      setIds(bankQuestions.map((q) => q.id));
      return;
    }
    let sequence: string[] = [];
    try {
      const value = JSON.parse(sessionStorage.getItem(`sql-browser:${back}`) ?? "null");
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) sequence = value;
    } catch {
      /* fall through to filtered list */
    }
    if (!sequence.includes(questionId)) {
      sequence = filteredQuestions(
        new URL(back, "http://sql.local").searchParams,
        useLearning.getState(),
      ).map((q) => q.id);
      if (!sequence.includes(questionId)) sequence.push(questionId);
      saveBrowserSequence(back, sequence);
    }
    setIds(sequence);
  }, [back, questionId, ready, raw]);

  if (params.has("track")) return null;

  const records = new Map(allQuestions().map((q) => [q.id, q]));
  const i = ids.indexOf(questionId);
  const prev = records.get(ids[i - 1]);
  const next = records.get(ids[i + 1]);
  const indexLabel = i >= 0 ? `${i + 1} / ${ids.length}` : null;

  const prevHref = prev
    ? raw
      ? questionLink(prev, back)
      : bankHref(prev.id) ?? prev.href
    : null;
  const nextHref = next
    ? raw
      ? questionLink(next, back)
      : bankHref(next.id) ?? next.href
    : null;

  if (nextOnly) {
    return nextHref ? (
      <Link className="btn primary" href={nextHref}>
        Next question: {next?.title}
      </Link>
    ) : (
      <Link className="btn" href={raw ? back : "/practice/questions"}>
        {raw ? "Back to questions" : "Browse questions"}
      </Link>
    );
  }

  return (
    <WorkspaceToolbar
      ariaLabel="Question browser navigation"
      listHref={raw ? back : "/practice/questions"}
      listLabel="All questions"
      indexLabel={indexLabel}
      prev={prevHref ? { href: prevHref, label: `Previous question: ${prev?.title}` } : null}
      next={nextHref ? { href: nextHref, label: `Next question: ${next?.title}` } : null}
    />
  );
}
