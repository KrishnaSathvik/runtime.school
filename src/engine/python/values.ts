/**
 * Python values as plain, type-tagged data.
 *
 * The worker serialises learner values into this shape (exact built-in types only; anything else,
 * including subclasses, becomes `other`). Expected values are authored with `py.*` helpers.
 * Comparison happens here, in TypeScript, so learner-defined __eq__ or patched builtins never
 * decide whether an answer is right.
 */

export type PyValue =
  | { t: "none" }
  | { t: "bool"; v: boolean }
  | { t: "int"; v: string }
  | { t: "float"; v: number; r?: string }
  | { t: "str"; v: string; r?: string; truncated?: boolean }
  | { t: "list" | "tuple" | "set" | "frozenset"; items: PyValue[]; truncated?: boolean }
  | { t: "dict"; entries: [PyValue, PyValue][]; truncated?: boolean }
  | { t: "other"; type: string; repr: string };

/** JSON-safe form sent to the worker (NaN and infinities are spelled out). */
export type WireValue =
  | { t: "none" }
  | { t: "bool"; v: boolean }
  | { t: "int"; v: string }
  | { t: "float"; v: number | "nan" | "inf" | "-inf" }
  | { t: "str"; v: string }
  | { t: "list" | "tuple" | "set" | "frozenset"; items: WireValue[] }
  | { t: "dict"; entries: [WireValue, WireValue][] };

function intText(v: number | bigint | string): string {
  if (typeof v === "number" && !Number.isSafeInteger(v)) throw new Error(`py.int needs a safe integer, got ${v}`);
  return BigInt(v).toString();
}

/** Authoring helpers for expected values and test arguments. */
export const py = {
  none: { t: "none" } as PyValue,
  bool: (v: boolean): PyValue => ({ t: "bool", v }),
  int: (v: number | bigint | string): PyValue => ({ t: "int", v: intText(v) }),
  float: (v: number): PyValue => ({ t: "float", v }),
  str: (v: string): PyValue => ({ t: "str", v }),
  list: (...items: PyValue[]): PyValue => ({ t: "list", items }),
  tuple: (...items: PyValue[]): PyValue => ({ t: "tuple", items }),
  set: (...items: PyValue[]): PyValue => ({ t: "set", items }),
  frozenset: (...items: PyValue[]): PyValue => ({ t: "frozenset", items }),
  dict: (entries: [PyValue, PyValue][]): PyValue => ({ t: "dict", entries }),
};

export function toWire(v: PyValue): WireValue {
  switch (v.t) {
    case "none":
      return v;
    case "bool":
      return { t: "bool", v: v.v };
    case "int":
      return { t: "int", v: v.v };
    case "float":
      return { t: "float", v: Number.isNaN(v.v) ? "nan" : v.v === Infinity ? "inf" : v.v === -Infinity ? "-inf" : v.v };
    case "str":
      return { t: "str", v: v.v };
    case "list":
    case "tuple":
    case "set":
    case "frozenset":
      return { t: v.t, items: v.items.map(toWire) };
    case "dict":
      return { t: "dict", entries: v.entries.map(([k, x]) => [toWire(k), toWire(x)]) };
    case "other":
      throw new Error("Only built-in Python values can be sent as test inputs.");
  }
}

// ---- comparison ----

export type ComparePolicy = {
  /** "exact-type" (default): 48 and 48.0 differ. "int-float-equal": they match. bool never equals int. */
  numbers?: "exact-type" | "int-float-equal";
  /** Float tolerance (default rel 1e-9, abs 1e-12), or "exact". NaN never equals NaN. */
  float?: { rel?: number; abs?: number } | "exact";
  /** "exact" (default) or "strip" (ignore leading/trailing whitespace). */
  strings?: "exact" | "strip";
  /** List/tuple element order: "ordered" (default) or "any". Sets and dicts are always unordered. */
  order?: "ordered" | "any";
};

const DEFAULT_REL = 1e-9;
const DEFAULT_ABS = 1e-12;

function floatsClose(a: number, b: number, policy: ComparePolicy): boolean {
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  if (policy.float === "exact") return a === b;
  if (a === b) return true; // also handles equal infinities
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const rel = policy.float?.rel ?? DEFAULT_REL;
  const abs = policy.float?.abs ?? DEFAULT_ABS;
  return Math.abs(a - b) <= Math.max(rel * Math.max(Math.abs(a), Math.abs(b)), abs);
}

const numeric = (v: PyValue): v is { t: "int"; v: string } | { t: "float"; v: number } => v.t === "int" || v.t === "float";

/** Same type for the purposes of reporting "wrong type" at the top level. */
export function sameKind(actual: PyValue, expected: PyValue, policy: ComparePolicy = {}): boolean {
  if (actual.t === expected.t) return true;
  return policy.numbers === "int-float-equal" && numeric(actual) && numeric(expected);
}

