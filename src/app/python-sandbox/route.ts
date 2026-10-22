import { pythonRunnerEnabled } from "@/platform/python-runner";
import { RUNNER_DIR, sandboxPolicy } from "@/platform/python-sandbox";

/**
 * Host document for the isolated Python runner (docs/python/runner-isolation.md). Loaded only inside
 * `<iframe sandbox="allow-scripts">`; the CSP `sandbox` directive makes it an opaque origin even if opened
 * directly, so learner code can't reach this site's cookies, storage or DOM. Its CSP allows scripts and
 * network only from the self-hosted Pyodide folder.
 */
export function GET(req: Request): Response {
  if (!pythonRunnerEnabled()) return new Response("Not found", { status: 404 });
  const origin = new URL(req.url).origin;
  const html = `<!doctype html><meta charset="utf-8"><title>Python runner</title><script type="module" src="${origin}${RUNNER_DIR}python-sandbox.mjs"></script>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": sandboxPolicy(origin),
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}
