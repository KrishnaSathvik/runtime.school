/**
 * M23 practice: ten independent problems on command-line scripts and automation (PY-L23-01 … PY-L23-05).
 *
 * Mix: 3 function implementations, 2 data transformations, 1 debugging (a genuinely broken settings check),
 * 1 validation, 1 refactoring (hand-rolled sys.argv parsing replaced by argparse, same results, proper errors),
 * 1 integration (a release script driving git through an injected runner), 1 output prediction.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 *
 * Fixtures are small slices shaped like the course datasets: D02 (Online Retail II invoice exports and file names) and
 * D11 (GH Archive-style repository automation: git output, release tags, disk usage of a checkout). subprocess is
 * never faked as having run: code that calls other programs receives `run` as a parameter, and the checks pass
 * stand-ins that return real `subprocess.CompletedProcess` objects. Hidden inputs cover empty input, ties, capitals,
 * missing values, boundaries and failures.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput, raisesCase } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const expr = (id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: pv(expected),
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
const raisesExpr = (id: string, label: string, code: string, exception: string, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  raises: exception,
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});

// ---------------------------------------------------------------- fixtures

const exportNames = ["orders-2011-03-14.csv", "orders-2011-03-02.csv", "orders-2010-12-31.csv", "notes.txt"];

/** A git stand-in for the release question: status output, existing tags, and whether tagging works. */
const gitStandIn = (status: string, tags: string, tagCode = 0) =>
  [
    "import subprocess as _sp",
    "_calls = []",
    "def _git(args, **kw):",
    "    _calls.append(list(args))",
    "    if args[1] == 'status':",
    `        return _sp.CompletedProcess(args, 0, stdout=${JSON.stringify(status)}, stderr='')`,
    "    if args[1] == 'tag' and args[2] == '--list':",
    `        return _sp.CompletedProcess(args, 0, stdout=${JSON.stringify(tags)}, stderr='')`,
    "    if args[1] == 'tag':",
    `        return _sp.CompletedProcess(args, ${tagCode}, stdout='', stderr=${JSON.stringify(tagCode ? "fatal: cannot lock ref\n" : "")})`,
    "    return _sp.CompletedProcess(args, 1, stdout='', stderr='unexpected command')",
  ].join("\n");

const duOutput = "12\t./src/app\n40\t./src\n8\t./docs\n3\t./.github/workflows\n5\t./.github\n61\t.\n";

