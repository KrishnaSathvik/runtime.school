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

// Libraries a lesson may ask for (`?packages=pandas,matplotlib` on this worker's URL). Each maps to
// the Pyodide packages to load (dependencies come from the hash-checked lockfile) and the modules
// imported during boot, so the first Run doesn't pay for the import. Wheels are copied and verified
// by scripts/copy-pyodide.mjs; anything not listed here is refused.
const PACKAGE_SETS = {
  numpy: { load: ["numpy"], warm: ["numpy"] },
  pandas: { load: ["pandas"], warm: ["pandas"] },
  matplotlib: { load: ["matplotlib"], warm: ["matplotlib.pyplot"] },
  duckdb: { load: ["duckdb"], warm: ["duckdb"] },
  // DuckDB's PySpark-compatible DataFrame API, importable as `pyspark`. Not Apache Spark.
  pyspark: { load: ["duckdb", "pandas", "typing-extensions"], warm: ["pyspark.sql"] },
  "scikit-learn": { load: ["scikit-learn"], warm: ["sklearn"] },
  // Polars' core DataFrame API. This Pyodide build has no Parquet/JSON readers or streaming engine (scan_*).
  polars: { load: ["polars"], warm: ["polars"] },
  // Parquet and Arrow for pandas (read_parquet / to_parquet), and polars.to_pandas().
  pyarrow: { load: ["pyarrow"], warm: ["pyarrow"] },
  // IANA time zones for zoneinfo; nothing to import ahead of time.
  tzdata: { load: ["tzdata"], warm: [] },
};
const requested = (new URL(import.meta.url).searchParams.get("packages") ?? "").split(",").filter(Boolean);

// Runs once per interpreter, before the harness and before any learner code.
const SETUP = String.raw`
import importlib, importlib.abc, importlib.util, os, sys, warnings

def _setup(requested, warm):
    if "matplotlib" in requested:
        # No display in a worker: draw with Agg, and the harness sends finished figures as PNGs.
        os.environ["MPLBACKEND"] = "Agg"
        # Emitted by matplotlib 3.10's own Agg text drawing under Pyodide, not by learner code.
        warnings.filterwarnings("ignore", message=r"The [xy] parameter as float was deprecated", category=DeprecationWarning)
    if "pyspark" in requested:
        sys.meta_path.insert(0, _SparkAlias())
    for name in warm:
        importlib.import_module(name)


class _SparkAlias(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    # pyspark, pyspark.sql, pyspark.sql.functions, … resolve to duckdb.experimental.spark.*.
    TARGET = "duckdb.experimental.spark"

    def find_spec(self, name, path=None, target=None):
        if name != "pyspark" and not name.startswith("pyspark."):
            return None
        if importlib.util.find_spec(self.TARGET + name[len("pyspark"):]) is None:
            return None
        return importlib.util.spec_from_loader(name, self, is_package=True)

    def create_module(self, spec):
        return importlib.import_module(self.TARGET + spec.name[len("pyspark"):])

    def exec_module(self, module):
        pass
`;