/** Structural equality under an explicit policy. Never consults learner code. */
export function pyEqual(actual: PyValue, expected: PyValue, policy: ComparePolicy = {}): boolean {
  if (actual.t === "other" || expected.t === "other") return false;
  if ("truncated" in actual && actual.truncated) return false;
  if (!sameKind(actual, expected, policy)) return false;
  if (actual.t !== expected.t) {
    // int ↔ float under int-float-equal
    const a = actual.t === "int" ? Number(actual.v) : (actual as { v: number }).v;
    const b = expected.t === "int" ? Number(expected.v) : (expected as { v: number }).v;
    return floatsClose(a, b, policy);
  }
  switch (expected.t) {
    case "none":
      return true;
    case "bool":
      return (actual as typeof expected).v === expected.v;
    case "int":
      return BigInt((actual as typeof expected).v) === BigInt(expected.v);
    case "float":
      return floatsClose((actual as typeof expected).v, expected.v, policy);
    case "str": {
      const a = (actual as typeof expected).v;
      return policy.strings === "strip" ? a.trim() === expected.v.trim() : a === expected.v;
    }
    case "list":
    case "tuple": {
      const a = (actual as typeof expected).items;
      if (a.length !== expected.items.length) return false;
      return policy.order === "any"
        ? sameMultiset(a, expected.items, policy)
        : a.every((x, i) => pyEqual(x, expected.items[i], policy));
    }
    case "set":
    case "frozenset": {
      const a = (actual as typeof expected).items;
      return a.length === expected.items.length && sameMultiset(a, expected.items, policy);
    }
    case "dict": {
      const a = (actual as typeof expected).entries;
      if (a.length !== expected.entries.length) return false;
      const used = new Set<number>();
      return expected.entries.every(([k, v]) => {
        const i = a.findIndex(([ak], j) => !used.has(j) && pyEqual(ak, k, policy));
        if (i < 0 || !pyEqual(a[i][1], v, policy)) return false;
        used.add(i);
        return true;
      });
    }
  }
}

function sameMultiset(a: PyValue[], b: PyValue[], policy: ComparePolicy): boolean {
  const used = new Set<number>();
  return b.every((want) => {
    const i = a.findIndex((x, j) => !used.has(j) && pyEqual(x, want, policy));
    if (i < 0) return false;
    used.add(i);
    return true;
  });
}

// ---- display (Python-style repr) ----

/** Python's repr() for floats: shortest round-trip digits, scientific below 1e-4 and from 1e16. */
export function pyFloatRepr(n: number): string {
  if (Number.isNaN(n)) return "nan";
  if (n === Infinity) return "inf";
  if (n === -Infinity) return "-inf";
  if (n === 0) return Object.is(n, -0) ? "-0.0" : "0.0";
  const [mant, expText] = n.toExponential().split("e");
  const exp = Number(expText);
  const sign = mant.startsWith("-") ? "-" : "";
  const digits = mant.replace("-", "").replace(".", "");
  if (exp < -4 || exp >= 16) {
    const m = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
    const e = Math.abs(exp).toString().padStart(2, "0");
    return `${sign}${m}e${exp < 0 ? "-" : "+"}${e}`;
  }
  if (exp >= 0) {
    const whole = digits.length > exp + 1 ? digits.slice(0, exp + 1) : digits.padEnd(exp + 1, "0");
    const frac = digits.slice(exp + 1);
    return `${sign}${whole}.${frac || "0"}`;
  }
  return `${sign}0.${"0".repeat(-exp - 1)}${digits}`;
}

/** Python's repr() for str. */
export function pyStrRepr(s: string): string {
  const quote = s.includes("'") && !s.includes('"') ? '"' : "'";
  let out = quote;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === "\\") out += "\\\\";
    else if (ch === quote) out += `\\${quote}`;
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (c < 0x20 || c === 0x7f) out += `\\x${c.toString(16).padStart(2, "0")}`;
    else out += ch;
  }
  return out + quote;
}

export function formatPy(v: PyValue): string {
  switch (v.t) {
    case "none":
      return "None";
    case "bool":
      return v.v ? "True" : "False";
    case "int":
      return v.v;
    case "float":
      return v.r ?? pyFloatRepr(v.v);
    case "str":
      return (v.r ?? pyStrRepr(v.v)) + (v.truncated ? "…" : "");
    case "list":
      return `[${v.items.map(formatPy).join(", ")}${v.truncated ? ", …" : ""}]`;
    case "tuple":
      return v.items.length === 1 ? `(${formatPy(v.items[0])},)` : `(${v.items.map(formatPy).join(", ")})`;
    case "set":
      return v.items.length ? `{${v.items.map(formatPy).join(", ")}}` : "set()";
    case "frozenset":
      return v.items.length ? `frozenset({${v.items.map(formatPy).join(", ")}})` : "frozenset()";
    case "dict":
      return `{${v.entries.map(([k, x]) => `${formatPy(k)}: ${formatPy(x)}`).join(", ")}${v.truncated ? ", …" : ""}}`;
    case "other":
      return v.repr;
  }
}

/** Python type name, for feedback such as "is a str, but this task needs an int". */
export function pyTypeName(v: PyValue): string {
  return v.t === "none" ? "NoneType" : v.t === "other" ? v.type : v.t;
}