export const m23Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q23-02",
    version: 2,
    slug: "newest-export",
    title: "The newest dated export",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "enumerate-call", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "none-value", "path-call", "precedence", "print-call", "print-several", "print-text", "reassignment", "string-check", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "tuple-unpack"],
    prompt: "A sync script only uploads the most recent export. Exports are named `<kind>-<year>-<month>-<day>.csv`, and the folder also holds other files. Given the file names, pick the newest export.",
    spec: [
      ["Function", "`newest_export(names)`"],
      ["names", "a list of file names (text)"],
      ["Returns", "the name whose date is latest, or `None` when no name is a dated export"],
      ["Dated export", "suffix `.csv` (any capitals); the stem split on `-` ends in a 4-digit year, a 2-digit month and a 2-digit day"],
      ["Ties", "the same date twice: the name that comes first in the list"],
    ],
    hiddenKinds: ["a later year beats a later month", "capital letters in the suffix", "two exports on the same date", "names that look dated but aren't CSV", "no dated exports at all"],
    hints: [
      "Keep a running best (a name and its date) while you walk the list, like finding a maximum by hand.",
      "`Path(name).stem` and `.suffix` split a name without needing the file to exist. A date written `YYYY-MM-DD` compares correctly as text.",
      "Check the parts before using them: at least four pieces after splitting the stem, with lengths 4, 2 and 2 and all digits. Replace the best only when a date is strictly later.",
    ],
    explanation: "For each name, check the suffix with `.lower()`, split the stem on `-`, and keep the last three parts as a `YYYY-MM-DD` text when they have the right lengths and are digits. Dates in that order compare correctly as text, so a running maximum with `>` finds the newest and keeps the first name on a tie. Comparing whole file names fails as soon as the kinds differ (`returns-2010…` sorts after `orders-2011…`).",
    code: {
      starter: src`
from pathlib import Path

def newest_export(names):
    return None

print(newest_export(["orders-2011-03-14.csv", "orders-2011-03-02.csv", "orders-2010-12-31.csv", "notes.txt"]))
`,
      answer: src`
from pathlib import Path

def export_date(name):
    path = Path(name)
    if path.suffix.lower() != ".csv":
        return None
    parts = path.stem.split("-")
    if len(parts) < 4:
        return None
    year, month, day = parts[-3], parts[-2], parts[-1]
    if len(year) == 4 and len(month) == 2 and len(day) == 2 and (year + month + day).isdigit():
        return year + "-" + month + "-" + day
    return None

def newest_export(names):
    best = None
    best_date = ""
    for name in names:
        date = export_date(name)
        if date is not None and date > best_date:
            best = name
            best_date = date
    return best

print(newest_export(["orders-2011-03-14.csv", "orders-2011-03-02.csv", "orders-2010-12-31.csv", "notes.txt"]))
`,
      alternatives: [
        src`
from pathlib import Path

def newest_export(names):
    dated = []
    for position, name in enumerate(names):
        stem = Path(name).stem
        pieces = stem.split("-")
        if Path(name).suffix.lower() == ".csv" and len(pieces) >= 4:
            y, m, d = pieces[-3:]
            if len(y) == 4 and len(m) == 2 and len(d) == 2 and y.isdigit() and m.isdigit() and d.isdigit():
                dated.append((y, m, d, -position, name))
    if not dated:
        return None
    return max(dated)[4]
`,
      ],
      wrong: [
        {
          code: src`
def newest_export(names):
    csvs = sorted(name for name in names if name.endswith(".csv"))
    if not csvs:
        return None
    return csvs[-1]
`,
          fails: ["returns"],
          why: "sorting whole names compares the kind first, so `returns-2010-…` beats `orders-2011-…`",
        },
        {
          code: src`
from pathlib import Path

def newest_export(names):
    best = None
    best_date = ""
    for name in names:
        if Path(name).suffix != ".csv":
            continue
        parts = Path(name).stem.split("-")
        if len(parts) < 4:
            continue
        date = "-".join(parts[-3:])
        if date >= best_date:
            best = name
            best_date = date
    return best
`,
          fails: ["returns"],
          why: "`.CSV` exports are skipped, non-date endings are compared as if they were dates, and `>=` hands ties to the later name",
        },
      ],
      task: {
        checks: [
          fn("returns", "newest_export", [
            example([exportNames], "orders-2011-03-14.csv"),
            example([["returns-2010-01-05.csv", "orders-2011-02-01.csv"]], "orders-2011-02-01.csv"),
            example([["notes.txt", "summary.csv"]], null),
            hiddenCase("a later year beats a later month", [["sales-2010-12-31.csv", "sales-2011-01-01.csv"]], "sales-2011-01-01.csv"),
            hiddenCase("capital letters in the suffix", [["orders-2011-04-01.CSV", "orders-2011-03-30.csv"]], "orders-2011-04-01.CSV"),
            hiddenCase("two exports on the same date", [["eu-2011-05-05.csv", "us-2011-05-05.csv"]], "eu-2011-05-05.csv"),
            hiddenCase("names that look dated but aren't CSV", [["orders-2012-01-01.json", "orders-2011-01-01.csv", "orders-2013-1-1.csv"]], "orders-2011-01-01.csv"),
            hiddenCase("no dated exports at all", [[]], null),
          ], { label: "newest_export() picks the latest dated CSV" }),
        ],
      },
    },
  },
  {
    id: "PY-Q23-03",
    version: 2,
    slug: "alert-threshold-from-env",
    title: "An alert threshold that crashes on the server",
    format: "debugging",
    difficulty: "easy",
    minutes: 8,
    requires: ["assignment", "comparison", "conversion", "dict-get", "dict-literal", "function-def", "function-param", "function-return", "identity", "if-statement", "none-value", "print-call", "print-several", "print-text", "string-method", "top-level-indent"],
    prompt: "A monitoring script decides whether to page someone. It works on a laptop, but on the server, where `ALERT_AT=3` is set in the environment, it crashes with `TypeError: '>=' not supported between instances of 'int' and 'str'`. Fix `should_alert` so it works whether or not the variable is set.",
    spec: [
      ["Function", "`should_alert(failures, env)`"],
      ["failures", "the number of failed jobs (an `int`)"],
      ["Returns", "`True` when `failures` is at least `ALERT_AT` (default 5), else `False`"],
      ["env", "a dictionary of text values, like `os.environ`; `ALERT_AT` may have spaces around it"],
    ],
    hiddenKinds: ["the variable is not set", "a two-digit threshold", "failures exactly at the threshold", "spaces around the value"],
    hints: [
      "Read the error: one side of `>=` is a number and the other is text. Which one came from the environment?",
      "Environment values are always text; only the default in the code is a number.",
      "Convert the value with `int(...)`, giving the default as text so the same conversion handles both cases. `int` ignores spaces at the ends.",
    ],
    explanation: "`env.get(\"ALERT_AT\", 5)` returns the number 5 on the laptop but the text `\"3\"` on the server, and an int can't be compared with text. Converting with `int(env.get(\"ALERT_AT\", \"5\"))` gives a number in both cases. Comparing as text instead (`str(failures) >= …`) runs but is wrong: `\"10\" >= \"5\"` is False because text compares character by character.",
    code: {
      starter: src`
def should_alert(failures, env):
    return failures >= env.get("ALERT_AT", 5)

print(should_alert(7, {}))
print(should_alert(2, {"ALERT_AT": "3"}))
`,
      answer: src`
def should_alert(failures, env):
    threshold = int(env.get("ALERT_AT", "5"))
    return failures >= threshold

print(should_alert(7, {}))
print(should_alert(2, {"ALERT_AT": "3"}))
`,
      alternatives: [
        src`
def should_alert(failures, env):
    text = env.get("ALERT_AT")
    if text is None:
        return failures >= 5
    return failures >= int(text.strip())
`,
      ],
      wrong: [
        {
          code: src`
def should_alert(failures, env):
    return failures >= int(env["ALERT_AT"])
`,
          fails: ["returns"],
          why: "on the laptop, where the variable isn't set, it now crashes with KeyError",
        },
        {
          code: src`
def should_alert(failures, env):
    return str(failures) >= env.get("ALERT_AT", "5")
`,
          fails: ["returns"],
          why: "text comparison: `\"10\" >= \"5\"` is False, so ten failures don't alert",
        },
      ],
      task: {
        checks: [
          fn("returns", "should_alert", [
            example([2, { ALERT_AT: "3" }], false),
            example([3, { ALERT_AT: "3" }], true),
            example([7, {}], true),
            hiddenCase("the variable is not set", [4, {}], false),
            hiddenCase("a two-digit threshold", [9, { ALERT_AT: "12" }], false),
            hiddenCase("failures exactly at the threshold", [5, {}], true),
            hiddenCase("spaces around the value", [10, { ALERT_AT: " 4 " }], true),
            hiddenCase("many failures, single-digit threshold", [10, { ALERT_AT: "5" }], true),
          ], { label: "should_alert() compares with the threshold as a number" }),
        ],
      },
    },
  },
  {
    id: "PY-Q23-06",
    version: 2,
    slug: "backup-command-arguments",
    title: "Arguments for a backup command",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["argparse-call", "assignment", "dict-literal", "function-def", "function-param", "function-return", "import-module", "list-literal", "print-call", "print-several", "print-text", "reassignment", "top-level-indent"],
    prompt: "A backup script is run as `backup SOURCE [--dest DIR] [--keep N] [--level fast|best] [--verify]`. Describe those arguments with argparse and return the parsed values.",
    spec: [
      ["Function", "`backup_args(argv)`"],
      ["argv", "a list of words, e.g. `[\"/srv/shop\", \"--keep\", \"14\"]`"],
      ["Returns", "`{'source': …, 'dest': …, 'keep': …, 'level': …, 'verify': …}`"],
      ["Arguments", "`source` positional; `--dest` default `\"backups\"`; `--keep` whole number, default 7; `--level` one of `fast`, `best`, default `fast`; `--verify` a flag"],
      ["Bad input", "a missing source, a `--keep` that isn't a whole number, or another level stops with `SystemExit`"],
    ],
    hiddenKinds: ["options given before the source", "the --name=value spelling", "every option at once", "a decimal --keep", "an unknown level", "no source"],
    hints: [
      "One `add_argument` per argument; the dictionary keys come from the names (without the dashes).",
      "`type=` converts `--keep`, `choices=` limits `--level`, and `action=\"store_true\"` makes `--verify` a flag.",
      "`vars(parser.parse_args(argv))` gives the dictionary. argparse itself stops with SystemExit on the bad inputs, so no extra checks are needed.",
    ],
    explanation: "Each rule in the usage line maps to one `add_argument`: a positional for the source, `default=` for `--dest`, `type=int, default=7` for `--keep`, `choices=[\"fast\", \"best\"]` for `--level`, and `action=\"store_true\"` for `--verify`. argparse handles option order, the `--keep=14` spelling and every rejection. Forgetting `type=int` returns `'14'`; forgetting `choices` silently accepts `--level max`.",
    code: {
      starter: src`
import argparse

def backup_args(argv):
    parser = argparse.ArgumentParser(prog="backup")
    return vars(parser.parse_args(argv))

print(backup_args(["/srv/shop", "--keep", "14"]))
`,
      answer: src`
import argparse

def backup_args(argv):
    parser = argparse.ArgumentParser(prog="backup")
    parser.add_argument("source")
    parser.add_argument("--dest", default="backups")
    parser.add_argument("--keep", type=int, default=7)
    parser.add_argument("--level", choices=["fast", "best"], default="fast")
    parser.add_argument("--verify", action="store_true")
    return vars(parser.parse_args(argv))

print(backup_args(["/srv/shop", "--keep", "14"]))
`,
      alternatives: [
        src`
import argparse

def backup_args(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify", action="store_true")
    parser.add_argument("--level", default="fast", choices=["fast", "best"])
    parser.add_argument("--keep", default=7, type=int)
    parser.add_argument("--dest", default="backups")
    parser.add_argument("source")
    args = parser.parse_args(argv)
    return {"source": args.source, "dest": args.dest, "keep": args.keep, "level": args.level, "verify": args.verify}
`,
      ],
      wrong: [
        {
          code: src`
import argparse

def backup_args(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--dest", default="backups")
    parser.add_argument("--keep", default=7)
    parser.add_argument("--level", choices=["fast", "best"], default="fast")
    parser.add_argument("--verify", action="store_true")
    return vars(parser.parse_args(argv))
`,
          fails: ["returns", "refuses"],
          why: "`--keep` stays text, and `--keep 2.5` is accepted",
        },
        {
          code: src`
import argparse

def backup_args(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("source")
    parser.add_argument("--dest", default="backups")
    parser.add_argument("--keep", type=int, default=7)
    parser.add_argument("--level", default="fast")
    parser.add_argument("--verify", default=False)
    return vars(parser.parse_args(argv))
`,
          fails: ["returns", "refuses"],
          why: "`--verify` expects a value after it, and any `--level` is accepted",
        },
      ],
      task: {
        checks: [
          fn("returns", "backup_args", [
            example([["/srv/shop", "--keep", "14"]], { source: "/srv/shop", dest: "backups", keep: 14, level: "fast", verify: false }),
            example([["data"]], { source: "data", dest: "backups", keep: 7, level: "fast", verify: false }),
            example([["data", "--level", "best", "--verify"]], { source: "data", dest: "backups", keep: 7, level: "best", verify: true }),
            hiddenCase("options given before the source", [["--verify", "--dest", "/mnt/nas", "/srv/db"]], { source: "/srv/db", dest: "/mnt/nas", keep: 7, level: "fast", verify: true }),
            hiddenCase("the --name=value spelling", [["/srv/shop", "--keep=30"]], { source: "/srv/shop", dest: "backups", keep: 30, level: "fast", verify: false }),
            hiddenCase("every option at once", [["x", "--dest", "y", "--keep", "1", "--level", "best", "--verify"]], { source: "x", dest: "y", keep: 1, level: "best", verify: true }),
          ], { label: "backup_args() returns every argument with its type and default" }),
          fn("refuses", "backup_args", [
            raisesCase([["--keep", "3"]], "SystemExit"),
            raisesCase([["data", "--keep", "2.5"]], "SystemExit", { label: "a decimal --keep" }),
            raisesCase([["data", "--level", "max"]], "SystemExit", { label: "an unknown level" }),
            raisesCase([[]], "SystemExit", { label: "no source" }),
          ], { label: "backup_args() stops on bad input" }),
        ],
      },
    },
  },
  {
    id: "PY-Q23-10",
    version: 2,
    slug: "check-a-rename-plan",
    title: "Check a rename plan before applying it",
    format: "validation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "none-value", "print-call", "print-several", "range-call", "string-format", "string-index", "string-slice", "top-level-indent", "tuple-unpack"],
    prompt: "Before a folder tool applies a rename plan, it lists everything that would go wrong, so a person can fix the plan first. Report each problem pair once, in plan order.",
    spec: [
      ["Function", "`plan_problems(plan, existing)`"],
      ["plan", "a list of `(old, new)` name pairs"],
      ["existing", "the list of names currently in the folder"],
      ["Returns", "a list of `\"<old>: <problem>\"` texts, in plan order; `[]` when the plan is safe"],
      ["Problems", "checked in this order, first match only: `missing source` (old isn't in the folder), `duplicate target` (an earlier pair already renames to the same new name), `target exists` (new is already in the folder)"],
    ],
    hiddenKinds: ["a safe plan", "two pairs aiming at the same name", "a pair with several problems", "an empty plan", "names that differ only in capitals"],
    hints: [
      "Walk the plan once, keeping a list of the targets you've already seen.",
      "For each pair, test the three problems in the given order and stop at the first that applies; `if`/`elif` does exactly that.",
      "Names are compared exactly: `Report.csv` and `report.csv` are different names. Remember each target after checking it, problem or not.",
    ],
    explanation: "One pass with a list of targets seen so far. Each pair is tested against the three rules in order with `if`/`elif`, so a pair produces at most one message, and its target is remembered either way, so a later clash is reported as a duplicate. Checking `target exists` before `duplicate target` reports the wrong problem, and forgetting to remember targets that already had a problem misses later duplicates.",
    code: {
      starter: src`
def plan_problems(plan, existing):
    problems = []
    return problems

existing = ["Invoice 1.CSV", "Invoice 2.CSV", "invoice-2.csv"]
plan = [("Invoice 1.CSV", "invoice-1.csv"), ("Invoice 2.CSV", "invoice-2.csv"), ("Invoice 3.CSV", "invoice-3.csv")]
print(plan_problems(plan, existing))
`,
      answer: src`
def plan_problems(plan, existing):
    problems = []
    targets = []
    for old, new in plan:
        if old not in existing:
            problems.append(old + ": missing source")
        elif new in targets:
            problems.append(old + ": duplicate target")
        elif new in existing:
            problems.append(old + ": target exists")
        targets.append(new)
    return problems

existing = ["Invoice 1.CSV", "Invoice 2.CSV", "invoice-2.csv"]
plan = [("Invoice 1.CSV", "invoice-1.csv"), ("Invoice 2.CSV", "invoice-2.csv"), ("Invoice 3.CSV", "invoice-3.csv")]
print(plan_problems(plan, existing))
`,
      alternatives: [
        src`
def problem_for(old, new, existing, earlier_targets):
    if old not in existing:
        return "missing source"
    if new in earlier_targets:
        return "duplicate target"
    if new in existing:
        return "target exists"
    return None

def plan_problems(plan, existing):
    found = []
    for i in range(len(plan)):
        old, new = plan[i]
        earlier = [pair[1] for pair in plan[:i]]
        problem = problem_for(old, new, existing, earlier)
        if problem is not None:
            found.append(f"{old}: {problem}")
    return found
`,
      ],
      wrong: [
        {
          code: src`
def plan_problems(plan, existing):
    problems = []
    targets = []
    for old, new in plan:
        if old not in existing:
            problems.append(old + ": missing source")
        elif new in existing:
            problems.append(old + ": target exists")
        elif new in targets:
            problems.append(old + ": duplicate target")
        targets.append(new)
    return problems
`,
          fails: ["returns"],
          why: "a duplicate whose name also exists is reported as `target exists`: the order of the checks is wrong",
        },
        {
          code: src`
def plan_problems(plan, existing):
    problems = []
    targets = []
    for old, new in plan:
        if old not in existing:
            problems.append(old + ": missing source")
            continue
        if new in targets:
            problems.append(old + ": duplicate target")
        elif new in existing:
            problems.append(old + ": target exists")
        else:
            targets.append(new)
    return problems
`,
          fails: ["returns"],
          why: "targets of pairs that had a problem are never remembered, so a later clash with them is missed",
        },
      ],
      task: {
        checks: [
          fn("returns", "plan_problems", [
            example([[["Invoice 1.CSV", "invoice-1.csv"], ["Invoice 2.CSV", "invoice-2.csv"], ["Invoice 3.CSV", "invoice-3.csv"]], ["Invoice 1.CSV", "Invoice 2.CSV", "invoice-2.csv"]], ["Invoice 2.CSV: target exists", "Invoice 3.CSV: missing source"]),
            example([[["A.csv", "a.csv"], ["a .csv", "a.csv"]], ["A.csv", "a .csv"]], ["a .csv: duplicate target"]),
            example([[["Q1.PDF", "q1.pdf"]], ["Q1.PDF"]], []),
            hiddenCase("a safe plan", [[["X.csv", "x.csv"], ["Y.csv", "y.csv"]], ["X.csv", "Y.csv", "z.csv"]], []),
            hiddenCase("a duplicate whose target also exists", [[["A", "t"], ["B", "t"]], ["A", "B", "t"]], ["A: target exists", "B: duplicate target"]),
            hiddenCase("a missing source that is also a duplicate", [[["A", "t"], ["Gone", "t"]], ["A"]], ["Gone: missing source"]),
            hiddenCase("a later clash with a pair that had a problem", [[["Gone", "t"], ["B", "t"]], ["B"]], ["Gone: missing source", "B: duplicate target"]),
            hiddenCase("an empty plan", [[], ["a.csv"]], []),
            hiddenCase("names that differ only in capitals", [[["Report.CSV", "report.csv"]], ["Report.CSV", "Report.csv"]], []),
          ], { label: "plan_problems() reports each problem pair once, in order" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q23-12",
    version: 2,
    slug: "folder-manifest",
    title: "A manifest of data files by folder",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "continue-statement", "conversion", "defaultdict-call", "dict-comp", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "map-call", "membership", "path-call", "print-call", "string-index", "string-method", "top-level-indent"],
    prompt: "A deploy step ships a project's data files and writes a manifest of what went where. Given the relative paths in the project, build the manifest for the CSV and JSON files.",
    spec: [
      ["Function", "`manifest(paths)`"],
      ["paths", "relative paths with `/`, e.g. `\"data/2011/sales.csv\"`"],
      ["Returns", "a dictionary from folder (`\".\"` for the top level) to the sorted list of file names in it"],
      ["Rules", "only suffixes `.csv` and `.json`, ignoring capitals; folders with no such files are left out; the input list is not changed"],
    ],
    hiddenKinds: ["files at the top level", "capital letters in the suffix", "two files with the same name in different folders", "no data files at all", "a deeply nested file"],
    hints: [
      "Group by folder (see Collection Algorithms): a dictionary of lists, appending as you go and sorting at the end.",
      "`Path(text)` works on any path text without touching the disk: `.parent` is the folder part and `.name` the file name. `str(...)` turns the parent back into text; for a top-level file it is `\".\"`.",
      "Filter on `path.suffix.lower()` before grouping, so folders without data files never get a key.",
    ],
    explanation: "Each path text becomes a `Path`; files whose lowered suffix is `.csv` or `.json` are grouped under `str(path.parent)`, which is `\".\"` for a top-level file, and every list is sorted at the end. Splitting on `/` by hand gets the top level wrong (no `/` at all) and grouping by the first folder only flattens nested folders together.",
    code: {
      starter: src`
from pathlib import Path

def manifest(paths):
    folders = {}
    return folders

paths = ["data/2011/sales.csv", "data/2011/returns.JSON", "data/readme.md", "data/2010/sales.csv", "config.json"]
print(manifest(paths))
`,
      answer: src`
from pathlib import Path

def manifest(paths):
    folders = {}
    for text in paths:
        path = Path(text)
        if path.suffix.lower() not in [".csv", ".json"]:
            continue
        folder = str(path.parent)
        if folder not in folders:
            folders[folder] = []
        folders[folder].append(path.name)
    for folder in folders:
        folders[folder].sort()
    return folders

paths = ["data/2011/sales.csv", "data/2011/returns.JSON", "data/readme.md", "data/2010/sales.csv", "config.json"]
print(manifest(paths))
`,
      alternatives: [
        src`
from collections import defaultdict
from pathlib import Path

def manifest(paths):
    grouped = defaultdict(list)
    for p in map(Path, paths):
        if p.suffix.lower() in (".csv", ".json"):
            grouped[str(p.parent)].append(p.name)
    return {folder: sorted(names) for folder, names in grouped.items()}
`,
      ],
      wrong: [
        {
          code: src`
def manifest(paths):
    folders = {}
    for text in paths:
        folder, name = text.rsplit("/", 1)
        if name.lower().endswith(".csv") or name.lower().endswith(".json"):
            folders.setdefault(folder, []).append(name)
    for folder in folders:
        folders[folder].sort()
    return folders
`,
          fails: ["returns", "keeps-input"],
          why: "a top-level file has no `/`, so `rsplit` can't produce a folder and the unpacking fails",
        },
        {
          code: src`
from pathlib import Path

def manifest(paths):
    folders = {}
    for text in paths:
        path = Path(text)
        if path.suffix in [".csv", ".json"]:
            folders[str(path.parent)] = folders.get(str(path.parent), []) + [path.name]
    return folders
`,
          fails: ["returns"],
          why: "`.JSON` is skipped and the lists are left in input order",
        },
      ],
      task: {
        checks: [
          fn("returns", "manifest", [
            example([["data/2011/sales.csv", "data/2011/returns.JSON", "data/readme.md", "data/2010/sales.csv", "config.json"]], { "data/2011": ["returns.JSON", "sales.csv"], "data/2010": ["sales.csv"], ".": ["config.json"] }),
            example([["notes.md", "src/app.py"]], {}),
            example([["b/x.csv", "b/a.csv"]], { b: ["a.csv", "x.csv"] }),
            hiddenCase("files at the top level", [["z.json", "a.CSV"]], { ".": ["a.CSV", "z.json"] }),
            hiddenCase("two files with the same name in different folders", [["eu/sales.csv", "us/sales.csv"]], { eu: ["sales.csv"], us: ["sales.csv"] }),
            hiddenCase("a deeply nested file", [["a/b/c/d/e.json", "a/f.csv"]], { "a/b/c/d": ["e.json"], a: ["f.csv"] }),
            hiddenCase("no paths at all", [[]], {}),
          ], { label: "manifest() groups data files by folder", compare: { order: "any" } }),
          fn("keeps-input", "manifest", [
            keepsInput([["b/x.csv", "a.json"]]),
          ], { label: "manifest() doesn't change the list it is given" }),
        ],
      },
    },
  },
  {
    id: "PY-Q23-13",
    version: 2,
    slug: "settings-from-prefixed-env",
    title: "Typed settings from prefixed variables",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "boolean", "conditional-expr", "continue-statement", "conversion", "dict-comp", "dict-iterate", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "list-mutate", "logical", "membership", "nested-condition", "print-call", "print-several", "print-text", "raise-stmt", "string-format", "string-index", "string-method", "top-level-indent", "truthiness", "tuple-literal", "type-call"],
    prompt: "A service keeps its defaults in a dictionary and lets the environment override any of them with variables like `SHOP_PORT` or `SHOP_DEBUG`. Each override must come out with the same type as its default.",
    spec: [
      ["Function", "`merge_settings(defaults, env, prefix)`"],
      ["defaults", "a dictionary like `{\"port\": 8000, \"debug\": False, \"rate\": 0.2, \"name\": \"shop\"}`"],
      ["Returns", "a new dictionary with every key of `defaults`; a key is overridden when `prefix + KEY` (upper case) is in `env`"],
      ["Conversion", "to the default's type: `int`, `float`, `str` as-is; for `bool`, `1/true/yes/on` and `0/false/no/off` (any capitals, spaces trimmed)"],
      ["Raises", "`ValueError` when a value can't be converted (e.g. `SHOP_PORT=eighty`, `SHOP_DEBUG=maybe`)"],
      ["Rules", "`defaults` is not changed; variables without the prefix, or for unknown keys, are ignored"],
    ],
    hiddenKinds: ["no overrides", "a boolean written in capitals", "a float override", "a variable for an unknown key", "a value that can't be converted", "the defaults must stay unchanged"],
    hints: [
      "Start from a copy of the defaults, then look up `prefix + key.upper()` for each key.",
      "Choose the conversion from `type(default)`. Check for `bool` before anything else, and with `is`: a bool must not go through `int(...)`.",
      "`int(\"eighty\")` already raises ValueError; for booleans, raise it yourself when the word is in neither list.",
    ],
    explanation: "Copy the defaults, then for every key build the variable name, and if it's set convert it according to `type(default)`. Booleans need their own word lists, because `bool(\"false\")` is True. `int` and `float` raise ValueError on bad text by themselves. Writing into `defaults` directly changes the caller's dictionary, so the service's defaults drift every time settings are loaded.",
    code: {
      starter: src`
def merge_settings(defaults, env, prefix):
    return defaults

defaults = {"port": 8000, "debug": False, "rate": 0.2, "name": "shop"}
print(merge_settings(defaults, {"SHOP_PORT": "9000", "SHOP_DEBUG": " Yes", "HOME": "/root"}, "SHOP_"))
`,
      answer: src`
def to_bool(text):
    word = text.strip().lower()
    if word in ["1", "true", "yes", "on"]:
        return True
    if word in ["0", "false", "no", "off"]:
        return False
    raise ValueError(f"not an on/off value: {text!r}")

def merge_settings(defaults, env, prefix):
    settings = dict(defaults)
    for key, default in defaults.items():
        name = prefix + key.upper()
        if name not in env:
            continue
        text = env[name]
        if type(default) is bool:
            settings[key] = to_bool(text)
        elif type(default) is int:
            settings[key] = int(text)
        elif type(default) is float:
            settings[key] = float(text)
        else:
            settings[key] = text
    return settings

defaults = {"port": 8000, "debug": False, "rate": 0.2, "name": "shop"}
print(merge_settings(defaults, {"SHOP_PORT": "9000", "SHOP_DEBUG": " Yes", "HOME": "/root"}, "SHOP_"))
`,
      alternatives: [
        src`
ON = ("1", "true", "yes", "on")
OFF = ("0", "false", "no", "off")

def convert(default, text):
    if isinstance(default, bool):
        word = text.strip().lower()
        if word not in ON + OFF:
            raise ValueError(text)
        return word in ON
    return type(default)(text)

def merge_settings(defaults, env, prefix):
    return {key: convert(value, env[prefix + key.upper()]) if prefix + key.upper() in env else value for key, value in defaults.items()}
`,
      ],
      wrong: [
        {
          code: src`
def merge_settings(defaults, env, prefix):
    settings = dict(defaults)
    for key, default in defaults.items():
        name = prefix + key.upper()
        if name in env:
            settings[key] = type(default)(env[name])
    return settings
`,
          fails: ["returns", "refuses"],
          why: "`bool(\"0\")` and `bool(\"false\")` are True: any non-empty text converts to True",
        },
        {
          code: src`
def merge_settings(defaults, env, prefix):
    for key, default in defaults.items():
        name = prefix + key.upper()
        if name not in env:
            continue
        word = env[name].strip().lower()
        if type(default) is bool:
            if word not in ["1", "true", "yes", "on", "0", "false", "no", "off"]:
                raise ValueError(word)
            defaults[key] = word in ["1", "true", "yes", "on"]
        else:
            defaults[key] = type(default)(env[name])
    return defaults
`,
          fails: ["keeps-input"],
          why: "the overrides are written into the caller's defaults dictionary",
        },
      ],
      task: {
        checks: [
          fn("returns", "merge_settings", [
            example([{ port: 8000, debug: false, rate: 0.2, name: "shop" }, { SHOP_PORT: "9000", SHOP_DEBUG: " Yes", HOME: "/root" }, "SHOP_"], { port: 9000, debug: true, rate: 0.2, name: "shop" }),
            example([{ port: 8000, debug: true }, {}, "SHOP_"], { port: 8000, debug: true }),
            example([{ name: "shop", workers: 2 }, { SHOP_NAME: "outlet", SHOP_WORKERS: "8" }, "SHOP_"], { name: "outlet", workers: 8 }),
            hiddenCase("a boolean written in capitals as off", [{ debug: true }, { APP_DEBUG: "FALSE" }, "APP_"], { debug: false }),
            hiddenCase("a float override", [{ rate: 0.2 }, { APP_RATE: "0.35" }, "APP_"], { rate: 0.35 }),
            hiddenCase("a variable for an unknown key", [{ port: 1 }, { APP_COLOR: "red", PORT: "5" }, "APP_"], { port: 1 }),
            hiddenCase("a whole-number default written as text 0", [{ retries: 3 }, { APP_RETRIES: "0" }, "APP_"], { retries: 0 }),
          ], { label: "merge_settings() converts each override to its default's type" }),
          fn("refuses", "merge_settings", [
            raisesCase([{ port: 8000 }, { SHOP_PORT: "eighty" }, "SHOP_"], "ValueError"),
            raisesCase([{ debug: false }, { SHOP_DEBUG: "maybe" }, "SHOP_"], "ValueError", { label: "an on/off value that is neither" }),
          ], { label: "merge_settings() refuses values it can't convert" }),
          fn("keeps-input", "merge_settings", [
            keepsInput([{ port: 1, debug: false }, { X_PORT: "2", X_DEBUG: "on" }, "X_"], { label: "the defaults must stay unchanged" }),
          ], { label: "merge_settings() leaves the defaults unchanged" }),
        ],
      },
    },
  },
  {
    id: "PY-Q23-16",
    version: 2,
    slug: "argv-by-hand-to-argparse",
    title: "Replace hand-written argument parsing",
    format: "refactoring",
    difficulty: "medium",
    minutes: 15,
    requires: ["argparse-call", "arithmetic", "assignment", "conversion", "dict-literal", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "membership", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent"],
    prompt: "`parse` reads a report script's arguments by poking at the list by position. For good input it works, and those results must stay exactly the same. For bad input it crashes with IndexError or ValueError, or quietly ignores what it doesn't understand. Rewrite it with argparse so bad input stops with a usage error (`SystemExit`), as users of command-line tools expect.",
    spec: [
      ["Function", "`parse(argv)`"],
      ["Returns", "`{'path': …, 'limit': …, 'verbose': …}` exactly as now: `limit` an `int` defaulting to 10, `verbose` a flag"],
      ["Must refuse", "no path, a limit that isn't a whole number, `--limit` with no value, and any option it doesn't know: all with `SystemExit`"],
    ],
    hiddenKinds: ["options before the path", "--limit with no value after it", "an unknown option", "an empty argument list"],
    hints: [
      "Keep the results identical: the same three keys, the same default, the same types.",
      "Three `add_argument` calls replace all the index arithmetic; `vars(...)` gives back the dictionary.",
      "You don't write any of the error handling: argparse already refuses missing values, bad numbers and unknown options with SystemExit.",
    ],
    explanation: "The hand-written version assumes the path is first and that `--limit` is followed by a number. argparse states the same rules declaratively, so the valid results don't change, while every malformed command now gets a usage message and exit status 2 instead of a traceback, and options may come in any order. Catching IndexError and ValueError by hand would still accept unknown options silently.",
    code: {
      starter: src`
def parse(argv):
    path = argv[0]
    limit = 10
    if "--limit" in argv:
        limit = int(argv[argv.index("--limit") + 1])
    verbose = "--verbose" in argv
    return {"path": path, "limit": limit, "verbose": verbose}

print(parse(["sales.csv", "--limit", "5"]))
print(parse(["sales.csv", "--verbose"]))
`,
      answer: src`
import argparse

def parse(argv):
    parser = argparse.ArgumentParser(prog="report")
    parser.add_argument("path")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--verbose", action="store_true")
    return vars(parser.parse_args(argv))

print(parse(["sales.csv", "--limit", "5"]))
print(parse(["sales.csv", "--verbose"]))
`,
      alternatives: [
        src`
import argparse

PARSER = argparse.ArgumentParser(prog="report")
PARSER.add_argument("path")
PARSER.add_argument("--limit", default=10, type=int)
PARSER.add_argument("--verbose", action="store_true")

def parse(argv):
    args = PARSER.parse_args(argv)
    return {"path": args.path, "limit": args.limit, "verbose": args.verbose}
`,
      ],
      wrong: [
        {
          code: src`
def parse(argv):
    if not argv:
        raise SystemExit(2)
    path = argv[0]
    limit = 10
    if "--limit" in argv:
        try:
            limit = int(argv[argv.index("--limit") + 1])
        except (IndexError, ValueError):
            raise SystemExit(2)
    return {"path": path, "limit": limit, "verbose": "--verbose" in argv}
`,
          fails: ["errors", "order"],
          why: "patching the crashes by hand still accepts unknown options and assumes the path comes first",
        },
        {
          code: src`
import argparse

def parse(argv):
    parser = argparse.ArgumentParser(prog="report")
    parser.add_argument("path")
    parser.add_argument("--limit", default=10)
    parser.add_argument("--verbose", action="store_true")
    return vars(parser.parse_args(argv))
`,
          fails: ["returns", "errors", "order"],
          why: "without `type=int` the limit comes back as text, which changes the results",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse", [
            example([["sales.csv", "--limit", "5"]], { path: "sales.csv", limit: 5, verbose: false }),
            example([["sales.csv", "--verbose"]], { path: "sales.csv", limit: 10, verbose: true }),
            example([["march.csv"]], { path: "march.csv", limit: 10, verbose: false }),
            hiddenCase("both options", [["q.csv", "--verbose", "--limit", "25"]], { path: "q.csv", limit: 25, verbose: true }),
          ], { label: "parse() returns the same results as before for good input" }),
          fn("errors", "parse", [
            raisesCase([[]], "SystemExit"),
            raisesCase([["sales.csv", "--limit", "five"]], "SystemExit"),
            raisesCase([["sales.csv", "--limit"]], "SystemExit", { label: "--limit with no value after it" }),
            raisesCase([["sales.csv", "--colour"]], "SystemExit", { label: "an unknown option" }),
          ], { label: "parse() stops with SystemExit on bad input" }),
          {
            kind: "expr",
            id: "order",
            label: "Options may come before the path",
            hidden: true,
            expr: "result = parse(['--limit', '3', 'april.csv'])",
            expected: pv({ path: "april.csv", limit: 3, verbose: false }),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q23-19",
    version: 2,
    slug: "tag-a-release",
    title: "Tag a release with git",
    format: "integration",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "function-def", "function-default", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "star-args", "star-kwargs", "string-format", "string-method", "string-slice", "top-level-indent", "truthiness"],
    prompt: "A release script tags the current commit, but only when it is safe. It talks to git through `run` (`subprocess.run` on a real machine; a stand-in in the checks). Write `tag_release(version, run)`.",
    spec: [
      ["Function", "`tag_release(version, run)`"],
      ["Steps", "1. `run([\"git\", \"status\", \"--porcelain\"], capture_output=True, text=True)`: any output means uncommitted changes. 2. `run([\"git\", \"tag\", \"--list\", tag], …)`: any output means the tag exists. 3. `run([\"git\", \"tag\", \"-a\", tag, \"-m\", \"Release \" + version], …)`"],
      ["tag", "`\"v\" + version`, e.g. `\"v1.4.0\"`"],
      ["Returns", "the tag after step 3 succeeds"],
      ["Raises", "`RuntimeError` for uncommitted changes, an existing tag, or a failed step 3 (with git's stripped stderr in the message); later steps must not run after a refusal"],
    ],
    hiddenKinds: ["uncommitted changes", "the tag already exists", "git refuses to create the tag", "no tag is created after a refusal"],
    hints: [
      "Three calls to `run`, each with `capture_output=True, text=True`, and a decision after each one.",
      "`result.stdout.strip()` is empty when git has nothing to report. Raise as soon as a check fails, so the next step never runs.",
      "Check the `returncode` of the tagging step; a non-zero code means the tag wasn't made, and `stderr` says why.",
    ],
    explanation: "The function is a short sequence of guarded steps: look at the working tree, look for the tag, then create it, raising RuntimeError at the first refusal. Because `run` is a parameter, each branch can be exercised with a stand-in that answers like git would, without starting a process. Checking only the return codes of the first two steps misses the point: `git status` and `git tag --list` succeed (code 0) whether or not there is something to report.",
    code: {
      starter: src`
import subprocess

def tag_release(version, run=subprocess.run):
    return "v" + version

def fake_git(args, **options):
    print("git", " ".join(args[1:]))
    return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

print(tag_release("1.4.0", fake_git))
`,
      answer: src`
import subprocess

def tag_release(version, run=subprocess.run):
    tag = "v" + version
    status = run(["git", "status", "--porcelain"], capture_output=True, text=True)
    if status.stdout.strip():
        raise RuntimeError("uncommitted changes; commit or stash them first")
    existing = run(["git", "tag", "--list", tag], capture_output=True, text=True)
    if existing.stdout.strip():
        raise RuntimeError(f"tag {tag} already exists")
    made = run(["git", "tag", "-a", tag, "-m", "Release " + version], capture_output=True, text=True)
    if made.returncode != 0:
        raise RuntimeError("git tag failed: " + made.stderr.strip())
    return tag

def fake_git(args, **options):
    print("git", " ".join(args[1:]))
    return subprocess.CompletedProcess(args, 0, stdout="", stderr="")

print(tag_release("1.4.0", fake_git))
`,
      alternatives: [
        src`
import subprocess

def git(run, *words):
    return run(["git", *words], capture_output=True, text=True)

def tag_release(version, run=subprocess.run):
    tag = f"v{version}"
    if git(run, "status", "--porcelain").stdout.strip() != "":
        raise RuntimeError("working tree has changes")
    if git(run, "tag", "--list", tag).stdout.strip() != "":
        raise RuntimeError(tag + " exists")
    result = git(run, "tag", "-a", tag, "-m", f"Release {version}")
    if result.returncode:
        raise RuntimeError(result.stderr.strip())
    return tag
`,
      ],
      wrong: [
        {
          code: src`
import subprocess

def tag_release(version, run=subprocess.run):
    tag = "v" + version
    for args in (["git", "status", "--porcelain"], ["git", "tag", "--list", tag]):
        if run(args, capture_output=True, text=True).returncode != 0:
            raise RuntimeError("check failed")
    made = run(["git", "tag", "-a", tag, "-m", "Release " + version], capture_output=True, text=True)
    if made.returncode != 0:
        raise RuntimeError(made.stderr.strip())
    return tag
`,
          fails: ["dirty", "exists", "no-tag-after-refusal"],
          why: "status and tag --list exit with 0 even when they report something, so neither refusal ever happens",
        },
        {
          code: src`
import subprocess

def tag_release(version, run=subprocess.run):
    tag = "v" + version
    status = run(["git", "status", "--porcelain"], capture_output=True, text=True)
    existing = run(["git", "tag", "--list", tag], capture_output=True, text=True)
    run(["git", "tag", "-a", tag, "-m", "Release " + version], capture_output=True, text=True)
    if status.stdout.strip() or existing.stdout.strip():
        raise RuntimeError("not safe to tag")
    return tag
`,
          fails: ["tag-fails", "no-tag-after-refusal"],
          why: "it creates the tag before deciding it was unsafe, and ignores a failed tag command",
        },
      ],
      task: {
        checks: [
          expr("returns", "A clean tree and a new tag", `${gitStandIn("", "")}\nresult = (tag_release('1.4.0', _git), _calls)`, py.tuple(py.str("v1.4.0"), pv([["git", "status", "--porcelain"], ["git", "tag", "--list", "v1.4.0"], ["git", "tag", "-a", "v1.4.0", "-m", "Release 1.4.0"]])), { show: "tag_release(\"1.4.0\", <clean git>) and the commands it ran" }),
          raisesExpr("dirty", "Uncommitted changes stop the release", `${gitStandIn(" M shop/cart.py\n", "")}\ntag_release('1.4.1', _git)`, "RuntimeError", { hidden: true }),
          raisesExpr("exists", "An existing tag stops the release", `${gitStandIn("", "v2.0.0\n")}\ntag_release('2.0.0', _git)`, "RuntimeError", { hidden: true }),
          raisesExpr("tag-fails", "A failed tag command is reported", `${gitStandIn("", "", 128)}\ntag_release('2.1.0', _git)`, "RuntimeError", { hidden: true }),
          expr("no-tag-after-refusal", "Nothing is tagged after a refusal", `${gitStandIn(" M a.py\n", "")}\ntry:\n    tag_release('3.0.0', _git)\nexcept RuntimeError:\n    pass\nresult = [c for c in _calls if c[1] == 'tag' and '-a' in c]`, [], { hidden: true }),
        ],
      },
    },
  },
  {
    id: "PY-Q23-20",
    version: 2,
    slug: "disk-usage-by-folder",
    title: "Disk usage by top-level folder",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "comparison", "continue-statement", "conversion", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "len-call", "list-mutate", "logical", "membership", "newline-escape", "print-call", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "tuple-unpack"],
    prompt: "A clean-up script runs `du -k` in a repository checkout and reads its output: one line per folder, the size in kilobytes, a tab, and the path. Every folder's size already includes its subfolders. Turn the output into the size of each **top-level** folder.",
    spec: [
      ["Function", "`top_level_sizes(du_output)`"],
      ["du_output", "text like `\"12\\t./src/app\\n40\\t./src\\n8\\t./docs\\n61\\t.\\n\"`"],
      ["Returns", "a dictionary from top-level folder name (`src`, `docs`, `.github`) to its size in KB as an `int`"],
      ["Rules", "use only lines whose path is exactly `./<name>`; deeper lines would double-count and the `.` line is the total; blank lines are ignored"],
    ],
    hiddenKinds: ["folders whose names start with a dot", "lines in a different order", "only the total line", "empty output", "a folder name with a space"],
    hints: [
      "`splitlines()` gives one line per folder; `split(\"\\t\")` separates the size from the path (a folder name may contain spaces, so split on the tab only).",
      "A top-level path starts with `./` and has no further `/` after that.",
      "Strip the leading `./` to get the name and convert the size with `int`. Subfolder lines are skipped, not added: their size is already in their parent.",
    ],
    explanation: "Each line is `size<TAB>path`. Only paths of the form `./name` are top-level folders; their size already includes everything below them, so adding the deeper lines would count the same kilobytes twice, and the `.` line is the grand total. Splitting on whitespace instead of the tab breaks names with spaces.",
    code: {
      starter: src`
def top_level_sizes(du_output):
    sizes = {}
    return sizes

output = "12\t./src/app\n40\t./src\n8\t./docs\n3\t./.github/workflows\n5\t./.github\n61\t.\n"
print(top_level_sizes(output))
`,
      answer: src`
def top_level_sizes(du_output):
    sizes = {}
    for line in du_output.splitlines():
        if not line.strip():
            continue
        size, path = line.split("\t", 1)
        if not path.startswith("./"):
            continue
        name = path[2:]
        if "/" in name or name == "":
            continue
        sizes[name] = int(size)
    return sizes

output = "12\t./src/app\n40\t./src\n8\t./docs\n3\t./.github/workflows\n5\t./.github\n61\t.\n"
print(top_level_sizes(output))
`,
      alternatives: [
        src`
def top_level_sizes(du_output):
    result = {}
    for line in du_output.strip().split("\n"):
        if "\t" not in line:
            continue
        size, path = line.split("\t")
        parts = path.split("/")
        if len(parts) == 2 and parts[0] == ".":
            result[parts[1]] = int(size)
    return result
`,
      ],
      wrong: [
        {
          code: src`
def top_level_sizes(du_output):
    sizes = {}
    for line in du_output.splitlines():
        size, path = line.split("\t")
        if path == ".":
            continue
        top = path.split("/")[1]
        sizes[top] = sizes.get(top, 0) + int(size)
    return sizes
`,
          fails: ["returns"],
          why: "subfolder sizes are added to their parent, which already includes them, so `src` comes out as 52 instead of 40",
        },
        {
          code: src`
def top_level_sizes(du_output):
    sizes = {}
    for line in du_output.splitlines():
        parts = line.split()
        if len(parts) == 2 and parts[1].count("/") == 1:
            sizes[parts[1][2:]] = int(parts[0])
    return sizes
`,
          fails: ["returns"],
          why: "splitting on any whitespace breaks a folder name that contains a space",
        },
      ],
      task: {
        checks: [
          fn("returns", "top_level_sizes", [
            example([duOutput], { src: 40, docs: 8, ".github": 5 }),
            example([""], {}),
            example(["4\t./build\n4\t.\n"], { build: 4 }),
            hiddenCase("lines in a different order", ["61\t.\n40\t./src\n12\t./src/app\n"], { src: 40 }),
            hiddenCase("only the total line", ["7\t.\n"], {}),
            hiddenCase("a folder name with a space", ["9\t./old reports\n2\t./old reports/2010\n11\t.\n"], { "old reports": 9 }),
            hiddenCase("blank lines between folders", ["3\t./a\n\n5\t./b\n\n8\t.\n"], { a: 3, b: 5 }),
          ], { label: "top_level_sizes() reads each top-level folder's size" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q23-22",
    version: 2,
    slug: "glob-rglob-suffix",
    title: "glob, rglob and suffixes together",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 6,
    requires: ["arithmetic", "assignment", "boolean", "comp-if", "conversion", "dir-list", "for-loop", "import-module", "list-comp", "list-index", "list-literal", "list-sort", "membership", "path-call", "print-call", "print-text", "string-index", "string-method", "top-level-indent"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "The loop only creates files. Draw the tree: which files sit directly in `drop`, and which are in `drop/sub`?",
      "`glob(\"*.csv\")` matches names ending in exactly `.csv`, in that folder only; capitals matter. `rglob` adds the subfolder.",
      "The last line lowers each top-level file's suffix (only the last dot-part) and sorts the texts.",
    ],
    explanation: "Top level: `a.csv`, `b.CSV`, `e.csv.bak` and the folder `sub`. `glob(\"*.csv\")` matches only `a.csv`, because `b.CSV` has capitals and `e.csv.bak` ends in `.bak`. `rglob` adds `drop/sub/c.csv`. The suffixes of the three top-level files, lowered and sorted, are `.bak`, `.csv`, `.csv`; `sub` is a folder and is skipped.",
    predict: {
      program: src`
from pathlib import Path

root = Path("drop")
for name in ["b.CSV", "a.csv", "sub/c.csv", "sub/d.txt", "e.csv.bak"]:
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(name)

print([path.name for path in sorted(root.glob("*.csv"))])
print([str(path) for path in sorted(root.rglob("*.csv"))])
print(sorted([path.suffix.lower() for path in root.iterdir() if path.is_file()]))
`,
      output: "['a.csv']\n['drop/a.csv', 'drop/sub/c.csv']\n['.bak', '.csv', '.csv']\n",
      wrongPredictions: [
        "['a.csv', 'b.CSV']\n['drop/a.csv', 'drop/b.CSV', 'drop/sub/c.csv']\n['.bak', '.csv', '.csv']",
        "['a.csv']\n['drop/a.csv']\n['.bak', '.csv', '.csv']",
        "['a.csv', 'e.csv.bak']\n['drop/a.csv', 'drop/e.csv.bak', 'drop/sub/c.csv']\n['.bak', '.csv', '.csv']",
        "['a.csv']\n['drop/a.csv', 'drop/sub/c.csv']\n['.csv', '.csv', '.csv.bak']",
      ],
    },
  },
];
