// Database Lab, for real: every prepared environment is built from its dataset by the same import program the
// browser runs, and every activity runs on a fresh copy of each environment it lists, with the libraries the
// Playground would infer. Activities that change data must leave a database SQLite can still open.
import { describe, expect, it } from "vitest";
import { mountsFor, pyManifests } from "@/content/python-v2/datasets";
import { LAB_ACTIVITIES, LAB_ENVIRONMENTS, LAB_SCRATCH, activitiesFor, activityCode, activityEnvs, labEnv } from "@/content/python-v2/tools/lab";
import { importProgram } from "@/engine/python/lab-db";
import { packagesFor } from "@/features/python/handoff";
import { mountBytes, runFast } from "./helpers/python-fast";

const T = 240_000;
const built = new Map<string, Uint8Array>();

async function build(envId: string): Promise<Uint8Array> {
  if (envId === "scratch") return new Uint8Array(0);
  if (built.has(envId)) return built.get(envId)!;
  const env = labEnv(envId)!;
  const m = pyManifests[env.dataset];
  const program = importProgram(env.db, Object.entries(m.tables).map(([name, t]) => ({ name, ...t })));
  const r = await runFast(program, { mounts: mountsFor(m.editions[env.size].ref), collect: [".db"], timeoutS: 120 });
  expect(r.status, JSON.stringify(r).slice(0, 800)).toBe("ok");
  const db = (r as { blobs?: { path: string; bytes: ArrayBuffer }[] }).blobs?.find((b) => b.path === env.db);
  expect(db, `${env.db} not written`).toBeTruthy();
  const bytes = new Uint8Array(db!.bytes);
  built.set(envId, bytes);
  return bytes;
}

describe("Database Lab content", () => {
  it("has distinct ids and enough activities in every group", () => {
    expect(new Set(LAB_ACTIVITIES.map((a) => a.id)).size).toBe(LAB_ACTIVITIES.length);
    expect(LAB_ACTIVITIES.length).toBeGreaterThanOrEqual(18);
    for (const e of LAB_ENVIRONMENTS) expect(activitiesFor(e.id).length, e.id).toBeGreaterThanOrEqual(4);
    // Every dataset with clean tables has an environment, and every environment opens on the beginner activity.
    expect(new Set(LAB_ENVIRONMENTS.map((e) => e.dataset)).size).toBe(LAB_ENVIRONMENTS.length);
    for (const e of LAB_ENVIRONMENTS) expect(activitiesFor(e.id)[0].id, e.id).toBe("first-query");
    expect(activitiesFor("scratch").length).toBeGreaterThanOrEqual(3);
  });

  for (const e of LAB_ENVIRONMENTS) {
    it(`builds ${e.name} with every table`, async () => {
      const bytes = await build(e.id);
      const r = await runFast(`import sqlite3\nconn = sqlite3.connect("${e.db}")\nprint(sorted(r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")))\n`, { blobs: [{ path: e.db, bytes }] });
      expect(r.status === "ok" && r.stdout.trim()).toBe(JSON.stringify(Object.keys(pyManifests[e.dataset].tables).sort()).replace(/"/g, "'").replace(/,/g, ", "));
    }, T);
  }

  for (const a of LAB_ACTIVITIES) {
    const envs = activityEnvs(a);
    for (const envId of envs) {
      it(`${a.id} on ${envId}`, async () => {
        const env = envId === "scratch" ? LAB_SCRATCH : labEnv(envId)!;
        const code = activityCode(a, { db: env.db, start: "start" in env ? env.start : undefined });
        const bytes = await build(envId);
        const mounts = a.data ? mountsFor(pyManifests[a.data.dataset].editions[a.data.size].ref, a.data.files) : [];
        mounts.forEach(mountBytes);
        const r = await runFast(code, { packages: packagesFor(code), blobs: [{ path: env.db, bytes }], mounts, collect: [".db"], timeoutS: 120 });
        expect(r.status, JSON.stringify(r).slice(0, 1500)).toBe("ok");
        if (r.status !== "ok") return;
        expect(r.output.length).toBeGreaterThan(0);
        expect(r.stderr).toBe("");
        // The database is still a database afterwards.
        const after = (r as { blobs?: { path: string; bytes: ArrayBuffer }[] }).blobs?.find((b) => b.path === env.db);
        if (after && after.bytes.byteLength) {
          const check = await runFast(`import sqlite3\nprint(sqlite3.connect("${env.db}").execute("PRAGMA integrity_check").fetchone()[0])`, { blobs: [{ path: env.db, bytes: new Uint8Array(after.bytes) }] });
          expect(check.status === "ok" && check.stdout.trim()).toBe("ok");
        }
      }, T);
    }
  }
});
