/**
 * M21 practice: ten independent problems on dates, time zones, durations, Decimal money and regular expressions
 * (PY-L21-01 … PY-L21-05).
 *
 * Mix: 3 function implementations, 2 debugging (a reversed duration read with `.seconds`; a naive/aware cut-off
 * check), 1 validation, 2 data transformations (log lines to records; a discount split to the cent), 1 integration
 * (flight times across zones and a DST change) and 1 output prediction. Easy: 02, 03, 06. Medium: 10, 12, 13, 16, 19.
 * Hard: 20, 22.
 *
 * Fixtures: D02 invoice timestamps and wholesale prices, R01 order lines and support tickets, D11 event lines, D13
 * flight times. Functions return text, numbers, lists and tuples (never datetime or Decimal objects), so they are
 * graded by value on public and hidden cases: DST boundaries, half cents, exact cut-offs, near-miss patterns.
 * Questions that name a time zone load the tzdata package. Version 2: every question was replaced.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, pv, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const tz = ["tzdata"] as const;
const event = (time: string, type: string, actor: string, repo: string) => ({ time, type, actor, repo });

export const m21Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q21-02",
    version: 2,
    slug: "us-invoice-timestamps",
    title: "Convert US-style invoice timestamps",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: ["import-module", "strptime-call", "function-def", "function-param", "function-return", "assignment", "print-call", "unquoted-name", "top-level-indent", "print-text", "string-method"],
    prompt: "The original Online Retail II spreadsheet writes invoice times the American way, month first and without leading zeros: `12/1/2010 8:26`. A database import needs ISO 8601 text instead.",
    spec: [
      ["Function", "`invoice_timestamp(text)`"],
      ["text", "`month/day/year hour:minute`, e.g. `12/1/2010 8:26` is 1 December 2010 at 08:26"],
      ["Returns", "the ISO text from `isoformat()`, e.g. `'2010-12-01T08:26:00'`"],
      ["Errors", "text that isn't a real date in this layout raises ValueError (don't catch it)"],
    ],
    hiddenKinds: ["a leap day just after midnight", "a month number above 12", "the last minute of the year"],
    hints: [
      "Describe the layout with strptime codes: month, day, four-digit year, hour, minute.",
      "strptime accepts one-digit months, days and hours for `%m`, `%d` and `%H`.",
      "`isoformat()` writes the date and time with a `T` between them and the seconds included.",
    ],
    explanation: "`datetime.strptime(text, \"%m/%d/%Y %H:%M\")` reads month-first dates, including one-digit fields, and `isoformat()` produces the unambiguous `YYYY-MM-DDTHH:MM:SS` form. Reading the text day-first turns 1 December into 12 January without any error on dates up to the 12th, which is why the layout has to come from knowing the source, not guessing.",
    code: {
      starter: src`
from datetime import datetime

def invoice_timestamp(text):
    return text

print(invoice_timestamp("12/1/2010 8:26"))
`,
      answer: src`
from datetime import datetime

def invoice_timestamp(text):
    moment = datetime.strptime(text, "%m/%d/%Y %H:%M")
    return moment.isoformat()

print(invoice_timestamp("12/1/2010 8:26"))
`,
      alternatives: [
        src`
from datetime import datetime

def invoice_timestamp(text):
    return datetime.strptime(text.strip(), "%m/%d/%Y %H:%M").strftime("%Y-%m-%dT%H:%M:%S")
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime

def invoice_timestamp(text):
    return datetime.strptime(text, "%d/%m/%Y %H:%M").isoformat()
`,
          fails: ["returns"],
          why: "reading day-first turns 12/1 into 12 January",
        },
        {
          code: src`
from datetime import datetime

def invoice_timestamp(text):
    return str(datetime.strptime(text, "%m/%d/%Y %H:%M"))
`,
          fails: ["returns"],
          why: "`str` puts a space between date and time, not the ISO `T`",
        },
      ],
      task: {
        checks: [
          fn("returns", "invoice_timestamp", [
            example(["12/1/2010 8:26"], "2010-12-01T08:26:00"),
            example(["1/18/2011 10:01"], "2011-01-18T10:01:00"),
            example(["12/9/2011 12:50"], "2011-12-09T12:50:00"),
            hiddenCase("a leap day just after midnight", ["2/29/2012 0:05"], "2012-02-29T00:05:00"),
            raisesCase(["13/1/2011 9:00"], "ValueError", { label: "a month number above 12" }),
            hiddenCase("the last minute of the year", ["12/31/2010 23:59"], "2010-12-31T23:59:00"),
          ], { label: "invoice_timestamp() converts month-first text to ISO" }),
        ],
      },
    },
  },
  {
    id: "PY-Q21-03",
    version: 2,
    slug: "fix-the-response-time",
    title: "Fix the support response time",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["import-module", "strptime-call", "timedelta-call", "date-span", "function-def", "function-param", "function-return", "assignment", "arithmetic", "print-call", "unquoted-name", "top-level-indent", "print-several", "print-text"],
    prompt: "`response_hours` should say how many hours support took to answer a ticket. A ticket answered two hours after it was opened shows `22.0`, and one answered after three days shows less than a day. Fix it.",
    spec: [
      ["Function", "`response_hours(opened_at, answered_at)`"],
      ["Inputs", "timestamps like `2025-03-03 09:15`; the answer is never before the opening"],
      ["Returns", "the hours from opening to answer, as a float (90 minutes is 1.5)"],
    ],
    hiddenKinds: ["an answer more than a day later", "an answer in the same minute", "an answer across midnight"],
    hints: [
      "Print the timedelta itself, before anything is read from it. Is it positive?",
      "Later minus earlier gives a positive duration. Then think about what `.seconds` leaves out.",
      "`total_seconds()` covers the entire duration, days included.",
    ],
    explanation: "Two bugs. The subtraction is backwards, so the duration is negative: `-1 day, 22:00:00`, whose `.seconds` is 79200, hence 22 hours. And `.seconds` ignores whole days even for a positive duration. `(answered - opened).total_seconds() / 3600` fixes both. Swapping the subtraction alone still loses whole days; switching to `total_seconds()` alone gives negative hours.",
    code: {
      starter: src`
from datetime import datetime

def response_hours(opened_at, answered_at):
    opened = datetime.strptime(opened_at, "%Y-%m-%d %H:%M")
    answered = datetime.strptime(answered_at, "%Y-%m-%d %H:%M")
    gap = opened - answered
    return gap.seconds / 3600

print(response_hours("2025-03-03 09:15", "2025-03-03 11:15"))
`,
      answer: src`
from datetime import datetime

def response_hours(opened_at, answered_at):
    opened = datetime.strptime(opened_at, "%Y-%m-%d %H:%M")
    answered = datetime.strptime(answered_at, "%Y-%m-%d %H:%M")
    gap = answered - opened
    return gap.total_seconds() / 3600

print(response_hours("2025-03-03 09:15", "2025-03-03 11:15"))
`,
      alternatives: [
        src`
from datetime import datetime, timedelta

def response_hours(opened_at, answered_at):
    layout = "%Y-%m-%d %H:%M"
    gap = datetime.strptime(answered_at, layout) - datetime.strptime(opened_at, layout)
    return gap / timedelta(hours=1)
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime

def response_hours(opened_at, answered_at):
    opened = datetime.strptime(opened_at, "%Y-%m-%d %H:%M")
    answered = datetime.strptime(answered_at, "%Y-%m-%d %H:%M")
    gap = answered - opened
    return gap.seconds / 3600
`,
          fails: ["returns"],
          why: "the direction is fixed, but `.seconds` still drops the whole days",
        },
        {
          code: src`
from datetime import datetime

def response_hours(opened_at, answered_at):
    opened = datetime.strptime(opened_at, "%Y-%m-%d %H:%M")
    answered = datetime.strptime(answered_at, "%Y-%m-%d %H:%M")
    gap = opened - answered
    return gap.total_seconds() / 3600
`,
          fails: ["returns"],
          why: "the total is right in size but negative, because the subtraction is still backwards",
        },
      ],
      task: {
        checks: [
          fn("returns", "response_hours", [
            example(["2025-03-03 09:15", "2025-03-03 11:15"], py.float(2)),
            example(["2025-03-03 09:15", "2025-03-03 10:45"], 1.5),
            hiddenCase("an answer more than a day later", ["2025-03-03 09:15", "2025-03-06 10:15"], py.float(73)),
            hiddenCase("an answer in the same minute", ["2025-03-03 09:15", "2025-03-03 09:15"], py.float(0)),
            hiddenCase("an answer across midnight", ["2025-03-03 23:30", "2025-03-04 00:15"], 0.75),
          ], { label: "response_hours() measures the full time to answer" }),
        ],
      },
    },
  },
  {
    id: "PY-Q21-06",
    version: 2,
    slug: "invalid-sku-codes",
    title: "Find the invalid SKU codes",
    format: "validation",
    difficulty: "easy",
    minutes: 8,
    requires: ["import-module", "regex-call", "regex-fullmatch", "function-def", "function-param", "function-return", "assignment", "for-loop", "if-statement", "identity", "none-value", "list-literal", "list-mutate", "print-call", "unquoted-name", "top-level-indent", "comp-if", "list-comp", "list-index", "logical", "membership", "print-several", "print-text", "string-index"],
    prompt: "A supplier's price list must use Runtime Market SKUs: three capital letters, a dash and five digits, like `HOM-52782`. Before importing it, list the codes that don't have exactly that shape.",
    spec: [
      ["Function", "`bad_skus(codes)`"],
      ["Valid", "exactly `[A-Z]{3}-\\d{5}` for the whole code: no spaces, no extra characters before or after"],
      ["Returns", "a new list of the invalid codes, in their original order; `[]` when all are valid"],
    ],
    hiddenKinds: ["a sixth digit", "an extra letter in front", "lower-case letters", "an empty code", "an empty list"],
    hints: [
      "Test each code against the pattern and keep the ones that fail.",
      "The whole code must have the shape, not just part of it.",
      "`re.search` and `re.match` accept a valid piece followed by extra text; `re.fullmatch` doesn't.",
    ],
    explanation: "`re.fullmatch(r\"[A-Z]{3}-\\d{5}\", code)` is None unless the entire code has the shape, so trailing spaces, a sixth digit or a prefix all fail. `re.search` would find `HOM-52782` inside `XHOM-52782` or `HOM-527821`, and `re.match` anchors only the start, so it still accepts the extra digit.",
    code: {
      starter: src`
import re

def bad_skus(codes):
    return []

print(bad_skus(["HOM-52782", "hom-52782", "BOO-5841", "GRO-63674 "]))
`,
      answer: src`
import re

def bad_skus(codes):
    bad = []
    for code in codes:
        if re.fullmatch(r"[A-Z]{3}-\d{5}", code) is None:
            bad.append(code)
    return bad

print(bad_skus(["HOM-52782", "hom-52782", "BOO-5841", "GRO-63674 "]))
`,
      alternatives: [
        src`
import re

SKU = re.compile(r"[A-Z]{3}-[0-9]{5}")

def bad_skus(codes):
    return [code for code in codes if not SKU.fullmatch(code)]
`,
      ],
      wrong: [
        {
          code: src`
import re

def bad_skus(codes):
    bad = []
    for code in codes:
        if re.search(r"[A-Z]{3}-\d{5}", code) is None:
            bad.append(code)
    return bad
`,
          fails: ["returns"],
          why: "`search` accepts a valid piece inside a longer code, including the trailing space",
        },
        {
          code: src`
import re

def bad_skus(codes):
    bad = []
    for code in codes:
        if re.match(r"[A-Z]{3}-\d{5}", code) is None:
            bad.append(code)
    return bad
`,
          fails: ["returns"],
          why: "`match` only anchors the start, so a sixth digit or a trailing space slips through",
        },
        {
          code: src`
import re

def bad_skus(codes):
    bad = []
    for code in codes:
        if re.fullmatch(r"[A-Za-z]{3}-\d{5}", code) is None:
            bad.append(code)
    return bad
`,
          fails: ["returns"],
          why: "lower-case letters are accepted, but SKUs are capitals only",
        },
      ],
      task: {
        checks: [
          fn("returns", "bad_skus", [
            example([["HOM-52782", "hom-52782", "BOO-5841", "GRO-63674 "]], ["hom-52782", "BOO-5841", "GRO-63674 "]),
            example([["HOM-52782", "ELE-24781"]], []),
            example([[]], []),
            hiddenCase("a sixth digit", [["HOM-527821", "TOY-54564"]], ["HOM-527821"]),
            hiddenCase("an extra letter in front", [["XHOM-52782"]], ["XHOM-52782"]),
            hiddenCase("lower-case letters", [["Boo-58412", "BOO-58412"]], ["Boo-58412"]),
            hiddenCase("an empty code", [[""]], [""]),
          ], { label: "bad_skus() lists every code without the exact SKU shape" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q21-10",
    version: 2,
    slug: "invoice-totals-in-decimal",
    title: "Invoice totals to the cent",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["import-module", "decimal-call", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "arithmetic", "string-method", "membership", "dict-literal", "dict-lookup", "dict-store", "dict-iterate", "tuple-unpack", "continue-statement", "print-call", "unquoted-name", "top-level-indent", "conversion", "defaultdict-call", "dict-comp", "list-index", "list-literal", "list-mutate", "logical", "nested-index", "precedence", "string-format", "string-index", "truthiness"],
    prompt: "Wholesale prices in the Online Retail data sometimes have three decimals (`0.425` a unit). Totals must be exact: add each invoice's lines up exactly and round only the invoice total, half up, to the cent.",
    spec: [
      ["Function", "`invoice_totals(lines)`"],
      ["lines", "dictionaries with `invoice` (text), `quantity` (int) and `price` (text like `\"2.55\"` or `\"0.425\"`)"],
      ["Returns", "a dictionary from each invoice to its total as text with two decimals, e.g. `{'536365': '15.30'}`"],
      ["Rules", "invoices starting with `C` are cancellations and are left out; round the **total** once (half up), not each line"],
    ],
    hiddenKinds: ["two lines whose rounded amounts would add up to an extra cent", "a total that is exactly half a cent", "only cancellations", "an empty list"],
    hints: [
      "Keep a running Decimal total per invoice (start each new invoice at `Decimal(\"0\")`).",
      "Add `Decimal(price) * quantity` for each line, skipping cancellations.",
      "After all lines are added, quantize each total to `Decimal(\"0.01\")` with ROUND_HALF_UP and turn it into text.",
    ],
    explanation: "Summing exact Decimal amounts and rounding once at the end is what an invoice total means; rounding every line first can add or lose a cent (0.425 + 0.425 is 0.85, but 0.43 + 0.43 is 0.86). Floats add their own error: 1.005 is stored as 1.00499…, which formats as 1.00. The default Decimal rounding (half to even) would also give 1.00.",
    code: {
      starter: src`
from decimal import Decimal, ROUND_HALF_UP

def invoice_totals(lines):
    return {}

lines = [
    {"invoice": "536365", "quantity": 6, "price": "2.55"},
    {"invoice": "536365", "quantity": 6, "price": "3.39"},
    {"invoice": "536366", "quantity": 6, "price": "1.85"},
    {"invoice": "C536379", "quantity": -1, "price": "27.50"},
]
print(invoice_totals(lines))
`,
      answer: src`
from decimal import Decimal, ROUND_HALF_UP

def invoice_totals(lines):
    sums = {}
    for line in lines:
        invoice = line["invoice"]
        if invoice.startswith("C"):
            continue
        if invoice not in sums:
            sums[invoice] = Decimal("0")
        sums[invoice] += Decimal(line["price"]) * line["quantity"]
    totals = {}
    for invoice, amount in sums.items():
        totals[invoice] = str(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
    return totals

lines = [
    {"invoice": "536365", "quantity": 6, "price": "2.55"},
    {"invoice": "536365", "quantity": 6, "price": "3.39"},
    {"invoice": "536366", "quantity": 6, "price": "1.85"},
    {"invoice": "C536379", "quantity": -1, "price": "27.50"},
]
print(invoice_totals(lines))
`,
      alternatives: [
        src`
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP

def invoice_totals(lines):
    sums = defaultdict(Decimal)
    for line in lines:
        if line["invoice"][0] != "C":
            sums[line["invoice"]] += line["quantity"] * Decimal(line["price"])
    return {inv: f"{total.quantize(Decimal('0.01'), ROUND_HALF_UP)}" for inv, total in sums.items()}
`,
      ],
      wrong: [
        {
          code: src`
from decimal import Decimal, ROUND_HALF_UP

def invoice_totals(lines):
    totals = {}
    for line in lines:
        if line["invoice"].startswith("C"):
            continue
        amount = (Decimal(line["price"]) * line["quantity"]).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        totals[line["invoice"]] = totals.get(line["invoice"], Decimal("0")) + amount
    result = {}
    for invoice, amount in totals.items():
        result[invoice] = str(amount)
    return result
`,
          fails: ["returns"],
          why: "rounding every line before adding gives 0.86 for two lines of 0.425",
        },
        {
          code: src`
def invoice_totals(lines):
    totals = {}
    for line in lines:
        if line["invoice"].startswith("C"):
            continue
        totals[line["invoice"]] = totals.get(line["invoice"], 0) + float(line["price"]) * line["quantity"]
    result = {}
    for invoice, amount in totals.items():
        result[invoice] = f"{amount:.2f}"
    return result
`,
          fails: ["returns"],
          why: "the float 1.005 is really 1.00499…, so it is written as 1.00",
        },
        {
          code: src`
from decimal import Decimal

def invoice_totals(lines):
    sums = {}
    for line in lines:
        if line["invoice"].startswith("C"):
            continue
        sums[line["invoice"]] = sums.get(line["invoice"], Decimal("0")) + Decimal(line["price"]) * line["quantity"]
    result = {}
    for invoice, amount in sums.items():
        result[invoice] = str(amount.quantize(Decimal("0.01")))
    return result
`,
          fails: ["returns"],
          why: "the default half-to-even rule rounds an exact half cent down to 1.00",
        },
      ],
      task: {
        checks: [
          fn("returns", "invoice_totals", [
            example([[{ invoice: "536365", quantity: 6, price: "2.55" }, { invoice: "536365", quantity: 6, price: "3.39" }, { invoice: "536366", quantity: 6, price: "1.85" }, { invoice: "C536379", quantity: -1, price: "27.50" }]], { "536365": "35.64", "536366": "11.10" }),
            example([[{ invoice: "536367", quantity: 32, price: "0.425" }]], { "536367": "13.60" }),
            example([[]], {}),
            hiddenCase("two lines whose rounded amounts would add up to an extra cent", [[{ invoice: "540001", quantity: 1, price: "0.425" }, { invoice: "540001", quantity: 1, price: "0.425" }]], { "540001": "0.85" }),
            hiddenCase("a total that is exactly half a cent", [[{ invoice: "540002", quantity: 1, price: "1.005" }]], { "540002": "1.01" }),
            hiddenCase("only cancellations", [[{ invoice: "C540003", quantity: -2, price: "4.95" }]], {}),
          ], { label: "invoice_totals() totals each invoice exactly and rounds once" }),
        ],
      },
    },
  },
  {
    id: "PY-Q21-12",
    version: 2,
    slug: "three-ways-to-round",
    title: "Three ways to round a half cent",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["import-module", "decimal-call", "conversion", "assignment", "list-literal", "for-loop", "string-format", "print-call", "print-several", "unquoted-name", "top-level-indent", "membership", "print-text", "string-index"],
    prompt: "Each price is an exact half cent. The program rounds it three ways: Decimal's default rule, Decimal with ROUND_HALF_UP, and a float formatted with `:.2f`. Type exactly what it prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Decimal's default rule rounds an exact half to the even neighbour.",
      "ROUND_HALF_UP always goes up on an exact half.",
      "The float is the closest binary value to the text, which may be a hair above or below the half.",
    ],
    explanation: "0.125 is exactly representable in binary, so all exact rules see a true half: half-to-even gives 0.12, half-up 0.13, and the float formatter also rounds half to even, 0.12. 0.135 rounds to 0.14 both ways (4 is even), and its float is slightly above 0.135, so 0.14 too. 2.675 rounds to 2.68 with Decimal either way (8 is even), but the float is 2.67499999…, so it prints 2.67.",
    predict: {
      program: src`
from decimal import Decimal, ROUND_HALF_UP

for text in ["0.125", "0.135", "2.675"]:
    even = Decimal(text).quantize(Decimal("0.01"))
    up = Decimal(text).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    print(even, up, f"{float(text):.2f}")
`,
      output: "0.12 0.13 0.12\n0.14 0.14 0.14\n2.68 2.68 2.67\n",
      wrongPredictions: ["0.13 0.13 0.13\n0.14 0.14 0.14\n2.68 2.68 2.68", "0.12 0.13 0.13\n0.13 0.14 0.14\n2.67 2.68 2.68", "0.12 0.13 0.12\n0.14 0.14 0.14\n2.68 2.68 2.68"],
    },
  },
  {
    id: "PY-Q21-13",
    version: 2,
    slug: "fix-the-dispatch-cutoff",
    title: "Fix the same-day dispatch cut-off",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    packages: tz,
    requires: ["import-module", "timezone-call", "zone-convert", "function-def", "function-param", "function-return", "assignment", "comparison", "print-call", "unquoted-name", "top-level-indent", "print-several", "print-text", "string-method"],
    prompt: "Orders placed before 17:00 **local time** in the warehouse's zone ship the same day. `same_day_dispatch` crashes with `TypeError: can't compare offset-naive and offset-aware datetimes`. Fix it so it answers correctly for any zone, all year.",
    spec: [
      ["Function", "`same_day_dispatch(placed_utc, cutoff_hour, zone_name)`"],
      ["placed_utc", "ISO text in UTC, like `2025-03-03T20:30:00Z`"],
      ["Returns", "`True` when the order was placed before `cutoff_hour`:00 on the warehouse clock that day, else `False`"],
      ["Rule", "an order at exactly the cut-off misses it"],
    ],
    hiddenKinds: ["summer time in New York", "exactly at the cut-off", "a zone ahead of UTC", "a UTC date that is the next local day"],
    hints: [
      "Fixing the crash by making the cut-off UTC runs, but check an order at 22:00 New York time: which day is it in UTC?",
      "The question is about the warehouse clock, so convert the order time to the warehouse zone first.",
      "Build the cut-off from that local time (same date, `cutoff_hour`, minute 0) or simply compare its hour.",
    ],
    explanation: "The starter builds a naive cut-off from the UTC date and compares it with an aware time, hence the TypeError. Giving the cut-off `timezone.utc` stops the crash but compares against 17:00 UTC (noon in New York) on the UTC date, which is the next day for evening orders. Converting the order to the warehouse zone with `astimezone(ZoneInfo(zone_name))` and comparing that local clock with the cut-off hour is right in winter, in summer and in any zone.",
    code: {
      starter: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def same_day_dispatch(placed_utc, cutoff_hour, zone_name):
    placed = datetime.fromisoformat(placed_utc)
    cutoff = datetime(placed.year, placed.month, placed.day, cutoff_hour)
    return placed < cutoff

print(same_day_dispatch("2025-03-03T20:30:00Z", 17, "America/New_York"))
`,
      answer: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def same_day_dispatch(placed_utc, cutoff_hour, zone_name):
    placed = datetime.fromisoformat(placed_utc).astimezone(ZoneInfo(zone_name))
    cutoff = placed.replace(hour=cutoff_hour, minute=0, second=0, microsecond=0)
    return placed < cutoff

print(same_day_dispatch("2025-03-03T20:30:00Z", 17, "America/New_York"))
`,
      alternatives: [
        src`
from datetime import datetime
from zoneinfo import ZoneInfo

def same_day_dispatch(placed_utc, cutoff_hour, zone_name):
    local = datetime.fromisoformat(placed_utc).astimezone(ZoneInfo(zone_name))
    return local.hour < cutoff_hour
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime, timezone

def same_day_dispatch(placed_utc, cutoff_hour, zone_name):
    placed = datetime.fromisoformat(placed_utc)
    cutoff = datetime(placed.year, placed.month, placed.day, cutoff_hour, tzinfo=timezone.utc)
    return placed < cutoff
`,
          fails: ["returns"],
          why: "the crash is gone, but the cut-off is 17:00 UTC on the UTC date, not 17:00 at the warehouse",
        },
        {
          code: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def same_day_dispatch(placed_utc, cutoff_hour, zone_name):
    placed = datetime.fromisoformat(placed_utc).astimezone(ZoneInfo(zone_name))
    cutoff = placed.replace(hour=cutoff_hour, minute=0, second=0, microsecond=0)
    return placed <= cutoff
`,
          fails: ["returns"],
          why: "an order at exactly 17:00 has missed the cut-off, but `<=` lets it through",
        },
      ],
      task: {
        packages: tz,
        checks: [
          fn("returns", "same_day_dispatch", [
            example(["2025-03-03T20:30:00Z", 17, "America/New_York"], true),
            example(["2025-03-03T22:30:00Z", 17, "America/New_York"], false),
            example(["2025-03-04T03:00:00Z", 17, "America/New_York"], false),
            hiddenCase("summer time in New York", ["2025-07-01T20:30:00Z", 17, "America/New_York"], true),
            hiddenCase("exactly at the cut-off", ["2025-03-03T22:00:00Z", 17, "America/New_York"], false),
            hiddenCase("a zone ahead of UTC", ["2025-03-03T06:30:00Z", 15, "Asia/Tokyo"], false),
            hiddenCase("an early-morning local order", ["2025-03-03T23:30:00Z", 12, "Asia/Tokyo"], true),
          ], { label: "same_day_dispatch() compares with the cut-off on the warehouse clock" }),
        ],
      },
    },
  },
  {
    id: "PY-Q21-16",
    version: 2,
    slug: "parse-event-log-lines",
    title: "Turn event log lines into records",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["import-module", "regex-call", "regex-fullmatch", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "identity", "none-value", "arithmetic", "dict-literal", "list-literal", "list-mutate", "tuple-literal", "continue-statement", "print-call", "unquoted-name", "top-level-indent", "len-call", "match-case", "membership", "print-several", "print-text", "truthiness"],
    prompt: "A repository service writes one event per log line: `2025-03-03T00:02:37Z PushEvent ml-koi418 tidewater/smartqueue`. Turn the well-formed lines into records and count the ones that aren't.",
    spec: [
      ["Function", "`parse_events(lines)`"],
      ["Shape", "a UTC time `YYYY-MM-DDTHH:MM:SSZ`, an event type made of letters ending in `Event`, an actor login (letters, digits, `-` or `_`), and a repository `owner/name`, separated by single spaces"],
      ["Returns", "`(records, skipped)`: a list of `{\"time\", \"type\", \"actor\", \"repo\"}` dictionaries in order, and how many lines didn't have the shape"],
    ],
    hiddenKinds: ["two spaces between fields", "a repository without an owner", "a time without the Z", "an empty list"],
    hints: [
      "One pattern with four groups, checked against the whole line.",
      "`[A-Za-z]+Event` for the type, `[\\w-]+` for the login, and `[\\w.-]+/[\\w.-]+` for the repository.",
      "When `re.fullmatch` returns None, count the line and move on; otherwise build the dictionary from the four groups.",
    ],
    explanation: "A single `re.fullmatch` with four groups both validates the line and extracts its parts. Anything that doesn't fit exactly, such as doubled spaces, a missing owner or a local time without `Z`, returns None and is counted. Splitting on spaces would accept any four words; `re.search` would accept a well-formed line with junk around it.",
    code: {
      starter: src`
import re

def parse_events(lines):
    records = []
    skipped = 0
    return (records, skipped)

print(parse_events(["2025-03-03T00:02:37Z PushEvent ml-koi418 tidewater/smartqueue", "garbage"]))
`,
      answer: src`
import re

LINE = r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) ([A-Za-z]+Event) ([\w-]+) ([\w.-]+/[\w.-]+)"

def parse_events(lines):
    records = []
    skipped = 0
    for line in lines:
        match = re.fullmatch(LINE, line)
        if match is None:
            skipped += 1
            continue
        records.append({"time": match.group(1), "type": match.group(2), "actor": match.group(3), "repo": match.group(4)})
    return (records, skipped)

print(parse_events(["2025-03-03T00:02:37Z PushEvent ml-koi418 tidewater/smartqueue", "garbage"]))
`,
      alternatives: [
        src`
import re

def parse_events(lines):
    pattern = re.compile(r"(?P<time>\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ) (?P<type>[A-Za-z]+Event) (?P<actor>[\w-]+) (?P<repo>[\w.-]+/[\w.-]+)")
    records = []
    for line in lines:
        found = pattern.fullmatch(line)
        if found:
            records.append(found.groupdict())
    return (records, len(lines) - len(records))
`,
      ],
      wrong: [
        {
          code: src`
def parse_events(lines):
    records = []
    skipped = 0
    for line in lines:
        parts = line.split()
        if len(parts) != 4:
            skipped += 1
            continue
        records.append({"time": parts[0], "type": parts[1], "actor": parts[2], "repo": parts[3]})
    return (records, skipped)
`,
            fails: ["returns"],
            why: "splitting accepts any four words, and `split()` hides doubled spaces",
          },
          {
            code: src`
import re

def parse_events(lines):
    records = []
    skipped = 0
    for line in lines:
        match = re.search(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z) ([A-Za-z]+Event) ([\w-]+) ([\w.-]+/[\w.-]+)", line)
        if match is None:
            skipped += 1
            continue
        records.append({"time": match.group(1), "type": match.group(2), "actor": match.group(3), "repo": match.group(4)})
    return (records, skipped)
`,
            fails: ["returns"],
            why: "`search` accepts a well-formed event with other text in front of it",
          },
        ],
      task: {
        checks: [
          fn("returns", "parse_events", [
            example([["2025-03-03T00:02:37Z PushEvent ml-koi418 tidewater/smartqueue", "garbage"]], py.tuple(py.list(pv(event("2025-03-03T00:02:37Z", "PushEvent", "ml-koi418", "tidewater/smartqueue"))), py.int(1))),
            example([["2025-03-03T00:05:10Z WatchEvent dev_ana tidewater/smartqueue", "2025-03-03T00:09:58Z IssuesEvent sam-ops oakline/ledger.v2"]], py.tuple(py.list(pv(event("2025-03-03T00:05:10Z", "WatchEvent", "dev_ana", "tidewater/smartqueue")), pv(event("2025-03-03T00:09:58Z", "IssuesEvent", "sam-ops", "oakline/ledger.v2"))), py.int(0))),
            example([[]], py.tuple(py.list(), py.int(0))),
            hiddenCase("two spaces between fields", [["2025-03-03T00:02:37Z  PushEvent ml-koi418 tidewater/smartqueue"]], py.tuple(py.list(), py.int(1))),
            hiddenCase("a repository without an owner", [["2025-03-03T00:02:37Z ForkEvent kai smartqueue"]], py.tuple(py.list(), py.int(1))),
            hiddenCase("a time without the Z", [["2025-03-03T00:02:37 PushEvent kai a/b", "x 2025-03-03T00:02:37Z PushEvent kai a/b"]], py.tuple(py.list(), py.int(2))),
          ], { label: "parse_events() keeps well-formed lines and counts the rest" }),
        ],
      },
    },
  },
  {
    id: "PY-Q21-19",
    version: 2,
    slug: "next-business-day",
    title: "The next business day",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 12,
    requires: ["import-module", "timedelta-call", "date-span", "function-def", "function-param", "function-return", "assignment", "reassignment", "while-loop", "comparison", "logical", "membership", "print-call", "unquoted-name", "top-level-indent", "arithmetic", "boolean", "if-statement", "list-literal", "print-several", "print-text", "strptime-call", "truthiness"],
    prompt: "Refunds are paid on the next business day after they're approved: not a Saturday or Sunday, and not a public holiday.",
    spec: [
      ["Function", "`next_business_day(day_text, holidays)`"],
      ["day_text", "`YYYY-MM-DD`, the approval date"],
      ["holidays", "a list of `YYYY-MM-DD` texts"],
      ["Returns", "the first date **after** `day_text` that is Monday–Friday and not a holiday, as `YYYY-MM-DD`"],
    ],
    hiddenKinds: ["approval on a Saturday", "a holiday on the Monday after a weekend", "two holidays in a row", "a business day followed by a business day"],
    hints: [
      "Parse the date, then step forward one day at a time with `timedelta(days=1)`.",
      "Keep stepping while the day is a weekend (`weekday()` 5 or 6) or its text is in the holidays.",
      "Always take at least one step: the answer is never the approval date itself.",
    ],
    explanation: "Starting from the day after approval and moving forward with `timedelta(days=1)` while the date is a weekend or a holiday handles any combination: a Friday becomes Monday, Christmas Eve becomes the 26th, a Monday holiday after a weekend becomes Tuesday. Checking the approval date itself, ignoring holidays, or skipping only one day each fail on some calendar.",
    code: {
      starter: src`
from datetime import date, timedelta

def next_business_day(day_text, holidays):
    return day_text

print(next_business_day("2024-12-20", []))
print(next_business_day("2024-12-24", ["2024-12-25"]))
`,
      answer: src`
from datetime import date, timedelta

def next_business_day(day_text, holidays):
    day = date.fromisoformat(day_text) + timedelta(days=1)
    while day.weekday() >= 5 or day.isoformat() in holidays:
        day = day + timedelta(days=1)
    return day.isoformat()

print(next_business_day("2024-12-20", []))
print(next_business_day("2024-12-24", ["2024-12-25"]))
`,
      alternatives: [
        src`
from datetime import datetime, timedelta

def is_business_day(day, holidays):
    return day.weekday() < 5 and day.strftime("%Y-%m-%d") not in holidays

def next_business_day(day_text, holidays):
    day = datetime.strptime(day_text, "%Y-%m-%d")
    while True:
        day += timedelta(days=1)
        if is_business_day(day, holidays):
            return day.strftime("%Y-%m-%d")
`,
      ],
      wrong: [
        {
          code: src`
from datetime import date, timedelta

def next_business_day(day_text, holidays):
    day = date.fromisoformat(day_text)
    while day.weekday() >= 5 or day.isoformat() in holidays:
        day = day + timedelta(days=1)
    return day.isoformat()
`,
          fails: ["returns"],
          why: "an approval on a business day returns that same day instead of the next one",
        },
        {
          code: src`
from datetime import date, timedelta

def next_business_day(day_text, holidays):
    day = date.fromisoformat(day_text) + timedelta(days=1)
    while day.weekday() >= 5:
        day = day + timedelta(days=1)
    return day.isoformat()
`,
          fails: ["returns"],
          why: "holidays are ignored",
        },
        {
          code: src`
from datetime import date, timedelta

def next_business_day(day_text, holidays):
    day = date.fromisoformat(day_text) + timedelta(days=1)
    if day.weekday() >= 5 or day.isoformat() in holidays:
        day = day + timedelta(days=1)
    return day.isoformat()
`,
          fails: ["returns"],
          why: "`if` skips at most one day, so a Friday approval lands on Sunday",
        },
      ],
      task: {
        checks: [
          fn("returns", "next_business_day", [
            example(["2024-12-20", []], "2024-12-23"),
            example(["2024-12-24", ["2024-12-25"]], "2024-12-26"),
            example(["2024-12-31", ["2025-01-01"]], "2025-01-02"),
            hiddenCase("approval on a Saturday", ["2024-12-21", []], "2024-12-23"),
            hiddenCase("a holiday on the Monday after a weekend", ["2025-05-23", ["2025-05-26"]], "2025-05-27"),
            hiddenCase("two holidays in a row", ["2025-12-24", ["2025-12-25", "2025-12-26"]], "2025-12-29"),
            hiddenCase("a business day followed by a business day", ["2025-03-04", ["2025-12-25"]], "2025-03-05"),
          ], { label: "next_business_day() skips weekends and holidays" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q21-20",
    version: 2,
    slug: "spread-a-discount",
    title: "Spread a discount across order lines",
    format: "data_transformation",
    difficulty: "hard",
    minutes: 25,
    requires: ["import-module", "decimal-call", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "range-call", "len-call", "arithmetic", "precedence", "conversion", "list-literal", "list-mutate", "list-index", "list-sort", "sort-key", "lambda", "tuple-literal", "aggregate-call", "print-call", "unquoted-name", "top-level-indent", "list-comp", "membership", "print-several", "print-text", "string-index", "string-slice"],
    prompt: "A 10.00 coupon applies to a whole order, but the accounts system books discounts per line. Spread the discount across the lines in proportion to their totals, in whole cents, so the line discounts add up to exactly the coupon.",
    spec: [
      ["Function", "`allocate_discount(line_totals, discount)`"],
      ["Inputs", "line totals and the discount as text with two decimals, e.g. `[\"43.77\", \"50.57\", \"39.09\"]` and `\"10.00\"`; the order total is above 0"],
      ["Step 1", "each line's exact share is `discount × line_total ÷ order_total`; round every share **down** to the cent"],
      ["Step 2", "hand the leftover cents out one at a time to the lines whose shares lost the most in rounding (the largest remainders); on a tie, the earlier line first"],
      ["Returns", "a list of texts with two decimals, one per line, that add up exactly to `discount`"],
    ],
    hiddenKinds: ["equal lines", "a single line", "a discount smaller than the number of lines", "remainders that must be compared, not positions"],
    hints: [
      "Work in Decimal throughout: compute the exact shares, then their rounded-down versions with `quantize(..., rounding=ROUND_DOWN)`.",
      "The leftover is `discount - sum(rounded)`, a whole number of cents. Each line's remainder is its exact share minus its rounded share.",
      "Sort the line positions by remainder, largest first (ties by position), and add one cent to the first `leftover` of them.",
    ],
    explanation: "This is the largest-remainder method used for allocating money. Rounding every share down guarantees the total doesn't overshoot; the leftover cents (never more than the number of lines) go where rounding hurt most, so each line ends up within a cent of its exact share and the parts add up to the whole. Rounding each share half up can overshoot or undershoot, and giving the leftovers to the first lines ignores which lines actually lost the most.",
    code: {
      starter: src`
from decimal import Decimal, ROUND_DOWN

def allocate_discount(line_totals, discount):
    return []

print(allocate_discount(["43.77", "50.57", "39.09"], "10.00"))
`,
      answer: src`
from decimal import Decimal, ROUND_DOWN

def allocate_discount(line_totals, discount):
    cent = Decimal("0.01")
    totals = [Decimal(text) for text in line_totals]
    off = Decimal(discount)
    order_total = sum(totals)
    exact = [off * t / order_total for t in totals]
    shares = [e.quantize(cent, rounding=ROUND_DOWN) for e in exact]
    leftover = int((off - sum(shares)) / cent)
    by_remainder = sorted(range(len(shares)), key=lambda i: (-(exact[i] - shares[i]), i))
    for i in by_remainder[:leftover]:
        shares[i] += cent
    return [str(share) for share in shares]

print(allocate_discount(["43.77", "50.57", "39.09"], "10.00"))
`,
      alternatives: [
        src`
from decimal import Decimal, ROUND_DOWN

def allocate_discount(line_totals, discount):
    amounts = [Decimal(t) for t in line_totals]
    whole = sum(amounts)
    cents = int(Decimal(discount) * 100)
    exact_cents = [cents * a / whole for a in amounts]
    floors = [int(x) for x in exact_cents]
    rest = cents - sum(floors)
    order = sorted(range(len(amounts)), key=lambda i: (-(exact_cents[i] - floors[i]), i))
    for i in order[:rest]:
        floors[i] += 1
    return [str((Decimal(f) / 100).quantize(Decimal("0.01"))) for f in floors]
`,
      ],
      wrong: [
        {
          code: src`
from decimal import Decimal, ROUND_HALF_UP

def allocate_discount(line_totals, discount):
    totals = [Decimal(text) for text in line_totals]
    order_total = sum(totals)
    shares = []
    for t in totals:
        share = (Decimal(discount) * t / order_total).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        shares.append(str(share))
    return shares
`,
          fails: ["returns"],
          why: "rounding each share on its own doesn't make them add up: three equal shares of 1.00 give 0.99",
        },
        {
          code: src`
from decimal import Decimal, ROUND_DOWN

def allocate_discount(line_totals, discount):
    cent = Decimal("0.01")
    totals = [Decimal(text) for text in line_totals]
    off = Decimal(discount)
    shares = [(off * t / sum(totals)).quantize(cent, rounding=ROUND_DOWN) for t in totals]
    leftover = int((off - sum(shares)) / cent)
    for i in range(leftover):
        shares[i] += cent
    return [str(share) for share in shares]
`,
          fails: ["returns"],
          why: "the leftover cents go to the first lines instead of the lines with the largest remainders",
        },
      ],
      task: {
        checks: [
          fn("returns", "allocate_discount", [
            example([["43.77", "50.57", "39.09"], "10.00"], ["3.28", "3.79", "2.93"]),
            example([["12.93"], "5.00"], ["5.00"]),
            example([["10.00", "10.00", "10.00"], "1.00"], ["0.34", "0.33", "0.33"]),
            hiddenCase("a discount smaller than the number of lines", [["1.00", "2.00"], "0.01"], ["0.00", "0.01"]),
            hiddenCase("remainders that must be compared, not positions", [["30.00", "10.00", "20.00"], "0.05"], ["0.02", "0.01", "0.02"]),
            hiddenCase("a single line with a full discount", [["71.14"], "71.14"], ["71.14"]),
          ], { label: "allocate_discount() splits the discount in proportion, adding up exactly" }),
        ],
      },
    },
  },
  {
    id: "PY-Q21-22",
    version: 2,
    slug: "flight-time-across-zones",
    title: "Flight time across time zones",
    format: "integration",
    difficulty: "hard",
    minutes: 20,
    packages: tz,
    requires: ["import-module", "strptime-call", "timezone-call", "zone-convert", "timedelta-call", "date-span", "function-def", "function-param", "function-return", "assignment", "arithmetic", "conversion", "print-call", "unquoted-name", "top-level-indent", "precedence", "print-several", "print-text", "reassignment", "string-method"],
    prompt: "Airline timetables give departure and arrival in each airport's **local** time. The flight data team needs the real time in the air between them, in minutes, which has to account for the zones and for daylight saving.",
    spec: [
      ["Function", "`air_minutes(departure, dep_zone, arrival, arr_zone)`"],
      ["Inputs", "local clock times `YYYY-MM-DD HH:MM` and the IANA zone of each airport, e.g. `\"America/Los_Angeles\"`"],
      ["Returns", "the whole number of minutes between the two moments, as an int"],
      ["Example", "Las Vegas 00:59 to Houston 05:56 on 10 January 2025 → `177`"],
    ],
    hiddenKinds: ["a flight across the night daylight saving starts", "a transatlantic flight in summer", "an eastbound flight across midnight"],
    hints: [
      "Each clock reading only means a moment once its own zone is attached.",
      "Parse both texts, attach `ZoneInfo(dep_zone)` and `ZoneInfo(arr_zone)` with `replace(tzinfo=...)`.",
      "Subtract the aware times and convert the duration with `total_seconds()`; 60 seconds make a minute.",
    ],
    explanation: "Subtracting two aware datetimes in different zones compares the real moments, so the zones and their daylight-saving rules on those dates are all taken into account. Subtracting the naive clock readings ignores the zones, and fixed offsets (Los Angeles is −8) break on the night the clocks change. `.seconds` would also break for any flight over 24 hours.",
    code: {
      starter: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def air_minutes(departure, dep_zone, arrival, arr_zone):
    return 0

print(air_minutes("2025-01-10 00:59", "America/Los_Angeles", "2025-01-10 05:56", "America/Chicago"))
`,
      answer: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def air_minutes(departure, dep_zone, arrival, arr_zone):
    left = datetime.strptime(departure, "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo(dep_zone))
    landed = datetime.strptime(arrival, "%Y-%m-%d %H:%M").replace(tzinfo=ZoneInfo(arr_zone))
    return int((landed - left).total_seconds() // 60)

print(air_minutes("2025-01-10 00:59", "America/Los_Angeles", "2025-01-10 05:56", "America/Chicago"))
`,
      alternatives: [
        src`
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

def to_utc(text, zone):
    local = datetime.fromisoformat(text).replace(tzinfo=ZoneInfo(zone))
    return local.astimezone(timezone.utc)

def air_minutes(departure, dep_zone, arrival, arr_zone):
    return int((to_utc(arrival, arr_zone) - to_utc(departure, dep_zone)) / timedelta(minutes=1))
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime

def air_minutes(departure, dep_zone, arrival, arr_zone):
    left = datetime.strptime(departure, "%Y-%m-%d %H:%M")
    landed = datetime.strptime(arrival, "%Y-%m-%d %H:%M")
    return int((landed - left).total_seconds() // 60)
`,
          fails: ["returns"],
          why: "subtracting the clock readings ignores that the airports are in different zones",
        },
        {
          code: src`
from datetime import datetime, timedelta, timezone

OFFSETS = {"America/Los_Angeles": -8, "America/Denver": -7, "America/Chicago": -6, "America/New_York": -5, "Europe/London": 0}

def air_minutes(departure, dep_zone, arrival, arr_zone):
    left = datetime.strptime(departure, "%Y-%m-%d %H:%M").replace(tzinfo=timezone(timedelta(hours=OFFSETS[dep_zone])))
    landed = datetime.strptime(arrival, "%Y-%m-%d %H:%M").replace(tzinfo=timezone(timedelta(hours=OFFSETS[arr_zone])))
    return int((landed - left).total_seconds() // 60)
`,
          fails: ["returns"],
          why: "fixed winter offsets are wrong once daylight saving starts",
        },
      ],
      task: {
        packages: tz,
        checks: [
          fn("returns", "air_minutes", [
            example(["2025-01-10 00:59", "America/Los_Angeles", "2025-01-10 05:56", "America/Chicago"], 177),
            example(["2025-01-10 05:00", "America/Chicago", "2025-01-10 09:14", "America/New_York"], 194),
            example(["2025-01-10 05:10", "America/Los_Angeles", "2025-01-10 08:07", "America/Denver"], 117),
            hiddenCase("a flight across the night daylight saving starts", ["2025-03-08 23:30", "America/Los_Angeles", "2025-03-09 07:10", "America/New_York"], 220),
            hiddenCase("a transatlantic flight in summer", ["2025-07-01 18:30", "Europe/London", "2025-07-01 21:25", "America/New_York"], 475),
            hiddenCase("an eastbound flight across midnight", ["2025-01-10 22:40", "America/Denver", "2025-01-11 04:05", "America/New_York"], 205),
          ], { label: "air_minutes() measures the real time between two local clock readings" }),
        ],
      },
    },
  },
];

