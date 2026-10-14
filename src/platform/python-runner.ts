/**
 * Where learner Python may execute.
 *
 * Python currently runs in a same-origin worker, which is not an isolation boundary: Pyodide's JS
 * bridge can reach this origin's storage and network. Until the separate-origin runner exists,
 * execution is allowed only in local development and in previews that are access-controlled and
 * built with NEXT_PUBLIC_PYTHON_RUNNER=1. Production is always off, whatever the flag says.
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
  if (env.vercelEnv === "production") return false;
  return env.nodeEnv === "development" || env.flag === "1";
}
