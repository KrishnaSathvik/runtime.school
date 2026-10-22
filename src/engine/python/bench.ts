import type { PyRunResult } from "./client";

/**
 * The Performance Lab benchmark (T04), as one Python program run in the normal sandboxed runner.
 *
 * The setup builds the inputs once (not timed). Each implementation runs in a fresh namespace that holds
 * those inputs and must assign `result`. Order of work: one run of each to check the results match (and
 * to show what it printed), one warmup each, then timed runs alternating A and B with the garbage collector
 * off (as timeit does), then one run each under tracemalloc for peak memory. A time budget lowers the
 * number of repeats for slow inputs so the whole comparison stays inside the run limit.
 * The program prints one line starting with BENCH_MARK followed by JSON; everything else is learner output.
 */
export const BENCH_MARK = "__runtime_bench__";
/** How long one comparison may take in total. Timed runs share a smaller budget inside it. */
export const BENCH_TIMEOUT_MS = 60000;
const BENCH_BUDGET_S = 25;

export type BenchSide = {
  ok: boolean;
  error?: { type: string; message: string; line: number | null };
  printed?: string;
  times?: number[];
  peak?: number | null;
  summary?: string;
};
export type BenchReport = { a: BenchSide; b: BenchSide; same: boolean | null; diff?: string; repeats: number; python: string; budgetCut: boolean; libs?: Record<string, string> };

const py = (s: string) => JSON.stringify(s);

