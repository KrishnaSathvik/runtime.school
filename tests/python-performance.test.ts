// Performance Lab experiments, executed for real in Pyodide: at their default inputs and at the smallest option of
// every input, both sides must run and produce the same result, and both must be timed. Profiles must name functions.
import { describe, expect, it } from "vitest";
import { EXPERIMENTS, PERF_CATEGORIES, paramLines, type PyExperiment } from "@/content/python-v2/tools/performance";
import { mountsFor, pyManifests } from "@/content/python-v2/datasets";
import { benchProgram, profileProgram, readBench, stats, type BenchReport, type ProfileReport } from "@/engine/python/bench";
import { runFast } from "./helpers/python-fast";

const T = 400_000;

function inputs(e: PyExperiment, pick: "default" | "smallest") {
  const chosen = Object.fromEntries(e.params.map((p) => [p.name, pick === "default" ? p.start : 0]));
  const setup = `${paramLines(e, chosen)}\n${e.setup}`;
  const size = e.dataset ? e.dataset.sizes[pick === "default" ? e.dataset.start : 0] : null;
  const mounts = e.dataset ? mountsFor(pyManifests[e.dataset.id].editions[size!].ref, e.dataset.files) : [];
  return { setup, mounts };
}

describe("Performance Lab catalogue", () => {
  it("has at least 40 distinct experiments across every category", () => {
    expect(new Set(EXPERIMENTS.map((e) => e.id)).size).toBe(EXPERIMENTS.length);
    expect(EXPERIMENTS.length).toBeGreaterThanOrEqual(40);
    for (const c of PERF_CATEGORIES) expect(EXPERIMENTS.filter((e) => e.category === c).length, c).toBeGreaterThanOrEqual(5);
    for (const e of EXPERIMENTS) {
      for (const p of e.params) expect(p.start).toBeLessThan(p.options.length);
      if (e.dataset) for (const s of e.dataset.sizes) expect(pyManifests[e.dataset.id].editions[s]?.files, `${e.id} ${s}`).toBeTruthy();
    }
  });
});

for (const pick of ["default", "smallest"] as const) {
  describe(`experiments at ${pick} inputs`, () => {
    for (const e of EXPERIMENTS) {
      it(`${e.id}`, async () => {
        const { setup, mounts } = inputs(e, pick);
        const r = await runFast(benchProgram(setup, e.a.code, e.b.code, 3), { packages: e.packages, mounts, timeoutS: 300 });
        expect(r.status, JSON.stringify(r).slice(0, 1200)).toBe("ok");
        if (r.status !== "ok") return;
        const { report } = readBench<BenchReport>(r.stdout);
        expect(report, r.stdout.slice(0, 400)).not.toBeNull();
        expect(report!.a.ok && report!.b.ok, JSON.stringify(report).slice(0, 800)).toBe(true);
        expect(report!.same, report!.diff).toBe(true);
        expect(report!.a.times!.length).toBeGreaterThanOrEqual(3);
        expect(stats(report!.b.times!).median).toBeGreaterThan(0);
        expect(report!.a.peak).toBeGreaterThanOrEqual(0);
      }, T);
    }
  });
}

describe("profiling", () => {
  it("names where the time goes on each side", async () => {
    const e = EXPERIMENTS.find((x) => x.id === "repeated-vs-cached")!;
    const { setup } = inputs(e, "smallest");
    const r = await runFast(profileProgram(setup, e.a.code, e.b.code), { timeoutS: 60 });
    const { report } = readBench<ProfileReport>(r.status === "ok" ? r.stdout : "");
    expect(Array.isArray(report!.a)).toBe(true);
    expect(JSON.stringify(report!.a)).toMatch(/fib/);
  }, 120_000);
});
