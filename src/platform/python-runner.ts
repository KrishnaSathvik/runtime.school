/**
 * Where learner Python may execute.
 *
 * Every interpreter runs in the isolated sandbox runner: an opaque-origin `sandbox="allow-scripts"` iframe with its
 * own CSP and the worker's network APIs removed (docs/python/runner-isolation.md). Learner code can't reach this
 * site's cookies, storage or DOM, so Python is on everywhere: local, preview and production.
 *
 * Kill switch: build with NEXT_PUBLIC_PYTHON_RUNNER=0 to turn Python off (`/python*` routes 404, the sitemap drops
 * them and the landing subject goes back to the waitlist) without a code change.
 *
 * Env reads are literal so Next inlines them into client bundles.
 */
export function pythonRunnerEnabled(
  env: { nodeEnv?: string; vercelEnv?: string; flag?: string } = {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.NEXT_PUBLIC_VERCEL_ENV,
    flag: process.env.NEXT_PUBLIC_PYTHON_RUNNER,
  },
): boolean {
  return env.flag !== "0";
}
