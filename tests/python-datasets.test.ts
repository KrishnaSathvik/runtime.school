import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildPythonDataset } from "../datasets/python/build.mjs";
import { generateMarket } from "../datasets/python/R01/generate.mjs";

type Row = Record<string, string | number | boolean | null>;
type Market = Record<"customers" | "sellers" | "products" | "orders" | "order_items" | "payments" | "reviews", Row[]>;
type FileEntry = { path: string; table: string; layer: string; rows: number; bytes: number; sha256: string };
type Edition = { ref: string; files?: FileEntry[]; quality?: { id: string; count: number }[]; onDemand?: boolean };

let built: { manifest: { version: number; editions: Record<string, Edition> }; files: { rel: string; data: string }[] };
let m: Market;
beforeAll(async () => {
  built = (await buildPythonDataset("R01")) as unknown as typeof built;
  m = generateMarket() as unknown as Market;
}, 30_000); // Boots Pyodide and builds R01: ~5 s alone, past the 10 s hook default under a parallel run.

const rowsOf = (edition: string, table: string, layer = "clean") => built.manifest.editions[edition].files!.find((f) => f.table === table && f.layer === layer)!.rows;
const fileText = (edition: string, rel: string) => built.files.find((f) => f.rel === `R01/${edition}.1/${rel}`)!.data;

describe("R01 Runtime Market build", () => {
  it("is reproducible: a fresh build equals the committed manifest", () => {
    const committed = readFileSync("src/content/python-v2/datasets/R01.json", "utf8");
    expect(JSON.stringify(built.manifest, null, 1) + "\n").toBe(committed);
  });

  it("sizes each edition as the plan says", () => {
    for (const t of ["customers", "sellers", "products", "orders", "order_items", "payments", "reviews"]) expect(rowsOf("preview", t)).toBeLessThanOrEqual(25);
    expect(rowsOf("starter", "orders")).toBeGreaterThanOrEqual(100);
    expect(rowsOf("starter", "orders")).toBeLessThanOrEqual(500);
    expect(rowsOf("standard", "order_items")).toBeGreaterThanOrEqual(5000);
    expect(rowsOf("standard", "order_items")).toBeLessThanOrEqual(25000);
    expect(rowsOf("full", "orders")).toBe(m.orders.length);
    expect(built.manifest.editions.stress.onDemand).toBe(true);
  });

  it("documents every raw problem with a real, nonzero count", () => {
    for (const e of ["starter", "standard", "full"]) {
      for (const q of built.manifest.editions[e].quality!) expect(q.count, `${e} ${q.id}`).toBeGreaterThan(0);
    }
    // The documented count matches what's actually in the file.
    const raw = fileText("starter", "raw/order_items.csv");
    const dollars = raw.split("\n").filter((l) => /,\$\d/.test(l)).length;
    expect(dollars).toBe(built.manifest.editions.starter.quality!.find((q) => q.id === "currency-text")!.count);
    // The clean layer has none of them.
    expect(fileText("starter", "order_items.csv")).not.toMatch(/\$/);
  });
});

