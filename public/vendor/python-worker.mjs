// Runtime Python worker: one Pyodide interpreter, used for exactly one execution, then discarded.
// A fresh interpreter per run is the isolation guarantee: imported modules, patched builtins,
// sys state and virtual files from one attempt can never reach the next.
// This is not a security sandbox; see docs/python/runtime.md.
import { loadPyodide } from "./pyodide/314.0.7/pyodide.mjs";

// Bound before any learner code runs, so `js.postMessage = …` or patched globals from Python
// cannot rewrite what this worker reports. Every message also carries the run's nonce, which
// lives only in this module's scope; messages Python forges itself lack it and are ignored.
const post = globalThis.postMessage.bind(globalThis);
const fromEntries = Object.fromEntries;
const stringify = JSON.stringify;
const now = performance.now.bind(performance);

// The harness. Python's exec() runs the learner's own program inside Pyodide (no shell, no child
// process). Every builtin used after the learner's code has run is captured first, so patching
// builtins cannot change how values are read. Values are returned as type-tagged data and judged
// on the main thread; expected answers never enter this interpreter.
const HARNESS = String.raw`
import ast, builtins, io, json, linecache, sys, traceback

_type = type; _len = len; _str = str; _int = int; _float = float; _bool = bool
_list = list; _tuple = tuple; _dict = dict; _set = set; _frozenset = frozenset
_id = id; _callable = callable; _repr = repr
_int_repr = int.__repr__; _float_repr = float.__repr__; _str_repr = str.__repr__
_dict_items = dict.items; _name_desc = type.__dict__["__name__"]
_loads = json.loads; _extract_tb = traceback.extract_tb
_format_list = traceback.format_list; _format_only = traceback.format_exception_only
_sys = sys; _builtins = builtins; _Module = type(sys); _lines = linecache.cache
_ast_parse = ast.parse; _ast_walk = ast.walk
_Assign = ast.Assign; _AugAssign = ast.AugAssign; _AnnAssign = ast.AnnAssign; _Name = ast.Name; _Tuple = ast.Tuple; _List = ast.List
_out0 = sys.stdout; _err0 = sys.stderr
MAX_DEPTH = 12; MAX_ITEMS = 500; MAX_STR = 5000; MAX_CALL_OUT = 5000; MAX_NAMES = 100


class _OutputLimit(BaseException):
    pass


class _Capture:
    def __init__(self):
        self.parts = []
        self.size = 0

    def write(self, s):
        if _type(s) is not _str:
            s = _str(s)
        room = MAX_CALL_OUT - self.size
        if _len(s) > room:
            self.parts.append(s[:room])
            self.size = MAX_CALL_OUT
            raise _OutputLimit()
        self.parts.append(s)
        self.size += _len(s)
        return _len(s)

    def flush(self):
        pass

    def text(self):
        return "".join(self.parts)


def _type_name(t):
    try:
        n = _name_desc.__get__(t, _type)
        return n if _type(n) is _str else "?"
    except BaseException:
        return "?"


def _frames(tb):
    return [f for f in _extract_tb(tb) if f.filename == "main.py"]


def _error(e):
    try:
        frames = _frames(e.__traceback__)
        only = "".join(_format_only(_type(e), e))
        try:
            message = _str(e)
        except BaseException:
            message = ""
        return {
            "type": _type_name(_type(e)),
            "message": message,
            "line": frames[-1].lineno if frames else None,
            "traceback": ("Traceback (most recent call last):\n" + "".join(_format_list(frames)) + only) if frames else only,
        }
    except BaseException:
        return {"type": _type_name(_type(e)), "message": "", "line": None, "traceback": ""}


def _ser(v, depth=0, seen=None):
    t = _type(v)
    if v is None:
        return {"t": "none"}
    if t is _bool:
        return {"t": "bool", "v": v is True}
    if t is _int:
        try:
            return {"t": "int", "v": _int_repr(v)}
        except ValueError:
            return {"t": "other", "type": "int", "repr": "<int with too many digits>"}
    if t is _float:
        return {"t": "float", "v": v, "r": _float_repr(v)}
    if t is _str:
        if _len(v) > MAX_STR:
            return {"t": "str", "v": v[:MAX_STR], "r": _str_repr(v[:MAX_STR]), "truncated": True}
        return {"t": "str", "v": v, "r": _str_repr(v)}
    kind = "list" if t is _list else "tuple" if t is _tuple else "set" if t is _set else "frozenset" if t is _frozenset else "dict" if t is _dict else None
    if kind is not None:
        if seen is None:
            seen = _set()
        if depth >= MAX_DEPTH or _id(v) in seen:
            return {"t": "other", "type": kind, "repr": "[...]"}
        seen.add(_id(v))
        out = []
        truncated = False
        for item in (_dict_items(v) if kind == "dict" else v):
            if _len(out) >= MAX_ITEMS:
                truncated = True
                break
            if kind == "dict":
                out.append([_ser(item[0], depth + 1, seen), _ser(item[1], depth + 1, seen)])
            else:
                out.append(_ser(item, depth + 1, seen))
        seen.discard(_id(v))
        r = {"t": kind}
        r["entries" if kind == "dict" else "items"] = out
        if truncated:
            r["truncated"] = True
        return r
    try:
        text = _repr(v)
        if _type(text) is not _str:
            text = "?"
    except BaseException:
        text = "<" + _type_name(t) + " object>"
    return {"t": "other", "type": _type_name(t), "repr": text[:300]}


def _de(x):
    t = x["t"]
    if t == "none":
        return None
    if t == "bool":
        return x["v"] is True
    if t == "int":
        return _int(x["v"])
    if t == "float":
        return _float(x["v"])
    if t == "str":
        return x["v"]
    if t == "list":
        return [_de(i) for i in x["items"]]
    if t == "tuple":
        return _tuple([_de(i) for i in x["items"]])
    if t == "set":
        return _set([_de(i) for i in x["items"]])
    if t == "frozenset":
        return _frozenset([_de(i) for i in x["items"]])
    if t == "dict":
        return {_de(k): _de(v) for k, v in x["entries"]}
    raise ValueError("unsupported test value")


def _assignments(source, names):
    # Learning-objective facts from the parsed source (read before the program runs): for each
    # requested name, its top-level assignments in order and the variable names each one uses.
    found = {n: [] for n in names}
    if not names:
        return found
    try:
        tree = _ast_parse(source)
    except BaseException:
        return found
    for node in tree.body:
        if isinstance(node, _Assign):
            targets, value = node.targets, node.value
        elif isinstance(node, _AugAssign):
            targets, value = [node.target], node.value
        elif isinstance(node, _AnnAssign) and node.value is not None:
            targets, value = [node.target], node.value
        else:
            continue
        used = sorted({n.id for n in _ast_walk(value) if isinstance(n, _Name)})
        for t in targets:
            for tn in (t.elts if isinstance(t, (_Tuple, _List)) else [t]):
                if isinstance(tn, _Name) and tn.id in found:
                    found[tn.id].append({"line": node.lineno, "uses": used, "aug": isinstance(node, _AugAssign)})
    return found


def _probe(ns, probe, progress):
    names = []
    for k in _list(ns):
        if _len(names) >= MAX_NAMES:
            break
        if _type(k) is _str and not k.startswith("__") and _type(ns[k]) is not _Module:
            names.append(k)
    found = {}
    for name in probe.get("vars", []):
        found[name] = {"value": _ser(ns[name])} if name in ns else {"missing": True}
    calls = {}
    for call in probe.get("calls", []):
        name = call["name"]
        if name not in ns:
            calls[name] = {"missing": True}
            continue
        fn = ns[name]
        if not _callable(fn):
            calls[name] = {"notCallable": True, "type": _type_name(_type(fn))}
            continue
        cases = []
        index = 0
        for case in call["cases"]:
            progress(name, index)
            index += 1
            cap = _Capture()
            saved = _sys.stdout
            _sys.stdout = cap
            try:
                # Fresh argument objects per case, so one case cannot mutate another's input.
                args = [_de(a) for a in case.get("args", [])]
                kwargs = {k: _de(v) for k, v in _dict_items(case.get("kwargs", {}))}
                value = fn(*args, **kwargs)
                entry = {"ok": True, "value": _ser(value)}
            except _OutputLimit:
                entry = {"ok": False, "error": {"type": "OutputLimit", "message": "printed too much output", "line": None, "traceback": ""}}
            except BaseException as e:
                entry = {"ok": False, "error": _error(e)}
            finally:
                _sys.stdout = saved
            entry["stdout"] = cap.text()
            cases.append(entry)
        calls[name] = {"cases": cases}
    return {"names": names, "vars": found, "calls": calls, "assignments": probe.get("_assignments", {})}


def run(source, probe_json, progress):
    # Parsed before the learner's code runs.
    probe = _loads(probe_json) if probe_json is not None else None
    _lines["main.py"] = (_len(source), None, source.splitlines(True), "main.py")
    try:
        code = compile(source, "main.py", "exec", dont_inherit=True)
    except SyntaxError as e:
        return {
            "status": "syntax-error",
            "type": _type_name(_type(e)),
            "message": e.msg or _str(e),
            "line": e.lineno,
            "column": e.offset,
            "endLine": getattr(e, "end_lineno", None),
            "endColumn": getattr(e, "end_offset", None),
            "text": (e.text or "").rstrip("\n"),
        }
    except ValueError as e:
        return {"status": "syntax-error", "type": "ValueError", "message": _str(e), "line": None, "column": None, "text": ""}
    if probe is not None:
        probe["_assignments"] = _assignments(source, probe.get("assignments", []))
    ns = {"__name__": "__main__", "__builtins__": _builtins}
    try:
        exec(code, ns)
        result = {"status": "ok"}
    except SystemExit as e:
        if e.code is None or (_type(e.code) is _int and e.code == 0):
            result = {"status": "ok"}
        else:
            result = {"status": "runtime-error", "type": "SystemExit", "message": "exit(" + _repr(e.code) + ")", "line": None, "traceback": ""}
    except BaseException as e:
        result = {"status": "runtime-error"}
        result.update(_error(e))
    finally:
        for stream in (_out0, _err0):
            try:
                stream.flush()
            except BaseException:
                pass
    if result["status"] == "ok" and probe is not None:
        result["probe"] = _probe(ns, probe, progress)
    return result
`;

