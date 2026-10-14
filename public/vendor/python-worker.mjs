// Runtime Python worker: one Pyodide interpreter, used for exactly one execution, then discarded.
// A fresh interpreter per run is the isolation guarantee: imported modules, patched builtins,
// sys state and virtual files from one attempt can never reach the next.
// This is not a security sandbox; see docs/python/runtime.md.
import { loadPyodide } from "./pyodide/314.0.7/pyodide.mjs";

// Python's exec() of the learner's own program inside Pyodide (no shell, no child process).
const HARNESS = String.raw`
import builtins, linecache, sys, traceback

def _frames(tb):
    return [f for f in traceback.extract_tb(tb) if f.filename == "main.py"]

def run(source):
    linecache.cache["main.py"] = (len(source), None, source.splitlines(True), "main.py")
    try:
        code = compile(source, "main.py", "exec", dont_inherit=True)
    except SyntaxError as e:
        return {
            "status": "syntax-error",
            "type": type(e).__name__,
            "message": e.msg or str(e),
            "line": e.lineno,
            "column": e.offset,
            "endLine": getattr(e, "end_lineno", None),
            "endColumn": getattr(e, "end_offset", None),
            "text": (e.text or "").rstrip("\n"),
        }
    except ValueError as e:
        return {"status": "syntax-error", "type": "ValueError", "message": str(e), "line": None, "column": None, "text": ""}
    ns = {"__name__": "__main__", "__builtins__": builtins}
    try:
        exec(code, ns)
        result = {"status": "ok"}
    except SystemExit as e:
        if e.code in (None, 0):
            result = {"status": "ok"}
        else:
            result = {"status": "runtime-error", "type": "SystemExit", "message": "exit(" + repr(e.code) + ")", "line": None, "traceback": ""}
    except BaseException as e:
        frames = _frames(e.__traceback__)
        only = "".join(traceback.format_exception_only(type(e), e))
        result = {
            "status": "runtime-error",
            "type": type(e).__name__,
            "message": str(e),
            "line": frames[-1].lineno if frames else None,
            "traceback": ("Traceback (most recent call last):\n" + "".join(traceback.format_list(frames)) + only) if frames else only,
        }
    finally:
        for stream in (sys.stdout, sys.stderr):
            try:
                stream.flush()
            except Exception:
                pass
    return result
`;

let harnessRun = null;
let pyodideRef = null;
let used = false;
let run = null; // { id, limit, sent, overflowed }

function makeWriter(stream) {
  const decoder = new TextDecoder();
  return {
    write(buf) {
      if (!run || run.overflowed) return buf.length;
      const text = decoder.decode(buf, { stream: true });
      const room = run.limit - run.sent;
      if (text.length > room) {
        if (room > 0) postMessage({ type: "output", id: run.id, stream, text: text.slice(0, room) });
        run.sent = run.limit;
        run.overflowed = true;
        // The main thread terminates this worker on overflow.
        postMessage({ type: "overflow", id: run.id });
        return buf.length;
      }
      run.sent += text.length;
      if (text) postMessage({ type: "output", id: run.id, stream, text });
      return buf.length;
    },
  };
}

const booted = (async () => {
  const pyodide = await loadPyodide({
    indexURL: new URL("./pyodide/314.0.7/", import.meta.url).href,
    packages: [],
  });
  pyodide.setStdout(makeWriter("stdout"));
  pyodide.setStderr(makeWriter("stderr"));
  pyodideRef = pyodide;
  const ns = pyodide.globals.get("dict")();
  pyodide.runPython(HARNESS, { globals: ns });
  harnessRun = ns.get("run");
  ns.destroy();
  postMessage({ type: "ready", version: pyodide.version });
})().catch((err) => {
  postMessage({ type: "boot-error", message: String(err?.message ?? err) });
});

onmessage = async ({ data }) => {
  if (data?.type !== "run") return;
  await booted;
  if (!harnessRun) return; // boot failed; the client already knows
  if (used) {
    postMessage({ type: "done", id: data.id, result: { status: "crashed", message: "This Python worker was already used." } });
    return;
  }
  used = true;
  run = { id: data.id, limit: data.outputLimit, sent: 0, overflowed: false };
  // stdin is whatever the exercise supplies; once it runs out, input() raises EOFError as in real Python.
  const lines = typeof data.stdin === "string" && data.stdin ? data.stdin.split(/(?<=\n)/) : [];
  pyodideRef.setStdin({ stdin: () => lines.shift(), isatty: false });
  const started = performance.now();
  let result;
  try {
    const proxy = harnessRun(String(data.code ?? ""));
    result = proxy.toJs({ dict_converter: Object.fromEntries });
    proxy.destroy();
  } catch (err) {
    result = { status: "crashed", message: String(err?.message ?? err) };
  }
  result.durationMs = Math.round(performance.now() - started);
  postMessage({ type: "done", id: data.id, result });
};
