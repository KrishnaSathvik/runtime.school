// Keeps the prebuild's expensive outputs between Vercel builds, so unchanged datasets aren't rebuilt every deploy.
//
//   node scripts/prebuild-cache.mjs restore   before the dataset builds: put last build's outputs back
//   node scripts/prebuild-cache.mjs save      after them: store this build's outputs for the next one
//
// These outputs are gitignored, so a fresh Vercel checkout has none and every builder starts from scratch.
// Vercel restores .next/cache between builds (next build keeps that folder), so the outputs ride along there.
// The builders still decide what is fresh: datasets/build.mjs compares input hashes, datasets/python/build.mjs
// checks each Parquet file's source hash, copy-pyodide.mjs verifies every file's sha256. A stale or missing cache
// only costs time, never correctness. Locally this does nothing: the outputs are already on disk.
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(root, ".next/cache/prebuild");

/** What to keep, and for folders which files (the rest is cheap to regenerate). */
const ITEMS = [
  { path: "public/datasets/canonical" }, // SQL datasets: ~60s to build
  { path: "src/data/datasets/generated/canonical.json" }, // their manifest, which holds the input hashes
  { path: "public/datasets/python", keep: (p) => p.endsWith(".parquet") }, // CSV → Parquet conversions
  { path: "public/vendor/pyodide" }, // wheels otherwise downloaded on every build
];

const mode = process.argv[2];
if (mode !== "restore" && mode !== "save") {
  console.error("usage: node scripts/prebuild-cache.mjs restore|save");
  process.exit(1);
}
if (!process.env.VERCEL) process.exit(0);

let n = 0;
for (const item of ITEMS) {
  const live = join(root, item.path);
  const kept = join(CACHE, item.path);
  if (mode === "restore") {
    if (!existsSync(kept)) continue;
    // Never overwrite: anything already in the checkout wins.
    cpSync(kept, live, { recursive: true, force: false, errorOnExist: false });
    n++;
  } else {
    if (!existsSync(live)) continue;
    rmSync(kept, { recursive: true, force: true });
    mkdirSync(dirname(kept), { recursive: true });
    const keep = item.keep;
    // cpSync asks about folders too: always descend, and copy only the files `keep` wants.
    cpSync(live, kept, { recursive: true, filter: keep ? (src) => statSync(src).isDirectory() || keep(src) : undefined });
    n++;
  }
}
console.log(`prebuild cache: ${mode === "restore" ? "restored" : "saved"} ${n} of ${ITEMS.length} items`);
