"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { trackById } from "@/content/question-bank/tracks";
import { useLearning } from "@/lib/learning-state";
import { itemLabel, nextInTrack, trackHref } from "./tracks";

/** Track context for a question opened from a track: position, back link, next question. */
export function useTrackContext(trackId: string | null, questionId: string) {
  const track = trackId ? trackById.get(trackId) : undefined;
  const inTrack = !!track && track.questionIds.includes(questionId);
  const touchTrack = useLearning((s) => s.touchTrack);
  const questions = useLearning((s) => s.questions);
  const stats = useLearning((s) => s.stats);
  const attempts = useLearning((s) => s.attempts);
  const history = useLearning((s) => s.history);

  useEffect(() => {
    if (inTrack) touchTrack(track!.id, questionId);
  }, [inTrack, track, questionId, touchTrack]);

  if (!inTrack) return null;
  const position = track!.questionIds.indexOf(questionId) + 1;
  const next = nextInTrack(track!, questionId, { questions, stats, attempts, history });
  return { track: track!, position, next };
}

export function TrackBanner({ ctx }: { ctx: NonNullable<ReturnType<typeof useTrackContext>> }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <Link href={`/practice/tracks/${ctx.track.id}`} className="text-[var(--accent)]">
        ← {ctx.track.title}
      </Link>
      <span className="metadata">
        Question {ctx.position} of {ctx.track.questionIds.length}
      </span>
    </div>
  );
}

export function NextInTrack({ ctx }: { ctx: NonNullable<ReturnType<typeof useTrackContext>> }) {
  return ctx.next ? (
    <Link href={trackHref(ctx.next.q, ctx.track.id)} className="btn primary">
      Next in track: {ctx.next.position}. {itemLabel(ctx.next.q, 36)}{" "}
      <ArrowRight size={14} />
    </Link>
  ) : (
    <Link href={`/practice/tracks/${ctx.track.id}`} className="btn primary">
      Track complete — back to {ctx.track.title} <ArrowRight size={14} />
    </Link>
  );
}
