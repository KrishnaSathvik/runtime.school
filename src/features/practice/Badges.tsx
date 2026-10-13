import { Check, Circle } from "lucide-react";
import type { Difficulty } from "@/content/question-bank";
import { DIFFICULTY_LABEL } from "@/content/question-bank";
import type { QuestionStatus } from "@/lib/learning-state";
import { STATUS_LABEL } from "./status";

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return <span className={`difficulty difficulty-${difficulty}`}>{DIFFICULTY_LABEL[difficulty]}</span>;
}

const GLYPH: Record<QuestionStatus, string> = {
  "not-attempted": "○",
  attempted: "◔",
  guided: "◑",
  solved: "●",
};

export function StatusMark({ status, label = STATUS_LABEL[status] }: { status: QuestionStatus; label?: string }) {
  return (
    <span className={`status-mark status-${status}`}>
      <span className="status-glyph" aria-hidden>
        {GLYPH[status]}
      </span>
      <span>{label}</span>
    </span>
  );
}

/** Compact LeetCode-style status for problem list / header. */
export function SolvedCheck({
  status,
  withHelp = false,
}: {
  status: QuestionStatus;
  withHelp?: boolean;
}) {
  if (withHelp || status === "guided") {
    const label = withHelp ? "Solved with help" : "Using help";
    return (
      <span className="solved-check is-helped" title={label} aria-label={label}>
        Help
      </span>
    );
  }
  if (status === "solved") {
    return (
      <span className="solved-check" title="Solved" aria-label="Solved">
        <Check size={12} strokeWidth={2.5} aria-hidden />
      </span>
    );
  }
  if (status === "attempted") {
    return (
      <span className="solved-check is-attempted" title="In progress" aria-label="In progress">
        <Circle size={10} strokeWidth={2} aria-hidden />
      </span>
    );
  }
  return (
    <span className="solved-check is-empty" title="Not started" aria-label="Not started">
      <Circle size={10} strokeWidth={1.5} aria-hidden />
    </span>
  );
}
