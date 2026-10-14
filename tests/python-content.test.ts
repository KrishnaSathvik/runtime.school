// Content validation against real Pyodide 314.0.7 (Node), using the worker's own harness and the lesson grader.
// Every claim the prose makes about output or errors is checked here; so is every reference answer and a set
// of realistic wrong answers, which must fail on the check that teaches the point.
import { describe, expect, it } from "vitest";
import { getPythonLesson, pythonLessons } from "@/content/python";
import type { PyRunResult } from "@/engine/python/client";
import { checkNode, runNode } from "./helpers/python-node";

const SLOW = 120000;

/** What a runnable block must do: finish with this stdout, or stop with this error after printing `stdout`. */
type Expect = { stdout: string; error?: { kind: "syntax-error" | "runtime-error"; type: string; line: number } };

function expectRun(r: PyRunResult, e: Expect) {
  expect("stdout" in r ? r.stdout : null).toBe(e.stdout);
  if (!e.error) return expect(r.status).toBe("ok");
  expect(r.status).toBe(e.error.kind);
  if (r.status === "syntax-error" || r.status === "runtime-error") {
    expect(r.error.type).toBe(e.error.type);
    expect(r.error.line).toBe(e.error.line);
  }
}

describe("every Python lesson", () => {
  for (const lesson of pythonLessons) {
    it(`${lesson.slug}: reference answers pass the real grader; starters don't`, async () => {
      for (const c of lesson.challenges) {
        const pass = await checkNode(c.task, c.answer);
        expect(pass.ok, `${c.id} answer: ${JSON.stringify(pass.checks.filter((k) => k.status !== "pass"))}`).toBe(true);
        expect((await checkNode(c.task, c.starter)).ok, `${c.id} starter`).toBe(false);
        if (c.expectedOutput) {
          const out = c.task.checks.find((k) => k.kind === "output");
          expect(out && "expected" in out ? out.expected : null).toBe(c.expectedOutput);
        }
      }
    }, SLOW);

    it(`${lesson.slug}: concept checks have one correct option and explain every option`, () => {
      expect(lesson.quiz.length).toBeGreaterThanOrEqual(2);
      for (const q of lesson.quiz) {
        expect(q.options.filter((o) => o.correct)).toHaveLength(1);
        expect(q.options.every((o) => o.why.length > 20)).toBe(true);
      }
    });
  }
});

