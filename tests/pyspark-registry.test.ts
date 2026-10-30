import { describe, expect, it } from "vitest";
import { pathwayBlockers, prerequisiteClosure, psCoverageReport, psRegistry, validatePsRegistry } from "@/content/pyspark/registry";
import type { PsRegistry } from "@/content/pyspark/types";
import { psItem, psProjects } from "@/content/pyspark/content";

const clone = (): PsRegistry => structuredClone(psRegistry);
const lesson = (reg: PsRegistry, id: string) => reg.lessons.find((l) => l.id === id)!;

describe("PySpark course registry", () => {
  it("matches the v4 planning baseline", () => {
    expect(psRegistry.modules).toHaveLength(15);
    expect(psRegistry.lessons).toHaveLength(90);
    expect(psRegistry.questions).toHaveLength(450);
    expect(psRegistry.projects).toHaveLength(10);
    expect(psRegistry.datasets).toHaveLength(15);
    expect(psRegistry.tools).toHaveLength(6);
    for (const m of psRegistry.modules) expect(m.lessons).toHaveLength(6);
    // The v4 plan named 92 tables; the registry lists what the generators build (newest manifest per dataset): 89.
    expect(psRegistry.datasets.reduce((n, d) => n + d.tables.length, 0)).toBe(89);
    expect(psRegistry.datasets.find((d) => d.id === "PS-D01")!.tables).toEqual(["customers", "products", "orders", "order_items"]);
  });

  it("is valid", () => {
    expect(validatePsRegistry(psRegistry)).toEqual([]);
  });

  it("namespaces every ID so it can't collide with SQL or Python", () => {
    const ids = [...psRegistry.modules, ...psRegistry.lessons, ...psRegistry.questions, ...psRegistry.projects, ...psRegistry.datasets, ...psRegistry.tools].map((e) => e.id);
    expect(ids.every((id) => /^PS-(M|L|Q|P|D|T)\d+$/.test(id))).toBe(true);
    expect(lesson(psRegistry, "PS-L026").questions).toEqual(["PS-Q0126", "PS-Q0127", "PS-Q0128", "PS-Q0129", "PS-Q0130"]);
  });

  it("has nothing published; all 90 lessons, all 450 practice questions and every step of all ten projects are written", () => {
    const items = [...psRegistry.lessons, ...psRegistry.questions, ...psRegistry.projects, ...psRegistry.projects.flatMap((p) => p.milestones), ...psRegistry.tools];
    expect(items.some((e) => e.status === "published")).toBe(false);
    const written = (xs: { id: string; status: string }[]) => xs.filter((e) => e.status !== "planned").map((e) => e.id);
    expect(written(psRegistry.lessons)).toEqual(Array.from({ length: 90 }, (_, i) => `PS-L${String(i + 1).padStart(3, "0")}`));
    const ids = Array.from({ length: 450 }, (_, i) => `PS-Q${String(i + 1).padStart(4, "0")}`);
    expect(written(psRegistry.questions)).toEqual(ids);
    expect(written(psRegistry.projects)).toEqual(["PS-P01", "PS-P02", "PS-P03", "PS-P04", "PS-P05", "PS-P06", "PS-P07", "PS-P08", "PS-P09", "PS-P10"]);
    // The v4 plan's step counts: 5 for the beginner projects and P05, 6 for P04, P06 and P07, 7 for the advanced ones.
    expect(psRegistry.projects.map((p) => written(p.milestones).length)).toEqual([5, 5, 5, 6, 5, 6, 6, 7, 7, 7]);
    for (const p of psRegistry.projects) expect(p.milestones.map((m) => m.id)).toEqual(p.milestones.map((_, i) => `${p.id}.m${i + 1}`));
  });

  it("asks for null handling only in the P01 step that needs it", () => {
    const steps = psRegistry.projects.find((p) => p.id === "PS-P01")!.milestones;
    const written = steps.filter((m) => m.status !== "planned");
    expect(written.map((m) => m.id)).toEqual(["PS-P01.m1", "PS-P01.m2", "PS-P01.m3", "PS-P01.m4", "PS-P01.m5"]);
    expect(written.filter((m) => m.prerequisites.includes("PS-L019")).map((m) => m.id)).toEqual(["PS-P01.m5"]);
    // Written steps need no data under licence review, through any prerequisite.
    expect(pathwayBlockers(written.flatMap((m) => m.prerequisites))).toEqual({});
  });

  it("defines each written project's pipeline from the functions its steps write", () => {
    const defined = psProjects.filter((p) => p.def);
    expect(defined.map((p) => p.id)).toEqual(["PS-P01", "PS-P02", "PS-P03", "PS-P04", "PS-P05", "PS-P06", "PS-P07", "PS-P08", "PS-P09", "PS-P10"]);
    for (const p of defined) {
      const d = p.def!;
      const written = p.steps.filter((s) => s.item);
      expect(d.dataset.id).toBe(p.datasets[0]);
      // A second dataset is one the registry lists, and its tables are inputs; steps take it the same way.
      for (const a of d.also ?? []) expect(p.datasets).toContain(a.id);
      for (const a of d.also ?? []) expect(a.tables.every((t) => d.inputs.includes(t))).toBe(true);
      for (const s of written) for (const a of s.item!.spec.also ?? []) expect(d.also?.find((x) => x.id === a.id)?.version).toBe(a.version);
      expect(d.milestones.map((m) => m.step)).toEqual(p.steps.map((s) => s.number));
      // Every step's entry is an artifact, and every artifact is a function its step's file adds.
      for (const s of written) expect(d.artifacts.some((a) => (a.entry ?? a.name) === s.item!.spec.entry && a.step === s.number)).toBe(true);
      for (const a of d.artifacts) {
        const s = p.steps[a.step - 1]?.item?.spec;
        expect(s, a.name).toBeTruthy();
        expect(`${s!.starter ?? ""}${s!.append ?? ""}`).toMatch(new RegExp(`def ${a.entry ?? a.name}\\(`));
        expect(a.inputs.every((t) => d.inputs.includes(t))).toBe(true);
        expect(a.inputs).toEqual(s!.entry === (a.entry ?? a.name) ? s!.inputs : a.inputs);
      }
      // Each output the registry promises is a deliverable artifact.
      expect(d.artifacts.filter((a) => a.deliverable).map((a) => a.name).sort()).toEqual([...p.deliverables].sort());
    }
  });

  it("keeps the v4 project lineup", () => {
    const levels = psRegistry.projects.map((p) => `${p.id}:${p.level}`);
    expect(levels).toEqual([
      "PS-P01:beginner", "PS-P02:beginner", "PS-P03:beginner",
      "PS-P04:intermediate", "PS-P05:intermediate", "PS-P06:intermediate", "PS-P07:intermediate",
      "PS-P08:advanced", "PS-P09:advanced", "PS-P10:advanced",
    ]);
    expect(psRegistry.projects.find((p) => p.id === "PS-P03")!.datasets).toEqual(["PS-D11"]);
    expect(psRegistry.projects.find((p) => p.id === "PS-P10")!.datasets).toEqual(["PS-D09", "PS-D15"]);
  });

  it("uses our own retail data and holds unreviewed sources", () => {
    const d = (id: string) => psRegistry.datasets.find((x) => x.id === id)!;
    expect(d("PS-D01")).toMatchObject({ kind: "generated", licence: { status: "ours" } });
    expect(d("PS-D01").source).toBeUndefined();
    // Every dataset is built as our own synthetic data; real sources stay a noted, unreviewed option.
    for (const x of psRegistry.datasets) expect(x).toMatchObject({ kind: "generated", licence: { status: "ours" } });
    expect(d("PS-D05").licence.note).toContain("MovieLens");
    expect(psCoverageReport().unused).toEqual([]);
  });

  it("labels each lesson with the Spark it runs on", () => {
    // L079–L081 run spark-submit and grade executed items, so they're interactive like every other lesson.
    expect(psRegistry.lessons.filter((l) => l.mode === "read-and-diagnose")).toEqual([]);
    expect(lesson(psRegistry, "PS-L079")).toMatchObject({ mode: "interactive", requires: "dataframe" });
    for (const id of ["PS-L080", "PS-L081"]) expect(lesson(psRegistry, id)).toMatchObject({ mode: "interactive", requires: "plans" });
    expect(lesson(psRegistry, "PS-L002")).toMatchObject({ mode: "interactive", requires: "rdd" });
    expect(lesson(psRegistry, "PS-L049").requires).toBe("rdd");
    expect(lesson(psRegistry, "PS-L063").requires).toBe("delta");
    expect(lesson(psRegistry, "PS-L070").requires).toBe("streaming");
  });

  it("has an acyclic prerequisite map in course order", () => {
    expect(() => prerequisiteClosure(psRegistry.lessons.map((l) => l.id))).not.toThrow();
    const looped = clone();
    lesson(looped, "PS-L001").prerequisites = ["PS-L003"];
    expect(() => prerequisiteClosure(["PS-L003"], looped)).toThrow("prerequisite cycle");
  });

  it("keeps the beginner modules free of advanced engine topics", () => {
    // M01–M06 (fundamentals through windows) may only build on tier-A work: DataFrames, RDDs, plans, or reading.
    const tierA = new Set(["none", "dataframe", "sql", "rdd", "arrow", "plans"]);
    const beginner = psRegistry.lessons.filter((l) => Number(l.module.slice(4)) <= 6).map((l) => l.id);
    const pulled = prerequisiteClosure(beginner).map((id) => lesson(psRegistry, id));
    expect(pulled.filter((l) => !tierA.has(l.requires)).map((l) => l.id)).toEqual([]);
    expect(pulled.every((l) => Number(l.module.slice(4)) <= 6)).toBe(true);
  });

  it("runs the first D01 pathway on our own retail data", () => {
    expect(lesson(psRegistry, "PS-L007").datasets).toEqual(["PS-D01"]);
    expect(psRegistry.questions.filter((q) => q.lesson === "PS-L007").every((q) => q.datasets.join() === "PS-D01")).toBe(true);
    // Creating, exploring and filtering DataFrames need no uncleared data.
    expect(pathwayBlockers(["PS-L007", "PS-L008", "PS-L010"])).toEqual({});
    // Joins no longer reach lessons that aren't needed for them (P01 review, docs/pyspark/plan.md §4).
    expect(pathwayBlockers(["PS-L025"])).toEqual({});
    // With every dataset our own, nothing on P01's path waits for a licence review.
    const p01 = psRegistry.projects.find((p) => p.id === "PS-P01")!;
    expect(pathwayBlockers(p01.prerequisites)).toEqual({});
    // The datasets themselves are unchanged: those lessons still teach on their own domains.
    expect(["PS-L011", "PS-L012", "PS-L013", "PS-L019"].map((id) => lesson(psRegistry, id).datasets.join())).toEqual(["PS-D05", "PS-D03", "PS-D04", "PS-D13"]);
    // Moved links stay visible as related reading.
    expect(lesson(psRegistry, "PS-L025").related).toEqual(["PS-L010", "PS-L012"]);
  });

  it("refuses to publish on an engine tier that isn't live", () => {
    const reg = clone();
    const l = lesson(reg, "PS-L010");
    for (const p of [lesson(reg, "PS-L001"), lesson(reg, "PS-L003"), lesson(reg, "PS-L007"), lesson(reg, "PS-L008"), lesson(reg, "PS-L009"), l]) p.status = "published";
    const built = { built: new Set(["PS-D01", "PS-D11"]), live: new Set<never>() };
    expect(validatePsRegistry(reg, built)).toContain("PS-L010: published but Spark capability dataframe isn't live");
    const live = { built: built.built, live: new Set(["dataframe", "rdd"] as const) };
    expect(validatePsRegistry(reg, live)).toEqual([]);
  });

  it("labels difficulty by the work, with an easier way into every lesson", () => {
    // Labels come from the rubric in docs/pyspark/authoring.md §3, not from the question's role.
    const rank = { easy: 0, medium: 1, hard: 2 } as const;
    const spec = (id: string) => psItem(id)!.spec;
    const share = (d: string) => psRegistry.questions.filter((q) => spec(q.id).difficulty === d).length / psRegistry.questions.length;
    expect(share("easy")).toBeGreaterThanOrEqual(0.25);
    expect(share("hard")).toBeLessThanOrEqual(0.3);
    for (const l of psRegistry.lessons) {
      const qs = psRegistry.questions.filter((q) => q.lesson === l.id);
      // Every lesson has a practice question that isn't hard, and its foundation question is the easiest way in.
      expect(qs.some((q) => spec(q.id).difficulty !== "hard"), l.id).toBe(true);
      const foundation = rank[spec(qs.find((q) => q.role === "foundation")!.id).difficulty];
      expect(Math.min(...qs.filter((q) => q.role !== "foundation").map((q) => rank[spec(q.id).difficulty])), l.id).toBeGreaterThanOrEqual(foundation);
    }
    // Every role spans more than one level: role is a scaffold, not a difficulty.
    for (const role of ["business", "debugging", "edge", "integration"] as const)
      expect(new Set(psRegistry.questions.filter((q) => q.role === role).map((q) => spec(q.id).difficulty)).size, role).toBeGreaterThan(1);
    // Minutes follow the label: an easy item never takes as long as a hard one of the same kind.
    const ids = [...psRegistry.questions.map((q) => q.id), ...psRegistry.lessons.flatMap((l) => [`${l.id}-C1`, `${l.id}-C2`])].filter((id) => psItem(id));
    for (const kind of [undefined, "predict"]) {
      const mins = (d: string) => ids.map(spec).filter((s) => s.kind === kind && s.difficulty === d).map((s) => s.minutes);
      expect(Math.max(...mins("easy")), String(kind)).toBeLessThan(Math.min(...mins("hard")));
    }
  });

  it("catches broken registries", () => {
    const dup = clone();
    dup.lessons[1].id = dup.lessons[0].id;
    expect(validatePsRegistry(dup).some((p) => p.startsWith("duplicate id"))).toBe(true);

    const backwards = clone();
    lesson(backwards, "PS-L025").prerequisites = ["PS-L031"];
    expect(validatePsRegistry(backwards)).toContain("PS-L025: prerequisite PS-L031 comes later");

    const missing = clone();
    missing.questions[0].prerequisites = ["PS-L999"];
    expect(validatePsRegistry(missing)).toContain("PS-Q0001: unknown prerequisite PS-L999");

    const early = clone();
    lesson(early, "PS-L026").status = "published";
    expect(validatePsRegistry(early, { built: new Set(["PS-D02"]), live: new Set(["dataframe"]) })).toContain("PS-L026: published before its prerequisite PS-L025");

    const unlicensed = clone();
    unlicensed.datasets.find((x) => x.id === "PS-D05")!.licence.status = "review";
    const q = unlicensed.questions.find((x) => x.datasets.includes("PS-D05"))!;
    q.status = "reviewed";
    expect(validatePsRegistry(unlicensed)).toContain(`${q.id}: reviewed but PS-D05's licence isn't cleared`);

    const faked = clone();
    lesson(faked, "PS-L079").mode = "read-and-diagnose";
    expect(validatePsRegistry(faked)).toContain("PS-L079: mode read-and-diagnose doesn't match capability dataframe");
  });
});
