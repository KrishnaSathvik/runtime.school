// Copies the pinned Pyodide core into public/vendor/pyodide/<version>/ and verifies every file
// against the hashes of the official release (cdn.jsdelivr.net/pyodide/v314.0.7/full/).
// Only the core is shipped: no extra packages, no micropip.
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

function main() {
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
  console.log(`pyodide ${PYODIDE_VERSION} core ready in public/vendor/pyodide/${PYODIDE_VERSION}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
