"use client";

import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { rtSectionHrefs } from "@/features/rt/entry";
import { useHydrated, useLearning } from "@/lib/learning-state";
import { Shell } from "../Shell";

/** Learn has no overview page: it opens your first unfinished lesson straight away. */
export function LearnEntry() {
  const router = useRouter();
  const ready = useHydrated();
  const done = useRef(false);
  useLayoutEffect(() => {
    // Redirect once; later store updates must not navigate again.
    if (!ready || done.current) return;
    done.current = true;
    router.replace(rtSectionHrefs(useLearning.getState()).learn);
  }, [ready, router]);
  return (
    <Shell path={[{ label: "sql" }, { label: "learn" }]} section="learn">
      <div className="rx-page" aria-busy="true" aria-label="Opening your lesson" />
    </Shell>
  );
}