export function benchProgram(setup: string, a: string, b: string, repeats: number): string {
  return `import gc, io, json, math, sys, time, traceback, tracemalloc

SETUP = ${py(setup)}
SOURCES = {"a": ${py(a)}, "b": ${py(b)}}
REPEATS = ${Math.max(1, Math.min(25, Math.round(repeats)))}
BUDGET = ${BENCH_BUDGET_S}

inputs = {"__name__": "__bench__"}
exec(compile(SETUP, "setup.py", "exec"), inputs)
codes = {}
for k, src in SOURCES.items():
    try:
        codes[k] = compile(src, k + ".py", "exec")
    except SyntaxError as e:
        codes[k] = e


def run(key):
    ns = dict(inputs)
    out = io.StringIO()
    saved = sys.stdout
    sys.stdout = out
    try:
        start = time.perf_counter()
        exec(codes[key], ns)
        elapsed = time.perf_counter() - start
    finally:
        sys.stdout = saved
    if "result" not in ns:
        raise NameError(key.upper() + " didn't assign result")
    return elapsed, ns["result"], out.getvalue()


def same(x, y):
    if hasattr(x, "tolist") and hasattr(x, "shape") and hasattr(y, "tolist"):
        x, y = x.tolist(), y.tolist()
    if hasattr(x, "equals") and hasattr(y, "equals"):
        try:
            return bool(x.equals(y))
        except Exception:
            return False
    if isinstance(x, float) or isinstance(y, float):
        try:
            return math.isclose(float(x), float(y), rel_tol=1e-9, abs_tol=1e-9)
        except (TypeError, ValueError):
            return False
    if isinstance(x, dict) and isinstance(y, dict):
        return x.keys() == y.keys() and all(same(x[k], y[k]) for k in x)
    if isinstance(x, (list, tuple)) and isinstance(y, (list, tuple)):
        return len(x) == len(y) and all(same(p, q) for p, q in zip(x, y))
    return x == y


def describe(value):
    kind = type(value).__name__
    try:
        return f"{kind} of {len(value):,}"
    except TypeError:
        text = repr(value)
        return kind + " " + (text if len(text) <= 60 else text[:57] + "...")


def short(value):
    text = repr(value)
    return text if len(text) <= 60 else text[:57] + "..."


def first_difference(x, y, where="result"):
    """Where A's and B's results first differ, e.g. "result[1]: A has 3, B has 2"."""
    try:
        if hasattr(x, "tolist") and hasattr(x, "shape") and hasattr(y, "tolist"):
            x, y = x.tolist(), y.tolist()
        if hasattr(x, "to_dict") and hasattr(y, "to_dict"):
            x, y = x.to_dict(), y.to_dict()
    except Exception:
        pass
    alike = type(x) is type(y) or all(isinstance(v, (int, float)) for v in (x, y)) or all(isinstance(v, (list, tuple)) for v in (x, y))
    if not alike:
        return f"{where}: A has {type(x).__name__} {short(x)}, B has {type(y).__name__} {short(y)}"
    if isinstance(x, dict):
        for k in x:
            if k not in y:
                return f"{where}: key {k!r} is in A but not in B"
        for k in y:
            if k not in x:
                return f"{where}: key {k!r} is in B but not in A"
        for k in x:
            if not same(x[k], y[k]):
                return first_difference(x[k], y[k], f"{where}[{k!r}]")
    if isinstance(x, (list, tuple)):
        for i, (p, q) in enumerate(zip(x, y)):
            if not same(p, q):
                return first_difference(p, q, f"{where}[{i}]")
        if len(x) != len(y):
            return f"{where}: A has {len(x):,} items, B has {len(y):,}"
    if isinstance(x, (set, frozenset)):
        only_a = sorted(map(repr, x - y))[:1]
        only_b = sorted(map(repr, y - x))[:1]
        if only_a:
            return f"{where}: {only_a[0]} is in A but not in B"
        if only_b:
            return f"{where}: {only_b[0]} is in B but not in A"
    return f"{where}: A has {short(x)}, B has {short(y)}"


def failure(key, e):
    line = None
    for frame in traceback.extract_tb(e.__traceback__):
        if frame.filename == key + ".py":
            line = frame.lineno
    return {"type": type(e).__name__, "message": str(e), "line": line}


report = {"a": {"ok": True}, "b": {"ok": True}, "same": None, "repeats": 0, "python": sys.version.split()[0], "budgetCut": False, "libs": {}}
results = {}
for key in ("a", "b"):
    if isinstance(codes[key], SyntaxError):
        e = codes[key]
        report[key] = {"ok": False, "error": {"type": type(e).__name__, "message": e.msg, "line": e.lineno}}
        continue
    try:
        _, value, printed = run(key)
        results[key] = value
        report[key]["printed"] = printed[:2000]
        report[key]["summary"] = describe(value)
    except Exception as e:
        report[key] = {"ok": False, "error": failure(key, e)}

if report["a"]["ok"] and report["b"]["ok"]:
    report["same"] = same(results["a"], results["b"])
    if not report["same"]:
        try:
            report["diff"] = "first difference at " + first_difference(results["a"], results["b"])
        except Exception:
            report["diff"] = "A gave " + describe(results["a"]) + "; B gave " + describe(results["b"])
    results.clear()
    warm = {k: run(k)[0] for k in ("a", "b")}
    repeats = REPEATS
    per_round = warm["a"] + warm["b"]
    if per_round * REPEATS > BUDGET:
        repeats = max(3, int(BUDGET / max(per_round, 1e-9)))
        report["budgetCut"] = repeats < REPEATS
    times = {"a": [], "b": []}
    gc.collect()
    enabled = gc.isenabled()
    gc.disable()
    try:
        for i in range(repeats):
            for key in (("a", "b") if i % 2 == 0 else ("b", "a")):
                times[key].append(run(key)[0])
    finally:
        if enabled:
            gc.enable()
    report["repeats"] = repeats
    for key in ("a", "b"):
        report[key]["times"] = times[key]
        gc.collect()
        tracemalloc.start()
        try:
            run(key)
            report[key]["peak"] = tracemalloc.get_traced_memory()[1]
        finally:
            tracemalloc.stop()

for name in ("numpy", "pandas", "polars", "duckdb", "pyarrow"):
    module = sys.modules.get(name)
    if module is not None and hasattr(module, "__version__"):
        report["libs"][name] = str(module.__version__)
print(${py(BENCH_MARK)} + json.dumps(report))
`;
}

