"use client";

import { useParams, useSearchParams } from "next/navigation";
import { QuestionWorkspace } from "@/features/practice/QuestionWorkspace";

export default function PracticeQuestionPage() {
  const params = useParams();
  const search = useSearchParams();
  return <QuestionWorkspace slug={String(params.slug)} trackId={search.get("track")} />;
}
