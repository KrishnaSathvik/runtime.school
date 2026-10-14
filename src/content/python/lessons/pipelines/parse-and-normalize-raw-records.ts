import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));

const EVENTS = `{"event": "Purchase", "user": " U-07 ", "amount": "£1,234.50", "ts": "2026-10-14T09:30:00+01:00"}
{"event": "signup", "user": "u-09", "ts": "2026-10-14T08:00:00Z"}
not json at all
{"event": "purchase", "user": "U-07", "amount": "12", "ts": "2026-10-14T23:45:00-05:00"}
{"event": "purchase", "user": "U-11", "amount": "twelve", "ts": "2026-10-15T10:00:00Z"}
`;

export const parseAndNormalizeRawRecords: PyLesson = {
  slug: "parse-and-normalize-raw-records",
  ref: "python:parse-and-normalize-raw-records",
  module: "pipelines",
  number: 2,
  title: "Parse and normalize raw records",
  level: "advanced",
  summary:
    "Turn raw lines into clean, typed records: parse JSON lines one at a time, normalise identifiers, names and categories to one spelling, store money as integer cents and times as UTC, and keep every line that couldn't be parsed, with its reason, instead of crashing or silently dropping it.",
  files: { "events.jsonl": EVENTS },

  sections: [
    {
      label: "JSON lines",
      blocks: [
        {
          kind: "p",
          text: "Event data often arrives as **JSON lines** (`.jsonl`): one JSON object per line. Each line is parsed on its own with `json.loads(line)`, so one corrupt line doesn't make the rest of the file unreadable. Parse inside `try`/`except json.JSONDecodeError`, and keep the bad line, its line number and the reason.",
        },
      ],
    },
    {
      label: "normalising",
      blocks: [
        {
          kind: "p",
          text: "**Normalising** gives each value one canonical form, so later steps can compare and group reliably: identifiers stripped and uppercased (`\" u-07 \"` → `U-07`), categories lowercased (`Purchase` → `purchase`), timestamps converted to UTC ISO text, and money stored as an **integer number of cents** (`£1,234.50` → `123450`).",
        },
        {
          kind: "p",
          text: "Why cents? Floats can't represent most decimal amounts exactly, so adding many of them drifts by fractions of a penny. Integers add exactly. Converting through `decimal.Decimal` avoids even the conversion error: `int(Decimal(\"1234.50\") * 100)`.",
        },
      ],
    },
    {
      label: "parse errors are data",
      blocks: [
        {
          kind: "p",
          text: "A pipeline should never crash on one bad record, and never lose one silently. Collect failures as records of their own: `{\"line\": 3, \"error\": \"not valid JSON\"}`. Then the run reports “4 parsed, 1 failed”, and the failures can be fixed at the source.",
        },
      ],
    },
  ],

  example: {
    caption: "Parsing events.jsonl (in the Files list), keeping the failures. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import json\nfrom datetime import datetime, timezone\nfrom decimal import Decimal, InvalidOperation\n\nparsed, failed = [], []\nwith open("events.jsonl", encoding="utf-8") as f:\n    for number, line in enumerate(f, start=1):\n        try:\n            raw = json.loads(line)\n        except json.JSONDecodeError:\n            failed.append({"line": number, "error": "not valid JSON"})\n            continue\n        record = {\n            "event": raw["event"].strip().lower(),\n            "user": raw["user"].strip().upper(),\n            "ts": datetime.fromisoformat(raw["ts"]).astimezone(timezone.utc).isoformat(),\n        }\n        if "amount" in raw:\n            try:\n                record["amount_cents"] = int(Decimal(raw["amount"].replace("£", "").replace(",", "")) * 100)\n            except InvalidOperation:\n                failed.append({"line": number, "error": f"bad amount {raw[\'amount\']!r}"})\n                continue\n        parsed.append(record)\n\nfor r in parsed:\n    print(r)\nprint("failed:", failed)',
  },

  walkthrough: [
    {
      title: "One line at a time",
      text: "The third line isn't JSON, but because each line is parsed separately the others are fine.",
      code: 'import json\nwith open("events.jsonl", encoding="utf-8") as f:\n    for number, line in enumerate(f, start=1):\n        try:\n            print(number, json.loads(line)["event"])\n        except json.JSONDecodeError as error:\n            print(number, "not JSON:", error.msg)',
    },
    {
      title: "Canonical identifiers and categories",
      text: "Three spellings of one user, and two of one event type, become one each.",
      code: 'users = [" U-07 ", "u-07", "U-07"]\nevents = ["Purchase", "purchase ", "PURCHASE"]\nprint({u.strip().upper() for u in users})\nprint({e.strip().lower() for e in events})',
    },
    {
      title: "Money as integer cents",
      text: "Adding 0.1 ten times, one at a time as a pipeline does, doesn't reach exactly 1; adding 10 cents ten times is exactly 100. `Decimal` converts text without float error.",
      code: 'from decimal import Decimal\ntotal = 0.0\nfor _ in range(10):\n    total += 0.1\nprint(total, total == 1.0, sum([10] * 10) == 100)\nfor text in ["£1,234.50", "12", "0.07"]:\n    clean = text.replace("£", "").replace(",", "")\n    print(text, "->", int(Decimal(clean) * 100))',
    },
    {
      title: "Times in UTC",
      text: "Each timestamp keeps its moment but is written in UTC, so they compare and sort correctly.",
      code: 'from datetime import datetime, timezone\nfor ts in ["2026-10-14T09:30:00+01:00", "2026-10-14T08:00:00Z", "2026-10-14T23:45:00-05:00"]:\n    print(ts, "->", datetime.fromisoformat(ts).astimezone(timezone.utc).isoformat())',
    },
  ],

  mistakes: [
    {
      title: "Parsing the whole file as one JSON document",
      text: "A JSON-lines file isn't one JSON value, so `json.load` fails on the second line: `JSONDecodeError`. Nothing at all is read.",
      code: 'import json\nwith open("events.jsonl", encoding="utf-8") as f:\n    events = json.load(f)',
      raises: "JSONDecodeError",
      fix: "Parse each line separately with `json.loads(line)`.",
    },
    {
      title: "Money as floats",
      text: "Three charges of £0.10 should total exactly £0.30, but the float total isn't equal to 0.3.",
      code: "charges = [0.1, 0.1, 0.1]\ntotal = 0\nfor c in charges:\n    total += c\nprint(total, total == 0.3)",
      fix: "Store and add amounts as integer cents: `[10, 10, 10]` totals exactly `30`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Parse money into cents",
      prompt:
        "Write `to_cents(text)`, which converts amounts like `\"£1,234.50\"`, `\"12\"`, `\" 0.07 \"` or `\"-3.10\"` into an **int** number of cents. Remove a leading `£` and thousands commas, and ignore surrounding spaces. More than 2 decimal places, or anything that isn't a number, raises `ValueError`. Use `decimal.Decimal`, not `float`.",
      looksFor: [
        "Valid amounts become exact integer cents.",
        "`£` and thousands separators are removed; spaces are ignored.",
        "Bad text and more than 2 decimal places raise `ValueError`.",
      ],
      starter: "from decimal import Decimal, InvalidOperation\n\n\ndef to_cents(text):\n    # Return the amount as an int number of cents.\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "to_cents",
            cases: [
              { args: [s("£1,234.50")], expected: i(123450) },
              { args: [s("12")], expected: i(1200) },
              { args: [s(" 0.07 ")], expected: i(7) },
              { args: [s("-3.10")], expected: i(-310) },
              { args: [s("twelve")], raises: "ValueError" },
              { args: [s("1.005")], raises: "ValueError" },
              { args: [s("0.29")], expected: i(29), hidden: true },
              { args: [s("£19.99")], expected: i(1999), hidden: true },
              { args: [s("")], raises: "ValueError", hidden: true },
            ],
            tip: 'Decimal(clean) raises InvalidOperation for bad text; catch it and raise ValueError. Check amount.as_tuple().exponent >= -2 for at most 2 decimal places.',
          },
        ],
      },
      hints: [
        'clean = text.strip().replace("£", "").replace(",", "").',
        "try: amount = Decimal(clean) except InvalidOperation: raise ValueError(...). Decimal keeps the exact digits.",
        "If amount.as_tuple().exponent < -2 there are more than 2 decimal places; otherwise return int(amount * 100).",
      ],
      answer: 'from decimal import Decimal, InvalidOperation\n\n\ndef to_cents(text):\n    """Convert money text like "£1,234.50" to an int number of cents."""\n    clean = text.strip().replace("£", "").replace(",", "")\n    try:\n        amount = Decimal(clean)\n    except InvalidOperation:\n        raise ValueError(f"not an amount: {text!r}") from None\n    if not amount.is_finite() or amount.as_tuple().exponent < -2:\n        raise ValueError(f"amount must have at most 2 decimal places: {text!r}")\n    return int(amount * 100)',
      wrong: [
        { code: 'def to_cents(text):\n    clean = text.strip().replace("£", "").replace(",", "")\n    return int(float(clean) * 100)\n', fails: ["fn"], why: "float: 0.29 * 100 truncates to 28" },
        { code: 'from decimal import Decimal\n\ndef to_cents(text):\n    clean = text.strip().replace("£", "").replace(",", "")\n    return int(Decimal(clean) * 100)\n', fails: ["fn"], why: "InvalidOperation instead of ValueError, and 1.005 accepted" },
      ],
    },
    {
      id: "challenge-2",
      title: "Parse a JSON-lines file",
      prompt:
        "Write `parse_events(path)` for a file like `events.jsonl`. Return a tuple `(parsed, failed)`. Each parsed record is `{\"event\", \"user\", \"ts\"}` with the event lowercased, the user stripped and uppercased, and `ts` converted to UTC ISO text, plus `\"amount_cents\"` (using your idea from Challenge 1) when the line has an amount. Each failure is `{\"line\": <number from 1>, \"error\": <reason>}`: for lines that aren't JSON, and for amounts that can't be read. Keep file order.",
      looksFor: [
        "Valid lines become normalised records, in order.",
        "Lines that aren't JSON, and unreadable amounts, become failures with their line numbers.",
        "Nothing is silently dropped: parsed plus failed covers every line.",
      ],
      starter: "import json\nfrom datetime import datetime, timezone\nfrom decimal import Decimal, InvalidOperation\n\n\ndef parse_events(path):\n    # Return (parsed records, failures).\n    pass\n",
      task: {
        checks: [
          {
            kind: "expr",
            id: "parsed",
            label: "Normalised records",
            show: 'parse_events("events.jsonl")[0]',
            expr: 'parsed, failed = parse_events("events.jsonl")\nresult = parsed',
            expected: py.list(
              rec([["event", s("purchase")], ["user", s("U-07")], ["ts", s("2026-10-14T08:30:00+00:00")], ["amount_cents", i(123450)]]),
              rec([["event", s("signup")], ["user", s("U-09")], ["ts", s("2026-10-14T08:00:00+00:00")]]),
              rec([["event", s("purchase")], ["user", s("U-07")], ["ts", s("2026-10-15T04:45:00+00:00")], ["amount_cents", i(1200)]]),
            ),
            tip: 'ts: datetime.fromisoformat(raw["ts"]).astimezone(timezone.utc).isoformat(). Only add amount_cents when "amount" is in the line.',
          },
          {
            kind: "expr",
            id: "failed",
            label: "Failures keep their line numbers",
            show: 'parse_events("events.jsonl")[1]',
            expr: 'parsed, failed = parse_events("events.jsonl")\nresult = [f["line"] for f in failed], all(isinstance(f.get("error"), str) and f["error"] for f in failed)',
            expected: py.tuple(py.list(i(3), i(5)), py.bool(true)),
            tip: "enumerate(f, start=1) gives line numbers. Catch json.JSONDecodeError for bad lines, and InvalidOperation (or ValueError) for bad amounts.",
          },
          {
            kind: "expr",
            id: "blank",
            label: "Blank lines are skipped, not failures",
            hidden: true,
            expr: 'with open("blank.jsonl", "w", encoding="utf-8") as _f:\n    _f.write(\'{"event": "View", "user": "a", "ts": "2026-01-01T00:00:00Z"}\\n\\n\')\nparsed, failed = parse_events("blank.jsonl")\nresult = (len(parsed), failed)',
            expected: py.tuple(i(1), py.list()),
          },
        ],
      },
      hints: [
        "for number, line in enumerate(f, start=1): skip blank lines with if not line.strip(): continue.",
        'try: raw = json.loads(line) except json.JSONDecodeError: failed.append({"line": number, "error": "not valid JSON"}); continue.',
        'Build the record, then if "amount" in raw: convert with Decimal; on InvalidOperation append a failure and continue.',
      ],
      answer: 'import json\nfrom datetime import datetime, timezone\nfrom decimal import Decimal, InvalidOperation\n\n\ndef to_cents(text):\n    clean = text.strip().replace("£", "").replace(",", "")\n    try:\n        amount = Decimal(clean)\n    except InvalidOperation:\n        raise ValueError(f"not an amount: {text!r}") from None\n    if not amount.is_finite() or amount.as_tuple().exponent < -2:\n        raise ValueError(f"too many decimal places: {text!r}")\n    return int(amount * 100)\n\n\ndef parse_events(path):\n    """Parse a JSON-lines file into normalised records; return (parsed, failed)."""\n    parsed, failed = [], []\n    with open(path, encoding="utf-8") as f:\n        for number, line in enumerate(f, start=1):\n            if not line.strip():\n                continue\n            try:\n                raw = json.loads(line)\n            except json.JSONDecodeError:\n                failed.append({"line": number, "error": "not valid JSON"})\n                continue\n            record = {\n                "event": raw["event"].strip().lower(),\n                "user": raw["user"].strip().upper(),\n                "ts": datetime.fromisoformat(raw["ts"]).astimezone(timezone.utc).isoformat(),\n            }\n            if "amount" in raw:\n                try:\n                    record["amount_cents"] = to_cents(raw["amount"])\n                except ValueError as error:\n                    failed.append({"line": number, "error": str(error)})\n                    continue\n            parsed.append(record)\n    return parsed, failed',
      wrong: [
        { code: 'import json\nfrom datetime import datetime, timezone\n\ndef parse_events(path):\n    parsed, failed = [], []\n    with open(path, encoding="utf-8") as f:\n        for number, line in enumerate(f, start=1):\n            try:\n                raw = json.loads(line)\n                record = {"event": raw["event"].strip().lower(), "user": raw["user"].strip().upper(), "ts": datetime.fromisoformat(raw["ts"]).astimezone(timezone.utc).isoformat()}\n                if "amount" in raw:\n                    record["amount_cents"] = int(float(raw["amount"].replace("£", "").replace(",", "")) * 100)\n                parsed.append(record)\n            except Exception:\n                pass\n    return parsed, failed\n', fails: ["failed"], why: "silently drops bad lines" },
        { code: 'import json\n\ndef parse_events(path):\n    parsed, failed = [], []\n    with open(path, encoding="utf-8") as f:\n        for number, line in enumerate(f, start=1):\n            if not line.strip():\n                continue\n            try:\n                raw = json.loads(line)\n            except json.JSONDecodeError:\n                failed.append({"line": number, "error": "not valid JSON"})\n                continue\n            if "amount" in raw and not raw["amount"].replace("£", "").replace(",", "").replace(".", "").isdigit():\n                failed.append({"line": number, "error": "bad amount"})\n                continue\n            record = {"event": raw["event"].strip().lower(), "user": raw["user"].strip().upper(), "ts": raw["ts"]}\n            if "amount" in raw:\n                record["amount_cents"] = int(raw["amount"].replace("£", "").replace(",", "").replace(".", ""))\n            parsed.append(record)\n    return parsed, failed\n', fails: ["parsed"], why: "timestamps not converted, and cents by deleting the point" },
      ],
    },
  ],

  quiz: [
    {
      id: "cents",
      prompt: "Why store money as integer cents in a pipeline?",
      options: [
        { text: "Integers add exactly; floats like 0.1 can't be stored exactly, so totals drift", correct: true, why: "Cents keep sums and comparisons exact, which reconciliation depends on." },
        { text: "Integers take less space", why: "Size isn't the reason; exactness is." },
        { text: "JSON can't store decimals", why: "It can; the problem is how floats represent them." },
        { text: "So amounts can't be negative", why: "Integers can be negative; refunds are fine." },
      ],
    },
    {
      id: "jsonl",
      prompt: "A 10,000-line JSON-lines file has one corrupt line. What should a robust parser do?",
      options: [
        { text: "Parse the other 9,999 lines, and record the bad line's number and the reason", correct: true, why: "Nothing is lost silently, and the failure can be fixed at the source." },
        { text: "Stop with an error and process nothing", why: "One bad line shouldn't block 9,999 good ones; record it instead." },
        { text: "Skip the bad line without saying anything", why: "Silent drops make counts wrong and hide problems." },
        { text: "Guess what the line meant", why: "Guessing invents data; report it as a failure." },
      ],
    },
  ],

  outcomes: [
    "Parse JSON-lines files one line at a time, keeping failures with their line numbers.",
    "Normalise identifiers, categories and timestamps to one canonical form.",
    "Convert money text to exact integer cents with `Decimal`.",
    "Treat parse errors as data, so nothing is lost silently.",
  ],
};
