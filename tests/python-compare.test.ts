// Syntax & API Comparator, for real: every approach of every comparison runs in Pyodide on the same input.
// "same" comparisons must print identical output; "differ" comparisons must really print something different.
import { describe, expect, it } from "vitest";
import { COMPARE_CATEGORIES, COMPARISONS } from "@/content/python-v2/tools/compare";
import { EXPERIMENTS } from "@/content/python-v2/tools/performance";
import { mountsFor, pyManifests } from "@/content/python-v2/datasets";
import { packagesFor } from "@/features/python/handoff";
import { runFast } from "./helpers/python-fast";

describe("Comparator catalogue", () => {
  it("has at least 60 comparisons in every area, unique ids, resolvable links", () => {
    const ids = new Set(COMPARISONS.map((c) => c.id));
    expect(ids.size).toBe(COMPARISONS.length);
    expect(COMPARISONS.length).toBeGreaterThanOrEqual(60);
    for (const cat of COMPARE_CATEGORIES) expect(COMPARISONS.filter((c) => c.category === cat).length, cat).toBeGreaterThanOrEqual(8);
    for (const c of COMPARISONS) {
      expect(c.approaches.length, c.id).toBeGreaterThanOrEqual(2);
      for (const r of c.related) expect(ids.has(r), `${c.id} → ${r}`).toBe(true);
      expect(c.concepts.length, c.id).toBeGreaterThan(0);
    }
    for (const e of EXPERIMENTS) if (e.compare) expect(ids.has(e.compare), `${e.id} → ${e.compare}`).toBe(true);
  });
});

describe("every comparison runs", () => {
  for (const c of COMPARISONS) {
    it(`${c.id} (${c.outputs})`, async () => {
      const mounts = c.data ? mountsFor(pyManifests[c.data.dataset].editions[c.data.size ?? "starter"].ref, c.data.files) : [];
      const outs: string[] = [];
      for (const a of c.approaches) {
        const packages = [...new Set([...c.packages, ...packagesFor(a.code)])];
        const r = await runFast(a.code, { packages, mounts, timeoutS: 60 });
        expect(r.status, `${a.label}: ${JSON.stringify(r).slice(0, 900)}`).toBe("ok");
        if (r.status !== "ok") return;
        expect(r.stdout.trim().length, `${a.label} printed nothing`).toBeGreaterThan(0);
        outs.push(r.stdout);
      }
      if (c.outputs === "same") for (let i = 1; i < outs.length; i++) expect(outs[i], `${c.approaches[i].label} vs ${c.approaches[0].label}`).toBe(outs[0]);
      else expect(new Set(outs).size, "the approaches were expected to differ").toBeGreaterThan(1);
    }, 240_000);
  }
});
