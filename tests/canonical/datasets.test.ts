/**
 * Dataset contracts for the twelve canonical Learn/Practice datasets, run against the shipped files.
 * These fail if a dataset shrinks, loses a table or column, breaks a relationship or drifts from its manifest.
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import manifest from "@/data/datasets/generated/canonical.json";
import { learningCatalog, learningDatasets } from "@/data/datasets/learning";
import { canonicalNames } from "@/data/datasets/learning-map";
import { sqlEngine } from "../helpers/canonical";
import { runContract } from "../../datasets/lib/contract.mjs";

const ROOT = path.resolve(__dirname, "../..");
const IDS = Object.keys(canonicalNames);
type Entry = (typeof manifest)[keyof typeof manifest];
const entries = manifest as Record<string, Entry>;
type Table = { name: string; grain: string; columns: { name: string; meaning: string }[] };

/** Licences acceptable for commercial reuse (with attribution where required). */
const OPEN_LICENSES = /CC BY 4\.0|U\.S\. government work|NYC Open Data|Retrosheet|Runtime-owned synthetic/;

it("exposes exactly twelve canonical identities, one version each, no editions", () => {
  expect(Object.keys(entries).sort()).toEqual([...IDS].sort());
  expect(learningCatalog).toHaveLength(12);
  for (const id of IDS) {
    const e = entries[id];
    expect(e.ref).toEqual({ datasetId: id, datasetVersion: e.metadata.version });
    expect(e.metadata.name).toBe(canonicalNames[id as keyof typeof canonicalNames]);
    expect(e.metadata).not.toHaveProperty("editions");
  }
});

it("stays within the realistic-scale targets", () => {
  const all = IDS.reduce((n, id) => n + entries[id].metadata.totals.rows, 0);
  expect(all).toBeGreaterThanOrEqual(1_300_000);
  expect(all).toBeLessThanOrEqual(1_800_000);
  for (const id of IDS) {
    const { rows, tables, columns } = entries[id].metadata.totals;
    expect(rows, id).toBeGreaterThanOrEqual(75_000);
    expect(rows, id).toBeLessThanOrEqual(250_000);
    expect(tables, id).toBeGreaterThanOrEqual(5);
    expect(tables, id).toBeLessThanOrEqual(10);
    expect(columns, id).toBeGreaterThanOrEqual(40);
    expect(columns, id).toBeLessThanOrEqual(80);
  }
});

it("records provenance and a commercial-reuse licence for every dataset", () => {
  for (const id of IDS) {
    const meta = entries[id].metadata as Entry["metadata"] & { source: Record<string, unknown>; kind: string; edgeCases: unknown[] };
    expect(["real", "synthetic", "hybrid"], id).toContain(meta.kind);
    for (const field of ["publisher", "url", "license", "attribution", "transformations"]) expect(meta.source[field], `${id}.${field}`).toBeTruthy();
    expect(meta.source.commercialReuse, id).toBe("permitted");
    expect(String(meta.source.license), id).toMatch(OPEN_LICENSES);
    expect(String(meta.source.license), id).not.toMatch(/NonCommercial|\bNC\b/);
    expect(meta.reproduction, id).toBeTruthy();
    expect(meta.coverage, id).toBeTruthy();
    expect(meta.edgeCases.length, id).toBeGreaterThanOrEqual(5);
  }
  // Healthcare is synthetic only: no real patient data.
  expect(entries.healthcare.metadata.kind).toBe("synthetic");
});

describe.each(IDS)("%s", (id) => {
  const e = entries[id];

  it("ships the exact database named in the manifest and passes its contract", async () => {
    const file = path.join(ROOT, "public", e.asset.url);
    expect(fs.existsSync(file), `${e.asset.url} missing: run npm run datasets:canonical`).toBe(true);
    const gz = fs.readFileSync(file);
    expect(gz.length).toBe(e.asset.gzipBytes);
    const bytes = gunzipSync(gz);
    expect(bytes.length).toBe(e.asset.bytes);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(e.asset.sha256);

    const mod = (await import(pathToFileURL(path.join(ROOT, "datasets", id, "dataset.mjs")).href)).default;
    expect(mod.version).toBe(e.metadata.version);
    const SQL = await sqlEngine();
    const db = new SQL.Database(new Uint8Array(bytes));
    const count = (t: string) => db.exec(`SELECT COUNT(*) FROM ${t}`)[0].values[0][0] as number;
    try {
      const { failures, results } = runContract(db, mod);
      expect(failures).toEqual([]);
      expect(results.length).toBeGreaterThan(mod.tables.length + 3);
      expect(db.exec("PRAGMA integrity_check")[0].values).toEqual([["ok"]]);
      for (const t of mod.tables as Table[]) {
        expect(count(t.name), t.name).toBe(e.metadata.rows[t.name as keyof typeof e.metadata.rows]);
        expect(t.grain.length, t.name).toBeGreaterThan(10);
        expect(t.columns.every((c) => c.meaning.length > 0), t.name).toBe(true);
      }
      // The main fact table is realistically wide. Retail's invoice lines carry every field the UCI source has.
      expect(Math.max(...(mod.tables as Table[]).map((t) => t.columns.length))).toBeGreaterThanOrEqual(id === "retail" ? 7 : 8);

      // The changed-data fixture applies cleanly, keeps relationships valid, changes data and rolls back fully.
      const before = (mod.tables as Table[]).map((t) => count(t.name));
      db.exec("PRAGMA foreign_keys=OFF; SAVEPOINT probe;");
      const changesBefore = db.exec("SELECT total_changes()")[0].values[0][0] as number;
      db.exec(e.mutation);
      expect(db.exec("PRAGMA foreign_key_check")).toEqual([]);
      expect((db.exec("SELECT total_changes()")[0].values[0][0] as number) - changesBefore).toBeGreaterThan(10);
      db.exec("ROLLBACK TO probe; RELEASE probe;");
      expect((mod.tables as Table[]).map((t) => count(t.name))).toEqual(before);
    } finally {
      db.close();
    }
  }, 120000);

  it("has small previews that match the schema", () => {
    const asset = learningDatasets[id as keyof typeof learningDatasets];
    for (const t of asset.metadata.tables) {
      const p = asset.previews[t.name];
      expect(p.result.columns).toEqual(t.columns.map((c) => c.name));
      expect(p.result.values.length).toBeGreaterThan(0);
      expect(p.result.values.length).toBeLessThanOrEqual(20);
      expect(p.total).toBe(e.metadata.rows[t.name as keyof typeof e.metadata.rows]);
    }
    expect(asset.seed.startsWith(`-- runtime:database ${e.asset.url} ${e.asset.sha256}`)).toBe(true);
  });
});
