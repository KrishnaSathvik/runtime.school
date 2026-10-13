"use client";
import { ExampleRun } from "@/components/editor/ExampleRun";

export function WalkthroughStep({ query, allowWrites }: { query: string; allowWrites: boolean }) {
  return (
    <div className="mt-2">
      <ExampleRun query={query} allowWrites={allowWrites} title="step.sql · SQLite" runLabel="Run this step" small />
    </div>
  );
}
