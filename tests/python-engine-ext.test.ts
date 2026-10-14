// The runner extensions content relies on: fixture files, files the program writes, re-running with other
// input values, expression checks, expected exceptions, numpy scalars and display() tables. Real Pyodide.
import { describe, expect, it } from "vitest";
import { py } from "@/engine/python/values";
import type { PyTask } from "@/engine/python/grading";
import { checkFast, runFast } from "./helpers/python-fast";

const SLOW = 240000;

describe("python runner extensions", () => {
  it("fixture files are readable, and files the program writes come back", async () => {
    const r = await runFast('with open("data/in.csv") as f:\n    rows = f.read().splitlines()\nprint(len(rows))\nwith open("out.txt", "w") as f:\n    f.write("done\\n")\n', { files: { "data/in.csv": "a,b\n1,2\n" } });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.stdout).toBe("2\n");
    expect(r.files).toEqual([{ path: "out.txt", text: "done\n" }]);
    // The next run starts with an empty folder.
    const again = await runFast('import os\nprint(sorted(os.listdir(".")))');
    expect("stdout" in again && again.stdout).toBe("[]\n");
  }, SLOW);

  it("fixture modules import like files next to main.py, and are forgotten after the run", async () => {
    const r = await runFast("import pricing\nprint(pricing.TAX)", { files: { "pricing.py": "TAX = 0.2\n" } });
    expect("stdout" in r && r.stdout).toBe("0.2\n");
    const r2 = await runFast("import pricing\nprint(pricing.TAX)", { files: { "pricing.py": "TAX = 0.5\n" } });
    expect("stdout" in r2 && r2.stdout).toBe("0.5\n");
  }, SLOW);

  it("variant checks re-run the program with other inputs", async () => {
    const task: PyTask = {
      checks: [
        { kind: "variant", id: "warm", set: { temp: py.int(31) }, output: "hot\n" },
        { kind: "variant", id: "cold", set: { temp: py.int(5) }, output: "cold\n", vars: { label: py.str("cold") }, hidden: true },
      ],
    };
    const good = 'temp = 18\nlabel = "hot" if temp > 25 else "cold"\nprint(label)\n';
    expect((await checkFast(task, good)).ok).toBe(true);
    const fixed = await checkFast(task, 'temp = 18\nprint("cold")\n');
    expect(fixed.checks.map((c) => c.status)).toEqual(["fail", "fail"]);
    expect(fixed.checks[0].detail).toBe('With temp = 31: line 1: expected "hot", but your program printed "cold".');
    const gone = await checkFast(task, 'label = "hot"\nprint(label)\n');
    expect(gone.checks[0].category).toBe("missing-input");
  }, SLOW);

  it("expr checks and expected exceptions", async () => {
    const task: PyTask = {
      checks: [
        { kind: "expr", id: "e1", label: "area(2, 3) is 6", expr: "area(2, 3)", show: "area(2, 3)", expected: py.int(6) },
        { kind: "expr", id: "e2", label: "rejects negatives", expr: "area(-1, 3)", raises: "ValueError" },
        { kind: "function", id: "f", name: "area", cases: [{ args: [py.int(1), py.int(1)], expected: py.int(1) }, { args: [py.int(-1), py.int(1)], raises: "ValueError", hidden: true }] },
      ],
    };
    const good = "def area(w, h):\n    if w < 0 or h < 0:\n        raise ValueError('negative')\n    return w * h\n";
    expect((await checkFast(task, good)).ok).toBe(true);
    const bad = await checkFast(task, "def area(w, h):\n    return w * h\n");
    expect(bad.checks.map((c) => c.status)).toEqual(["pass", "fail", "fail"]);
    expect(bad.checks[1].category).toBe("wrong-exception");
  }, SLOW);

  it("numpy scalars compare as Python numbers; display() sends a table", async () => {
    const task: PyTask = { packages: ["numpy"], checks: [{ kind: "variable", name: "m", expected: py.float(2) }, { kind: "expr", label: "shape", expr: "a.shape", expected: py.tuple(py.int(3)) }] };
    expect((await checkFast(task, "import numpy as np\na = np.array([1, 2, 3])\nm = a.mean()\n")).ok).toBe(true);
    const t = await runFast('import pandas as pd\ndf = pd.DataFrame({"a": [1, None], "b": ["x", "y"]})\ndisplay(df)\nprint("after")', { packages: ["pandas"] });
    expect(t.status).toBe("ok");
    if (t.status !== "ok") return;
    expect(t.output.map((c) => c.stream)).toEqual(["table", "stdout"]);
    expect(JSON.parse(t.output[0].text)).toMatchObject({ columns: ["a", "b"], rows: [["0", "1.0", "x"], ["1", null, "y"]], shape: [2, 2] });
    const rec = await checkFast({ packages: ["pandas"], checks: [{ kind: "expr", label: "rows", expr: "_records(df)", expected: py.list(py.dict([[py.str("a"), py.float(1)]]), py.dict([[py.str("a"), py.none]])) }] }, 'import pandas as pd\ndf = pd.DataFrame({"a": [1, None]})\n');
    expect(rec.ok, JSON.stringify(rec.checks)).toBe(true);
  }, SLOW);

  it("an endless loop times out instead of hanging", async () => {
    const r = await runFast("n = 0\nwhile True:\n    n += 1\n", { timeoutS: 1 });
    expect(r.status).toBe("timeout");
    const c = await checkFast({ checks: [{ kind: "variant", set: { n: py.int(1) }, output: "" }] }, "n = 0\nprint(n)\n");
    expect(c.ok).toBe(false);
  }, SLOW);
});
