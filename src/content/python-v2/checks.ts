/**
 * Reusable checks for beginner exercises, built on the grader's `expr` check (the expression runs after the
 * learner's program, in a copy of its namespace; `_source` is the program's text). Expected values stay on
 * this side and never enter the interpreter.
 */
import type { PyCheck } from "@/engine/python/grading";
import { py } from "@/engine/python/values";

const pyStr = (s: string) => JSON.stringify(s);

/**
 * Run the learner's whole program again with other typed input and compare everything it prints.
 * `input(prompt)` prints its prompt without a new line and doesn't echo the typed text, as in the real runner.
 */
export function outputWithInput(id: string, label: string, lines: string[], expected: string, hidden = true): PyCheck {
  const expr = [
    "import io as _io, contextlib as _cl",
    `_feed = iter(__import__("json").loads(${pyStr(JSON.stringify(lines))}))`,
    "def _inp(prompt=''):",
    "    print(prompt, end='')",
    "    try:",
    "        return next(_feed)",
    "    except StopIteration:",
    "        raise EOFError('EOF when reading a line')",
    "_buf = _io.StringIO()",
    "with _cl.redirect_stdout(_buf):",
    "    exec(compile(_source, 'main.py', 'exec'), {'__name__': '__main__', 'input': _inp})",
    "result = _buf.getvalue()",
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.str(expected), hidden };
}

/** How many times the program calls print(), read from its syntax tree. */
export function printCalls(id: string, label: string, atMost: number, tip?: string): PyCheck {
  const expr = [
    "import ast as _ast",
    "result = sum(1 for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.Call) and getattr(_n.func, 'id', None) == 'print') <= " + atMost,
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** Every given text still appears in the program, inside a comment (switched off, not deleted). */
export function keptAsComments(id: string, label: string, texts: string[], tip?: string): PyCheck {
  const expr = [
    `_want = __import__("json").loads(${pyStr(JSON.stringify(texts))})`,
    "_comments = [_l.split('#', 1)[1] for _l in _source.splitlines() if _l.lstrip().startswith('#')]",
    "result = all(any(_w in _c for _c in _comments) for _w in _want)",
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** The program calls a builtin by name, read from its syntax tree. */
export function callsFunction(id: string, label: string, name: string, tip?: string): PyCheck {
  const expr = [
    "import ast as _ast",
    `result = any(isinstance(_n, _ast.Call) and getattr(_n.func, 'id', None) == ${pyStr(name)} for _n in _ast.walk(_ast.parse(_source)))`,
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** The program uses and, or, or not, read from its syntax tree. */
export function usesBoolOp(id: string, label: string, op: "and" | "or" | "not", tip?: string): PyCheck {
  const test =
    op === "not"
      ? "isinstance(_n, _ast.UnaryOp) and isinstance(_n.op, _ast.Not)"
      : `isinstance(_n, _ast.BoolOp) and isinstance(_n.op, _ast.${op === "and" ? "And" : "Or"})`;
  const expr = ["import ast as _ast", `result = any(${test} for _n in _ast.walk(_ast.parse(_source)))`].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

function astAny(id: string, label: string, test: string, tip?: string): PyCheck {
  const expr = ["import ast as _ast", `result = any(${test} for _n in _ast.walk(_ast.parse(_source)))`].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** The program has an if statement. A one-line `a if test else b` does not count. */
export function usesIf(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.If)", tip);
}

/** The program has an else that is not an elif. */
export function usesElse(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.If) and bool(_n.orelse) and not isinstance(_n.orelse[0], _ast.If)", tip);
}

/** The program has an elif. */
export function usesElif(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.If) and bool(_n.orelse) and isinstance(_n.orelse[0], _ast.If)", tip);
}

/** An if sits in the body of another if. An elif does not count. */
export function usesNestedIf(id: string, label: string, tip?: string): PyCheck {
  const expr = [
    "import ast as _ast",
    "def _inside(_n):",
    "    return isinstance(_n, _ast.If) and any(isinstance(_c, _ast.If) for _s in _n.body for _c in _ast.walk(_s))",
    "result = any(_inside(_n) for _n in _ast.walk(_ast.parse(_source)))",
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** `if name:` uses the value itself as the test, not a comparison. */
export function usesBareTest(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.If) and isinstance(_n.test, _ast.Name)", tip);
}

/** A value chosen with `a if test else b`. */
export function usesIfExpr(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.IfExp)", tip);
}

export function usesMatch(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Match)", tip);
}

export function usesFor(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.For)", tip);
}

export function usesWhile(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.While)", tip);
}

export function usesBreak(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Break)", tip);
}

export function usesContinue(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Continue)", tip);
}

