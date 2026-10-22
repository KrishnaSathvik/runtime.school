import { beforeAll, describe, expect, it } from "vitest";
import { bootWorker, type WorkerResponse } from "./helpers/original";
import type { PlanValidation } from "@/engine/plan-validation";

// A selective, reproducible fixture; no random data or wall-clock measurements.
const seed = `
  CREATE TABLE events(id INTEGER PRIMARY KEY, account INTEGER, amount INTEGER);
  WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<12000)
  INSERT INTO events SELECT x, x%1000, x*3 FROM n;
  CREATE TABLE other(account INTEGER);
  WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<5000)
  INSERT INTO other SELECT x FROM n;
  CREATE INDEX other_account ON other(account);
`;
const select = 'SELECT id, amount FROM events WHERE account=42 ORDER BY id';
const ddl = 'CREATE INDEX my_choice ON events(account);';
const contract: PlanValidation = {
  indexes: [{ id: 'account lookup', table: 'events', columns: ['account'] }],
  access: [{ index: 'account lookup', strategy: 'search' }],
};
let send: (request: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => { send = await bootWorker(); });

async function check(query: string, overrides: Record<string, unknown> = {}) {
  const result = await send({ seed, query, answer: ddl + select, allowWrites: true,
    ordered: true, mutation: 'INSERT INTO events VALUES(12042,42,999);',
    planValidation: contract, ...overrides });
  expect(result.error).toBeUndefined();
  return result;
}

