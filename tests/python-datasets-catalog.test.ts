// The Python dataset catalogue, end to end: every built dataset is listed for learners (and nothing else is), every
// edition file on disk matches its manifest hash, real sources carry their source and credit, generated ones their
// seed, and the loading code the tools offer runs in real Pyodide for every file format of every dataset.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pyManifests } from "@/content/python-v2/datasets";
import { allFiles, loadSnippet, sizeFor, toolDatasets } from "@/content/python-v2/tools/friendly";
import { PY_DATASET_IDS } from "../datasets/python/build.mjs";
import { runFast } from "./helpers/python-fast";

describe("dataset catalogue", () => {
  it("lists exactly the built datasets", () => {
    expect(Object.keys(pyManifests).sort()).toEqual([...PY_DATASET_IDS].sort());
    expect(toolDatasets.map((d) => d.id).sort()).toEqual([...PY_DATASET_IDS].sort());
    expect(toolDatasets.length).toBe(15);
  });

  for (const d of toolDatasets) {
    it(`${d.id} ${d.name}: files match their hashes, the start table exists, provenance is recorded`, () => {
      const m = d.manifest;
      expect(m.tables[d.start], `${d.id} start table`).toBeTruthy();
      if (d.kind === "real") {
        expect(m.seed).toBeNull();
        expect(m.source).toBeTruthy();
        expect(m.licence.status).toBe("cleared");
      } else {
        expect(typeof m.seed).toBe("number");
        expect(m.licence.status).toBe("ours");
      }
      for (const [name, e] of Object.entries(m.editions)) {
        for (const f of e.files ?? []) {
          const p = `public${f.url}`;
          expect(existsSync(p), `${d.id}@${name} ${f.path} missing; run npm run datasets:python`).toBe(true);
          expect(createHash("sha256").update(readFileSync(p)).digest("hex"), `${d.id}@${name} ${f.path}`).toBe(f.sha256);
        }
      }
      // A small size exists for every dataset, and stays small enough to load quickly in a browser.
      const small = allFiles(d, sizeFor(d, "starter"));
      expect(small.length).toBeGreaterThan(0);
      expect(small.reduce((s, f) => s + f.bytes, 0)).toBeLessThan(6e6);
    });
  }
});

describe("loading code runs for every format", () => {
  for (const d of toolDatasets) {
    const files = allFiles(d, sizeFor(d, "starter")).filter((f) => f.layer === "clean");
    // One file per format (the first), so each loader is exercised on real data.
    const seen = new Set<string>();
    const picks = files.filter((f) => {
      const k = f.path.endsWith(".xml") ? "xml" : f.format ?? "csv";
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    for (const f of picks) {
      it(`${d.name}: ${f.path}`, async () => {
        const code = loadSnippet(f);
        const pandas = /import pandas/.test(code);
        const packages = pandas ? (f.format === "parquet" ? (["pandas", "pyarrow"] as const) : (["pandas"] as const)) : ([] as const);
        const r = await runFast(code, { packages, mounts: [{ path: `data/${f.path}`, url: f.url, sha256: f.sha256 }], timeoutS: 60 });
        expect(r.status, JSON.stringify(r).slice(0, 600)).toBe("ok");
        if (f.format === "csv" && !pandas) return;
        if (r.status === "ok") expect(r.output.length).toBeGreaterThan(0);
      }, 240_000);
    }
  }
});
