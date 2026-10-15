/**
 * Independent semantic anchors: for questions whose logic is easy to get subtly wrong, the expected
 * answer is recomputed in plain TypeScript from raw rows and compared with the reference SQL.
 * This checks the reference solutions themselves, not just that grading compares them consistently.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bankById, bankSeed } from "@/content/question-bank";
import { openSeed, type Db } from "../helpers/canonical";

type Row = unknown[];
const open: Db[] = [];
const q = (id: string) => bankById.get(id)!;
const sorted = (rows: Row[]) => rows.map((r) => JSON.stringify(r)).sort();
let dbs: Record<string, Db>;

const all = (db: Db, sql: string): Row[] => db.exec(sql)[0]?.values ?? [];
const addDays = (d: string, n: number) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);

beforeAll(async () => {
  dbs = {};
  for (const id of ["qb-0116", "qb-0118", "qb-0120", "qb-0124", "qb-0126", "qb-0127", "qb-0129", "qb-0131", "qb-0133", "qb-0134"]) {
    const db = await openSeed(bankSeed(q(id)));
    open.push(db);
    dbs[id] = db;
  }
}, 120000);
afterAll(() => open.forEach((db) => db.close()));

describe("independent semantic anchors on the canonical datasets", { timeout: 60000 }, () => {
  it("qb-0116 fills runs of missing readings with the last known value", () => {
    const db = dbs["qb-0116"];
    const raw = all(db, "SELECT reading_id, device_id, recorded_at, value FROM sensor_readings WHERE device_id BETWEEN 1 AND 10 ORDER BY device_id, recorded_at, reading_id");
    const last = new Map<number, number | null>();
    const expected = raw.map(([id, device, at, value]) => {
      if (value !== null) last.set(device as number, value as number);
      return [id, device, at, value, value ?? last.get(device as number) ?? null];
    });
    expect(raw.some((r) => r[3] === null)).toBe(true);
    expect(sorted(all(db, q("qb-0116").solution))).toEqual(sorted(expected));
  });

  it("qb-0118 merges overlapping and back-to-back medication fills", () => {
    const db = dbs["qb-0118"];
    const raw = all(db, "SELECT patient_id, medication_name, start_date, stop_date FROM medications WHERE patient_id BETWEEN 1 AND 200 ORDER BY patient_id, medication_name, start_date, medication_id") as [number, string, string, string][];
    const out: Row[] = [];
    let cur: { p: number; m: string; from: string; to: string; n: number } | null = null;
    for (const [p, m, start, stop] of raw) {
      if (cur && cur.p === p && cur.m === m && start <= addDays(cur.to, 1)) {
        if (stop > cur.to) cur.to = stop;
        cur.n++;
      } else {
        if (cur) out.push([cur.p, cur.m, cur.from, cur.to, cur.n]);
        cur = { p, m, from: start, to: stop, n: 1 };
      }
    }
    if (cur) out.push([cur.p, cur.m, cur.from, cur.to, cur.n]);
    expect(out.length).toBeLessThan(raw.length);
    expect(sorted(all(db, q("qb-0118").solution))).toEqual(sorted(out));
  });

  it("qb-0120 finds runs of three or more consecutive late legs", () => {
    const db = dbs["qb-0120"];
    const raw = all(db, "SELECT tail_number, flight_date, scheduled_departure, arrival_delay > 15 FROM flights WHERE flight_date >= '2025-01-01' AND flight_date < '2025-02-01' AND cancelled = 0 AND diverted = 0 AND tail_number IS NOT NULL ORDER BY tail_number, flight_date, scheduled_departure, flight_id");
    const out: Row[] = [];
    let run: { key: string; tail: unknown; day: unknown; first: unknown; n: number } | null = null;
    const flush = () => {
      if (run && run.n >= 3) out.push([run.tail, run.day, run.first, run.n]);
      run = null;
    };
    for (const [tail, day, dep, late] of raw) {
      const key = `${tail}|${day}`;
      if (run && run.key !== key) flush();
      if (late === 1) {
        if (run) run.n++;
        else run = { key, tail, day, first: dep, n: 1 };
      } else flush();
    }
    flush();
    expect(out.length).toBeGreaterThan(50);
    expect(sorted(all(db, q("qb-0120").solution))).toEqual(sorted(out));
  });

  it("qb-0124 relational division: a reviewer must cover every active team repository", () => {
    const db = dbs["qb-0124"];
    const repos = new Map<number, Set<number>>();
    for (const [team, repo] of all(db, "SELECT owning_team_id, repository_id FROM repositories WHERE archived_at IS NULL")) {
      repos.set(team as number, (repos.get(team as number) ?? new Set()).add(repo as number));
    }
    const reviewed = new Map<number, Set<number>>();
    for (const [dev, repo] of all(db, "SELECT DISTINCT v.reviewer_id, p.repository_id FROM reviews v JOIN pull_requests p ON p.pull_request_id = v.pull_request_id")) {
      reviewed.set(dev as number, (reviewed.get(dev as number) ?? new Set()).add(repo as number));
    }
    const expected = all(db, "SELECT developer_id, team_id FROM developers").filter(([dev, team]) => {
      const needed = repos.get(team as number);
      return !!needed && needed.size >= 2 && [...needed].every((r) => reviewed.get(dev as number)?.has(r));
    });
    expect(expected.length).toBeGreaterThan(0);
    expect(sorted(all(db, q("qb-0124").solution))).toEqual(sorted(expected));
  });

  it("qb-0126 counts direct and transitive reports", () => {
    const db = dbs["qb-0126"];
    const children = new Map<number, number[]>();
    for (const [dev, manager] of all(db, "SELECT developer_id, manager_id FROM developers WHERE manager_id IS NOT NULL")) {
      children.set(manager as number, [...(children.get(manager as number) ?? []), dev as number]);
    }
    const expected: Row[] = [];
    for (const [manager, direct] of children) {
      let total = 0;
      const stack = [...direct];
      while (stack.length) {
        const d = stack.pop()!;
        total++;
        stack.push(...(children.get(d) ?? []));
      }
      if (total >= 10) expected.push([manager, direct.length, total]);
    }
    expect(sorted(all(db, q("qb-0126").solution))).toEqual(sorted(expected));
  });

  it("qb-0127 floors negative temperatures into the bucket below zero", () => {
    const db = dbs["qb-0127"];
    const counts = new Map<number, number>();
    for (const [t] of all(db, "SELECT tmax_c FROM daily_weather WHERE tmax_c IS NOT NULL AND observation_date >= '2024-01-01' AND observation_date < '2025-01-01'")) {
      const bucket = Math.floor((t as number) / 5) * 5;
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    expect([...counts.keys()].some((b) => b < 0)).toBe(true);
    expect(sorted(all(db, q("qb-0127").solution))).toEqual(sorted([...counts].map(([b, n]) => [b === 0 ? 0 : b, n])));
  });

  it("qb-0129 returns nearest-rank percentiles", () => {
    const db = dbs["qb-0129"];
    const byAirline = new Map<string, number[]>();
    for (const [a, d] of all(db, "SELECT airline_code, arrival_delay FROM flights WHERE arrival_delay IS NOT NULL")) {
      byAirline.set(a as string, [...(byAirline.get(a as string) ?? []), d as number]);
    }
    const expected = [...byAirline].map(([a, ds]) => {
      ds.sort((x, y) => x - y);
      const at = (p: number) => ds[Math.ceil(p * ds.length) - 1];
      return [a, at(0.5), at(0.9)];
    });
    expect(sorted(all(db, q("qb-0129").solution))).toEqual(sorted(expected));
  });

  it("qb-0131 finds everyone within two review steps, at the shortest distance", () => {
    const db = dbs["qb-0131"];
    const edges = new Map<number, Set<number>>();
    for (const [src, dst] of all(db, "SELECT DISTINCT v.reviewer_id, p.author_id FROM reviews v JOIN pull_requests p ON p.pull_request_id = v.pull_request_id WHERE v.reviewer_id <> p.author_id")) {
      edges.set(src as number, (edges.get(src as number) ?? new Set()).add(dst as number));
    }
    const dist = new Map<number, number>();
    for (const a of edges.get(7) ?? []) dist.set(a, 1);
    for (const a of edges.get(7) ?? []) for (const b of edges.get(a) ?? []) if (!dist.has(b)) dist.set(b, 2);
    dist.delete(7);
    expect(dist.size).toBeGreaterThan(0);
    expect(sorted(all(db, q("qb-0131").solution))).toEqual(sorted([...dist]));
  });

  it("qb-0133 lists routes without a reverse route", () => {
    const db = dbs["qb-0133"];
    const routes = all(db, "SELECT origin, destination FROM routes") as [string, string][];
    const set = new Set(routes.map(([o, d]) => `${o}>${d}`));
    const expected = routes.filter(([o, d]) => !set.has(`${d}>${o}`));
    expect(sorted(all(db, q("qb-0133").solution))).toEqual(sorted(expected));
  });

  it("qb-0134 counts each retried request once, by its final attempt", () => {
    const db = dbs["qb-0134"];
    const raw = all(db, "SELECT merchant_id, request_key, requested_at, authorization_id, amount, status FROM authorizations") as [number, string, string, number, number, string][];
    const final = new Map<string, (typeof raw)[number]>();
    for (const r of raw) {
      const f = final.get(r[1]);
      if (!f || r[2] > f[2] || (r[2] === f[2] && r[3] > f[3])) final.set(r[1], r);
    }
    const byMerchant = new Map<number, { attempts: number; keys: Set<string>; approved: number }>();
    for (const r of raw) {
      const m = byMerchant.get(r[0]) ?? { attempts: 0, keys: new Set<string>(), approved: 0 };
      m.attempts++;
      m.keys.add(r[1]);
      if (final.get(r[1]) === r && r[5] === "approved") m.approved += r[4];
      byMerchant.set(r[0], m);
    }
    const expected = [...byMerchant].filter(([, m]) => m.attempts > m.keys.size).map(([id, m]) => [id, m.attempts, m.keys.size, m.approved]);
    const got = new Map(all(db, q("qb-0134").solution).map((r) => [r[0], r]));
    expect(got.size).toBe(expected.length);
    for (const e of expected) {
      const g = got.get(e[0])!;
      expect(g.slice(0, 3)).toEqual(e.slice(0, 3));
      expect(g[3] as number).toBeCloseTo(e[3] as number, 1);
    }
  });
});
