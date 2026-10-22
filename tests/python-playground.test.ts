// The Playground workspace: every starter runs as written, with exactly the dataset files and libraries the
// Playground infers from its code (filesNeeded, packagesFor), and the workspace helpers behave.
import { describe, expect, it } from "vitest";
import { STARTERS } from "@/content/python-v2/tools/starters";
import { allFiles, toolDataset } from "@/content/python-v2/tools/friendly";
import { missingModule, packagesFor } from "@/features/python/handoff";
import { execFileSync } from "node:child_process";
import { blankWorkspace, filesNeeded, nameProblem, programCode, readsInput, stdinFor } from "@/features/python/workspace";
import { runFast } from "./helpers/python-fast";

describe("starters", () => {
  it("has distinct ids and at least 15 starters across every group", () => {
    expect(new Set(STARTERS.map((s) => s.id)).size).toBe(STARTERS.length);
    expect(STARTERS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(STARTERS.map((s) => s.group)).size).toBe(5);
    for (const s of STARTERS) {
      expect(s.files[0].name).toBe("main.py");
      if (s.dataset) expect(toolDataset(s.dataset), s.id).toBeTruthy();
    }
  });

  for (const s of STARTERS) {
    it(`${s.id} runs and prints something`, async () => {
      const [main, ...rest] = s.files;
      const all = s.files.map((f) => f.code).join("\n");
      const d = s.dataset ? toolDataset(s.dataset)! : null;
      const files = d ? filesNeeded(all, allFiles(d, "starter")) : [];
      if (d) expect(files.length, `${s.id} mounts nothing`).toBeGreaterThan(0);
      const r = await runFast(main.code, {
        packages: packagesFor(all),
        files: Object.fromEntries(rest.map((f) => [f.name, f.code])),
        mounts: files.map((f) => ({ path: `data/${f.path}`, url: f.url, sha256: f.sha256 })),
        timeoutS: 90,
      });
      expect(r.status, JSON.stringify(r).slice(0, 1500)).toBe("ok");
      if (r.status === "ok") expect(r.output.length).toBeGreaterThan(0);
    }, 240_000);
  }
});

describe("workspace helpers", () => {
  const files = allFiles(toolDataset("D11")!, "starter");
  it("mounts only what the code names", () => {
    expect(filesNeeded("print('hi')", files)).toEqual([]);
    expect(filesNeeded('open("data/events.csv")', files).map((f) => f.path)).toEqual(["events.csv"]);
    expect(filesNeeded('Path("data/events").glob("*.jsonl")', files).length).toBe(24);
    expect(filesNeeded('glob.glob("data/events/2025-03-03-0*.jsonl")', files).length).toBe(10);
    expect(filesNeeded('os.listdir("data")', files).length).toBe(files.filter((f) => f.layer === "clean").length);
  });
  it("infers from the running file and the modules it imports only", () => {
    const ws = { ...blankWorkspace(), files: [
      { name: "main.py", code: "import pandas as pd" },
      { name: "app.py", code: "from tools import f\nimport json" },
      { name: "tools.py", code: "import numpy as np" },
    ] };
    expect(packagesFor(programCode(ws, "app.py"))).toEqual(["numpy"]);
    expect(packagesFor(programCode(ws, "main.py"))).toEqual(["pandas"]);
  });
  it("ships a worker that parses", () => {
    execFileSync("node", ["--check", "public/vendor/python-worker.mjs"]);
  });
  it("checks new file names", () => {
    const ws = blankWorkspace();
    expect(nameProblem("helpers.py", ws)).toBeNull();
    expect(nameProblem("main.py", ws)).toMatch(/already/);
    expect(nameProblem("my file.py", ws)).toMatch(/letters/);
    expect(nameProblem("pandas.py", ws)).toMatch(/hide/);
    expect(nameProblem("main.py", ws, "main.py")).toBeNull();
  });
  it("infers libraries from imports", () => {
    expect(packagesFor("import polars as pl\ndf.to_pandas()")).toEqual(["polars", "pyarrow"]);
    expect(packagesFor("import pandas as pd\npd.read_parquet('x')")).toEqual(["pandas", "pyarrow"]);
    expect(packagesFor("from zoneinfo import ZoneInfo")).toEqual(["tzdata"]);
    expect(packagesFor("import json")).toEqual([]);
    expect(packagesFor("import duckdb\nduckdb.sql('select 1').df()")).toEqual(["duckdb", "pandas"]);
  });
  it("names a module that isn't available", async () => {
    const r = await runFast("import requests\n");
    expect(missingModule(r as never)).toBe("requests");
  });
});

describe("program input (stdin)", () => {
  it("shows the box only for programs that read input", () => {
    expect(readsInput('name = input("Name: ")')).toBe(true);
    expect(readsInput("n = int(input())")).toBe(true);
    expect(readsInput("import sys\ndata = sys.stdin.read()")).toBe(true);
    expect(readsInput("from sys import stdin")).toBe(true);
    expect(readsInput('print("hi")')).toBe(false);
    expect(readsInput("x = my_input(3)\nself.input(1)")).toBe(false);
  });
  it("sends one typed line per input() call", () => {
    expect(stdinFor(undefined)).toBe("");
    expect(stdinFor("")).toBe("");
    expect(stdinFor("Ada")).toBe("Ada\n");
    expect(stdinFor("2\n40\n")).toBe("2\n40\n");
  });
  it("reads lines in order, and raises EOFError when they run out", async () => {
    const ok = await runFast('a = int(input("a? "))\nb = int(input("b? "))\nprint(a + b)\n', { stdin: stdinFor("2\n40") });
    expect(ok.status).toBe("ok");
    if (ok.status === "ok") expect(ok.stdout).toBe("a? b? 42\n");
    const short = await runFast('a = input("A: ")\nb = input("B: ")\n', { stdin: stdinFor("only") });
    expect(short.status).toBe("runtime-error");
    if (short.status === "runtime-error") expect([short.error.type, short.error.line]).toEqual(["EOFError", 2]);
    const none = await runFast('input("Name: ")\n', { stdin: stdinFor("") });
    expect(none.status === "runtime-error" && none.error.type).toBe("EOFError");
  });
});
