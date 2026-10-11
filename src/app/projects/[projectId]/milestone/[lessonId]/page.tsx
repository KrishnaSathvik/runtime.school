"use client";

import { useParams } from "next/navigation";
import { LessonWorkspace } from "@/features/lesson/LessonWorkspace";

export default function ProjectMilestonePage() {
  const params = useParams();
  return (
    <LessonWorkspace
      lessonId={Number(params.lessonId)}
      projectId={Number(params.projectId)}
    />
  );
}
