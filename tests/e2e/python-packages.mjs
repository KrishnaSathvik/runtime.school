// Data libraries (NumPy, pandas, matplotlib, DuckDB, pyspark via DuckDB, scikit-learn) in real Pyodide 314.0.7.
// Usage: npm run dev -- -p 3041 & BASE=http://localhost:3041 node tests/e2e/python-packages.mjs
// Optional: BROWSERS=chromium,firefox,webkit (default all three).
import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";

const BASE = process.env.BASE ?? "http://localhost:3041";
const ENGINES = { chromium, firefox, webkit };
const BROWSERS = (process.env.BROWSERS ?? "chromium,firefox,webkit").split(",");
const results = [];

async function test(name, fn) {
  const t = Date.now();
  try {
    const note = await fn();
    results.push(`✓ ${name} (${Date.now() - t} ms)${note ? ` — ${note}` : ""}`);
  } catch (err) {
    results.push(`✕ ${name}\n    ${String(err?.message ?? err).split("\n").slice(0, 8).join("\n    ")}`);
    process.exitCode = 1;
  }
}

/** Runs through the real client (window.__runtimePython, exposed by /python/runtime). */
const py = (page, code, packages) =>
  page.evaluate(
    async ([code, packages]) => {
      const r = await window.__runtimePython.runPython(code, { packages, timeoutMs: 20000 });
      return { ...r, output: r.output?.map((c) => ({ stream: c.stream, text: c.stream === "figure" ? c.text.slice(0, 40) : c.text })) };
    },
    [code, packages],
  );

const ok = (r) => assert.equal(r.status, "ok", JSON.stringify(r).slice(0, 600));