describe("R01 reads like real data", () => {
  const month = (o: Row) => String(o.ordered_at).slice(5, 7);

  it("is seasonal, with holiday peaks and growth", () => {
    const by = (y: string, mm: string) => m.orders.filter((o) => String(o.ordered_at).startsWith(`${y}-${mm}`)).length;
    expect(by("2024", "11")).toBeGreaterThan(by("2024", "02") * 1.8);
    expect(by("2025", "12")).toBeGreaterThan(by("2025", "06"));
    expect(by("2025", "06")).toBeGreaterThan(by("2024", "06"));
    const perDay: Record<string, number> = {};
    for (const o of m.orders) perDay[String(o.ordered_at).slice(0, 10)] = (perDay[String(o.ordered_at).slice(0, 10)] ?? 0) + 1;
    const busiest = Object.entries(perDay).sort((a, b) => b[1] - a[1])[0][0];
    expect(["2024-11-29", "2025-11-28"]).toContain(busiest); // Black Friday
    expect(new Set(m.orders.map(month)).size).toBe(12);
  });

  it("has repeat buyers and a long tail of spend", () => {
    const spend: Record<string, number> = {}, count: Record<string, number> = {};
    for (const o of m.orders) {
      spend[o.customer_id as string] = (spend[o.customer_id as string] ?? 0) + (o.total as number);
      count[o.customer_id as string] = (count[o.customer_id as string] ?? 0) + 1;
    }
    const s = Object.values(spend).sort((a, b) => b - a);
    const share = s.slice(0, Math.round(s.length * 0.2)).reduce((a, b) => a + b, 0) / s.reduce((a, b) => a + b, 0);
    expect(share).toBeGreaterThan(0.5);
    expect(share).toBeLessThan(0.8);
    const oneTime = Object.values(count).filter((n) => n === 1).length / s.length;
    expect(oneTime).toBeGreaterThan(0.35);
    expect(oneTime).toBeLessThan(0.65);
    expect(m.customers.length).toBeGreaterThan(s.length); // some customers never order
    const totals = m.orders.map((o) => o.total as number).sort((a, b) => a - b);
    const median = totals[totals.length >> 1], mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    expect(mean).toBeGreaterThan(median); // right-skewed
  });

  it("keeps the books consistent", () => {
    const lines: Record<string, number> = {};
    for (const l of m.order_items) lines[l.order_id as string] = (lines[l.order_id as string] ?? 0) + (l.line_total as number);
    const net: Record<string, number> = {};
    for (const p of m.payments) if (p.status === "captured" || p.status === "refunded") net[p.order_id as string] = (net[p.order_id as string] ?? 0) + (p.amount as number);
    for (const o of m.orders) {
      expect(Math.abs((lines[o.order_id as string] ?? 0) - (o.subtotal as number))).toBeLessThan(0.02);
      expect(Math.abs((o.subtotal as number) + (o.shipping_fee as number) + (o.tax as number) - (o.total as number))).toBeLessThan(0.011);
      if (o.status === "delivered" || o.status === "shipped") expect(Math.abs((net[o.order_id as string] ?? 0) - (o.total as number))).toBeLessThan(0.011);
      if (o.status === "cancelled") expect(Math.abs(net[o.order_id as string] ?? 0)).toBeLessThan(0.011);
    }
  });

  it("respects time: nothing happens before it could", () => {
    const signup = new Map(m.customers.map((c) => [c.customer_id, String(c.signup_at)]));
    const product = new Map(m.products.map((p) => [p.product_id, p]));
    const orderAt = new Map(m.orders.map((o) => [o.order_id, String(o.ordered_at)]));
    for (const o of m.orders) expect(String(o.ordered_at) >= signup.get(o.customer_id)!).toBe(true);
    for (const l of m.order_items) {
      const p = product.get(l.product_id)!;
      const at = orderAt.get(l.order_id)!.slice(0, 10);
      expect(at >= String(p.launched_on)).toBe(true);
      if (p.discontinued_on) expect(at < String(p.discontinued_on)).toBe(true);
    }
    const delivered = new Map(m.orders.map((o) => [o.order_id, o.delivered_at]));
    for (const r of m.reviews) expect(String(r.created_at) > String(delivered.get(r.order_id))).toBe(true);
  });

  it("rates late deliveries lower", () => {
    const late = new Map(m.orders.map((o) => [o.order_id, o.delivered_at !== null && String(o.delivered_at).slice(0, 10) > String(o.estimated_delivery)]));
    const avg = (rs: Row[]) => rs.reduce((a, r) => a + (r.rating as number), 0) / rs.length;
    const onTime = m.reviews.filter((r) => !late.get(r.order_id));
    const lateR = m.reviews.filter((r) => late.get(r.order_id));
    expect(lateR.length).toBeGreaterThan(50);
    expect(avg(onTime) - avg(lateR)).toBeGreaterThan(0.4);
    expect(avg(m.reviews)).toBeGreaterThan(3.8);
    expect(avg(m.reviews)).toBeLessThan(4.4);
  });
});

describe("D07 NOAA daily weather build", () => {
  let d07: { manifest: { editions: Record<string, Edition & { profile?: Record<string, Record<string, { nulls: number }>> }> } };
  beforeAll(async () => {
    d07 = (await buildPythonDataset("D07")) as unknown as typeof d07;
  }, 30_000); // A whole dataset build in Pyodide, like R01's above.
  it("is reproducible from the committed SQL extract", () => {
    expect(JSON.stringify(d07.manifest, null, 1) + "\n").toBe(readFileSync("src/content/python-v2/datasets/D07.json", "utf8"));
  });
  it("sizes editions as the plan says and keeps whole station histories", () => {
    const rows = (e: string, t: string) => d07.manifest.editions[e].files!.find((f) => f.table === t)!.rows;
    expect(rows("preview", "daily_weather")).toBeLessThanOrEqual(25);
    expect(rows("starter", "daily_weather")).toBeGreaterThanOrEqual(100);
    expect(rows("starter", "daily_weather")).toBeLessThanOrEqual(500);
    expect(rows("standard", "daily_weather")).toBeGreaterThanOrEqual(5000);
    expect(rows("full", "daily_weather")).toBe(109214);
    expect(d07.manifest.editions.stress).toBeUndefined();
  });
  it("adds nothing: no raw export, and real gaps stay real", () => {
    expect(d07.manifest.editions.full.files!.every((f) => f.layer === "clean")).toBe(true);
    expect(d07.manifest.editions.full.profile!.daily_weather.snowfall_mm.nulls).toBeGreaterThan(1000);
  });
});
