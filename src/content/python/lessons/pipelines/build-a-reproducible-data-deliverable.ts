import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const strs = (...xs: string[]) => py.list(...xs.map(s));

const RAW = `order_id,customer_id,amount,currency
A1,c01,40.00,gbp
A2,C02,15.50,GBP
A3,,9.99,GBP
A4,C03,-5.00,GBP
A5,c01,120.00,eur
`;

export const buildAReproducibleDataDeliverable: PyLesson = {
  slug: "build-a-reproducible-data-deliverable",
  ref: "python:build-a-reproducible-data-deliverable",
  module: "pipelines",
  number: 6,
  title: "Build a reproducible data deliverable",
  level: "advanced",
  summary:
    "Finish a pipeline the way a professional would: write the clean output, the rejected rows and a run manifest (input fingerprints, row counts, schema version and output fingerprints), all deterministic, so anyone can verify that the same input produces exactly the same files.",
  files: { "orders_raw.csv": RAW },

  sections: [
    {
      label: "what to deliver",
      blocks: [
        {
          kind: "p",
          text: "A data deliverable is more than one output file. Ship the **clean output**, the **rejected rows** with reasons (so nothing disappears), and a **manifest**: a small JSON file describing the run, with the input files and their fingerprints, row counts in and out, the schema version, and the output files and their fingerprints. The manifest is the evidence that the outputs came from those inputs.",
        },
      ],
    },
    {
      label: "fingerprints",
      blocks: [
        {
          kind: "p",
          text: "A file's **fingerprint** is a hash of its bytes: `hashlib.sha256(path.read_bytes()).hexdigest()`. Change one byte and the fingerprint changes completely, so a matching fingerprint shows a file is exactly the one described. Recording input fingerprints answers “which data was this made from?”, and output fingerprints let a rerun prove it produced identical files.",
        },
      ],
    },
    {
      label: "reproducible by construction",
      blocks: [
        {
          kind: "p",
          text: "**Reproducible** means the same inputs and code always give byte-identical outputs. Everything from the earlier lessons contributes: sorted rows, a fixed column order, consistent number formats (cents as integers, or `f\"{x:.2f}\"`), `sort_keys=True` for JSON, and no timestamps or random values inside the data files. If you want to record when a run happened, put it in the manifest, outside the fingerprinted outputs.",
        },
      ],
    },
  ],

  example: {
    caption: "Fingerprints, and why identical content means identical hashes. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import hashlib\nfrom pathlib import Path\n\n\ndef fingerprint(path):\n    return hashlib.sha256(Path(path).read_bytes()).hexdigest()\n\n\nPath("a.csv").write_text("id,amount\\nA1,40.00\\n", encoding="utf-8")\nPath("b.csv").write_text("id,amount\\nA1,40.00\\n", encoding="utf-8")\nPath("c.csv").write_text("id,amount\\nA1,40.0\\n", encoding="utf-8")\nfor name in ["a.csv", "b.csv", "c.csv"]:\n    print(name, fingerprint(name)[:16])\nprint("raw input:", fingerprint("orders_raw.csv")[:16])',
  },

  walkthrough: [
    {
      title: "One byte changes the fingerprint",
      text: "`40.00` versus `40.0` is the same number but different bytes, so the hashes differ: formatting is part of reproducibility.",
      code: 'import hashlib\nfor text in ["A1,40.00\\n", "A1,40.0\\n", "A1,40.00\\n"]:\n    print(repr(text), hashlib.sha256(text.encode()).hexdigest()[:12])',
    },
    {
      title: "Sorting makes output order-independent",
      text: "The rows arrive in different orders, but sorted output is identical, and so is its fingerprint.",
      code: 'import hashlib\na = [("A2", 1550), ("A1", 4000)]\nb = [("A1", 4000), ("A2", 1550)]\ndef render(rows):\n    return "".join(f"{i},{c}\\n" for i, c in sorted(rows))\nprint(render(a) == render(b), hashlib.sha256(render(a).encode()).hexdigest()[:12])',
    },
    {
      title: "A manifest describes the run",
      text: "Counts, the schema version and fingerprints, written with sorted keys so the manifest itself is stable.",
      code: 'import hashlib, json\nfrom pathlib import Path\nPath("clean.csv").write_text("order_id,amount_cents\\nA1,4000\\n", encoding="utf-8")\nmanifest = {\n    "schema_version": "orders.v1",\n    "inputs": {"orders_raw.csv": hashlib.sha256(Path("orders_raw.csv").read_bytes()).hexdigest()[:16]},\n    "outputs": {"clean.csv": hashlib.sha256(Path("clean.csv").read_bytes()).hexdigest()[:16]},\n    "rows": {"in": 5, "accepted": 1, "rejected": 4},\n}\nprint(json.dumps(manifest, indent=2, sort_keys=True))',
    },
    {
      title: "Rerun and compare",
      text: "Running the same deterministic step twice gives the same fingerprint, which is how you prove reproducibility.",
      code: 'import hashlib\nfrom pathlib import Path\n\ndef build(path):\n    rows = sorted([("A2", 1550), ("A1", 4000)])\n    Path(path).write_text("order_id,amount_cents\\n" + "".join(f"{i},{c}\\n" for i, c in rows), encoding="utf-8")\n    return hashlib.sha256(Path(path).read_bytes()).hexdigest()\n\nprint(build("run1.csv") == build("run2.csv"))',
    },
  ],

  mistakes: [
    {
      title: "A timestamp inside the data",
      text: "Each run writes its own time into the file, so Monday's and Tuesday's runs on the same input never match, and nobody can tell whether the data changed.",
      code: 'import hashlib\n\ndef build(generated_at):\n    return f"generated {generated_at}\\nA1,4000\\n"\n\nmonday = build("2026-10-12T09:00:00Z")\ntuesday = build("2026-10-13T09:00:00Z")\nprint(hashlib.sha256(monday.encode()).hexdigest() == hashlib.sha256(tuesday.encode()).hexdigest())',
      fix: "Keep run times out of fingerprinted outputs; record them in the manifest if needed.",
    },
    {
      title: "Using Python's hash() as a fingerprint",
      text: "`hash()` of a string is randomised per run, so it can't identify a file across runs or machines. (Here both values come from one run, so they happen to match; tomorrow they won't.)",
      code: 'text = "A1,4000\\n"\nprint(type(hash(text)).__name__, hash(text) == hash(text))',
      fix: "Use `hashlib.sha256(data).hexdigest()`, which is the same everywhere.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Fingerprint and manifest",
      prompt:
        "Write `build_manifest(inputs, outputs, counts, schema_version)`. `inputs` and `outputs` are lists of file paths; `counts` is a dictionary of row counts. Return a dictionary with `schema_version`, `counts` (as given), and `inputs` and `outputs` as dictionaries from **file name** (not the full path) to the file's **full sha256 hex digest**, with keys sorted. Also write it to `manifest.json` next to `main.py` with `indent=2` and `sort_keys=True`.",
      looksFor: [
        "Each file maps to the sha256 of its bytes.",
        "Keys are file names, sorted; `counts` and `schema_version` are included.",
        "`manifest.json` is written with sorted keys and indent 2.",
      ],
      starter: "import hashlib\nimport json\nfrom pathlib import Path\n\n\ndef build_manifest(inputs, outputs, counts, schema_version):\n    # Return the manifest dict and write manifest.json.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "hashes",
            label: "Fingerprints are the files' sha256 digests",
            show: "build_manifest([\"orders_raw.csv\"], [\"out.csv\"], {...}, \"orders.v1\")",
            expr: 'import hashlib\nfrom pathlib import Path\nPath("out").mkdir(exist_ok=True)\nPath("out/b.csv").write_text("x\\n", encoding="utf-8")\nPath("out/a.csv").write_text("y\\n", encoding="utf-8")\nm = build_manifest(["orders_raw.csv"], ["out/b.csv", "out/a.csv"], {"in": 5, "accepted": 2}, "orders.v1")\nexpected_raw = hashlib.sha256(Path("orders_raw.csv").read_bytes()).hexdigest()\nresult = (m["inputs"] == {"orders_raw.csv": expected_raw}, list(m["outputs"]), m["outputs"]["a.csv"] == hashlib.sha256(b"y\\n").hexdigest(), m["counts"], m["schema_version"])',
            expected: py.tuple(py.bool(true), strs("a.csv", "b.csv"), py.bool(true), py.dict([[s("in"), i(5)], [s("accepted"), i(2)]]), s("orders.v1")),
            tip: "Path(p).name is the file name; hashlib.sha256(Path(p).read_bytes()).hexdigest() its fingerprint. Build each dict over sorted names.",
          },
          {
            kind: "expr",
            id: "file",
            label: "manifest.json matches the returned manifest, with sorted keys",
            show: 'json.load(open("manifest.json"))',
            expr: 'import json\nfrom pathlib import Path\nm = build_manifest(["orders_raw.csv"], [], {"in": 5}, "v9")\ntext = Path("manifest.json").read_text(encoding="utf-8")\nresult = (json.loads(text) == m, text.startswith(\'{\\n  "counts"\'))',
            expected: py.tuple(py.bool(true), py.bool(true)),
            tip: 'json.dump(manifest, f, indent=2, sort_keys=True) to "manifest.json".',
          },
        ],
      },
      hints: [
        "def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest().",
        "inputs: {Path(p).name: digest(p) for p in sorted(inputs, key=lambda p: Path(p).name)}; the same for outputs.",
        'Write it: Path("manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8").',
      ],
      answer: 'import hashlib\nimport json\nfrom pathlib import Path\n\n\ndef digest(path):\n    return hashlib.sha256(Path(path).read_bytes()).hexdigest()\n\n\ndef fingerprints(paths):\n    return {Path(p).name: digest(p) for p in sorted(paths, key=lambda p: Path(p).name)}\n\n\ndef build_manifest(inputs, outputs, counts, schema_version):\n    """Describe a run: schema version, row counts, and sha256 of every input and output file."""\n    manifest = {\n        "schema_version": schema_version,\n        "counts": counts,\n        "inputs": fingerprints(inputs),\n        "outputs": fingerprints(outputs),\n    }\n    Path("manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")\n    return manifest',
      wrong: [
        { code: 'import hashlib, json\nfrom pathlib import Path\n\ndef build_manifest(inputs, outputs, counts, schema_version):\n    m = {"schema_version": schema_version, "counts": counts, "inputs": {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in inputs}, "outputs": {p: hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in outputs}}\n    Path("manifest.json").write_text(json.dumps(m, indent=2, sort_keys=True), encoding="utf-8")\n    return m\n', fails: ["hashes"], why: "keys are full paths, unsorted" },
        { code: 'import json\nfrom pathlib import Path\n\ndef build_manifest(inputs, outputs, counts, schema_version):\n    m = {"schema_version": schema_version, "counts": counts, "inputs": {Path(p).name: str(hash(Path(p).read_bytes())) for p in sorted(inputs)}, "outputs": {Path(p).name: str(hash(Path(p).read_bytes())) for p in sorted(outputs)}}\n    Path("manifest.json").write_text(json.dumps(m, indent=2, sort_keys=True), encoding="utf-8")\n    return m\n', fails: ["hashes"], why: "hash() instead of sha256" },
      ],
    },
    {
      id: "challenge-2",
      title: "Deliver clean, rejected and manifest",
      prompt:
        "Write `deliver(raw_path, out_dir)` for a CSV like `orders_raw.csv` (`order_id,customer_id,amount,currency`). Accept rows with a customer, a positive amount and currency GBP or EUR (case-insensitive). Write `out_dir/clean.csv` (`order_id,customer_id,amount_cents,currency`; customer and currency uppercased; amount as int cents; sorted by `order_id`) and `out_dir/rejected.csv` (`order_id,reason`, sorted by `order_id`; reasons `missing_customer` or `bad_amount`, the first that applies), creating `out_dir` if needed. Return a manifest dictionary with row counts (`in`, `accepted`, `rejected`) and the sha256 of each output, keyed by file name. Running it twice must produce identical files.",
      looksFor: [
        "`clean.csv` and `rejected.csv` have exactly the described columns, rows, formats and order.",
        "The manifest has the counts, and sha256 fingerprints matching the written files.",
        "A second run produces byte-identical files.",
      ],
      starter: "import csv\nimport hashlib\nfrom decimal import Decimal\nfrom pathlib import Path\n\n\ndef deliver(raw_path, out_dir):\n    # Write clean.csv and rejected.csv into out_dir; return the manifest.\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "clean",
            label: "clean.csv has the accepted rows, normalised and sorted",
            show: 'deliver("orders_raw.csv", "delivery"), then clean.csv',
            expr: 'from pathlib import Path\ndeliver("orders_raw.csv", "delivery")\nresult = Path("delivery/clean.csv").read_text(encoding="utf-8").splitlines()',
            expected: strs("order_id,customer_id,amount_cents,currency", "A1,C01,4000,GBP", "A2,C02,1550,GBP", "A5,C01,12000,EUR"),
            tip: 'Use csv.writer with lineterminator="\\n" (or write lines yourself), cents as int(Decimal(amount) * 100), and sort by order_id.',
          },
          {
            kind: "expr",
            id: "rejected",
            label: "rejected.csv lists each rejection's reason",
            show: "rejected.csv",
            expr: 'from pathlib import Path\ndeliver("orders_raw.csv", "delivery2")\nresult = Path("delivery2/rejected.csv").read_text(encoding="utf-8").splitlines()',
            expected: strs("order_id,reason", "A3,missing_customer", "A4,bad_amount"),
          },
          {
            kind: "expr",
            id: "manifest",
            label: "The manifest's counts and fingerprints match the files",
            show: 'm = deliver(...); m["rows"], m["outputs"]',
            expr: 'import hashlib\nfrom pathlib import Path\nm = deliver("orders_raw.csv", "delivery3")\nok = all(m["outputs"][name] == hashlib.sha256(Path("delivery3", name).read_bytes()).hexdigest() for name in ("clean.csv", "rejected.csv"))\nresult = (m["rows"], sorted(m["outputs"]), ok)',
            expected: py.tuple(py.dict([[s("in"), i(5)], [s("accepted"), i(3)], [s("rejected"), i(2)]]), strs("clean.csv", "rejected.csv"), py.bool(true)),
            tip: 'Return {"rows": {"in": …, "accepted": …, "rejected": …}, "outputs": {"clean.csv": sha256, "rejected.csv": sha256}}.',
          },
          {
            kind: "expr",
            id: "reproducible",
            label: "Two runs give identical files",
            show: "deliver twice into different folders, then compare fingerprints",
            expr: 'a = deliver("orders_raw.csv", "run_a")\nb = deliver("orders_raw.csv", "run_b")\nresult = a["outputs"] == b["outputs"]',
            expected: py.bool(true),
          },
        ],
      },
      hints: [
        'Read with csv.DictReader. For each row: customer = row["customer_id"].strip().upper(); if not customer → reject "missing_customer"; amount = Decimal(row["amount"]); if amount <= 0 or currency not in {"GBP", "EUR"} → reject "bad_amount".',
        'out = Path(out_dir); out.mkdir(parents=True, exist_ok=True). Write each file with csv.writer(f, lineterminator="\\n"), header first, rows sorted by order_id.',
        "Fingerprint each written file with hashlib.sha256(path.read_bytes()).hexdigest() and return the counts and fingerprints.",
      ],
      answer: 'import csv\nimport hashlib\nfrom decimal import Decimal\nfrom pathlib import Path\n\nCURRENCIES = {"GBP", "EUR"}\n\n\ndef write_csv(path, header, rows):\n    with open(path, "w", newline="", encoding="utf-8") as f:\n        writer = csv.writer(f, lineterminator="\\n")\n        writer.writerow(header)\n        writer.writerows(rows)\n\n\ndef deliver(raw_path, out_dir):\n    """Write clean.csv and rejected.csv deterministically into out_dir; return a manifest."""\n    accepted, rejected = [], []\n    with open(raw_path, newline="", encoding="utf-8") as f:\n        rows = list(csv.DictReader(f))\n    for row in rows:\n        customer = row["customer_id"].strip().upper()\n        currency = row["currency"].strip().upper()\n        amount = Decimal(row["amount"])\n        if not customer:\n            rejected.append((row["order_id"], "missing_customer"))\n        elif amount <= 0 or currency not in CURRENCIES:\n            rejected.append((row["order_id"], "bad_amount"))\n        else:\n            accepted.append((row["order_id"], customer, int(amount * 100), currency))\n    out = Path(out_dir)\n    out.mkdir(parents=True, exist_ok=True)\n    write_csv(out / "clean.csv", ["order_id", "customer_id", "amount_cents", "currency"], sorted(accepted))\n    write_csv(out / "rejected.csv", ["order_id", "reason"], sorted(rejected))\n    return {\n        "rows": {"in": len(rows), "accepted": len(accepted), "rejected": len(rejected)},\n        "outputs": {name: hashlib.sha256((out / name).read_bytes()).hexdigest() for name in ("clean.csv", "rejected.csv")},\n    }',
      wrong: [
        { code: 'import csv, hashlib\nfrom pathlib import Path\n\ndef deliver(raw_path, out_dir):\n    out = Path(out_dir)\n    out.mkdir(parents=True, exist_ok=True)\n    rows = list(csv.DictReader(open(raw_path, newline="", encoding="utf-8")))\n    good = [r for r in rows if r["customer_id"] and float(r["amount"]) > 0]\n    with open(out / "clean.csv", "w", newline="", encoding="utf-8") as f:\n        w = csv.writer(f, lineterminator="\\n")\n        w.writerow(["order_id", "customer_id", "amount_cents", "currency"])\n        for r in good:\n            w.writerow([r["order_id"], r["customer_id"], int(float(r["amount"]) * 100), r["currency"]])\n    with open(out / "rejected.csv", "w", newline="", encoding="utf-8") as f:\n        f.write("order_id,reason\\n")\n    return {"rows": {"in": len(rows), "accepted": len(good), "rejected": len(rows) - len(good)}, "outputs": {n: hashlib.sha256((out / n).read_bytes()).hexdigest() for n in ("clean.csv", "rejected.csv")}}\n', fails: ["clean", "rejected"], why: "no normalisation, and rejections not written" },
      ],
    },
  ],

  quiz: [
    {
      id: "fingerprint",
      prompt: "Two runs on the same input produce `report.csv` files with different sha256 fingerprints. What's the most likely cause?",
      options: [
        { text: "Something non-deterministic is in the output: unsorted rows, a timestamp, or inconsistent number formatting", correct: true, why: "Identical bytes give identical fingerprints; any difference means the content or its format changed." },
        { text: "sha256 is random", why: "sha256 is deterministic: the same bytes always give the same digest." },
        { text: "The files are in different folders", why: "The fingerprint depends only on the file's bytes, not its location." },
        { text: "The input fingerprint wasn't recorded", why: "That's a gap in the manifest, but it doesn't change the output's bytes." },
      ],
    },
    {
      id: "manifest",
      prompt: "What belongs in a run manifest?",
      options: [
        { text: "Input and output fingerprints, row counts and the schema version", correct: true, why: "Together they show exactly what went in, what came out, and which contract it follows." },
        { text: "A copy of all the output rows", why: "The outputs are separate files; the manifest describes them." },
        { text: "The pipeline's source code", why: "Code belongs in version control; the manifest can name its version." },
        { text: "Only the time the run finished", why: "A time alone can't prove which data produced the files." },
      ],
    },
  ],

  outcomes: [
    "Deliver clean output, rejected rows and a manifest together.",
    "Fingerprint files with `hashlib.sha256` and record them in a manifest.",
    "Make outputs byte-for-byte reproducible.",
    "Verify reproducibility by comparing fingerprints across runs.",
  ],
};
