import { CheckCircle2 } from "lucide-react";

/** Finished module or lesson: a check mark the learner can see at a glance. */
export function CompletedMark() {
  return (
    <span className="completed-mark">
      <CheckCircle2 size={16} strokeWidth={2} aria-hidden /> Completed
    </span>
  );
}

/** Where "Continue" leads. A label, not a selection. */
export function UpNextTag() {
  return <span className="up-next-tag">Up next</span>;
}
