import type { PyPackage } from "@/engine/python/client";

/**
 * Moving work between the Python tools: "Open in Playground" from the Comparator, Performance Lab or Datasets, and
 * "Open in Database Lab" from Datasets. The sender leaves one message in sessionStorage and the
 * receiving tool takes it once on load, so a refresh or a later visit never replays it.
 */
export type PlaygroundHandoff = { kind: "playground"; code: string; from: string; dataset?: string; /** Data size the code was written against. */ size?: string; /** File name to open it as (a free name is picked if taken). */ name?: string };
export type LabHandoff = { kind: "lab"; dataset: string; edition: string };
type Handoff = PlaygroundHandoff | LabHandoff;

const KEY = "runtime-python-handoff";

export function sendHandoff(h: Handoff): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(h));
  } catch {
    /* storage blocked: the receiving tool just opens normally */
  }
}

export function takeHandoff<K extends Handoff["kind"]>(kind: K): Extract<Handoff, { kind: K }> | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as Handoff;
    if (h?.kind !== kind) return null;
    sessionStorage.removeItem(KEY);
    return h as Extract<Handoff, { kind: K }>;
  } catch {
    return null;
  }
}

/** The libraries a program imports, so the tools load them without asking the learner to choose. */
export function packagesFor(code: string): PyPackage[] {
  const has = (m: string) => new RegExp(`^\\s*(import|from)\\s+${m}\\b`, "m").test(code);
  const out = new Set<PyPackage>();
  if (has("numpy")) out.add("numpy");
  if (has("pandas")) out.add("pandas");
  // pandas draws charts with matplotlib (df.plot), so either one loads it.
  if (has("matplotlib") || (has("pandas") && /\.plot\b/.test(code))) out.add("matplotlib");
  if (has("duckdb")) {
    out.add("duckdb");
    // DuckDB hands results to pandas (.df()) or Polars (.pl()) only when those are loaded.
    if (/\.(df|fetchdf|fetch_df)\(/.test(code)) out.add("pandas");
    if (/\.pl\(/.test(code)) out.add("polars");
  }
  if (has("sklearn")) out.add("scikit-learn");
  if (has("pyspark")) out.add("pyspark");
  if (has("polars")) out.add("polars");
  // Parquet in pandas, and Polars → pandas, go through Arrow.
  if (has("pyarrow") || (has("pandas") && /\b(read_parquet|to_parquet)\b/.test(code)) || (has("polars") && /\.to_pandas\(/.test(code))) out.add("pyarrow");
  // zoneinfo needs the IANA time zone database, which Pyodide ships as a package.
  if (has("zoneinfo") || /\bZoneInfo\b/.test(code) || (has("pandas") && /\btz_(localize|convert)\b/.test(code))) out.add("tzdata");
  return [...out].sort();
}

/** Libraries that run here, for the message shown when a program imports one that doesn't. */
export const AVAILABLE_LIBRARIES = ["the standard library (csv, json, sqlite3, datetime, re, …)", "NumPy", "pandas", "Matplotlib", "DuckDB", "Polars", "PyArrow", "scikit-learn"];

/** Packages that exist on PyPI but not in this browser runtime, named the way learners import them. */
export function missingModule(r: { status: string; error?: { type: string; message: string } }): string | null {
  if (r.status !== "runtime-error" || !r.error || r.error.type !== "ModuleNotFoundError") return null;
  const m = /No module named '([^'.]+)/.exec(r.error.message);
  return m ? m[1] : null;
}

/** Save text or bytes as a download. */
export function downloadFile(name: string, data: BlobPart, type = "text/plain;charset=utf-8"): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---- a small .zip writer (stored, no compression) for exporting several files at once ----

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function zipFiles(files: { name: string; data: string | Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = typeof f.data === "string" ? enc.encode(f.data) : f.data;
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 names
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true);
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, data.length, true);
    dir.setUint32(24, data.length, true);
    dir.setUint16(28, name.length, true);
    dir.setUint32(42, offset, true);
    central.push(new Uint8Array(dir.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const size = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, size, true);
  end.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0));
  let at = 0;
  for (const p of all) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
