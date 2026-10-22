import { describe, expect, it } from "vitest";
import { coverageReport, pyRegistry, validateRegistry } from "@/content/python-v2/registry";
import type { PyRegistry } from "@/content/python-v2/types";
import { pyManifests } from "@/content/python-v2/datasets";

const built = new Set(Object.keys(pyManifests));

const clone = (): PyRegistry => structuredClone(pyRegistry);

describe("Python course registry", () => {
  it("matches the approved plan's shape", () => {
    expect(pyRegistry.modules).toHaveLength(50);
    expect(pyRegistry.lessons).toHaveLength(250);
    expect(pyRegistry.questions).toHaveLength(1250);
    expect(pyRegistry.projects).toHaveLength(10);
    expect(pyRegistry.tools).toHaveLength(5);
    for (const m of pyRegistry.modules) expect(m.lessons).toHaveLength(5);
  });

  it("is valid", () => {
    expect(validateRegistry(pyRegistry, built)).toEqual([]);
  });

  it("never points content at replaced datasets", () => {
    const used = new Set([...pyRegistry.lessons, ...pyRegistry.questions].flatMap((e) => e.datasets));
    expect(used.has("D01")).toBe(false);
    expect(used.has("D04")).toBe(false);
  });

  it("labels the browser-limited lessons instead of swapping their concepts", () => {
    const mode = (module: string, title: string) => pyRegistry.lessons.find((l) => l.module === module && l.title === title)?.mode;
    expect(mode("M38", "threads")).toBe("read-and-diagnose");
    expect(mode("M38", "processes")).toBe("read-and-diagnose");
    expect(mode("M38", "benchmark comparisons")).toBe("simulated");
    // seaborn is not installed in the browser runner; M44 teaches pandas plotting (matplotlib underneath) instead.
    expect(mode("M44", "charts from DataFrames")).toBe("interactive");
    expect(mode("M44", "Matplotlib")).toBe("interactive");
    expect(mode("M23", "subprocess")).toBe("read-and-diagnose");
    // Questions on a lesson's concept share its mode.
    const q = pyRegistry.questions.find((x) => x.module === "M38" && x.concept === "threads")!;
    expect(q.mode).toBe("read-and-diagnose");
  });

  it("catches broken registries", () => {
    const dup = clone();
    dup.lessons[1].id = dup.lessons[0].id;
    expect(validateRegistry(dup).some((p) => p.startsWith("duplicate id"))).toBe(true);

    const missing = clone();
    missing.questions[0].prerequisites = ["PY-L99-99"];
    expect(validateRegistry(missing)).toContain("PY-Q01-01: unknown prerequisite PY-L99-99");

    const backwards = clone();
    backwards.lessons[0].prerequisites = [backwards.lessons[3].id];
    expect(validateRegistry(backwards)).toContain(`${backwards.lessons[0].id}: prerequisite ${backwards.lessons[3].id} comes later`);

    const early = clone();
    early.lessons[0].status = "tests-pass";
    early.lessons[1].status = "published";
    expect(validateRegistry(early)).toContain(`${early.lessons[1].id}: published before its prerequisite ${early.lessons[0].id}`);

    const replaced = clone();
    replaced.questions[0].datasets = ["D01"];
    expect(validateRegistry(replaced)).toContain("PY-Q01-01: uses D01, which is replaced by R01");
  });

  it("blocks reviewed content on uncleared or unbuilt data", () => {
    const reg = clone();
    reg.datasets.find((d) => d.id === "D11")!.licence.status = "review";
    const q = reg.questions.find((x) => x.datasets[0] === "D11")!;
    q.status = "reviewed";
    expect(validateRegistry(reg)).toContain(`${q.id}: reviewed but D11's licence isn't cleared`);
    const r = reg.questions.find((x) => x.datasets[0] === "R01")!;
    r.status = "reviewed";
    expect(validateRegistry(reg)).toContain(`${r.id}: reviewed but R01 has no built editions`);
    expect(validateRegistry(reg, new Set(["R01"]))).not.toContain(`${r.id}: reviewed but R01 has no built editions`);
  });

  it("reports dataset coverage", () => {
    const r = coverageReport(pyRegistry, new Set(["R01"]));
    const r01 = r.datasets.find((d) => d.id === "R01")!;
    expect(r01.built).toBe(true);
    expect(r01.questions).toBe(248);
    expect(r01.projects).toEqual(["P01"]);
    expect(r.unused).toEqual(["D14"]);
    expect(r.blocked.some((b) => b.reason === "licence not cleared")).toBe(false);
    expect(r.blocked.some((b) => b.dataset === "R01")).toBe(false);
    const uncleared = clone();
    uncleared.datasets.find((d) => d.id === "D11")!.licence.status = "review";
    expect(coverageReport(uncleared, new Set(["R01"])).blocked.some((b) => b.dataset === "D11" && b.reason === "licence not cleared")).toBe(true);
  });
});
