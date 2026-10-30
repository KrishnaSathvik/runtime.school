/**
 * PySpark is hidden until it's ready (docs/pyspark/plan.md §7).
 *
 * - `NEXT_PUBLIC_PYSPARK=1` turns its pages on. Off (the default): every `/pyspark*` route 404s, nothing is in the
 *   sitemap, and the landing card stays "planned".
 * - Planned content can be inspected only in local development. A production build shows `published` items only.
 * - The Spark runner is a local development bridge; a production build never calls one.
 *
 * Env reads are literal so Next inlines them into client bundles.
 */
export function pysparkEnabled(flag: string | undefined = process.env.NEXT_PUBLIC_PYSPARK): boolean {
  return flag === "1";
}

/** Whether unpublished items (planned, in review) may be shown, clearly marked. Never in a production build. */
export function pysparkInspect(nodeEnv: string | undefined = process.env.NODE_ENV): boolean {
  return nodeEnv !== "production";
}

/** The local Spark runner bridge (services/spark-runner/dev_server.py), or null when there isn't one. */
export function pysparkRunnerUrl(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  url: string | undefined = process.env.NEXT_PUBLIC_PYSPARK_RUNNER_URL,
): string | null {
  if (nodeEnv === "production" || !url) return null;
  return url.replace(/\/$/, "");
}
