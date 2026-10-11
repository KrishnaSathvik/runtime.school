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
    <span className={`status-mark status-${status}`} title={label}>
      <span aria-hidden>{GLYPH[status]}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
