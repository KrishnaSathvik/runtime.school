/**
 * Where learner Python may execute.
 *
 * Python currently runs in a same-origin worker, which is not an isolation boundary: Pyodide's JS
 * bridge can reach this origin's storage and network. Until the separate-origin runner exists,
 * execution is allowed only in local `next dev`. Every Vercel deployment (production and preview)
 * keeps Python off — `/python*` routes 404 and the landing subject stays waitlisted.
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
  // Never ship Python on Vercel (production or preview), regardless of flags.
  if (env.vercelEnv === "production" || env.vercelEnv === "preview") return false;
  // Local development only. NEXT_PUBLIC_PYTHON_RUNNER is ignored for deploy safety.
  void env.flag;
  return env.nodeEnv === "development";
}