export type ProfileRow = { func: string; calls: number; total: number; cumulative: number };
export type ProfileReport = { a: ProfileRow[] | { error: string }; b: ProfileRow[] | { error: string } };

/** One run of each side under cProfile: the functions that took the most time, for "where does the time go?". */
export function profileProgram(setup: string, a: string, b: string): string {
  return `import cProfile, json, pstats

SETUP = ${py(setup)}
SOURCES = {"a": ${py(a)}, "b": ${py(b)}}
inputs = {"__name__": "__bench__"}
exec(compile(SETUP, "setup.py", "exec"), inputs)
report = {}
for key, src in SOURCES.items():
    ns = dict(inputs)
    profiler = cProfile.Profile()
    try:
        code = compile(src, key + ".py", "exec")
        profiler.enable()
        exec(code, ns)
        profiler.disable()
    except Exception as e:
        profiler.disable()
        report[key] = {"error": type(e).__name__ + ": " + str(e)}
        continue
    stats = pstats.Stats(profiler)
    rows = []
    for (filename, line, name), (cc, nc, tt, ct, callers) in stats.stats.items():
        if name in ("<built-in method builtins.exec>", "<method 'disable' of '_lsprof.Profiler' objects>"):
            continue  # the profiler's own bookkeeping
        where = name if filename.startswith("~") else f"{name} ({filename.split('/')[-1]}:{line})"
        rows.append({"func": where, "calls": nc, "total": tt, "cumulative": ct})
    rows.sort(key=lambda r: -r["total"])
    report[key] = rows[:8]
print(${py(BENCH_MARK)} + json.dumps(report))
`;
}

/** Pull the report out of the program's stdout. The rest of stdout is what the setup printed. */
export function readBench<T = BenchReport>(stdout: string): { report: T | null; rest: string } {
  const at = stdout.lastIndexOf(BENCH_MARK);
  if (at < 0) return { report: null, rest: stdout };
  const line = stdout.slice(at + BENCH_MARK.length).split("\n")[0];
  try {
    return { report: JSON.parse(line) as T, rest: stdout.slice(0, at) };
  } catch {
    return { report: null, rest: stdout };
  }
}

export type BenchStats = { median: number; min: number; max: number; spread: number };

export function stats(times: number[]): BenchStats {
  const s = [...times].sort((x, y) => x - y);
  const mid = s.length >> 1;
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  // Spread: half the interquartile range, as a share of the median. One slow outlier barely moves it.
  const q = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
  return { median, min: s[0], max: s.at(-1)!, spread: median > 0 ? (q(0.75) - q(0.25)) / 2 / median : 0 };
}

export function formatSeconds(s: number): string {
  if (s >= 1) return `${s.toFixed(2)} s`;
  if (s >= 0.001) return `${(s * 1000).toFixed(s >= 0.1 ? 0 : 1)} ms`;
  return `${(s * 1e6).toFixed(0)} µs`;
}

export function formatBytes(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
}

/**
 * Try it runs the lab's input setup, then the version, as one program. Line numbers and tracebacks are given back
 * in the version's own lines ("B", line 1), and lines in the setup are named as the setup.
 */
export function ownLines(r: PyRunResult, setup: string, code: string, side: "a" | "b"): PyRunResult {
  const offset = setup.split("\n").length + 1;
  const own = code.replace(/\n$/, "").split("\n").length;
  const name = side.toUpperCase();
  const map = (n: number | null) => (n !== null && n > offset && n <= offset + own ? n - offset : null);
  const file = (n: number) => (n > offset && n <= offset + own ? `File "${name}", line ${n - offset}` : n <= offset ? `File "the lab's input setup", line ${n}` : `File "the lab's result check", line 1`);
  if (r.status === "runtime-error") {
    return { ...r, error: { ...r.error, line: map(r.error.line), file: null, traceback: r.error.traceback.replace(/File "main\.py", line (\d+)/g, (_, n: string) => file(Number(n))) } };
  }
  if (r.status === "syntax-error") return { ...r, error: { ...r.error, line: map(r.error.line) } };
  return r;
}