let harnessRun = null;
let pyodideRef = null;
let used = false;
let run = null; // { id, nonce, limit, sent, overflowed }

function makeWriter(stream) {
  const decoder = new TextDecoder();
  return {
    write(buf) {
      if (!run || run.overflowed) return buf.length;
      const text = decoder.decode(buf, { stream: true });
      const room = run.limit - run.sent;
      if (text.length > room) {
        if (room > 0) post({ type: "output", id: run.id, nonce: run.nonce, stream, text: text.slice(0, room) });
        run.sent = run.limit;
        run.overflowed = true;
        // The main thread terminates this worker on overflow.
        post({ type: "overflow", id: run.id, nonce: run.nonce });
        return buf.length;
      }
      run.sent += text.length;
      if (text) post({ type: "output", id: run.id, nonce: run.nonce, stream, text });
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
  post({ type: "ready", version: pyodide.version });
})().catch((err) => {
  post({ type: "boot-error", message: String(err?.message ?? err) });
});

onmessage = async ({ data }) => {
  if (data?.type !== "run") return;
  await booted;
  if (!harnessRun) return; // boot failed; the client already knows
  if (used) {
    post({ type: "done", id: data.id, nonce: data.nonce, result: { status: "crashed", message: "This Python worker was already used." } });
    return;
  }
  used = true;
  const id = data.id;
  const nonce = String(data.nonce ?? "");
  run = { id, nonce, limit: data.outputLimit, sent: 0, overflowed: false };
  // stdin is whatever the exercise supplies; once it runs out, input() raises EOFError as in real Python.
  const lines = typeof data.stdin === "string" && data.stdin ? data.stdin.split(/(?<=\n)/) : [];
  pyodideRef.setStdin({ stdin: () => lines.shift(), isatty: false });
  const progress = (call, index) => post({ type: "case", id, nonce, call: String(call), index: Number(index) });
  // undefined, not null: Pyodide turns JS null into jsnull, which is not Python's None.
  const probeJson = data.probe ? stringify(data.probe) : undefined;
  const started = now();
  let result;
  try {
    const proxy = harnessRun(String(data.code ?? ""), probeJson, progress);
    result = proxy.toJs({ dict_converter: fromEntries });
    proxy.destroy();
  } catch (err) {
    result = { status: "crashed", message: String(err?.message ?? err) };
  }
  result.durationMs = Math.round(now() - started);
  post({ type: "done", id, nonce, result });
};
