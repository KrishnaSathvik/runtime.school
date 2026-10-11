"use client";

import { useParams, useSearchParams } from "next/navigation";
import { LessonWorkspace } from "@/features/lesson/LessonWorkspace";

export default function LessonPage() {
  const params = useParams();
  const search = useSearchParams();
  const challenge = Number(search.get("challenge"));
  return (
    <LessonWorkspace
      lessonId={Number(params.lessonId)}
      initialChallenge={challenge === 1 || challenge === 2 ? challenge - 1 : null}
      trackId={search.get("track")}
      learnConcept={search.get("stage") === "understand"}
    />
  );
}
