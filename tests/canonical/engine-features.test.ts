/** Stateful and plan-aware grading features, exercised through canonical Practice questions. */
import { beforeAll, describe, expect, it } from "vitest";
import { bankById, bankCheckRequest, bankQuestions, bankRunRequest } from "@/content/question-bank";
import { bootWorker, type WorkerResponse } from "../helpers/original";

let send: (request: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});
const q = (id: string) => bankById.get(id)!;

describe("plan validation", () => {
  it("declares special plan restrictions only where the task teaches them", () => {
    const withTempSort = bankQuestions.filter((x) => x.planValidation?.noTempSort).map((x) => x.id);
    expect(withTempSort).toEqual(["qb-0052"]);
    expect(q("qb-0052").task).toMatch(/without a temporary sort/);
    expect(bankQuestions.every((x) => !x.planValidation?.noFullScans)).toBe(true);
  });

  it("distinguishes correct output and index structure from a failed access strategy", async () => {
    const problem = q("qb-0049");
    const r = await send(bankCheckRequest(problem, problem.solution.replace("FROM flights WHERE", "FROM flights NOT INDEXED WHERE")));
    expect(r.grade.checks.map((c: { ok: boolean }) => c.ok)).toEqual([true, true, false]);
    expect(r.grade.checks[2].label).toBe("Finds rows with the index");
  });

  it("does not claim an index or plan passed when output is wrong", async () => {
    const r = await send(bankCheckRequest(q("qb-0049"), "SELECT 1 AS wrong"));
    expect(r.grade.checks).toHaveLength(1);
    expect(r.grade.checks[0].ok).toBe(false);
  });

  it("reports both original and changed-data checks after success", async () => {
    const problem = q("qb-0049");
    const r = await send(bankCheckRequest(problem, problem.solution));
    expect(r.grade.ok).toBe(true);
    expect(r.grade.checks.every((c: { ok: boolean }) => c.ok)).toBe(true);
    expect(new Set(r.grade.checks.map((c: { fixture: string }) => c.fixture))).toEqual(new Set(["original", "changed"]));
  });

  it("an index that leaves a temporary sort is rejected", async () => {
    const problem = q("qb-0052");
    const sql = problem.solution.replace("ON tracking_events(event_type, event_at)", "ON tracking_events(event_type, package_id, event_at)");
    expect(sql).not.toBe(problem.solution);
    const r = await send(bankCheckRequest(problem, sql));
    expect(r.grade.ok).toBe(false);
  });
});

describe("stateful grading", () => {
  it("a one-shot load passes its first execution but is rejected on replay", async () => {
    const problem = q("qb-0058");
    const sql = "CREATE TABLE load_once(x);" + problem.solution;
    const first = await send({ ...bankCheckRequest(problem, sql), repeatCheck: false });
    expect(first.grade.ok).toBe(true);
    const repeat = await send(bankCheckRequest(problem, sql));
    expect(repeat.grade.ok).toBe(false);
    expect(repeat.grade.message).toMatch(/repeating the load/);
  });

  it("valid-write probes reject an overly restrictive schema and roll probes back", async () => {
    const problem = q("qb-0059");
    const sql = problem.solution.replace("capacity BETWEEN 1 AND 500)", "capacity BETWEEN 1 AND 499)");
    expect(sql).not.toBe(problem.solution);
    const r = await send(bankCheckRequest(problem, sql));
    expect(r.grade.ok).toBe(false);
    expect(r.grade.message).toMatch(/valid write was rejected/);
    const ok = await send(bankCheckRequest(problem, problem.solution));
    expect(ok.grade.ok).toBe(true);
    expect(ok.result.values).toHaveLength(2);
  });

  it("invalid-write probes reject a schema that is too permissive", async () => {
    const problem = q("qb-0059");
    const r = await send(bankCheckRequest(problem, problem.solution.replace(", UNIQUE (warehouse_id, slot_date)", "")));
    expect(r.grade.ok).toBe(false);
    expect(r.grade.message).toMatch(/invalid write succeeded/);
  });

  it("detects hidden state corruption on replay even when both displayed outputs match", async () => {
    const r = await send({ seed: "CREATE TABLE counter(n); INSERT INTO counter VALUES(0);", query: "UPDATE counter SET n=n+1; SELECT 1 AS visible;", answer: "UPDATE counter SET n=1; SELECT 1 AS visible;", allowWrites: true, repeatCheck: true, stateQueries: ["SELECT * FROM counter"] });
    expect(r.grade.ok).toBe(false);
    expect(r.grade.message).toMatch(/Repeated execution/);
  });
});

describe("fixtures and wrong answers", () => {
  it("Run and Check use the same per-question overlay without leaking it into other questions", async () => {
    for (const id of ["qb-0058", "qb-0072"]) expect(bankRunRequest(q(id), "SELECT 1").seed).toBe(bankCheckRequest(q(id), "SELECT 1").seed);
    const rows = await send(bankRunRequest(q("qb-0058"), "SELECT COUNT(*) > 0 AS loaded FROM partner_feed"));
    expect(rows.result.values).toEqual([[1]]);
    const other = await send(bankRunRequest(q("qb-0057"), "SELECT COUNT(*) FROM partner_feed"));
    expect(other.error).toMatch(/no such table/);
  });

  it.each(bankQuestions.flatMap((p) => p.wrong.map((w) => [p.id, w.mistake, p, w.sql] as const)))("%s wrong approach is valid SQL that fails grading: %s", async (_id, _why, problem, sql) => {
    const r = await send(bankCheckRequest(problem, sql));
    expect(r.error).toBeUndefined();
    expect(r.grade?.ok).toBe(false);
  }, 30000);
});
