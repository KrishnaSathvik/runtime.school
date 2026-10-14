// Copies the pinned Pyodide core into public/vendor/pyodide/<version>/ and verifies every file
// against the hashes of the official release (cdn.jsdelivr.net/pyodide/v314.0.7/full/).
// It then fetches the data-library wheels lessons may ask for (NumPy, pandas, matplotlib, DuckDB,
// scikit-learn) from the same official release and verifies each one against the sha256 recorded in
// the release's pyodide-lock.json, which is itself pinned below. No micropip, no runtime CDN:
// everything is served from our own origin.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const PYODIDE_VERSION = "314.0.7";

/** sha256 of the official 314.0.7 release files. */
export const PYODIDE_FILES = {
  "pyodide.mjs": "6f1d60f7bf529beb300f0f47983c921d3982363640ba20af0e38efdddbc66109",
  "pyodide.asm.mjs": "f7cdc8ece80678ceb712f8e65ebe6d3a83203a180c399865f49612a051693635",
  "pyodide.asm.wasm": "cc36e3cab04fdfc9a63ff13eb52eae2b911bf46c025cc7b281f394bd3de1d5e6",
  "python_stdlib.zip": "fa1957e5777068fc4f7437f96d860ae2fbe9c19732ba06c84e004ec16dd7dd7a",
  "pyodide-lock.json": "5dc2fc119108bc148c7457dc86e7675b5c87e1cafd420b9c34c1eaef7b36c010",
};

/**
 * Pyodide packages a lesson may load, with everything they depend on. Must match the worker's
 * PACKAGE_SETS (pyspark is not listed here: it is DuckDB's Spark API under the `pyspark` name).
 */
export const PYODIDE_PACKAGES = ["numpy", "pandas", "matplotlib", "duckdb", "typing-extensions", "scikit-learn"];

const RELEASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** Every lock entry needed for `names`, dependencies included, sorted by name. */
export function resolvePackages(lock, names = PYODIDE_PACKAGES) {
  const found = new Map();
  const visit = (name) => {
    if (found.has(name)) return;
    const entry = lock.packages[name];
    if (!entry) throw new Error(`${name} is not in the Pyodide ${PYODIDE_VERSION} lockfile.`);
    found.set(name, entry);
    for (const dep of entry.depends ?? []) visit(dep);
  };
  names.forEach(visit);
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function download(url, attempts = 3) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (i >= attempts) throw new Error(`Could not download ${url}: ${err.message}`);
    }
  }
}

async function main() {
  const src = join(root, "node_modules", "pyodide");
  const installed = JSON.parse(readFileSync(join(src, "package.json"), "utf8")).version;
  if (installed !== PYODIDE_VERSION) {
    throw new Error(`pyodide ${installed} is installed; Runtime pins ${PYODIDE_VERSION}.`);
  }
  const out = join(root, "public", "vendor", "pyodide", PYODIDE_VERSION);
  mkdirSync(out, { recursive: true });
  for (const [name, hash] of Object.entries(PYODIDE_FILES)) {
    const from = join(src, name);
    if (sha(from) !== hash) throw new Error(`${name} does not match the official ${PYODIDE_VERSION} release.`);
    const to = join(out, name);
    if (!existsSync(to) || sha(to) !== hash) copyFileSync(from, to);
  }

  // The lockfile was verified above, so its per-wheel hashes are trusted.
  const lock = JSON.parse(readFileSync(join(out, "pyodide-lock.json"), "utf8"));
  let fetched = 0;
  for (const pkg of resolvePackages(lock)) {
    const to = join(out, pkg.file_name);
    if (existsSync(to) && sha(to) === pkg.sha256) continue;
    const bytes = await download(RELEASE_URL + pkg.file_name);
    const got = createHash("sha256").update(bytes).digest("hex");
    if (got !== pkg.sha256) throw new Error(`${pkg.file_name} does not match the official ${PYODIDE_VERSION} release.`);
    writeFileSync(to + ".part", bytes);
    renameSync(to + ".part", to);
    fetched++;
  }
  console.log(`pyodide ${PYODIDE_VERSION} core and data packages ready in public/vendor/pyodide/${PYODIDE_VERSION}` + (fetched ? ` (${fetched} wheels downloaded)` : ""));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