for (const name of BROWSERS) {
  const browser = await ENGINES[name].launch();
  results.push(`\n[${name}]`);
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(`${BASE}/python/runtime`);
  await page.waitForFunction(() => window.__runtimePython, null, { timeout: 60000 });
  try {
    await test("core Python requests no library wheels", async () => {
      ok(await py(page, "print(1)", []));
      assert.deepEqual(requests.filter((u) => u.endsWith(".whl")), []);
    });

    await test("NumPy and pandas: real results, cold then warm", async () => {
      const code = `import numpy as np, pandas as pd
df = pd.DataFrame({"customer": ["a", "b", "a"], "amount": [10.0, 5.5, None]})
print(np.__version__, pd.__version__)
print(df.groupby("customer")["amount"].sum().to_dict(), float(np.arange(4).mean()))`;
      let t = Date.now();
      const cold = await py(page, code, ["numpy", "pandas"]);
      const coldMs = Date.now() - t;
      ok(cold);
      assert.equal(cold.stdout, "2.4.6 3.0.2\n{'a': 10.0, 'b': 5.5} 1.5\n");
      // The spare interpreter warmed with the same libraries in the background.
      await page.waitForTimeout(8000);
      t = Date.now();
      ok(await py(page, code, ["numpy", "pandas"]));
      const warmMs = Date.now() - t;
      const wheels = requests.filter((u) => u.endsWith(".whl"));
      assert.ok(wheels.length > 0 && wheels.every((u) => u.startsWith(`${BASE}/vendor/pyodide/314.0.7/`)), "wheels are same-origin");
      return `cold ${coldMs} ms, warm ${warmMs} ms`;
    });

    await test("each run still gets a fresh interpreter with libraries loaded", async () => {
      ok(await py(page, "import pandas as pd\npd.leftover = 1", ["pandas"]));
      const r = await py(page, "import pandas as pd\nprint(hasattr(pd, 'leftover'))", ["pandas"]);
      ok(r);
      assert.equal(r.stdout, "False\n");
    });

    await test("matplotlib: plt.show() and open figures come back as PNGs in output order, no warnings", async () => {
      const r = await py(
        page,
        `import matplotlib.pyplot as plt
print("before")
plt.bar(["Jan", "Feb"], [3, 5]); plt.title("Sales")
plt.show()
print("after")
fig, ax = plt.subplots(); ax.plot([1, 2, 3])`,
        ["matplotlib"],
      );
      ok(r);
      assert.deepEqual(r.output.map((c) => c.stream), ["stdout", "figure", "stdout", "figure"]);
      assert.ok(r.output.filter((c) => c.stream === "figure").every((c) => c.text.startsWith("data:image/png;base64,iVBOR")));
      assert.equal(r.stderr, "");
    });

    await test("pandas .plot() draws through matplotlib", async () => {
      const r = await py(page, `import pandas as pd\npd.DataFrame({"x": [1, 2, 3]}).plot()`, ["pandas", "matplotlib"]);
      ok(r);
      assert.equal(r.output.filter((c) => c.stream === "figure").length, 1);
    });

    await test("DuckDB: SQL over a pandas DataFrame", async () => {
      const r = await py(
        page,
        `import duckdb, pandas as pd\norders = pd.DataFrame({"c": ["a", "b", "a"], "v": [1, 2, 3]})\nprint(duckdb.sql("select c, sum(v) from orders group by c order by c").fetchall())`,
        ["duckdb", "pandas"],
      );
      ok(r);
      assert.equal(r.stdout, "[('a', 4), ('b', 2)]\n");
    });

    await test("pyspark (DuckDB's Spark API): SparkSession, filter, withColumn, groupBy", async () => {
      const r = await py(
        page,
        `from pyspark.sql import SparkSession
from pyspark.sql import functions as F
spark = SparkSession.builder.appName("orders").getOrCreate()
df = spark.createDataFrame([("a", 10), ("b", 5), ("a", 7)], ["customer", "amount"])
big = df.filter(F.col("amount") > 6).withColumn("double", F.col("amount") * 2)
print(sorted(tuple(r) for r in big.collect()))
print(sorted(tuple(r) for r in df.groupBy("customer").agg(F.sum("amount").alias("total")).collect()))`,
        ["pyspark"],
      );
      ok(r);
      assert.equal(r.stdout, "[('a', 7, 14), ('a', 10, 20)]\n[('a', 17), ('b', 5)]\n");
    });

    await test("scikit-learn: fit a linear model", async () => {
      const r = await py(
        page,
        `from sklearn.linear_model import LinearRegression\nm = LinearRegression().fit([[1], [2], [3]], [2, 4, 6])\nprint(round(float(m.coef_[0]), 6), round(float(m.predict([[4]])[0]), 6))`,
        ["scikit-learn"],
      );
      ok(r);
      assert.equal(r.stdout, "2.0 8.0\n");
    });

    await test("recovery: a timeout and a Stop with pandas loaded, then pandas runs again", async () => {
      const loop = await page.evaluate(() =>
        window.__runtimePython.runPython("import pandas as pd\nprint('started', flush=True)\nwhile True:\n    pass", { packages: ["pandas"], timeoutMs: 3000 }),
      );
      assert.equal(loop.status, "timeout");
      assert.equal(loop.stdout, "started\n");
      const stopped = await page.evaluate(async () => {
        const p = window.__runtimePython.runPython("while True:\n    pass", { packages: ["pandas"], timeoutMs: 60000 });
        await new Promise((r) => setTimeout(r, 1500));
        window.__runtimePython.stopPython();
        return p;
      });
      assert.equal(stopped.status, "stopped");
      const r = await py(page, "import pandas as pd\nprint(pd.Series([1, 2]).sum())", ["pandas"]);
      ok(r);
      assert.equal(r.stdout, "3\n");
    });

    await test("libraries that weren't requested can't be imported", async () => {
      const r = await py(page, "import pandas", []);
      assert.equal(r.status, "runtime-error");
      assert.equal(r.error.type, "ModuleNotFoundError");
    });
  } finally {
    await context.close();
    await browser.close();
  }
}

console.log(results.join("\n"));