describe("Print, comments and execution order", () => {
  const lesson = getPythonLesson("print-comments-and-execution-order")!;
  const [c1, c2] = lesson.challenges;

  it("has a stable identity, follows Lesson 1, and uses only core Python", () => {
    expect(lesson.ref).toBe("python:print-comments-and-execution-order");
    expect(lesson.number).toBe(2);
    expect(lesson.packages).toBeUndefined();
    // Nothing from later modules: no functions, loops, conditions, collections, f-strings or sep/end.
    // Words inside text and comments ("Summary for one line") don't count.
    const codeOnly = (code: string) => code.replace(/"[^"\n]*"/g, '""').replace(/#.*$/gm, "");
    for (const code of [lesson.example.code, ...lesson.walkthrough.map((s) => s.code), ...lesson.challenges.map((c) => c.answer)]) {
      expect(codeOnly(code)).not.toMatch(/\bdef\b|\bfor\b|\bwhile\b|\bif\b|\[|\{|\bf""|sep=|end=/);
    }
  });

  it("every example, walkthrough step and mistake does exactly what its text says", async () => {
    expectRun(await runNode(lesson.example.code), { stdout: "Order summary\n\nItem: notebook\nTotal: 12 dollars\n" });
    const steps: Expect[] = [
      { stdout: "Item: notebook\nQuantity: 3\nParcel: 3 kg\n" },
      { stdout: "Order summary\n\nTotal: 12\n" },
      { stdout: "first\nthird\n" },
      { stdout: "Starting\n", error: { kind: "runtime-error", type: "NameError", line: 2 } },
    ];
    for (const [i, s] of lesson.walkthrough.entries()) expectRun(await runNode(s.code), steps[i]);
    const mistakes: Expect[] = [
      // Nothing printed: Python reads the whole file before running line 1.
      { stdout: "", error: { kind: "syntax-error", type: "SyntaxError", line: 2 } },
      { stdout: "", error: { kind: "runtime-error", type: "NameError", line: 1 } },
      { stdout: "", error: { kind: "runtime-error", type: "TypeError", line: 2 } },
    ];
    for (const [i, m] of lesson.mistakes.entries()) expectRun(await runNode(m.code), mistakes[i]);
    // The section's inline examples.
    expectRun(await runNode('print("Total:", 12)\nprint("#1 seller")'), { stdout: "Total: 12\n#1 seller\n" });
  }, SLOW);

  it("concept-check answers match real Python", async () => {
    expectRun(await runNode(lesson.quiz[0].code!), { stdout: "A\n", error: { kind: "runtime-error", type: "NameError", line: 2 } });
    expectRun(await runNode(lesson.quiz[1].code!), { stdout: "Total: 12\n" });
  }, SLOW);

  /** Each wrong answer must fail, and on the check that explains the mistake. */
  async function failsOn(task: typeof c1.task, code: string, failing: string[] | "program") {
    const r = await checkNode(task, code);
    expect(r.ok, code).toBe(false);
    if (failing === "program") expect(r.checks.every((k) => k.status === "not-run"), code).toBe(true);
    else expect(r.checks.filter((k) => k.status === "fail").map((k) => k.id).sort(), code).toEqual([...failing].sort());
    return r;
  }

  it("Challenge 1: other correct layouts pass; common mistakes fail for the right reason", async () => {
    const head = 'item = "notebook"\nprice = 4\nquantity = 3\n';
    const lines = 'print("Order summary")\nprint()\nprint("Item:", item)\nprint("Quantity:", quantity)\nprint("Total:", total, "dollars")\n';
    // Valid alternatives: quantity * price, a comment, calculation written after the first prints.
    for (const ok of [
      `${head}total = quantity * price  # dollars\n${lines}`,
      `${head}print("Order summary")\nprint()\nprint("Item:", item)\nprint("Quantity:", quantity)\ntotal = price * quantity\nprint("Total:", total, "dollars")\n`,
    ]) expect((await checkNode(c1.task, ok)).ok, ok).toBe(true);

    await failsOn(c1.task, `${head}total = price * quantity\n${lines.replace("print()\n", "")}`, ["output"]); // no empty line
    await failsOn(c1.task, `${head}total = price * quantity\n${lines.replace('"Item:", item', '"Item: ", item')}`, ["output"]); // double space
    await failsOn(c1.task, `${head}total = 12\n${lines}`, ["total-calculated"]); // typed the number
    const early = await failsOn(c1.task, `${head}print("Total:", total, "dollars")\ntotal = price * quantity\n`, "program");
    expect(early.error).toMatchObject({ type: "NameError", line: 4 });
    const plus = await failsOn(c1.task, `${head}total = price * quantity\nprint("Total: " + total)\n`, "program");
    expect(plus.error).toMatchObject({ type: "TypeError" });
  }, SLOW);

  it("Challenge 2: each stage of fixing the starter gives the next real error, and other valid orders pass", async () => {
    // As given: the note on line 1 is a syntax error, so nothing runs.
    const start = await failsOn(c2.task, c2.starter, "program");
    expect(start.outcome).toBe("syntax-error");
    expect(start.error).toMatchObject({ line: 1 });
    // Note fixed, order not: the first print needs cost.
    const commented = await failsOn(c2.task, "# " + c2.starter, "program");
    expect(commented.error).toMatchObject({ type: "NameError", line: 2, message: "name 'cost' is not defined" });
    // A valid interleaved order passes.
    const interleaved = '# note\nweight_kg = 3\nprint("Parcel:", weight_kg, "kg")\nrate = 4\nprint("Rate:", rate, "per kg")\ncost = weight_kg * rate\nprint("Cost:", cost)\n';
    expect((await checkNode(c2.task, interleaved)).ok).toBe(true);
    // Runs, but prints in the wrong order.
    await failsOn(c2.task, '# note\nweight_kg = 3\nrate = 4\ncost = weight_kg * rate\nprint("Cost:", cost)\nprint("Parcel:", weight_kg, "kg")\nprint("Rate:", rate, "per kg")\n', ["output"]);
    // Replaced the calculation with a number.
    await failsOn(c2.task, '# note\nweight_kg = 3\nrate = 4\ncost = 12\nprint("Parcel:", weight_kg, "kg")\nprint("Rate:", rate, "per kg")\nprint("Cost:", cost)\n', ["cost-calculated"]);
  }, SLOW);
});
