"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { LessonWorkspace } from "@/features/lesson/LessonWorkspace";

function Workspace({ lessonId }: { lessonId: number }) {
  const search = useSearchParams();
  const challenge = Number(search.get("challenge"));
  return (
    <LessonWorkspace
      lessonId={lessonId}
      initialChallenge={challenge === 1 || challenge === 2 ? challenge - 1 : null}
      trackId={search.get("track")}
      learnConcept={search.get("stage") === "understand"}
    />
  );
}

/** Interactive SQL lesson mounted under the SEO slug URL. */
export function SqlSeoLessonClient({ lessonId }: { lessonId: number }) {
  return (
    <Suspense fallback={<div className="canvas"><p className="metadata">Loading lesson…</p></div>}>
      <Workspace lessonId={lessonId} />
    </Suspense>
  );
}
