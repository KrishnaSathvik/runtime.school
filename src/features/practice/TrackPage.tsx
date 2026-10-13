"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { practiceDatasets, topicLabel } from "@/content/question-bank";
import { trackById } from "@/content/question-bank/tracks";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { DifficultyBadge } from "./Badges";
import { questionStatusText } from "./status";
import { itemLabel, resumeInTrack, trackHref, trackProgress, trackRange } from "./tracks";

export function TrackPage({ trackId }: { trackId: string }) {
  const hydrated = useHydrated();
  const track = trackById.get(trackId);
  const questions = useLearning((s) => s.questions);
  const stats = useLearning((s) => s.stats);
  const attempts = useLearning((s) => s.attempts);
  const history = useLearning((s) => s.history);
  const started = useLearning((s) => (track ? s.tracks[track.id] : undefined));
  const touchTrack = useLearning((s) => s.touchTrack);

  const progress = useMemo(
    () => (track ? trackProgress(track, { questions, stats, attempts, history }) : null),
    [track, questions, stats, attempts, history],
  );

  if (!track || !progress) {
    return (
      <div className="canvas">
        <h1>Track not found</h1>
        <Link href="/practice/questions" className="btn mt-4">Back to Practice</Link>
      </div>
    );
  }

  const next = resumeInTrack(track, { questions, stats, attempts, history }, started?.lastQuestionId);
  const pct = Math.round((100 * progress.solved) / progress.total);
  const bankCount = progress.items.filter((item) => item.q.sourceType === "bank").length;
  const learnCount = progress.total - bankCount;

  return (
    <div className="canvas">
      <Link href="/practice/questions" className="inline-flex items-center gap-1 text-sm text-[var(--accent)]">
        <ArrowLeft size={14} aria-hidden /> All questions
      </Link>
      <div className="eyebrow mt-6">Practice track · {trackRange(track)}</div>
      <h1>{track.title}</h1>
      <p className="lead">{track.objective}</p>
      <p className="metadata mt-3">
        <strong className="text-[var(--text)]">Prerequisites:</strong> {track.startingPoint}
      </p>
      <p className="metadata mt-1">Skills: {track.skills.join(" · ")}</p>
      <p className="metadata mt-1">
        {progress.total} questions · {bankCount} independent · {learnCount} From Learn
      </p>

      <section className="mt-8 border-y border-[var(--border)] py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[220px] flex-1">
            <p className="text-sm" role="status">
              {hydrated
                ? `${progress.solved} of ${progress.total} solved without hints`
                : `${progress.total} questions`}
            </p>
            <div
              className="mt-2 h-[3px] w-full max-w-sm overflow-hidden bg-[var(--border)]"
              role="progressbar"
              aria-label={`${track.title} progress`}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={hydrated ? progress.solved : 0}
            >
              <div className="h-full bg-[var(--accent)]" style={{ width: `${hydrated ? pct : 0}%` }} />
            </div>
            {hydrated && next && (
              <p className="metadata mt-3">
                Next up: {next.position}. {itemLabel(next.q)}
                {next.q.sourceType === "bank" ? "" : " (From Learn · review)"}
              </p>
            )}
          </div>
          {hydrated &&
            (next ? (
              <Link
                href={trackHref(next.q, track.id)}
                className="btn primary"
                onClick={() => touchTrack(track.id, next.q.id)}
              >
                {started ? "Continue" : "Start track"}: {next.position}. {itemLabel(next.q)}{" "}
                <ArrowRight size={14} />
              </Link>
            ) : progress.complete ? (
              <div>
                <p className="feedback-ok text-sm">Track complete — every question solved without hints.</p>
                <Link href="/practice/questions" className="btn mt-3">
                  Find another independent question <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <p className="text-sm">
                These questions were solved with help. Open one below and try again without hints to count it.
              </p>
            ))}
        </div>
      </section>

      <div className="learning-path mt-6 border-t border-[var(--border)]" aria-label="Questions in this track">
        {progress.items.map((item) => {
          const section = track.sections?.[item.q.id];
          const status = hydrated
            ? questionStatusText(item.q, { questions, stats, attempts, history })
            : "—";
          const current = next?.q.id === item.q.id;
          return (
            <div key={item.q.id}>
              {section && <div className="eyebrow mt-6 mb-2 px-0.5">{section}</div>}
              {track.consolidation?.[item.q.id] && (
                <p className="metadata mb-2 px-0.5">{track.consolidation[item.q.id]}</p>
              )}
              <Link
                href={trackHref(item.q, track.id)}
                className={`index-row ${current ? "current-module" : ""}`}
                onClick={() => touchTrack(track.id, item.q.id)}
                aria-current={current ? "step" : undefined}
              >
                <span className="module-id">{String(item.position).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="text-[15px] font-medium leading-snug">{item.q.title}</div>
                  <div className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                    {topicLabel[item.q.primaryTopic]} ·{" "}
                    {practiceDatasets[item.q.datasetId]?.name}
                    {item.q.sourceType === "bank" ? " · Independent" : " · From Learn · review"}
                    {current ? " · next up" : ""}
                  </div>
                </div>
                <div className="index-aside">
                  <DifficultyBadge difficulty={item.q.difficulty} />
                  <span className="index-progress">{status}</span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
      <p className="metadata mt-6">
        Solving a question updates that question wherever it appears — browser, track, or lesson.
        Assisted solves stay marked as solved with help. Completing this track does not automatically
        complete Learn lessons or project milestones.
      </p>
    </div>
  );
}
