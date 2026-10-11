"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DIFFICULTY_LABEL, practiceDatasets, topicLabel } from "@/content/question-bank";
import { trackById } from "@/content/question-bank/tracks";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { DifficultyBadge, StatusMark } from "./Badges";
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
        <Link href="/practice" className="btn mt-4">Back to Practice</Link>
      </div>
    );
  }

  const next = resumeInTrack(track, { questions, stats, attempts, history }, started?.lastQuestionId);
  const pct = Math.round((100 * progress.solved) / progress.total);

  return (
    <div className="canvas">
      <Link href="/practice" className="inline-flex items-center gap-1 text-sm text-[var(--accent)]">
        <ArrowLeft size={14} aria-hidden /> Practice
      </Link>
      <div className="eyebrow mt-6">Practice track · {trackRange(track)}</div>
      <h1>{track.title}</h1>
      <p className="lead">{track.objective}</p>
      <p className="metadata mt-3">{track.startingPoint}</p>
      <p className="metadata mt-1">Skills: {track.skills.join(" · ")}</p>

      <section className="mt-8 border-y border-[var(--border)] py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-[220px] flex-1">
            <p className="text-sm" role="status">
              {hydrated ? `${progress.solved} of ${progress.total} solved without hints` : `${progress.total} questions`}
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
            ) : (
              <div>
                <p className="feedback-ok text-sm">Track complete — every question solved without hints.</p>
                <Link href="/practice?status=unsolved" className="btn mt-3">
                  Find another unsolved question <ArrowRight size={14} />
                </Link>
              </div>
            ))}
        </div>
      </section>

      <ol className="mt-6" aria-label="Questions in this track">
        {progress.items.map((item, i) => {
          const prev = progress.items[i - 1];
          const stageStart = !prev || prev.q.difficulty !== item.q.difficulty;
          return (
            <li key={item.q.id}>
              {stageStart && (
                <div className="eyebrow mt-6 mb-2">{track.consolidation?.[item.q.id] ? "Put it together · " : ""}{DIFFICULTY_LABEL[item.q.difficulty]}</div>
              )}
              {track.consolidation?.[item.q.id] && <p className="metadata mb-2">{track.consolidation[item.q.id]}</p>}
              <Link
                href={trackHref(item.q, track.id)}
                className={`question-row !grid-cols-[28px_24px_minmax(0,1fr)_auto] ${next?.q.id === item.q.id ? "bg-[var(--secondary)]" : ""}`}
                onClick={() => touchTrack(track.id, item.q.id)}
                aria-current={next?.q.id === item.q.id ? "step" : undefined}
              >
                <span className="module-id">{String(item.position).padStart(2, "0")}</span>
                <StatusMark status={hydrated ? item.status : "not-attempted"} label={hydrated ? questionStatusText(item.q, { questions, stats, attempts, history }) : undefined} />
                <div className="min-w-0">
                  <div className="line-clamp-2 text-sm font-medium">
                    {item.q.title}
                  </div>
                  <div className="metadata mt-0.5 truncate">
                    {topicLabel[item.q.primaryTopic]} · {practiceDatasets[item.q.datasetId]?.name}
                    {item.q.sourceType === "bank" ? "" : " · lesson challenge"}
                    {next?.q.id === item.q.id ? " · next up" : ""}
                  </div>
                </div>
                <DifficultyBadge difficulty={item.q.difficulty} />
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="metadata mt-6">
        Your progress on a question is shared wherever that question appears.
        Completing this track does not automatically complete lessons or project milestones.
      </p>
    </div>
  );
}
