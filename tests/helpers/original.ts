import fs from "fs";
import path from "path";
import vm from "vm";

const ROOT = path.resolve(__dirname, "../..");
const ORIGINAL = path.join(ROOT, "original-site/dist");

type AnyRecord = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Loads the untouched ChatGPT Site curriculum scripts into an isolated VM context. */
export function loadOriginalContent(): AnyRecord {
  const ctx: AnyRecord = {};
  vm.createContext(ctx);
  for (const f of [
    "datasets.js",
    "curriculum.js",
    "advanced.js",
    "walkthroughs.js",
    "engineering.js",
    "warehouse.js",
  ]) {
    vm.runInContext(fs.readFileSync(path.join(ORIGINAL, f), "utf8"), ctx);
  }
  const read = (name: string) => vm.runInContext(name, ctx);
  return {
    seed: read("seed"),
    fixtureMutation: read("fixtureMutation"),
    lessons: read("lessons"),
    groups: read("groups"),
    courseOrder: read("typeof courseOrder!=='undefined'?courseOrder:null"),
    caseStudyGroups: read("caseStudyGroups"),
    datasetCatalog: read("datasetCatalog"),
    planComparisons: read("planComparisons"),
    stepsFor: read("stepsFor"),
    quizFor: read("quizFor"),
  };
}

export type WorkerResponse = AnyRecord;

/**
 * Boots the exact worker script the Next.js app ships (public/vendor/engine.js)
 * inside a VM with Node's sql.js, so tests exercise production grading code.
 */
export async function bootWorker(
  workerFile = path.join(ROOT, "public/vendor/engine.js"),
  gradingFile = path.join(ROOT, "public/vendor/grading.js"),
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const initSqlJs = require(path.join(ROOT, "public/vendor/sql-wasm.js"));
  const SQL = await initSqlJs({
    locateFile: (f: string) => path.join(ROOT, "public/vendor", f),
  });
  const posts: WorkerResponse[] = [];
  const ctx: AnyRecord = {
    postMessage: (x: WorkerResponse) => posts.push(x),
    initSqlJs: () => Promise.resolve(SQL),
    // Canonical datasets are fetched by URL; serve them from the built public/ folder.
    fetch: async (url: string) => {
      const file = path.join(ROOT, "public", decodeURIComponent(url));
      return fs.existsSync(file) ? new Response(fs.readFileSync(file)) : new Response(null, { status: 404 });
    },
    Blob, Response, DecompressionStream, crypto: globalThis.crypto,
  };
  vm.createContext(ctx);
  ctx.importScripts = (...files: string[]) => {
    if (files.includes("plan-validation.js")) {
      vm.runInContext(fs.readFileSync(path.join(ROOT, "public/vendor/plan-validation.js"), "utf8"), ctx);
    }
    if (files.includes("grading.js")) {
      vm.runInContext(fs.readFileSync(gradingFile, "utf8"), ctx);
    }
  };
  vm.runInContext(fs.readFileSync(workerFile, "utf8"), ctx);
  await new Promise((r) => setImmediate(r));
  return async (data: AnyRecord): Promise<WorkerResponse> => {
    posts.length = 0;
    await ctx.onmessage({ data });
    return posts.find((p) => !p.ready && !p.phase) as WorkerResponse;
  };
}
