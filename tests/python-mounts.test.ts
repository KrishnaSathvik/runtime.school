// Dataset mounts in real Pyodide, through the worker's own harness (tests/helpers/python-node.ts).
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { runNode } from "./helpers/python-node";

const manifest = JSON.parse(readFileSync("src/content/python-v2/datasets/R01.json", "utf8"));
const starter = manifest.editions.starter.files as { path: string; rows: number }[];
const file = (rel: string) => new Uint8Array(readFileSync(`public/datasets/python/R01/starter.1/${rel}`));

describe("dataset mounts in real Python", () => {
  it("reads a mounted edition and never lists it as program output", async () => {
    const code = [
      "import csv",
      "with open('data/orders.csv', newline='') as f:",
      "    rows = list(csv.DictReader(f))",
      "print(len(rows), rows[0]['order_id'])",
      "with open('summary.txt', 'w') as f:",
      "    f.write(str(len(rows)))",
    ].join("\n");
    const r = await runNode(code, { mounts: [{ path: "data/orders.csv", bytes: file("orders.csv") }] });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const rows = starter.find((f) => f.path === "orders.csv")!.rows;
    expect(r.stdout.split(" ")[0]).toBe(String(rows));
    expect(r.files?.map((f) => f.path)).toEqual(["summary.txt"]);
  }, 60000);

  it("mounts binary files byte for byte", async () => {
    const gz = gzipSync(Buffer.from("event,count\nclick,3\n"));
    const code = "import gzip\nprint(gzip.open('data/events.csv.gz', 'rt').read(), end='')";
    const r = await runNode(code, { mounts: [{ path: "data/events.csv.gz", bytes: new Uint8Array(gz) }] });
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.stdout).toBe("event,count\nclick,3\n");
  }, 60000);

  it("gives the raw export its documented problems", async () => {
    const code = [
      "import csv",
      "rows = list(csv.DictReader(open('data/raw/order_items.csv', newline='')))",
      "print(sum(r['unit_price'].startswith('$') for r in rows))",
    ].join("\n");
    const r = await runNode(code, { mounts: [{ path: "data/raw/order_items.csv", bytes: file("raw/order_items.csv") }] });
    const expected = manifest.editions.starter.quality.find((q: { id: string }) => q.id === "currency-text").count;
    expect(r.status === "ok" && r.stdout.trim()).toBe(String(expected));
  }, 60000);
});
