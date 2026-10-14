// The whole Python curriculum as a catalog: identities, order and scope. Each lesson's content is executed by
// tests/python-lessons-<module>.test.ts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { RESERVED_PYTHON_REFS, pythonLessonOrder, pythonLessons, pythonModules } from "@/content/python";

const research = JSON.parse(readFileSync("research/Runtime_Python_Agent_Starter_Complete/research/curriculum.json", "utf8")) as {
  lessons: { id: string; module_id: string; position: number }[];
};

describe("Python curriculum", () => {
  it("has 79 lessons in 12 modules: the research catalog minus the reserved Foundations lesson", () => {
    expect(pythonModules.map((m) => m.title)).toEqual([
      "Python Foundations", "Strings and Text", "Conditions and Logic", "Loops and Iteration", "Collections and Records", "Functions and Modules",
      "Debugging and Testing", "Files and Structured Data", "Practical Python Patterns", "NumPy Fundamentals", "pandas for Data Work", "Reliable Data Pipelines",
    ]);
    expect(pythonLessons).toHaveLength(79);
    const planned = research.lessons.map((l) => l.id).filter((id) => !RESERVED_PYTHON_REFS.includes(id as never));
    expect(pythonLessons.map((l) => l.ref)).toEqual(planned);
  });

  it("keeps identities unique and stable, and never reuses the reserved one", () => {
    for (const key of ["ref", "slug", "title"] as const) {
      const values = pythonLessons.map((l) => l[key].toLowerCase());
      expect(new Set(values).size, key).toBe(values.length);
    }
    expect(pythonLessons[0].ref).toBe("python:variables-and-values");
    expect(pythonLessons[1].ref).toBe("python:print-comments-and-execution-order");
    for (const ref of RESERVED_PYTHON_REFS) expect(pythonLessons.some((l) => l.ref === ref)).toBe(false);
    expect(pythonLessonOrder).toEqual(pythonLessons.map((l) => l.slug));
  });

  it("orders lessons so prerequisites always come first (module order, then lesson number)", () => {
    const moduleIndex = new Map(pythonModules.map((m, i) => [m.id, i]));
    for (let i = 1; i < pythonLessons.length; i++) {
      const [a, b] = [pythonLessons[i - 1], pythonLessons[i]];
      const order = Math.sign(moduleIndex.get(b.module)! - moduleIndex.get(a.module)!) || Math.sign(b.number - a.number);
      expect(order, `${a.ref} before ${b.ref}`).toBe(1);
    }
  });

  it("loads data libraries only in the modules that teach them, and never scikit-learn or pyspark", () => {
    for (const l of pythonLessons) {
      const pk = l.packages ?? [];
      if (l.module === "numpy") expect(pk, l.ref).toEqual(["numpy"]);
      else if (l.module === "pandas") expect(pk.includes("pandas"), l.ref).toBe(true);
      else expect(pk, l.ref).toEqual([]);
      expect(pk.some((p) => p === "scikit-learn" || p === "pyspark"), l.ref).toBe(false);
    }
  });

  it("every challenge has a distinct answer from its starter, and never uses input()", () => {
    for (const l of pythonLessons) {
      for (const c of l.challenges) {
        expect(c.answer.trim(), `${l.ref} ${c.id}`).not.toBe(c.starter.trim());
        expect(c.answer + c.starter, `${l.ref} ${c.id}`).not.toMatch(/\binput\(/);
      }
    }
  });
});
