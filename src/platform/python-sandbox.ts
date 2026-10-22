/** Runner files are served under /runner/ (a rewrite of /vendor/; see next.config.ts for why). */
export const RUNNER_DIR = "/runner/";
/** The self-hosted Pyodide release folder: the only place the isolated runner may load scripts or files from. */
export const PYODIDE_DIR = "/runner/pyodide/314.0.7/";

/**
 * CSP for the runner host document (docs/python/runner-isolation.md).
 * - `sandbox allow-scripts`: opaque origin, so no cookies, localStorage, IndexedDB or parent DOM.
 * - scripts: the sandbox bootstrap, the worker module and the Pyodide folder only; `wasm-unsafe-eval` to compile Python.
 * - network: the Pyodide folder only (wasm, stdlib, wheels). Dataset bytes are handed in by the page.
 * - workers: a data: URL loader (Chrome refuses blob:null workers) plus the worker's own module files.
 */
export function sandboxPolicy(origin: string): string {
  const pyodide = `${origin}${PYODIDE_DIR}`;
  return [
    "sandbox allow-scripts",
    "default-src 'none'",
    `script-src ${origin}${RUNNER_DIR}python-sandbox.mjs ${origin}${RUNNER_DIR}python-worker.mjs ${pyodide} 'wasm-unsafe-eval'`,
    `connect-src ${pyodide}`,
    // Firefox checks modules imported inside a worker against worker-src, so the worker's own files are listed too.
    `worker-src data: ${origin}${RUNNER_DIR}python-worker.mjs ${pyodide}`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}
