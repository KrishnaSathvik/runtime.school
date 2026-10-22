import type { PyEditionFile } from "@/content/python-v2/datasets";
import { BLANK_MAIN } from "@/content/python-v2/tools/starters";

/**
 * The Playground workspace: the learner's own files, which one runs, and the dataset they're working with.
 * Kept in this browser (localStorage) and saved on every change. Pure helpers live here so they can be tested.
 */
export type WsFile = { name: string; code: string };
/** `stdin`: the Program input box, the lines input() reads in order (optional, so older saves still load). */
export type Workspace = { files: WsFile[]; active: string; dataset: string | null; size: string; stdin?: string; v: 1 };

export const WS_KEY = "py-playground-workspace";
export const WS_MAX_FILES = 20;
export const WS_MAX_CHARS = 200_000;
/** Names a learner file may have: one level, letters/digits/_/-, and a text extension. */
export const WS_NAME = /^[A-Za-z_][\w-]{0,39}\.(py|txt|csv|json|md)$/;

export const blankWorkspace = (): Workspace => ({ files: [{ name: "main.py", code: BLANK_MAIN }], active: "main.py", dataset: null, size: "starter", v: 1 });

export function readWorkspace(legacyCode?: string | null): Workspace {
  try {
    const raw = JSON.parse(localStorage.getItem(WS_KEY) ?? "null");
    if (raw && raw.v === 1 && Array.isArray(raw.files)) {
      const files = (raw.files as unknown[])
        .filter((f): f is WsFile => !!f && typeof (f as WsFile).name === "string" && typeof (f as WsFile).code === "string" && WS_NAME.test((f as WsFile).name))
        .slice(0, WS_MAX_FILES)
        .map((f) => ({ name: f.name, code: f.code.slice(0, WS_MAX_CHARS) }));
      if (files.length) {
        const active = files.some((f) => f.name === raw.active) ? raw.active : files[0].name;
        const stdin = typeof raw.stdin === "string" && raw.stdin ? { stdin: raw.stdin.slice(0, WS_MAX_CHARS) } : {};
        return { files, active, dataset: typeof raw.dataset === "string" ? raw.dataset : null, size: typeof raw.size === "string" ? raw.size : "starter", ...stdin, v: 1 };
      }
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  const ws = blankWorkspace();
  // The previous Playground kept one program; it becomes main.py.
  if (legacyCode && legacyCode.trim()) ws.files[0].code = legacyCode;
  return ws;
}

export function writeWorkspace(ws: Workspace): boolean {
  try {
    localStorage.setItem(WS_KEY, JSON.stringify(ws));
    return true;
  } catch {
    return false;
  }
}

/** Why a new name can't be used, or null when it can. */
export function nameProblem(name: string, ws: Workspace, renaming?: string): string | null {
  if (!WS_NAME.test(name)) return "Use letters, digits, _ or - and end with .py, .txt, .csv, .json or .md (for example helpers.py).";
  if (name !== renaming && ws.files.some((f) => f.name === name)) return `There is already a file called ${name}.`;
  if (!renaming && ws.files.length >= WS_MAX_FILES) return `A workspace can hold ${WS_MAX_FILES} files.`;
  if (/^(data|json|csv|sqlite3|pandas|numpy|random|math|string|re|os|sys|test)\.py$/.test(name)) return `${name} would hide Python's own ${name.slice(0, -3)} module when you import it. Pick another name.`;
  return null;
}

/**
 * Which dataset files a program needs, from the paths in its code: a literal path mounts that file; a folder or a
 * pattern ("data/events/", f"data/{name}.csv", "data/api/*.json") mounts what starts with its fixed part; a bare
 * "data" (os.listdir("data"), Path("data")) mounts every clean file. Nothing is downloaded for code that never
 * mentions data.
 */
export function filesNeeded(code: string, files: PyEditionFile[]): PyEditionFile[] {
  const literals = [...code.matchAll(/(?:[rRfFbBuU]{0,2})(["'])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
  const picked = new Set<PyEditionFile>();
  for (const lit of literals) {
    const s = lit.replace(/^\.\//, "");
    if (s === "data" || s === "data/") {
      for (const f of files) if (f.layer === "clean") picked.add(f);
      continue;
    }
    if (!s.startsWith("data/")) continue;
    const fixed = s.slice(5).split(/[{*?[]/)[0];
    for (const f of files) {
      const folder = fixed.endsWith("/") ? fixed : `${fixed}/`;
      if (f.path === fixed || (s.length > 5 + fixed.length && f.path.startsWith(fixed)) || f.path.startsWith(folder)) picked.add(f);
    }
  }
  return files.filter((f) => picked.has(f));
}

/** Whether a program reads standard input (input(), sys.stdin), so the Playground shows its Program input box. */
export const readsInput = (code: string): boolean => /(^|[^\w.])input\s*\(|\bsys\.stdin\b|\bfrom\s+sys\s+import\b[^\n]*\bstdin\b/.test(code);

/** Program input as the run receives it: one line per input() call, each ending in a newline like typed lines do. */
export const stdinFor = (text: string | undefined): string => (text ? (text.endsWith("\n") ? text : `${text}\n`) : "");

/** A name for a new file that isn't taken yet: untitled.py, untitled2.py, … */
export function freshName(ws: Workspace, base = "untitled", ext = "py"): string {
  for (let i = 1; ; i++) {
    const name = `${base}${i === 1 ? "" : i}.${ext}`;
    if (!ws.files.some((f) => f.name === name)) return name;
  }
}

/**
 * The code that actually runs: the entry file plus the workspace modules it imports, directly or through another
 * module. Libraries and data are inferred from this, so an unrelated file never makes a run load pandas.
 */
export function programCode(ws: Workspace, entry: string): string {
  const byModule = new Map(ws.files.filter((f) => f.name.endsWith(".py")).map((f) => [f.name.slice(0, -3), f]));
  const seen = new Set<string>();
  const visit = (name: string) => {
    const f = byModule.get(name);
    if (!f || seen.has(name)) return;
    seen.add(name);
    for (const m of f.code.matchAll(/^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w., ]+))/gm)) {
      for (const mod of (m[1] ?? m[2]).split(",")) visit(mod.trim().split(/\s+as\s+|\./)[0]);
    }
  };
  visit(entry.replace(/\.py$/, ""));
  return [...seen].map((n) => byModule.get(n)!.code).join("\n");
}
