/**
 * Python snippets for `expr` checks. Each runs after the learner's program, in a copy of its namespace, and sets
 * `result`; the expected value is compared in TypeScript (see engine/python/grading.ts).
 */

/** Call `call` and capture what it prints. */
export const printedBy = (call: string) =>
  `import io, contextlib\n_buf = io.StringIO()\nwith contextlib.redirect_stdout(_buf):\n    ${call}\nresult = _buf.getvalue()`;

/** Run `call`, expecting an exception; result is "<Type>: <message>", or "no error". */
export const errorOf = (call: string) =>
  `try:\n    ${call}\n    result = "no error"\nexcept Exception as _e:\n    result = type(_e).__name__ + ": " + str(_e)`;

/**
 * Mutation check: run the learner's test function against several implementations of `target`, swapped into the
 * program's own namespace one at a time. The result is one boolean per implementation: did the test pass?
 * Each implementation is a `def target(...)` source string.
 */
export function mutationCheck(test: string, target: string, impls: string[]): string {
  return [
    `_g = ${test}.__globals__`,
    `_saved = _g.get("${target}")`,
    "_impls = []",
    ...impls.map((code, n) => `${code.replace(/^def \w+/, `def _impl_${n}`)}\n_impls.append(_impl_${n})`),
    "result = []",
    "for _impl in _impls:",
    `    _g["${target}"] = _impl`,
    "    try:",
    `        ${test}()`,
    "        result.append(True)",
    "    except Exception:",
    "        result.append(False)",
    `_g["${target}"] = _saved`,
  ].join("\n");
}
