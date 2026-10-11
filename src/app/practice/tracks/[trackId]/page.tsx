"use client";

import { useParams } from "next/navigation";
import { TrackPage } from "@/features/practice/TrackPage";

export default function PracticeTrackPage() {
  const params = useParams();
  return <TrackPage trackId={String(params.trackId)} />;
}