/** A for or while sits in the body of another for or while. */
export function usesNestedLoop(id: string, label: string, tip?: string): PyCheck {
  const expr = [
    "import ast as _ast",
    "def _inside(_n):",
    "    return isinstance(_n, (_ast.For, _ast.While)) and any(isinstance(_c, (_ast.For, _ast.While)) for _s in _n.body for _c in _ast.walk(_s))",
    "result = any(_inside(_n) for _n in _ast.walk(_ast.parse(_source)))",
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

export function usesFString(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.JoinedStr)", tip);
}

/** text[n] or text[start:end]. */
export function usesSubscript(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Subscript)", tip);
}

/** text[start:end], including an omitted start or end. */
export function usesSlice(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Subscript) and isinstance(_n.slice, _ast.Slice)", tip);
}

/** A method call such as text.upper(). */
export function usesMethod(id: string, label: string, name: string, tip?: string): PyCheck {
  const expr = [
    "import ast as _ast",
    `result = any(isinstance(_n, _ast.Call) and isinstance(getattr(_n, "func", None), _ast.Attribute) and _n.func.attr == ${pyStr(name)} for _n in _ast.walk(_ast.parse(_source)))`,
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** True when a multiplication's operand is an addition, so the addition is grouped to run first. */
export function groupsAddition(id: string, label: string, tip?: string): PyCheck {
  const expr = [
    "import ast as _ast",
    "def _add(n):",
    "    return isinstance(n, _ast.BinOp) and isinstance(n.op, _ast.Add)",
    "result = any(isinstance(n, _ast.BinOp) and isinstance(n.op, _ast.Mult) and (_add(n.left) or _add(n.right)) for n in _ast.walk(_ast.parse(_source)))",
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

export function usesList(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.List) and isinstance(_n.ctx, _ast.Load)", tip);
}

export function usesTuple(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Tuple) and isinstance(_n.ctx, _ast.Load)", tip);
}

/** items[n] = value. Reading items[n] does not count. */
export function usesItemAssign(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Assign) and any(isinstance(_t, _ast.Subscript) for _t in _n.targets)", tip);
}

/** a, b = pair. A for-loop header does not count. */
export function usesUnpack(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Assign) and any(isinstance(_t, _ast.Tuple) for _t in _n.targets)", tip);
}

export function usesDict(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Dict)", tip);
}

export function usesNestedDict(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Dict) and any(isinstance(_v, _ast.Dict) for _v in _n.values)", tip);
}

export function usesSet(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Set)", tip);
}

export function usesDef(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.FunctionDef)", tip);
}

export function usesParam(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.FunctionDef) and bool(_n.args.args)", tip);
}

export function usesReturn(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Return)", tip);
}

export function usesDefault(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.FunctionDef) and bool(_n.args.defaults)", tip);
}

/** The first line inside a function is a string, which is a docstring. */
export function usesDocstring(id: string, label: string, tip?: string): PyCheck {
  const test = [
    "isinstance(_n, _ast.FunctionDef) and bool(_n.body) and isinstance(_n.body[0], _ast.Expr)",
    "and isinstance(getattr(_n.body[0], 'value', None), _ast.Constant) and isinstance(_n.body[0].value.value, str)",
  ].join(" ");
  return astAny(id, label, test, tip);
}

export function usesListComp(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.ListComp)", tip);
}

export function usesDictComp(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.DictComp)", tip);
}

export function usesSetComp(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.SetComp)", tip);
}

/** Two for clauses in one comprehension: [n for row in rows for n in row]. */
export function usesNestedComp(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, (_ast.ListComp, _ast.SetComp, _ast.DictComp)) and len(_n.generators) >= 2", tip);
}

/** A comprehension keeps a value only when its if test passes. */
export function usesCompIf(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, (_ast.ListComp, _ast.SetComp, _ast.DictComp)) and any(_g.ifs for _g in _n.generators)", tip);
}

/** sorted(items, key=by_price). A plain sorted call does not count. */
export function usesSortKey(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and getattr(_n.func, "id", None) == "sorted" and any(_k.arg == "key" for _k in _n.keywords)', tip);
}

/** def total(*prices). A bare * before keyword-only parameters does not count. */
export function usesVararg(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.FunctionDef) and _n.args.vararg is not None", tip);
}

/** def show(**info). */
export function usesKwarg(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.FunctionDef) and _n.args.kwarg is not None", tip);
}

/** def ship(item, *, qty). The parameter must be passed by name. */
export function usesKwonly(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.FunctionDef) and bool(_n.args.kwonlyargs)", tip);
}

export function usesLambda(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Lambda)", tip);
}

