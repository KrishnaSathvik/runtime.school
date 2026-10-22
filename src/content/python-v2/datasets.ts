import type { PyMount } from "@/engine/python/client";
import r01 from "./datasets/R01.json";
import r02 from "./datasets/R02.json";
import d02 from "./datasets/D02.json";
import d03 from "./datasets/D03.json";
import d05 from "./datasets/D05.json";
import d06 from "./datasets/D06.json";
import d07 from "./datasets/D07.json";
import d08 from "./datasets/D08.json";
import d09 from "./datasets/D09.json";
import d10 from "./datasets/D10.json";
import d11 from "./datasets/D11.json";
import d12 from "./datasets/D12.json";
import d13 from "./datasets/D13.json";
import d14 from "./datasets/D14.json";
import d15 from "./datasets/D15.json";

/** Built dataset manifests (datasets/python/build.mjs). A dataset is usable only when it has one. */
export type PyFileFormat = "csv" | "json" | "jsonl" | "geojson" | "parquet" | "text" | "sqlite";
export type PyEditionFile = { path: string; table: string; layer: "clean" | "raw"; format?: PyFileFormat; rows: number; bytes: number; sha256: string; url: string; from?: string };
export type PyColumn = { name: string; type: string; description: string; nullable: boolean };
export type PyManifest = {
  id: string;
  title: string;
  version: number;
  /** Generated datasets have a seed; real sources have none. */
  seed: number | null;
  /** Where a real source came from. */
  source?: string;
  /** Credit line required by the source's licence. */
  attribution?: string;
  description: string;
  licence: { name: string; status: string };
  window: [string, string];
  generator: string;
  tables: Record<string, { description: string; primaryKey: string[]; foreignKeys: { column: string; references: string }[]; columns: PyColumn[] }>;
  editions: Record<string, {
    ref: string;
    files?: PyEditionFile[];
    profile?: Record<string, Record<string, { nulls: number; distinct: number; min?: number | string; max?: number | string; mean?: number }>>;
    quality?: { id: string; description: string; count: number }[];
    onDemand?: boolean;
    recipe?: string;
  }>;
};

export const pyManifests: Record<string, PyManifest> = Object.fromEntries(
  [r01, r02, d02, d03, d05, d06, d07, d08, d09, d10, d11, d12, d13, d14, d15].map((m) => [m.id, m as unknown as PyManifest]),
);

/** `R01@starter.1` → the manifest and that edition. */
export function edition(ref: string) {
  const [id, rest] = ref.split("@");
  const [name, version] = (rest ?? "").split(".");
  const manifest = pyManifests[id];
  const ed = manifest?.editions[name];
  if (!manifest || !ed || String(manifest.version) !== version) throw new Error(`unknown dataset edition ${ref}`);
  return { manifest, name, edition: ed };
}

/**
 * Mounts for an edition's files, placed under `data/` (e.g. `data/orders.csv`, `data/raw/orders.csv`).
 * `files` picks paths within the edition; omit it for every clean table's CSV (the same set lessons always had:
 * Parquet, JSON and API-page files are mounted only when asked for).
 */
export function mountsFor(ref: string, files?: string[]): PyMount[] {
  const { edition: ed } = edition(ref);
  const all = ed.files ?? [];
  const chosen = files ? files.map((p) => all.find((f) => f.path === p) ?? (() => { throw new Error(`${ref} has no ${p}`); })()) : all.filter((f) => f.layer === "clean" && (f.format ?? "csv") === "csv");
  return chosen.map((f) => ({ path: `data/${f.path}`, url: f.url, sha256: f.sha256 }));
}
