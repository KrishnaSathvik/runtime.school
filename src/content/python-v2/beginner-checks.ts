/**
 * Checks for beginner programs that have no functions yet (M02–M08): the program is re-run with other input
 * values so that printing the expected text cannot pass. Built on the grader's `variant` and `expr` checks.
 * Expected values stay on this side; only the inputs enter the interpreter.
 */
import type { PyCheck } from "@/engine/python/grading";
import { pv } from "./fn-checks";

/**
 * Re-run the program with the first top-level assignment of each name replaced (`price = 9` becomes
 * `price = 15`) and compare everything it prints. Hidden by default: the learner sees "Works with other input values".
 * Write `py.float(4)` for 4.0; a whole JS number becomes an int.
 */
export function rerun(id: string, set: Record<string, unknown>, output: string, opts: { hidden?: boolean; vars?: Record<string, unknown>; label?: string } = {}): PyCheck {
  return {
    kind: "variant",
    id,
    // A hidden rerun's label names the kind of input ("stock exactly at the reorder level"), never the values.
    ...(opts.label ? { label: opts.label } : {}),
    set: Object.fromEntries(Object.entries(set).map(([k, v]) => [k, pv(v)])),
    output,
    ...(opts.vars ? { vars: Object.fromEntries(Object.entries(opts.vars).map(([k, v]) => [k, pv(v)])) } : {}),
    hidden: opts.hidden ?? true,
  };
}

/**
 * Run the whole program again once per case, each time with other typed lines for input(), and compare what each
 * run prints. `input(prompt)` prints its prompt without a new line and doesn't echo the typed text, as in the
 * real runner. A run that stops with an error ends with the error's type on its own line, so it can't match.
 */
export function retyped(id: string, cases: [string[], string][], label = "Works with other typed lines"): PyCheck {
  const expr = [
    "import io as _io, contextlib as _cl, json as _json",
    `_cases = _json.loads(${JSON.stringify(JSON.stringify(cases.map(([lines]) => lines)))})`,
    "result = []",
    "for _lines in _cases:",
    "    _feed = iter(_lines)",
    "    def _inp(prompt=''):",
    "        print(prompt, end='')",
    "        try:",
    "            return next(_feed)",
    "        except StopIteration:",
    "            raise EOFError('EOF when reading a line')",
    "    _buf = _io.StringIO()",
    "    try:",
    "        with _cl.redirect_stdout(_buf):",
    "            exec(compile(_source, 'main.py', 'exec'), {'__name__': '__main__', 'input': _inp})",
    "    except Exception as _e:",
    "        _buf.write('\\n' + type(_e).__name__)",
    "    result.append(_buf.getvalue())",
  ].join("\n");
  return { kind: "expr", id, label, expr, expected: pv(cases.map(([, out]) => out)), hidden: true };
}