// The harness. Python's exec() runs the learner's own program inside Pyodide (no shell, no child
// process). Every builtin used after the learner's code has run is captured first, so patching
// builtins cannot change how values are read. Values are returned as type-tagged data and judged
// on the main thread; expected answers never enter this interpreter.
const HARNESS = String.raw`
import ast, builtins, io, json, linecache, os, sys, traceback

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
_isinstance = isinstance; _sorted = sorted; _getattr = getattr; _open = open; _compile = compile; _eval = eval; _exec = exec
_dumps = json.dumps; _literal = ast.literal_eval; _Constant = ast.Constant; _Expr = ast.Expr; _ast_fix = ast.fix_missing_locations
_makedirs = os.makedirs; _dirname = os.path.dirname; _walk = os.walk; _relpath = os.path.relpath; _getcwd = os.getcwd; _getsize = os.path.getsize
MAX_DEPTH = 12; MAX_ITEMS = 500; MAX_STR = 5000; MAX_CALL_OUT = 5000; MAX_NAMES = 100
MAX_FIGURES = 10; MAX_FIGURE_BYTES = 1500000
MAX_FILES = 20; MAX_FILE_CHARS = 200000; MAX_TABLE_ROWS = 60; MAX_TABLE_COLS = 30

# matplotlib (only when the lesson loaded it): plt.show() and the end of the program send every open
# figure to the page as a PNG, in order with printed output, then close it.
_np = sys.modules.get("numpy")
_np_generic = _np.generic if _np is not None else None
_pd = sys.modules.get("pandas")
_plt = sys.modules.get("matplotlib.pyplot")
_figure_sink = [None, 0]  # [callback for this run, figures sent]
if _plt is not None:
    import base64
    _get_fignums = _plt.get_fignums; _figure = _plt.figure; _close = _plt.close
    _BytesIO = io.BytesIO; _b64encode = base64.b64encode


def _show_figures(*args, **kwargs):
    if _plt is None or _figure_sink[0] is None:
        return
    for stream in (_out0, _err0):
        stream.flush()
    for num in _get_fignums():
        fig = _figure(num)
        try:
            if _figure_sink[1] >= MAX_FIGURES:
                if _figure_sink[1] == MAX_FIGURES:
                    _err0.write("Only the first " + _str(MAX_FIGURES) + " figures are shown.\n")
                    _err0.flush()
                    _figure_sink[1] += 1
                continue
            buf = _BytesIO()
            fig.savefig(buf, format="png", dpi=100, bbox_inches="tight")
            data = buf.getvalue()
            if _len(data) > MAX_FIGURE_BYTES:
                _err0.write("A figure was too large to show. Try a smaller figsize.\n")
                _err0.flush()
                continue
            _figure_sink[1] += 1
            _figure_sink[0](_b64encode(data).decode("ascii"))
        finally:
            _close(fig)


_emit_sink = [None]  # callback(kind, json) for this run: tables


def _missing(x):
    if x is None:
        return True
    if _pd is None:
        return _type(x) is _float and x != x
    try:
        r = _pd.isna(x)
        if _np_generic is not None and _isinstance(r, _np_generic):
            r = r.item()
        return r is True
    except BaseException:
        return False


def _cell(x):
    if _missing(x):
        return None
    try:
        text = _str(x)
    except BaseException:
        text = "?"
    return text[:200]


def _table_payload(obj):
    # pandas DataFrame/Series, a Polars DataFrame, or a 1-D/2-D NumPy array, as a table; None for anything else.
    if _pd is not None and _isinstance(obj, (_pd.Series, _pd.DataFrame)):
        frame = obj.to_frame() if _isinstance(obj, _pd.Series) else obj
        cols = [_str(c) for c in _list(frame.columns)[:MAX_TABLE_COLS]]
        head = frame.iloc[:MAX_TABLE_ROWS, :MAX_TABLE_COLS]
        rows = []
        for idx, row in zip(_list(head.index), head.itertuples(index=False, name=None)):
            rows.append([_cell(idx)] + [_cell(x) for x in row])
        dtypes = [_str(d) for d in _list(frame.dtypes)[:MAX_TABLE_COLS]]
        return {"columns": cols, "dtypes": dtypes, "rows": rows, "shape": [_int(frame.shape[0]), _int(frame.shape[1])],
                "index": _str(frame.index.name) if frame.index.name is not None else "", "series": _isinstance(obj, _pd.Series)}
    pl = _sys.modules.get("polars")
    if pl is not None and _isinstance(obj, (pl.DataFrame, pl.Series)):
        frame = obj.to_frame() if _isinstance(obj, pl.Series) else obj
        cols = [_str(c) for c in frame.columns[:MAX_TABLE_COLS]]
        rows = [[_str(i)] + [_cell(x) for x in r[:MAX_TABLE_COLS]] for i, r in enumerate(frame.head(MAX_TABLE_ROWS).rows())]
        return {"columns": cols, "dtypes": [_str(d) for d in frame.dtypes[:MAX_TABLE_COLS]], "rows": rows,
                "shape": [_int(frame.height), _int(frame.width)], "index": "", "series": _isinstance(obj, pl.Series)}
    np = _sys.modules.get("numpy")
    if np is not None and _isinstance(obj, np.ndarray) and obj.ndim in (1, 2):
        grid = obj.reshape(-1, 1) if obj.ndim == 1 else obj
        cols = [_str(i) for i in range(min(grid.shape[1], MAX_TABLE_COLS))]
        rows = [[_str(i)] + [_cell(x) for x in r[:MAX_TABLE_COLS].tolist()] for i, r in enumerate(grid[:MAX_TABLE_ROWS])]
        return {"columns": cols, "dtypes": [_str(obj.dtype)] * _len(cols), "rows": rows,
                "shape": [_int(grid.shape[0]), _int(grid.shape[1])], "index": "", "series": obj.ndim == 1, "array": True}
    return None


def _display(*objs):
    # display(x) shows tables (DataFrames, Series, arrays) as tables, as notebooks do, and anything else readably.
    for obj in objs:
        payload = None
        try:
            payload = _table_payload(obj)
        except BaseException:
            payload = None
        if payload is None or _emit_sink[0] is None:
            if _isinstance(obj, (_dict, _list, _tuple, _set)):
                import pprint
                pprint.pprint(obj, width=88, sort_dicts=False)
            else:
                print(obj)
            continue
        for stream in (_out0, _err0):
            stream.flush()
        _emit_sink[0]("table", _dumps(payload))


builtins.display = _display


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


# The learner's own files: the program that runs (main.py unless another entry file is named) and the files beside it.
_learner = [_frozenset(["main.py"]), "main.py"]  # [names, entry]


def _own(filename):
    # A learner file's name relative to the working folder, or None for library and harness frames.
    if filename in _learner[0]:
        return filename
    if filename.startswith("/"):
        try:
            rel = _relpath(filename, _getcwd())
        except BaseException:
            return None
        if rel in _learner[0]:
            return rel
    return None


def _frames(tb):
    out = []
    for f in _extract_tb(tb):
        name = _own(f.filename)
        if name is not None:
            f.filename = name
            out.append(f)
    return out


def _error(e):
    try:
        frames = _frames(e.__traceback__)
        only = "".join(_format_only(_type(e), e))
        try:
            message = _str(e)
        except BaseException:
            message = ""
        line = frames[-1].lineno if frames else None
        file = frames[-1].filename if frames else None
        # A syntax error in a file the program imported points at that file, not at the import.
        if _isinstance(e, SyntaxError) and e.filename and _own(e.filename) is not None:
            file = _own(e.filename)
            line = e.lineno
            only = only.replace(e.filename, file)
        return {
            "type": _type_name(_type(e)),
            "message": message,
            "line": line,
            "file": file,
            "traceback": ("Traceback (most recent call last):\n" + "".join(_format_list(frames)) + only) if frames else only,
        }
    except BaseException:
        return {"type": _type_name(_type(e)), "message": "", "line": None, "traceback": ""}


def _np_scalar(v, t):
    # numpy.float64(3.5) -> 3.5, numpy.bool_(True) -> True, numpy.int64(2) -> 2: what learners mean.
    if _np_generic is None or not _isinstance(v, _np_generic):
        return None
    try:
        x = v.item()
    except BaseException:
        return None
    return x if _type(x) in (_bool, _int, _float, _str) else None


def _ser(v, depth=0, seen=None):
    t = _type(v)
    if v is None:
        return {"t": "none"}
    if t not in (_bool, _int, _float, _str):
        x = _np_scalar(v, t)
        if x is not None:
            return _ser(x, depth, seen)
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


def _override(source, values):
    # The program with the first top-level assignment to each name replaced by a test value.
    tree = _ast_parse(source)
    missing = _list(values)
    for node in tree.body:
        if _isinstance(node, _Assign) and _len(node.targets) == 1 and _isinstance(node.targets[0], _Name) and node.targets[0].id in missing:
            name = node.targets[0].id
            node.value = _ast_parse(_repr(values[name]), mode="eval").body
            missing.remove(name)
    return _ast_fix(tree), missing


def _variants(source, base, probe):
    out = []
    for variant in probe.get("variants", []):
        values = {k: _de(v) for k, v in _dict_items(variant.get("set", {}))}
        try:
            tree, missing = _override(source, values)
        except BaseException:
            out.append({"status": "skipped"})
            continue
        if missing:
            out.append({"status": "missing", "missing": missing})
            continue
        ns = {"__name__": "__main__", "__builtins__": _builtins}
        cap = _Capture()
        saved = _sys.stdout
        _sys.stdout = cap
        try:
            _exec(_compile(tree, "main.py", "exec", dont_inherit=True), ns)
            entry = {"status": "ok"}
        except _OutputLimit:
            entry = {"status": "error", "error": {"type": "OutputLimit", "message": "printed too much output", "line": None, "traceback": ""}}
        except BaseException as e:
            entry = {"status": "error", "error": _error(e)}
        finally:
            _sys.stdout = saved
        entry["stdout"] = cap.text()
        entry["vars"] = {n: ({"value": _ser(ns[n])} if n in ns else {"missing": True}) for n in variant.get("vars", [])}
        out.append(entry)
    return out


def _records(frame):
    # A DataFrame as a list of row dicts with missing values as None, for comparison.
    return [{_str(k): (None if _missing(v) else (v.item() if _np_generic is not None and _isinstance(v, _np_generic) else v)) for k, v in _dict_items(r)} for r in frame.to_dict("records")]


def _exprs(ns, probe, source):
    out = []
    for item in probe.get("exprs", []):
        scratch = _dict(ns)
        scratch["_records"] = _records
        scratch["_source"] = source
        cap = _Capture()
        saved = _sys.stdout
        _sys.stdout = cap
        try:
            code = item["code"]
            try:
                value = _eval(_compile(code, "<check>", "eval", dont_inherit=True), scratch)
            except SyntaxError:
                _exec(_compile(code, "<check>", "exec", dont_inherit=True), scratch)
                value = scratch.get("result")
            entry = {"ok": True, "value": _ser(value)}
        except _OutputLimit:
            entry = {"ok": False, "error": {"type": "OutputLimit", "message": "printed too much output", "line": None, "traceback": ""}}
        except BaseException as e:
            entry = {"ok": False, "error": _error(e)}
        finally:
            _sys.stdout = saved
        entry["stdout"] = cap.text()
        out.append(entry)
    return out


def _write_fixtures(files):
    for path, text in _dict_items(files):
        d = _dirname(path)
        if d:
            _makedirs(d, exist_ok=True)
        with _open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)


def _changed_files(files, mounted=()):
    # Files the program created or changed, so the page can show and download them.
    # Mounted dataset files are canonical inputs, not output, so they're never listed.
    found = []
    root = _getcwd()
    for d, dirs, names in _walk(root):
        dirs[:] = [x for x in dirs if not x.startswith(".") and x != "__pycache__"]
        for n in _sorted(names):
            rel = _relpath(d + "/" + n, root)
            if rel in mounted:
                continue
            if _len(found) >= MAX_FILES:
                return found
            try:
                if _getsize(rel) > MAX_FILE_CHARS * 4:
                    found.append({"path": rel, "text": "", "truncated": True})
                    continue
                with _open(rel, encoding="utf-8", newline="") as f:
                    text = f.read()
            except BaseException:
                continue
            if files.get(rel) == text:
                continue
            entry = {"path": rel, "text": text[:MAX_FILE_CHARS]}
            if _len(text) > MAX_FILE_CHARS:
                entry["truncated"] = True
            if rel in files:
                entry["changed"] = True
            found.append(entry)
    return found


def _probe(ns, probe, progress, source=""):
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
    result = {"names": names, "vars": found, "calls": calls, "assignments": probe.get("_assignments", {})}
    if probe.get("exprs"):
        result["exprs"] = _exprs(ns, probe, source)
    return result


def run(source, probe_json, progress, figure, files_json=None, emit=None, mounted_json=None, entry=None):
    # Parsed before the learner's code runs.
    probe = _loads(probe_json) if probe_json is not None else None
    files = _loads(files_json) if files_json is not None else {}
    mounted = _frozenset(_loads(mounted_json)) if mounted_json is not None else _frozenset()
    # The program runs as the entry file (main.py by default); its .py neighbours are learner files too, for tracebacks.
    entry = entry if _type(entry) is _str and entry.endswith(".py") and "/" not in entry else "main.py"
    _learner[0] = _frozenset([entry] + [k for k in files if k.endswith(".py")])
    _learner[1] = entry
    if _plt is not None:
        _figure_sink[0] = figure
        _plt.show = _show_figures
    _emit_sink[0] = emit
    try:
        _write_fixtures(files)
    except BaseException as e:
        return {"status": "crashed", "message": "could not prepare the exercise files: " + _str(e)}
    # Fixture modules (pricing.py, …) import like files next to main.py.
    if "" not in _sys.path:
        _sys.path.insert(0, "")
    _lines[entry] = (_len(source), None, source.splitlines(True), entry)
    try:
        code = compile(source, entry, "exec", dont_inherit=True)
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
    # Figures still open when the program ends are shown too, as in a notebook.
    try:
        _show_figures()
    except BaseException as e:
        if result["status"] == "ok":
            result = {"status": "runtime-error"}
            result.update(_error(e))
    finally:
        for stream in (_out0, _err0):
            try:
                stream.flush()
            except BaseException:
                pass
    try:
        changed = _changed_files(files, mounted)
    except BaseException:
        changed = []
    if changed:
        result["files"] = changed
    if result["status"] == "ok" and probe is not None:
        result["probe"] = _probe(ns, probe, progress, source)
        if probe.get("variants"):
            result["probe"]["variants"] = _variants(source, ns, probe)
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
  const unknown = requested.filter((name) => !Object.hasOwn(PACKAGE_SETS, name));
  if (unknown.length) throw new Error(`unsupported package: ${unknown.join(", ")}`);
  const pyodide = await loadPyodide({
    indexURL: new URL("./pyodide/314.0.7/", import.meta.url).href,
    packages: [],
  });
  pyodide.setStdout(makeWriter("stdout"));
  pyodide.setStderr(makeWriter("stderr"));
  pyodideRef = pyodide;
  const ns = pyodide.globals.get("dict")();
  if (requested.length) {
    const load = [...new Set(requested.flatMap((name) => PACKAGE_SETS[name].load))];
    const failures = [];
    // Only from this origin's verified copy of the release, checked against the lockfile's sha256.
    await pyodide.loadPackage(load, { messageCallback: () => {}, errorCallback: (m) => failures.push(m), checkIntegrity: true });
    if (failures.length) throw new Error(failures.join("; "));
    pyodide.runPython(SETUP, { globals: ns });
    const setup = ns.get("_setup");
    setup(pyodide.toPy(requested), pyodide.toPy(requested.flatMap((name) => PACKAGE_SETS[name].warm)));
    setup.destroy();
  }
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
  // Everything this interpreter needs was loaded during boot, so learner code gets no network API at all.
  // This backs up the sandbox CSP (docs/python/runner-isolation.md): Firefox let EventSource through it.
  for (const name of ["fetch", "XMLHttpRequest", "WebSocket", "EventSource", "WebTransport", "importScripts"]) {
    try { delete globalThis[name]; } catch { /* not configurable here */ }
    if (name in globalThis) {
      try { Object.defineProperty(globalThis, name, { value: undefined, writable: false, configurable: false }); } catch { /* already locked */ }
    }
  }
  const id = data.id;
  const nonce = String(data.nonce ?? "");
  run = { id, nonce, limit: data.outputLimit, sent: 0, overflowed: false };
  // stdin is whatever the exercise supplies; once it runs out, input() raises EOFError as in real Python.
  const lines = typeof data.stdin === "string" && data.stdin ? data.stdin.split(/(?<=\n)/) : [];
  // Each line input() takes is also reported on its own channel, after the prompt it answers (input() flushes
  // stdout first), so a console can show what was typed. It is never written to stdout.
  pyodideRef.setStdin({
    stdin: () => {
      const line = lines.shift();
      if (line !== undefined) post({ type: "stdin", id, nonce, text: line });
      return line;
    },
    isatty: false,
  });
  const progress = (call, index) => post({ type: "case", id, nonce, call: String(call), index: Number(index) });
  // undefined, not null: Pyodide turns JS null into jsnull, which is not Python's None.
  const probeJson = data.probe ? stringify(data.probe) : undefined;
  const figure = (png) => post({ type: "figure", id, nonce, src: "data:image/png;base64," + String(png) });
  const emit = (kind, json) => post({ type: "rich", id, nonce, kind: String(kind), json: String(json) });
  const filesJson = data.files && typeof data.files === "object" ? stringify(data.files) : undefined;
  // Dataset files arrive as bytes, already fetched and hash-checked by the page: this worker never fetches data.
  // Learner-owned binary files (a Database Lab .db) arrive the same way. They are the program's own state, not output.
  const inputs = [...(Array.isArray(data.mounts) ? data.mounts : []), ...(Array.isArray(data.blobs) ? data.blobs : [])];
  let mountedJson;
  if (inputs.length) {
    const paths = [];
    try {
      for (const m of inputs) {
        const rel = String(m.path);
        if (!/^[\w.-]+(\/[\w.-]+)*$/.test(rel) || rel.split("/").includes("..")) throw new Error(`bad mount path ${rel}`);
        const dir = rel.split("/").slice(0, -1);
        for (let i = 1; i <= dir.length; i++) {
          const p = dir.slice(0, i).join("/");
          if (!pyodideRef.FS.analyzePath(p).exists) pyodideRef.FS.mkdir(p);
        }
        pyodideRef.FS.writeFile(rel, new Uint8Array(m.bytes));
        paths.push(rel);
      }
    } catch (err) {
      post({ type: "done", id, nonce, result: { status: "crashed", message: "could not prepare the dataset files: " + String(err?.message ?? err) } });
      return;
    }
    mountedJson = stringify(paths);
  }
  const started = now();
  let result;
  try {
    const entry = typeof data.entry === "string" ? data.entry : undefined;
    const proxy = harnessRun(String(data.code ?? ""), probeJson, progress, figure, filesJson, emit, mountedJson, entry);
    result = proxy.toJs({ dict_converter: fromEntries });
    proxy.destroy();
  } catch (err) {
    result = { status: "crashed", message: String(err?.message ?? err) };
  }
  result.durationMs = Math.round(now() - started);
  // Binary files the page asked to keep (e.g. every top-level .db), read back after the program ends.
  const transfer = [];
  if (Array.isArray(data.collect) && data.collect.length) {
    const suffixes = data.collect.map(String);
    const blobs = [];
    try {
      for (const name of pyodideRef.FS.readdir(".")) {
        if (blobs.length >= 8 || !suffixes.some((x) => name.endsWith(x))) continue;
        const stat = pyodideRef.FS.stat(name);
        if (!pyodideRef.FS.isFile(stat.mode) || stat.size > 64 * 1024 * 1024) continue;
        const bytes = pyodideRef.FS.readFile(name).slice();
        blobs.push({ path: name, bytes: bytes.buffer });
        transfer.push(bytes.buffer);
      }
    } catch { /* the program removed or broke its own files; report what was read */ }
    result.blobs = blobs;
  }
  post({ type: "done", id, nonce, result }, transfer);
};
