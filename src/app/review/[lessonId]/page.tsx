"use client";

import { useParams } from "next/navigation";
import { ReviewSession } from "@/features/review/ReviewSession";

export default function ReviewSessionPage() {
  const params = useParams();
  return <ReviewSession lessonId={Number(params.lessonId)} />;
}