/** rows[0][1], or order["film"]["title"]. */
export function usesNestedSubscript(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Subscript) and isinstance(_n.value, _ast.Subscript)", tip);
}

export function usesTry(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Try)", tip);
}

/** except ValueError. A bare except does not count. */
export function usesExceptType(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.ExceptHandler) and _n.type is not None", tip);
}

export function usesFinally(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Try) and bool(_n.finalbody)", tip);
}

export function usesRaise(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Raise)", tip);
}

export function usesClass(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.ClassDef)", tip);
}

export function usesWith(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.With)", tip);
}

/** open(path, "a"). The mode is a positional string. */
export function usesOpenMode(id: string, label: string, mode: string, tip?: string): PyCheck {
  return astAny(id, label, `isinstance(_n, _ast.Call) and getattr(_n.func, "id", None) == "open" and any(isinstance(_a, _ast.Constant) and _a.value == ${pyStr(mode)} for _a in _n.args)`, tip);
}

/** A keyword argument such as encoding="utf-8". */
export function usesKeyword(id: string, label: string, name: string, tip?: string): PyCheck {
  return astAny(id, label, `isinstance(_n, _ast.keyword) and _n.arg == ${pyStr(name)}`, tip);
}

/** end - start. A unary minus does not count. */
export function usesSub(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.BinOp) and isinstance(_n.op, _ast.Sub)", tip);
}

/** import json as js, or from json import dumps as to_json. */
export function usesImportAs(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, (_ast.Import, _ast.ImportFrom)) and any(_a.asname for _a in _n.names)", tip);
}

/** from shop.prices import double. A plain import does not count. */
export function usesDottedImport(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.ImportFrom) and _n.module is not None and "." in _n.module', tip);
}

/** if __name__ == "__main__". */
export function usesDunderMain(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Compare) and isinstance(_n.left, _ast.Name) and _n.left.id == "__name__"', tip);
}

export function usesAssert(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Assert)", tip);
}

/** def test_double. A function with any other name does not count. */
export function usesTestDef(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and _n.name.startswith("test_")', tip);
}

/** class Item: with no base. class PriceError(Exception) does not count. */
export function usesPlainClass(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.ClassDef) and not _n.bases", tip);
}

/** item.sku = "HAT". A plain name = value does not count. */
export function usesAttrAssign(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Assign) and any(isinstance(_t, _ast.Attribute) for _t in _n.targets)", tip);
}

export function usesInit(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and _n.name == "__init__"', tip);
}

/** def label(self). __init__ does not count. */
export function usesMethodDef(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and _n.name != "__init__" and bool(_n.args.args) and _n.args.args[0].arg == "self"', tip);
}

/** class Hat(Item). class PriceError(Exception) does not count. */
export function usesSubclass(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.ClassDef) and any(isinstance(_b, _ast.Name) and _b.id != "Exception" for _b in _n.bases)', tip);
}

export function usesDataclass(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.ClassDef) and any(isinstance(_d, _ast.Name) and _d.id == "dataclass" for _d in _n.decorator_list)', tip);
}

export function usesProperty(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and any(isinstance(_d, _ast.Name) and _d.id == "property" for _d in _n.decorator_list)', tip);
}

export function usesStrMethod(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and _n.name == "__str__"', tip);
}

export function usesReturnHint(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.FunctionDef) and _n.returns is not None", tip);
}

export function usesTypedDict(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.ClassDef) and any(isinstance(_b, _ast.Name) and _b.id == "TypedDict" for _b in _n.bases)', tip);
}

export function usesProtocol(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.ClassDef) and any(isinstance(_b, _ast.Name) and _b.id == "Protocol" for _b in _n.bases)', tip);
}

export function usesAbstract(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and any(isinstance(_d, _ast.Name) and _d.id == "abstractmethod" for _d in _n.decorator_list)', tip);
}

export function usesRuntimeProtocol(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.ClassDef) and any(isinstance(_d, _ast.Name) and _d.id == "runtime_checkable" for _d in _n.decorator_list)', tip);
}

export function usesMixin(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.ClassDef) and _n.name.endswith("Mixin")', tip);
}

export function usesDescriptor(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and _n.name in ("__get__", "__set__")', tip);
}

export function usesSqlite(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, '(isinstance(_n, _ast.Import) and any(_a.name == "sqlite3" for _a in _n.names)) or (isinstance(_n, _ast.ImportFrom) and _n.module == "sqlite3")', tip);
}

export function usesTx(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and isinstance(getattr(_n, "func", None), _ast.Attribute) and _n.func.attr in ("commit", "rollback")', tip);
}

export function usesUrlopen(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and getattr(_n.func, "id", None) == "urlopen"', tip);
}

