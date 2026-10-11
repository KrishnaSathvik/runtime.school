import type { Recommendation } from "@/lib/learning-state";

/** Where a recommended activity lives. */
export function hrefFor(rec: Pick<Recommendation, "id" | "project" | "kind">): string {
  if (rec.kind === "review") return `/review/${rec.id}`;
  if (rec.project !== null) return `/projects/${rec.project}/milestone/${rec.id}`;
  return `/lesson/${rec.id}`;
}