describe('plan-aware grading in the shipped SQLite worker', () => {
  it('pins the runtime whose EQP format these assertions support', async () => {
    const r = await send({ seed: '', query: 'SELECT sqlite_version() AS version' });
    expect(r.result.values).toEqual([['3.49.1']]);
  });

  it.each([
    ddl + select,
    'CREATE INDEX "a different name" ON events(account); SELECT e.id,e.amount FROM events AS e WHERE 42=e.account ORDER BY e.id;',
    ddl + 'WITH matches AS (SELECT id,amount FROM events WHERE account IN (42)) SELECT * FROM matches ORDER BY id;',
    ddl + 'SELECT id,amount FROM events WHERE account BETWEEN 42 AND 42 ORDER BY id;',
  ])('accepts equivalent SQL and unrestricted index names: %s', async sql => {
    expect((await check(sql)).grade.ok).toBe(true);
  });

  it.each([
    select,
    'CREATE INDEX my_choice ON events(amount);' + select,
    'CREATE INDEX my_choice ON events(amount,account);' + select,
    'CREATE INDEX my_choice ON events(account) WHERE account=42;' + select,
    'CREATE INDEX my_choice ON events(abs(account));' + select,
    'CREATE INDEX my_choice ON events(account COLLATE NOCASE);' + select,
    ddl + 'DROP INDEX my_choice;' + select,
  ])('rejects missing or incorrect index definitions: %s', async sql => {
    expect((await check(sql)).grade).toMatchObject({ ok: false, planFailed: true });
  });

  it('checks correct results before accepting a good plan', async () => {
    const r = await check(ddl + select.replace('42', '43'));
    expect(r.grade.ok).toBe(false);
    expect(r.grade.planFailed).toBeUndefined();
  });

  it('rejects an index that exists but is not used by the submitted query', async () => {
    const r = await check(ddl + select.replace('FROM events', 'FROM events NOT INDEXED'));
    expect(r.grade).toMatchObject({ ok: false, planFailed: true });
    expect(r.grade.message).toBe('This task needs SQLite to jump straight to the matching rows of events using the index on events (account). Your query reads every row of events instead.');
  });

  it('does not mistake SEARCH on another table for the required access', async () => {
    const sql = ddl + 'SELECT id,amount FROM events NOT INDEXED WHERE account IN (SELECT account FROM other WHERE account=42) ORDER BY id';
    const r = await check(sql);
    expect(r.grade).toMatchObject({ ok: false, planFailed: true });
    expect(r.grade.message).toContain('reads every row of events');
  });

  it('can reject a same-table decoy search alongside an unindexed scan', async () => {
    const sql = ddl + 'SELECT id,amount FROM events NOT INDEXED WHERE account=42 AND EXISTS(SELECT 1 FROM events AS probe WHERE probe.account=42) ORDER BY id';
    expect((await check(sql, { planValidation: { ...contract, noFullScans: true } })).grade)
      .toMatchObject({ ok: false, planFailed: true });
  });

  it('rejects TEMP tables shadowing the required source table', async () => {
    const sql = ddl + 'CREATE TEMP TABLE events AS SELECT * FROM main.events; SELECT id,amount FROM events WHERE account=42 ORDER BY id';
    expect((await check(sql)).grade).toMatchObject({ ok: false, planFailed: true });
  });

  it('inspects the final output query, not an earlier decoy query', async () => {
    const r = await check(ddl + select + ';' + select.replace('FROM events', 'FROM events NOT INDEXED'));
    expect(r.grade).toMatchObject({ ok: false, planFailed: true });
  });

  it('rejects trailing DDL instead of inspecting an unrelated SELECT', async () => {
    expect((await check(ddl + select + '; CREATE TABLE decoy(x);')).grade)
      .toMatchObject({ ok: false, planFailed: true });
  });

  it('checks changed-data output even when the visible result and plan pass', async () => {
    const r = await check(ddl + select.replace('ORDER BY', 'AND id<=12000 ORDER BY'));
    expect(r.grade).toMatchObject({ ok: false, variationFailed: true });
  });

  it('revalidates index existence on changed data', async () => {
    const r = await check(select, { seed: seed + ddl,
      mutation: 'DROP INDEX my_choice; INSERT INTO events VALUES(12042,42,999);', answer: select });
    expect(r.grade).toMatchObject({ ok: false, planFailed: true, variationFailed: true });
  });

  it('revalidates access strategy when fixture selectivity changes', async () => {
    const r = await check(ddl + select, {
      mutation: 'UPDATE events SET account=42;',
    });
    expect(r.grade).toMatchObject({ ok: false, planFailed: true, variationFailed: true });
    expect(r.grade.message).toContain('reads every row of events');
  });

  it('supports index-only contracts on tiny tables without demanding SEARCH', async () => {
    const r = await check(ddl + select, { seed: 'CREATE TABLE events(id INTEGER PRIMARY KEY, account INTEGER, amount INTEGER); INSERT INTO events VALUES(1,42,3);',
      planValidation: { indexes: contract.indexes } });
    expect(r.grade.ok).toBe(true);
  });

  it('requires covering access only when explicitly requested', async () => {
    const covering: PlanValidation = { indexes: [{ id: 'cover', table: 'events', columns: ['account','amount'] }],
      access: [{ index: 'cover', strategy: 'covering-search' }] };
    expect((await check('CREATE INDEX cover ON events(account,amount);' + select, { planValidation: covering })).grade.ok).toBe(true);
    const partial = await check(ddl + select, { planValidation: { ...contract, access: [{ index: 'account lookup', strategy: 'covering-search' }] } });
    expect(partial.grade.ok).toBe(false);
    expect(partial.grade.message).toBe('This task needs SQLite to jump straight to the matching rows using the index on events (account) alone, without reading the events table. Your query uses the index but still goes back to the table for the other columns.');
  });

  it('allows useful index scans for ordered traversal and checks temporary sorts', async () => {
    const sql = 'SELECT id,account FROM events ORDER BY account,id';
    const planValidation = { ...contract, access: [{ index: 'account lookup', strategy: 'index-scan' }], noTempSort: true };
    expect((await check(ddl + sql, { answer: ddl + sql, planValidation })).grade.ok).toBe(true);
    const sorted = select.replace('ORDER BY id', 'ORDER BY amount');
    const extraSort = (await check(ddl + sorted, { answer: ddl + sorted, planValidation: { ...contract, noTempSort: true } })).grade;
    expect(extraSort).toMatchObject({ ok: false, planFailed: true });
    expect(extraSort.message).toBe('This task needs the rows to come out already in index order. Your query makes SQLite sort them in a separate step.');
  });

  it('enforces unique index requirements', async () => {
    const planValidation = { indexes: [{ id: 'id', table: 'events', columns: ['id'], unique: true }] };
    expect((await check('CREATE INDEX ids ON events(id);' + select, { planValidation })).grade.ok).toBe(false);
    expect((await check('CREATE UNIQUE INDEX ids ON events(id);' + select, { planValidation })).grade.ok).toBe(true);
  });

  it('supports read-only queries with a pre-provisioned index', async () => {
    expect((await check(select, { seed: seed + ddl, allowWrites: false, answer: select })).grade.ok).toBe(true);
  });

  it('isolates submissions and produces repeatable outcomes', async () => {
    for (let i = 0; i < 3; i++) {
      expect((await check(ddl + select)).grade.ok).toBe(true);
      expect((await check(select)).grade.ok).toBe(false);
    }
  });

  it('leaves output-only grading and Run query unchanged', async () => {
    expect((await check(select, { planValidation: null })).grade.ok).toBe(true);
    expect((await check(select, { answer: null })).grade).toBeNull();
  });
});