export function usesIterMethod(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and _n.name in ("__iter__", "__next__")', tip);
}

export function usesYield(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Yield)", tip);
}

export function usesYieldFrom(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.YieldFrom)", tip);
}

/** @shout. @dataclass, @property, @abstractmethod, and @runtime_checkable do not count. */
export function usesDecorator(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and any(isinstance(_d, _ast.Name) and _d.id not in ("dataclass", "property", "abstractmethod", "runtime_checkable") for _d in _n.decorator_list)', tip);
}

export function usesDecoratorCall(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.FunctionDef) and any(isinstance(_d, _ast.Call) for _d in _n.decorator_list)", tip);
}

export function usesWraps(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and getattr(_n.func, "id", None) == "wraps"', tip);
}

export function usesEnter(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and _n.name == "__enter__"', tip);
}

export function usesContextDec(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and any(isinstance(_d, _ast.Name) and _d.id == "contextmanager" for _d in _n.decorator_list)', tip);
}

export function usesPartial(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and getattr(_n.func, "id", None) == "partial"', tip);
}

/** box(shout(...)). A call with no call inside its arguments does not count. */
export function usesCompose(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Call) and any(isinstance(_a, _ast.Call) for _a in _n.args)", tip);
}

export function usesCallable(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and getattr(_n.func, "id", None) == "callable"', tip);
}

/** def steps that calls steps. A call to a different function does not count. */
export function usesRecurse(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.FunctionDef) and any(isinstance(_c, _ast.Call) and isinstance(getattr(_c, "func", None), _ast.Name) and _c.func.id == _n.name for _c in _ast.walk(_n))', tip);
}

export function usesIs(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.Compare) and any(isinstance(_op, _ast.Is) for _op in _n.ops)", tip);
}

export function usesDeepcopy(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and (getattr(_n.func, "id", None) == "deepcopy" or (isinstance(getattr(_n, "func", None), _ast.Attribute) and _n.func.attr == "deepcopy"))', tip);
}

export function usesTimeit(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and isinstance(getattr(_n, "func", None), _ast.Attribute) and _n.func.attr == "timeit"', tip);
}

export function usesProfile(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, 'isinstance(_n, _ast.Call) and isinstance(getattr(_n, "func", None), _ast.Attribute) and _n.func.attr == "Profile"', tip);
}

/** Two function definitions. An async def does not count. */
export function usesTwoDefs(id: string, label: string, tip?: string): PyCheck {
  const expr = ["import ast as _ast", "result = sum(1 for _n in _ast.walk(_ast.parse(_source)) if isinstance(_n, _ast.FunctionDef)) >= 2"].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** One defined function is called at least twice. */
export function usesCalledTwice(id: string, label: string, tip?: string): PyCheck {
  const expr = [
    "import ast as _ast",
    "_tree = _ast.parse(_source)",
    "result = any(sum(1 for _c in _ast.walk(_tree) if isinstance(_c, _ast.Call) and isinstance(getattr(_c, 'func', None), _ast.Name) and _c.func.id == _n.name) >= 2 for _n in _ast.walk(_tree) if isinstance(_n, _ast.FunctionDef))",
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** A function calls one of its own parameters. */
export function usesPassedCall(id: string, label: string, tip?: string): PyCheck {
  const expr = [
    "import ast as _ast",
    "_tree = _ast.parse(_source)",
    "result = any(isinstance(_n, _ast.FunctionDef) and any(isinstance(_c, _ast.Call) and isinstance(getattr(_c, 'func', None), _ast.Name) and _c.func.id in [a.arg for a in _n.args.args] for _c in _ast.walk(_n)) for _n in _ast.walk(_tree))",
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** Adds two values, including adding a number to an array. */
export function usesAdd(id: string, label: string, tip?: string): PyCheck {
  return astAny(id, label, "isinstance(_n, _ast.BinOp) and isinstance(_n.op, _ast.Add)", tip);
}

/** The source contains a recorded command or a module name the AST would hide inside a string. */
export function usesSource(id: string, label: string, snippet: string, tip?: string): PyCheck {
  const expr = `result = ${pyStr(snippet)} in _source`;
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** At least `n` comment lines (lines whose first non-space character is #). */
export function hasComments(id: string, label: string, n = 1, tip?: string): PyCheck {
  const expr = `result = sum(1 for _l in _source.splitlines() if _l.lstrip().startswith('#')) >= ${n}`;
  return { kind: "expr", id, label, expr, expected: py.bool(true), ...(tip ? { tip } : {}) };
}

/** Function-implementation, data, file, learner-test and performance helpers (fn, example, hiddenCase, …). */
export * from "./fn-checks";
