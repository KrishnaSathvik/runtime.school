/**
 * M21 Dates, Numbers & Regex: five lessons (PY-L21-01 … PY-L21-05).
 *
 * Text that means something more specific than text. Timestamps are parsed with datetime.strptime and written with
 * strftime; time zones are real IANA zones from zoneinfo (the browser runner loads the tzdata package for them, so
 * every lesson and task that names a zone declares `packages: ["tzdata"]`), converted with astimezone, including
 * daylight-saving changes; durations are timedelta values (and `.seconds` is not the total); money uses Decimal with
 * an explicit quantize rounding rule; and patterns use re.search, findall, sub and fullmatch with groups.
 *
 * Fixtures are R01 order timestamps, delivery estimates and line prices, D11 event times, D02 descriptions and
 * support messages. Functions return text or numbers (never datetime or Decimal objects), so they can be graded by
 * value with public and hidden cases, including DST boundaries, half-cent rounding and near-miss patterns.
 * Version 2: rewritten from a print-the-year module.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const tz = ["tzdata"] as const;

const weekendOrders = [
  { order_id: "O104839", ordered_at: "2024-08-23 04:08:40" },
  { order_id: "O108752", ordered_at: "2024-12-21 19:58:19" },
  { order_id: "O108024", ordered_at: "2024-12-03 23:16:00" },
  { order_id: "O108800", ordered_at: "2024-12-22 09:15:00" },
];

const deliveries = [
  { order_id: "O100043", ordered_at: "2024-01-03 18:35:10", delivered_at: "2024-01-07 11:00:39" },
  { order_id: "O101217", ordered_at: "2024-03-13 17:16:09", delivered_at: "2024-03-17 10:00:58" },
  { order_id: "O108024", ordered_at: "2024-12-03 23:16:00", delivered_at: "" },
];

const shipments = [
  { order_id: "O100043", ordered_at: "2024-01-03 18:35:10", shipped_at: "2024-01-06 04:58:19" },
  { order_id: "O101217", ordered_at: "2024-03-13 17:16:09", shipped_at: "2024-03-14 05:45:05" },
  { order_id: "O104839", ordered_at: "2024-08-23 04:08:40", shipped_at: "2024-08-23 16:06:22" },
  { order_id: "O108024", ordered_at: "2024-12-03 23:16:00", shipped_at: "2024-12-05 11:10:50" },
  { order_id: "O108752", ordered_at: "2024-12-21 19:58:19", shipped_at: "2024-12-23 12:33:40" },
  { order_id: "O108800", ordered_at: "2024-12-22 09:15:00", shipped_at: "" },
];

const pair = (id: string, hours: number) => py.tuple(py.str(id), py.int(hours));

export const m21Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L21-01 strptime / strftime
  {
    id: "PY-L21-01",
    version: 2,
    slug: "read-a-date",
    title: "Read and write dates and times",
    lede: "A timestamp in a file is just text. `datetime.strptime` reads it with a format you spell out, giving a value you can ask for its weekday or compare; `strftime` writes it back in any layout.",
    focus: "Turn date and time text into datetime values with strptime, and format them back into text with strftime.",
    minutes: 18,
    objectives: [
      "Parse timestamps with `datetime.strptime(text, format)` using `%Y %m %d %H %M %S`",
      "Read parts of a datetime (`year`, `month`, `weekday()`) and format it with `strftime`",
      "Recognise the ValueError for text that doesn't match, and the silent `%m`/`%M` mix-up",
    ],
    requires: ["import-module", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "comparison", "logical", "dict-literal", "dict-lookup", "dict-store", "dict-get", "list-literal", "list-mutate", "string-method", "string-format", "try-except", "except-type", "raise-stmt", "continue-statement", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "arithmetic", "none-value", "conversion", "membership", "identity", "list-index", "string-index", "tuple-literal"],
    teaches: ["strptime-call"],
    blocks: [
      {
        kind: "text",
        md: "`\"2024-01-03 18:35:10\"` looks like a time, but to Python it's ten digits and some punctuation: you can't ask it for the weekday, compare it properly with `\"2024-1-4 9:00\"`, or add a day to it.\n\n`from datetime import datetime`, then `datetime.strptime(text, format)` (string **p**arse time) reads the text using a format made of codes: `%Y` four-digit year, `%m` month number, `%d` day, `%H` hour (00–23), `%M` minute, `%S` second, `%b` a short month name like `Jan`. Everything else in the format must appear in the text exactly. The result is a `datetime`, and `value.strftime(format)` (string **f**ormat time) writes it back out in whatever layout a report needs.",
      },
      {
        kind: "example",
        title: "An order timestamp, taken apart",
        code: src`
from datetime import datetime

ordered = datetime.strptime("2024-01-03 18:35:10", "%Y-%m-%d %H:%M:%S")
print(ordered)
print(ordered.year, ordered.month, ordered.day, ordered.hour)
print(ordered.strftime("%d %b %Y, %H:%M"))
print(ordered.strftime("%A"), ordered.weekday())
`,
        output: "2024-01-03 18:35:10\n2024 1 3 18\n03 Jan 2024, 18:35\nWednesday 2\n",
        note: "The parts are numbers now. `%A` is the full weekday name; `weekday()` counts from Monday as 0, so Wednesday is 2 and Saturday and Sunday are 5 and 6.",
      },
      {
        kind: "error-example",
        title: "Text that doesn't match the format",
        code: src`
from datetime import datetime

due = datetime.strptime("01/03/2024", "%Y-%m-%d")
`,
        error: "ValueError",
        output: "",
        note: "`ValueError: time data '01/03/2024' does not match format '%Y-%m-%d'`. The format must describe the text exactly. Note that `01/03/2024` is ambiguous anyway: 3 January in the UK, 1 March in the US.",
      },
      {
        kind: "text",
        md: "Once timestamps are datetimes, questions about them become one line each. This function counts orders per weekday, the kind of figure that decides when a shop schedules staff.",
      },
      {
        kind: "example",
        title: "Orders per weekday",
        code: src`
from datetime import datetime

def orders_per_weekday(timestamps):
    counts = {}
    for text in timestamps:
        day = datetime.strptime(text, "%Y-%m-%d %H:%M:%S").strftime("%A")
        counts[day] = counts.get(day, 0) + 1
    return counts

print(orders_per_weekday([
    "2024-01-03 18:35:10",
    "2024-03-13 17:16:09",
    "2024-08-23 04:08:40",
    "2024-12-03 23:16:00",
    "2024-12-21 19:58:19",
]))
`,
        output: "{'Wednesday': 2, 'Friday': 1, 'Tuesday': 1, 'Saturday': 1}\n",
        note: "Each timestamp is parsed, then formatted straight back into just its weekday name, which becomes the dictionary key.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever dates arrive as text (CSV columns, logs, forms) and you need to compare them, group them or show them differently. ISO text like `2024-01-03 18:35:10` can also be read with `datetime.fromisoformat(text)`. **Mistakes to avoid:** `%M` (minutes) where you meant `%m` (month), which parses without any error and gives the wrong date; and guessing whether `01/03` is day-first or month-first instead of knowing where the data came from.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A date for the receipt",
      prompt: "`receipt_date` returns the timestamp exactly as it came in. Make it return the date the way receipts print it, like `03 Jan 2024`.",
      spec: [
        ["Function", "`receipt_date(text)`"],
        ["text", "a timestamp like `2024-01-03 18:35:10`"],
        ["Returns", "text like `03 Jan 2024` (day, short month name, year)"],
      ],
      starter: src`
from datetime import datetime

def receipt_date(text):
    ordered = datetime.strptime(text, "%Y-%m-%d %H:%M:%S")
    return text

print(receipt_date("2024-01-03 18:35:10"))
`,
      answer: src`
from datetime import datetime

def receipt_date(text):
    ordered = datetime.strptime(text, "%Y-%m-%d %H:%M:%S")
    return ordered.strftime("%d %b %Y")

print(receipt_date("2024-01-03 18:35:10"))
`,
      wrong: [
        {
          code: src`
from datetime import datetime

def receipt_date(text):
    ordered = datetime.strptime(text, "%Y-%m-%d %H:%M:%S")
    return ordered.strftime("%d %m %Y")
`,
          fails: ["returns"],
          why: "`%m` is the month number, not its name",
        },
      ],
      hints: ["The parsed `ordered` value is ready; only the return needs to change.", "`strftime` writes a datetime in a layout you describe with codes.", "Day `%d`, short month name `%b`, year `%Y`, with spaces between."],
      task: {
        checks: [
          fn("returns", "receipt_date", [
            example(["2024-01-03 18:35:10"], "03 Jan 2024"),
            hiddenCase("a date late in the year", ["2024-12-21 19:58:19"], "21 Dec 2024"),
          ], { label: "receipt_date() formats the date for a receipt" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Orders placed at the weekend",
        prompt: "Weekend orders are packed by a smaller team. Write `weekend_orders(orders)`: return the `order_id` of every order placed on a Saturday or Sunday, in the order given.",
        spec: [
          ["Function", "`weekend_orders(orders)`"],
          ["orders", "a list of dictionaries with `order_id` and `ordered_at` like `2024-12-21 19:58:19`"],
          ["Returns", "a list of order IDs; `[]` when none were at the weekend"],
          ["Example", "the starter's orders → `['O108752', 'O108800']`"],
        ],
        starter: src`
from datetime import datetime

def weekend_orders(orders):
    ids = []
    return ids

orders = [
    {"order_id": "O104839", "ordered_at": "2024-08-23 04:08:40"},
    {"order_id": "O108752", "ordered_at": "2024-12-21 19:58:19"},
    {"order_id": "O108024", "ordered_at": "2024-12-03 23:16:00"},
    {"order_id": "O108800", "ordered_at": "2024-12-22 09:15:00"},
]
print(weekend_orders(orders))
`,
        answer: src`
from datetime import datetime

def weekend_orders(orders):
    ids = []
    for order in orders:
        placed = datetime.strptime(order["ordered_at"], "%Y-%m-%d %H:%M:%S")
        if placed.weekday() >= 5:
            ids.append(order["order_id"])
    return ids

orders = [
    {"order_id": "O104839", "ordered_at": "2024-08-23 04:08:40"},
    {"order_id": "O108752", "ordered_at": "2024-12-21 19:58:19"},
    {"order_id": "O108024", "ordered_at": "2024-12-03 23:16:00"},
    {"order_id": "O108800", "ordered_at": "2024-12-22 09:15:00"},
]
print(weekend_orders(orders))
`,
        alternatives: [
          src`
from datetime import datetime

def weekend_orders(orders):
    return [o["order_id"] for o in orders if datetime.fromisoformat(o["ordered_at"]).strftime("%A") in ["Saturday", "Sunday"]]
`,
        ],
        wrong: [
          {
            code: src`
from datetime import datetime

def weekend_orders(orders):
    ids = []
    for order in orders:
        placed = datetime.strptime(order["ordered_at"], "%Y-%m-%d %H:%M:%S")
        if placed.weekday() > 5:
            ids.append(order["order_id"])
    return ids
`,
            fails: ["returns"],
            why: "Saturday is 5, so `> 5` keeps only Sundays",
          },
          {
            code: src`
from datetime import datetime

def weekend_orders(orders):
    ids = []
    for order in orders:
        placed = datetime.strptime(order["ordered_at"], "%Y-%M-%d %H:%M:%S")
        if placed.weekday() >= 5:
            ids.append(order["order_id"])
    return ids
`,
            fails: ["returns"],
            why: "`%M` in the date part means minutes, so the format can't be parsed",
          },
        ],
        hints: [
          "Parse each `ordered_at` into a datetime.",
          "`weekday()` numbers the days from Monday as 0.",
          "Saturday and Sunday are the two highest numbers; keep orders on either.",
        ],
        task: {
          checks: [
            fn("returns", "weekend_orders", [
              example([weekendOrders], ["O108752", "O108800"]),
              example([[]], []),
              hiddenCase("the last second of Sunday and the first of Monday", [[{ order_id: "A", ordered_at: "2024-12-22 23:59:59" }, { order_id: "B", ordered_at: "2024-12-23 00:00:00" }]], ["A"]),
              hiddenCase("only weekday orders", [[{ order_id: "C", ordered_at: "2024-01-03 18:35:10" }]], []),
              hiddenCase("a Saturday morning", [[{ order_id: "D", ordered_at: "2025-03-01 07:00:00" }]], ["D"]),
            ], { label: "weekend_orders() keeps orders placed on Saturday or Sunday" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Normalise dates from three systems",
        prompt: "Three systems send dates in different layouts: `2024-01-03` (ISO), `03/01/2024` (UK: day/month/year) and `Jan 3, 2024`. Write `to_iso(text)`: return the date as `YYYY-MM-DD`, after stripping spaces at either end. Try each layout in turn; if none matches, raise `ValueError` with a message that includes the text. Impossible dates such as `30/02/2024` must be rejected, not guessed.",
        spec: [
          ["Function", "`to_iso(text)`"],
          ["Layouts", "`%Y-%m-%d`, `%d/%m/%Y`, `%b %d, %Y`"],
          ["Returns", "text like `2024-01-03`"],
          ["Raises", "`ValueError` when the text matches none of the layouts"],
          ["Example", "`to_iso(\"03/01/2024\")` → `'2024-01-03'`; `to_iso(\"next Tuesday\")` raises ValueError"],
        ],
        starter: src`
from datetime import datetime

def to_iso(text):
    return text

print(to_iso("2024-01-03"))
print(to_iso("03/01/2024"))
print(to_iso("Jan 3, 2024"))
`,
        answer: src`
from datetime import datetime

def to_iso(text):
    cleaned = text.strip()
    for layout in ["%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y"]:
        try:
            parsed = datetime.strptime(cleaned, layout)
        except ValueError:
            continue
        return parsed.strftime("%Y-%m-%d")
    raise ValueError(f"unrecognised date: {text}")

print(to_iso("2024-01-03"))
print(to_iso("03/01/2024"))
print(to_iso("Jan 3, 2024"))
`,
        alternatives: [
          src`
from datetime import datetime

LAYOUTS = ("%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y")

def try_layout(text, layout):
    try:
        return datetime.strptime(text, layout)
    except ValueError:
        return None

def to_iso(text):
    for layout in LAYOUTS:
        found = try_layout(text.strip(), layout)
        if found is not None:
            return found.date().isoformat()
    raise ValueError("unrecognised date: " + text)
`,
        ],
        wrong: [
          {
            code: src`
from datetime import datetime

def to_iso(text):
    cleaned = text.strip()
    for layout in ["%Y-%m-%d", "%m/%d/%Y", "%b %d, %Y"]:
        try:
            parsed = datetime.strptime(cleaned, layout)
        except ValueError:
            continue
        return parsed.strftime("%Y-%m-%d")
    raise ValueError(f"unrecognised date: {text}")
`,
            fails: ["returns"],
            why: "`%m/%d/%Y` reads the UK date the US way, so 03/01 becomes 1 March",
          },
          {
            code: src`
from datetime import datetime

def to_iso(text):
    cleaned = text.strip()
    for layout in ["%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y"]:
        try:
            parsed = datetime.strptime(cleaned, layout)
        except ValueError:
            continue
        return parsed.strftime("%Y-%m-%d")
    return None
`,
            fails: ["returns"],
            why: "returning None hides bad input; the contract says raise ValueError",
          },
          {
            code: src`
from datetime import datetime

def to_iso(text):
    for layout in ["%Y-%m-%d", "%d/%m/%Y", "%b %d, %Y"]:
        try:
            parsed = datetime.strptime(text, layout)
        except ValueError:
            continue
        return parsed.strftime("%Y-%m-%d")
    raise ValueError(f"unrecognised date: {text}")
`,
            fails: ["returns"],
            why: "without strip, a date with a space at either end matches no layout",
          },
        ],
        hints: [
          "Loop over the three layouts and try `strptime` with each one.",
          "A ValueError from one layout just means \"try the next\": catch it and `continue`.",
          "Return as soon as one works. If the loop finishes, none matched, so raise ValueError yourself.",
        ],
        task: {
          checks: [
            fn("returns", "to_iso", [
              example(["2024-01-03"], "2024-01-03"),
              example(["03/01/2024"], "2024-01-03"),
              example(["Jan 3, 2024"], "2024-01-03"),
              raisesCase(["next Tuesday"], "ValueError"),
              hiddenCase("a UK date whose day is above 12", ["31/12/2024"], "2024-12-31"),
              raisesCase(["12/31/2024"], "ValueError", { label: "a US-style date with a month above 12" }),
              raisesCase(["30/02/2024"], "ValueError", { label: "a date that doesn't exist" }),
              hiddenCase("spaces around a leap day", ["  2024-02-29 "], "2024-02-29"),
              hiddenCase("a month name late in the year", ["Nov 28, 2023"], "2023-11-28"),
            ], { label: "to_iso() normalises the three layouts and rejects anything else" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from datetime import datetime

placed = datetime.strptime("2024-12-21 19:58", "%Y-%m-%d %H:%M")
print(placed.strftime("%a %d/%m"), placed.weekday())
`,
        choices: ["Sat 21/12 5", "Saturday 21/12 6", "Sat 12/21 5", "Sat 21/12 6"],
        answer: 0,
        why: "`%a` is the short weekday name and the format puts the day before the month. Monday is 0, so Saturday is 5.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `%M` instead of `%m`. What does this print?",
        program: src`
from datetime import datetime

shipped = datetime.strptime("2024-07-15", "%Y-%M-%d")
print(shipped)
`,
        choices: ["2024-01-15 00:07:00", "2024-07-15 00:00:00", "ValueError", "2024-07-15 07:00:00"],
        answer: 0,
        why: "`%M` reads 07 as minutes, the month is never set and defaults to January, and nothing raises an error. That's why this mix-up survives into reports.",
      },
      {
        id: "q3",
        prompt: "Why parse `ordered_at` into a datetime instead of slicing the text?",
        choices: ["So you can ask for the weekday, compare and calculate with real date values", "Because slicing text is slower", "Because text can't be sorted", "Because CSV files can't hold dates"],
        answer: 0,
        why: "Slicing gives you pieces of text; a datetime knows which day of the week it is, which month follows which, and (next lessons) its time zone and how far apart two moments are.",
      },
    ],
    review: [
      "`datetime.strptime(text, format)` parses; `value.strftime(format)` formats. The format must match the text exactly.",
      "`%Y %m %d %H %M %S` are year, month, day, hour, minute, second; `%m` and `%M` are easy to swap.",
      "`weekday()` is 0 for Monday through 6 for Sunday.",
      "Next: a time only means something with its time zone.",
    ],
  },

  // ------------------------------------------------------------------ PY-L21-02 time zones
  {
    id: "PY-L21-02",
    version: 2,
    slug: "an-hour-offset",
    title: "Time zones and UTC",
    lede: "`18:35` means nothing until you know where. An aware datetime carries its time zone, and `astimezone` shows the same moment on another zone's clock, daylight saving included.",
    focus: "Attach time zones to datetimes with timezone.utc and ZoneInfo, and convert between zones with astimezone.",
    minutes: 20,
    packages: tz,
    objectives: [
      "Tell a naive datetime (no zone) from an aware one, and why servers store UTC",
      "Convert a UTC time to a local zone with `astimezone(ZoneInfo(\"America/New_York\"))`",
      "Attach the right zone to a local clock time with `replace(tzinfo=...)`, and see daylight saving change the offset",
    ],
    requires: ["import-module", "strptime-call", "function-def", "function-param", "function-return", "assignment", "for-loop", "list-literal", "list-mutate", "comparison", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "string-method", "if-statement", "dict-lookup", "list-comp", "list-index", "membership", "reassignment", "string-index"],
    teaches: ["timezone-call", "zone-convert"],
    blocks: [
      {
        kind: "text",
        md: "A shop in New York and a warehouse in Tokyo look at the same order. \"Placed at 19:02\" is true on one clock and false on the other. A datetime with no zone is **naive**: it's a clock reading with no place attached. An **aware** datetime carries a time zone, so it pins down one moment.\n\nServers and logs record moments in **UTC**, which has no daylight saving and no ambiguity: `timezone.utc` from `datetime`. To show a moment to people, convert it to their zone with `moment.astimezone(zone)`. Real zones come from `zoneinfo`: `ZoneInfo(\"America/New_York\")` knows the zone's whole history of offsets, including when daylight saving starts and ends.",
      },
      {
        kind: "example",
        title: "One moment on three clocks",
        code: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

created = datetime(2025, 3, 3, 0, 2, 37, tzinfo=timezone.utc)
print(created)
print(created.astimezone(ZoneInfo("America/New_York")))
print(created.astimezone(ZoneInfo("Asia/Tokyo")))
`,
        output: "2025-03-03 00:02:37+00:00\n2025-03-02 19:02:37-05:00\n2025-03-03 09:02:37+09:00\n",
        note: "The same moment: just after midnight in UTC, still the previous evening in New York, morning in Tokyo. The `+09:00` part is the offset from UTC.",
      },
      {
        kind: "text",
        md: "Daylight saving is why you never hard-code an offset. New York is 5 hours behind UTC in winter and 4 in summer; `ZoneInfo` picks the right one for each date. This function shows a UTC log time on a local clock. `datetime.fromisoformat` reads ISO text, and the `Z` at the end of `2025-01-15T14:00:00Z` means UTC.",
      },
      {
        kind: "example",
        title: "The same UTC hour in winter and summer",
        code: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def local_clock(utc_text, zone_name):
    moment = datetime.fromisoformat(utc_text)
    return moment.astimezone(ZoneInfo(zone_name)).strftime("%Y-%m-%d %H:%M %Z")

print(local_clock("2025-01-15T14:00:00Z", "America/New_York"))
print(local_clock("2025-07-15T14:00:00Z", "America/New_York"))
print(local_clock("2025-07-15T14:00:00Z", "Europe/London"))
`,
        output: "2025-01-15 09:00 EST\n2025-07-15 10:00 EDT\n2025-07-15 15:00 BST\n",
        note: "14:00 UTC is 09:00 in a New York winter but 10:00 in summer. `%Z` prints the zone's abbreviation for that date.",
      },
      {
        kind: "error-example",
        title: "Comparing a naive time with an aware one",
        code: src`
from datetime import datetime, timezone

cutoff = datetime(2025, 3, 3, 17, 0)
placed = datetime(2025, 3, 3, 21, 30, tzinfo=timezone.utc)
print(placed > cutoff)
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: can't compare offset-naive and offset-aware datetimes`. Python refuses to guess where `17:00` is. Give the cutoff its zone first.",
      },
      {
        kind: "text",
        md: "To go the other way (a local clock time someone typed, to UTC), **attach** the zone with `replace(tzinfo=ZoneInfo(...))`, which keeps the clock reading and says where it is, then convert with `astimezone(timezone.utc)`. `replace` is only right for a naive time you know is in that zone; on an aware time it would change the moment.\n\n**When to use it:** store and compare in UTC, convert to local only to display or to group by a local calendar day. **Mistakes to avoid:** mixing naive and aware values, hard-coding offsets like `-5`, and calling `astimezone` on a naive time, which silently assumes the computer's own zone.",
      },
    ],
    tryIt: {
      id: "try",
      title: "What time is it in Tokyo?",
      prompt: "`tokyo_clock` shows the UTC clock time. Convert the moment to Tokyo's zone (`Asia/Tokyo`) before formatting it.",
      spec: [
        ["Function", "`tokyo_clock(utc_text)`"],
        ["Returns", "the time in Tokyo as `HH:MM`"],
      ],
      starter: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def tokyo_clock(utc_text):
    moment = datetime.fromisoformat(utc_text)
    return moment.strftime("%H:%M")

print(tokyo_clock("2025-03-03T00:02:37Z"))
`,
      answer: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def tokyo_clock(utc_text):
    moment = datetime.fromisoformat(utc_text)
    return moment.astimezone(ZoneInfo("Asia/Tokyo")).strftime("%H:%M")

print(tokyo_clock("2025-03-03T00:02:37Z"))
`,
      wrong: [
        {
          code: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def tokyo_clock(utc_text):
    moment = datetime.fromisoformat(utc_text)
    return moment.replace(tzinfo=ZoneInfo("Asia/Tokyo")).strftime("%H:%M")
`,
          fails: ["returns"],
          why: "`replace` relabels the clock reading instead of converting it, so the time doesn't change",
        },
      ],
      hints: ["The moment is aware already (the `Z` means UTC).", "One method shows the same moment on another zone's clock.", "Call `astimezone(ZoneInfo(\"Asia/Tokyo\"))` before `strftime`."],
      task: {
        packages: tz,
        checks: [
          fn("returns", "tokyo_clock", [
            example(["2025-03-03T00:02:37Z"], "09:02"),
            hiddenCase("a time that crosses midnight in Tokyo", ["2025-07-15T23:30:00Z"], "08:30"),
          ], { label: "tokyo_clock() shows the Tokyo time" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Which local day was it?",
        prompt: "The New York store reports sales per calendar day, but order times are stored in UTC, so an order placed at 22:16 New York time is already the next day in UTC. Write `local_dates(timestamps, zone_name)`: for each UTC timestamp (ISO text ending in `Z`), return the date it was **in the given zone**, as `YYYY-MM-DD`, in the same order.",
        spec: [
          ["Function", "`local_dates(timestamps, zone_name)`"],
          ["Returns", "a list of `YYYY-MM-DD` texts, one per timestamp"],
          ["Example", "`local_dates([\"2024-12-03T03:16:00Z\"], \"America/New_York\")` → `['2024-12-02']`"],
        ],
        starter: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def local_dates(timestamps, zone_name):
    return []

print(local_dates(["2024-12-03T03:16:00Z", "2024-12-03T18:00:00Z"], "America/New_York"))
`,
        answer: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def local_dates(timestamps, zone_name):
    zone = ZoneInfo(zone_name)
    dates = []
    for text in timestamps:
        local = datetime.fromisoformat(text).astimezone(zone)
        dates.append(local.strftime("%Y-%m-%d"))
    return dates

print(local_dates(["2024-12-03T03:16:00Z", "2024-12-03T18:00:00Z"], "America/New_York"))
`,
        alternatives: [
          src`
from datetime import datetime
from zoneinfo import ZoneInfo

def local_dates(timestamps, zone_name):
    return [datetime.fromisoformat(t).astimezone(ZoneInfo(zone_name)).date().isoformat() for t in timestamps]
`,
        ],
        wrong: [
          {
            code: src`
def local_dates(timestamps, zone_name):
    dates = []
    for text in timestamps:
        dates.append(text[:10])
    return dates
`,
            fails: ["returns"],
            why: "slicing the text gives the UTC date, not the local one",
          },
          {
            code: src`
from datetime import datetime
from zoneinfo import ZoneInfo

def local_dates(timestamps, zone_name):
    dates = []
    for text in timestamps:
        local = datetime.fromisoformat(text).replace(tzinfo=ZoneInfo(zone_name))
        dates.append(local.strftime("%Y-%m-%d"))
    return dates
`,
            fails: ["returns"],
            why: "`replace` keeps the UTC clock reading and only relabels it",
          },
        ],
        hints: [
          "Parse each timestamp with `datetime.fromisoformat`; the `Z` makes it an aware UTC time.",
          "Convert it to the store's zone before asking for its date.",
          "Format the converted value with `%Y-%m-%d` (or take its `date()`).",
        ],
        task: {
          packages: tz,
          checks: [
            fn("returns", "local_dates", [
              example([["2024-12-03T03:16:00Z", "2024-12-03T18:00:00Z"], "America/New_York"], ["2024-12-02", "2024-12-03"]),
              example([[], "America/New_York"], []),
              hiddenCase("a zone ahead of UTC", [["2024-12-03T18:00:00Z"], "Asia/Tokyo"], ["2024-12-04"]),
              hiddenCase("either side of local midnight in summer time", [["2024-07-01T03:30:00Z", "2024-07-01T04:30:00Z"], "America/New_York"], ["2024-06-30", "2024-07-01"]),
            ], { label: "local_dates() gives each moment's date in the store's zone" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Book a meeting in UTC",
        prompt: "A scheduling tool lets people type a local time and their zone, and stores the meeting in UTC. Write `meeting_utc(local_text, zone_name)`: `local_text` is a clock time like `2025-03-10 09:00` **in** `zone_name`; return the same moment in UTC as ISO text, like `2025-03-10T13:00:00+00:00`. Daylight saving must be handled: New York switched from UTC−5 to UTC−4 on 9 March 2025.",
        spec: [
          ["Function", "`meeting_utc(local_text, zone_name)`"],
          ["local_text", "`YYYY-MM-DD HH:MM`, a clock reading in `zone_name`"],
          ["Returns", "the UTC moment from `isoformat()`, e.g. `'2025-03-10T13:00:00+00:00'`"],
        ],
        starter: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def meeting_utc(local_text, zone_name):
    return ""

print(meeting_utc("2025-03-10 09:00", "America/New_York"))
print(meeting_utc("2025-03-07 09:00", "America/New_York"))
`,
        answer: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def meeting_utc(local_text, zone_name):
    clock = datetime.strptime(local_text, "%Y-%m-%d %H:%M")
    local = clock.replace(tzinfo=ZoneInfo(zone_name))
    return local.astimezone(timezone.utc).isoformat()

print(meeting_utc("2025-03-10 09:00", "America/New_York"))
print(meeting_utc("2025-03-07 09:00", "America/New_York"))
`,
        alternatives: [
          src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def meeting_utc(local_text, zone_name):
    local = datetime.fromisoformat(local_text).replace(tzinfo=ZoneInfo(zone_name))
    utc = local.astimezone(timezone.utc)
    return utc.isoformat()
`,
        ],
        wrong: [
          {
            code: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def meeting_utc(local_text, zone_name):
    clock = datetime.strptime(local_text, "%Y-%m-%d %H:%M")
    return clock.astimezone(timezone.utc).isoformat()
`,
            fails: ["returns"],
            why: "`astimezone` on a naive time assumes the computer's own zone, not the meeting's",
          },
          {
            code: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def meeting_utc(local_text, zone_name):
    clock = datetime.strptime(local_text, "%Y-%m-%d %H:%M")
    return clock.replace(tzinfo=timezone.utc).isoformat()
`,
            fails: ["returns"],
            why: "labelling the local clock reading as UTC skips the conversion entirely",
          },
          {
            code: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

def meeting_utc(local_text, zone_name):
    clock = datetime.strptime(local_text, "%Y-%m-%d %H:%M")
    local = clock.replace(tzinfo=ZoneInfo(zone_name))
    return local.astimezone(ZoneInfo(zone_name)).isoformat()
`,
            fails: ["returns"],
            why: "it converts to the same zone again, so the result is still local time",
          },
        ],
        hints: [
          "Parse the text into a naive datetime first.",
          "Say where that clock reading is: attach `ZoneInfo(zone_name)` with `replace(tzinfo=...)`.",
          "Then convert the now-aware moment to `timezone.utc` and return its `isoformat()`.",
        ],
        task: {
          packages: tz,
          checks: [
            fn("returns", "meeting_utc", [
              example(["2025-03-10 09:00", "America/New_York"], "2025-03-10T13:00:00+00:00"),
              example(["2025-03-07 09:00", "America/New_York"], "2025-03-07T14:00:00+00:00"),
              hiddenCase("London in summer time", ["2025-07-01 09:00", "Europe/London"], "2025-07-01T08:00:00+00:00"),
              hiddenCase("a zone with a half-hour offset", ["2025-01-20 09:00", "Asia/Kolkata"], "2025-01-20T03:30:00+00:00"),
              hiddenCase("a zone that is already UTC", ["2025-01-20 09:00", "UTC"], "2025-01-20T09:00:00+00:00"),
            ], { label: "meeting_utc() converts a local clock time to UTC" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from datetime import datetime
from zoneinfo import ZoneInfo

placed = datetime.fromisoformat("2024-12-03T23:16:00+00:00")
local = placed.astimezone(ZoneInfo("America/Denver"))
print(local.strftime("%d %H:%M"), placed == local)
`,
        choices: ["03 16:16 True", "03 16:16 False", "04 06:16 True", "03 23:16 True"],
        answer: 0,
        why: "Denver is 7 hours behind UTC in December, so the clock shows 16:16 on the 3rd. It's the same moment, so the two aware values compare equal.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `replace` where `astimezone` was meant. What does this print?",
        program: src`
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

utc = datetime(2025, 1, 15, 14, 0, tzinfo=timezone.utc)
wrong = utc.replace(tzinfo=ZoneInfo("America/New_York"))
right = utc.astimezone(ZoneInfo("America/New_York"))
print(wrong.hour, right.hour, wrong == right)
`,
        choices: ["14 9 False", "9 9 True", "14 14 True", "9 14 False"],
        answer: 0,
        why: "`replace` keeps the clock reading 14:00 and says it's in New York, which is a different moment (19:00 UTC). `astimezone` keeps the moment and changes the clock to 09:00.",
      },
      {
        id: "q3",
        prompt: "Why do servers usually store timestamps in UTC?",
        choices: ["UTC has no daylight saving, so every moment has exactly one clock reading and sorting works", "UTC is the zone the server happens to be in", "Local times can't be stored in a database", "UTC times use fewer digits"],
        answer: 0,
        why: "Local clocks repeat an hour in autumn and skip one in spring, and differ between users. UTC is unambiguous; convert to local only to display.",
      },
    ],
    review: [
      "A naive datetime has no zone; an aware one carries `timezone.utc` or a `ZoneInfo(...)` zone.",
      "`astimezone(zone)` shows the same moment on another clock; `replace(tzinfo=zone)` attaches a zone to a naive clock reading.",
      "Store and compare in UTC, convert to local to display; `ZoneInfo` handles daylight saving.",
      "Next: how far apart two moments are, with timedelta.",
    ],
  },

  // ------------------------------------------------------------------ PY-L21-03 timedelta
  {
    id: "PY-L21-03",
    version: 2,
    slug: "days-between",
    title: "Durations with timedelta",
    lede: "Subtracting two datetimes gives a timedelta: how long something took. Adding a timedelta to a date moves it. `total_seconds()` is the whole duration; `.seconds` is only part of it.",
    focus: "Measure and shift time with timedelta: subtract datetimes, add durations, and read the total correctly.",
    minutes: 18,
    objectives: [
      "Subtract two datetimes and read the result's `days` and `total_seconds()`",
      "Add or subtract `timedelta(days=…, hours=…)` to move a date",
      "Avoid `.seconds`, which ignores whole days, and compare dates with dates",
    ],
    requires: ["import-module", "strptime-call", "function-def", "function-param", "function-return", "assignment", "reassignment", "for-loop", "if-statement", "else-clause", "comparison", "logical", "arithmetic", "precedence", "list-literal", "list-mutate", "list-sort", "sort-key", "lambda", "tuple-literal", "tuple-unpack", "dict-lookup", "len-call", "none-value", "conversion", "continue-statement", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "aggregate-call", "list-comp", "comp-if", "truthiness", "boolean", "dict-literal", "list-index", "membership", "string-index"],
    teaches: ["timedelta-call", "date-span"],
    blocks: [
      {
        kind: "text",
        md: "How long did delivery take? Is this order late? When is the payment due? All three are **durations**. Subtracting one datetime from another gives a `timedelta`, and a `timedelta` can be added to a datetime to move it: `ordered + timedelta(days=6)`.\n\nA timedelta stores days, seconds and microseconds. `delta.days` is the whole days, `delta.total_seconds()` is the entire duration in seconds (a float), and dividing gives other units: `delta.total_seconds() / 3600` is hours.",
      },
      {
        kind: "example",
        title: "How long delivery took",
        code: src`
from datetime import datetime, timedelta

ordered = datetime.fromisoformat("2024-01-03 18:35:10")
delivered = datetime.fromisoformat("2024-01-07 11:00:39")
wait = delivered - ordered
print(wait)
print(wait.days, wait.seconds, wait.total_seconds())
print(ordered + timedelta(days=6))
`,
        output: "3 days, 16:25:29\n3 59129 318329.0\n2024-01-09 18:35:10\n",
        note: "`wait.seconds` is 59129, only the 16 h 25 min 29 s left over after the 3 whole days. `total_seconds()` is the full 318329 seconds. The last line is the dataset's estimated delivery: six days after ordering.",
      },
      {
        kind: "text",
        md: "Dates and datetimes are different types. `date` (a calendar day, no time) comes from `datetime.date()` or `date.fromisoformat(\"2024-01-09\")`. Subtracting one from the other isn't allowed, so convert first.",
      },
      {
        kind: "error-example",
        title: "A date minus a datetime",
        code: src`
from datetime import date, datetime

due = date.fromisoformat("2024-01-09")
delivered = datetime.fromisoformat("2024-01-07 11:00:39")
print(due - delivered)
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: unsupported operand type(s) for -: 'datetime.date' and 'datetime.datetime'`. Use `delivered.date()` to compare calendar days.",
      },
      {
        kind: "example",
        title: "Days late, compared by calendar day",
        code: src`
from datetime import date, datetime

def days_late(delivered_at, estimated):
    delivered = datetime.fromisoformat(delivered_at).date()
    due = date.fromisoformat(estimated)
    late = (delivered - due).days
    if late < 0:
        return 0
    return late

print(days_late("2024-01-07 11:00:39", "2024-01-09"))
print(days_late("2024-12-28 04:12:39", "2024-12-27"))
print(days_late("2024-12-27 23:59:00", "2024-12-27"))
`,
        output: "0\n1\n0\n",
        note: "A parcel delivered at 23:59 on the due date is on time, which is why the comparison uses calendar days (`date()`) rather than the full timestamp.",
      },
      {
        kind: "text",
        md: "**When to use it:** delivery and response times, due dates, \"in the last 7 days\" filters, SLAs. **Mistakes to avoid:** reading `.seconds` as the total (it resets every day), mixing `date` and `datetime`, and comparing a duration with a plain number: write `wait > timedelta(hours=24)`, not `wait > 24`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Hours, counting the whole duration",
      prompt: "`hours_between` gives the right answer for short gaps but says an order shipped 58 hours later took about 10 hours. Fix it so whole days count too.",
      spec: [
        ["Function", "`hours_between(start_text, end_text)`"],
        ["Returns", "the hours between two `YYYY-MM-DD HH:MM:SS` timestamps, as a float"],
      ],
      starter: src`
from datetime import datetime

def hours_between(start_text, end_text):
    gap = datetime.fromisoformat(end_text) - datetime.fromisoformat(start_text)
    return gap.seconds / 3600

print(hours_between("2024-01-03 18:35:10", "2024-01-06 04:58:19"))
`,
      answer: src`
from datetime import datetime

def hours_between(start_text, end_text):
    gap = datetime.fromisoformat(end_text) - datetime.fromisoformat(start_text)
    return gap.total_seconds() / 3600

print(hours_between("2024-01-03 18:35:10", "2024-01-06 04:58:19"))
`,
      wrong: [
        {
          code: src`
from datetime import datetime

def hours_between(start_text, end_text):
    gap = datetime.fromisoformat(end_text) - datetime.fromisoformat(start_text)
    return gap.days * 24
`,
          fails: ["returns"],
          why: "only the whole days are counted, so the hours after them are lost",
        },
      ],
      hints: ["The subtraction is right; what's read from `gap` is not.", "`.seconds` is only the part of the duration after the whole days.", "`total_seconds()` covers the entire duration."],
      task: {
        checks: [
          fn("returns", "hours_between", [
            example(["2024-01-03 18:35:10", "2024-01-06 04:58:19"], 58.38583333333333),
            hiddenCase("exactly two days", ["2024-03-01 08:00:00", "2024-03-03 08:00:00"], py.float(48)),
            hiddenCase("less than a day", ["2024-08-23 04:08:40", "2024-08-23 16:06:22"], 11.961666666666666),
          ], { label: "hours_between() measures the whole duration in hours" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Average delivery time",
        prompt: "Write `average_delivery_days(orders)`: return the average time from `ordered_at` to `delivered_at`, in days as a float (36 hours is 1.5 days), over the orders that have been delivered. An order not delivered yet has `delivered_at` as an empty string. Return `None` if no order has been delivered.",
        spec: [
          ["Function", "`average_delivery_days(orders)`"],
          ["orders", "dictionaries with `ordered_at` and `delivered_at` (`YYYY-MM-DD HH:MM:SS`, or `\"\"`)"],
          ["Returns", "a float number of days, or `None`"],
          ["Example", "the starter's orders → about `3.6911`"],
        ],
        starter: src`
from datetime import datetime

def average_delivery_days(orders):
    return None

orders = [
    {"order_id": "O100043", "ordered_at": "2024-01-03 18:35:10", "delivered_at": "2024-01-07 11:00:39"},
    {"order_id": "O101217", "ordered_at": "2024-03-13 17:16:09", "delivered_at": "2024-03-17 10:00:58"},
    {"order_id": "O108024", "ordered_at": "2024-12-03 23:16:00", "delivered_at": ""},
]
print(average_delivery_days(orders))
`,
        answer: src`
from datetime import datetime

def average_delivery_days(orders):
    total_days = 0
    count = 0
    for order in orders:
        if order["delivered_at"] == "":
            continue
        took = datetime.fromisoformat(order["delivered_at"]) - datetime.fromisoformat(order["ordered_at"])
        total_days += took.total_seconds() / 86400
        count += 1
    if count == 0:
        return None
    return total_days / count

orders = [
    {"order_id": "O100043", "ordered_at": "2024-01-03 18:35:10", "delivered_at": "2024-01-07 11:00:39"},
    {"order_id": "O101217", "ordered_at": "2024-03-13 17:16:09", "delivered_at": "2024-03-17 10:00:58"},
    {"order_id": "O108024", "ordered_at": "2024-12-03 23:16:00", "delivered_at": ""},
]
print(average_delivery_days(orders))
`,
        alternatives: [
          src`
from datetime import datetime, timedelta

def average_delivery_days(orders):
    spans = [datetime.fromisoformat(o["delivered_at"]) - datetime.fromisoformat(o["ordered_at"]) for o in orders if o["delivered_at"]]
    if not spans:
        return None
    total = timedelta()
    for span in spans:
        total += span
    return (total / len(spans)) / timedelta(days=1)
`,
        ],
        wrong: [
          {
            code: src`
from datetime import datetime

def average_delivery_days(orders):
    total_days = 0
    count = 0
    for order in orders:
        if order["delivered_at"] == "":
            continue
        took = datetime.fromisoformat(order["delivered_at"]) - datetime.fromisoformat(order["ordered_at"])
        total_days += took.days
        count += 1
    if count == 0:
        return None
    return total_days / count
`,
            fails: ["returns"],
            why: "`.days` throws away the hours, so 3 days 16 hours counts as 3",
          },
          {
            code: src`
from datetime import datetime

def average_delivery_days(orders):
    total_days = 0
    for order in orders:
        if order["delivered_at"] == "":
            continue
        took = datetime.fromisoformat(order["delivered_at"]) - datetime.fromisoformat(order["ordered_at"])
        total_days += took.total_seconds() / 86400
    if len(orders) == 0:
        return None
    return total_days / len(orders)
`,
            fails: ["returns"],
            why: "dividing by every order, delivered or not, makes the average too small",
          },
        ],
        hints: [
          "Skip the orders without a delivery time, and count the ones you use.",
          "For each delivered order, subtract the two datetimes and turn the duration into days with `total_seconds()`.",
          "A day has 86,400 seconds. With nothing delivered there's no average: return None.",
        ],
        task: {
          checks: [
            fn("returns", "average_delivery_days", [
              example([deliveries], 3.691076388888889),
              example([[]], null),
              hiddenCase("a delivery of a day and a half", [[{ order_id: "A", ordered_at: "2024-01-01 00:00:00", delivered_at: "2024-01-02 12:00:00" }]], 1.5),
              hiddenCase("no order delivered yet", [[{ order_id: "B", ordered_at: "2024-01-01 00:00:00", delivered_at: "" }]], null),
              hiddenCase("deliveries of different lengths", [[{ order_id: "C", ordered_at: "2024-05-01 10:00:00", delivered_at: "2024-05-03 10:00:00" }, { order_id: "D", ordered_at: "2024-05-01 10:00:00", delivered_at: "2024-05-02 04:00:00" }]], 1.375),
            ], { label: "average_delivery_days() averages the full delivery times" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Orders that shipped too slowly",
        prompt: "The warehouse promises to ship within a number of hours. Write `late_shipments(orders, max_hours)`: return a list of `(order_id, hours)` tuples for the orders whose time from `ordered_at` to `shipped_at` is **more than** `max_hours`, where `hours` is the whole number of hours it took (rounded down). Skip orders that haven't shipped (`shipped_at` is `\"\"`). Sort by hours, slowest first; equal hours keep their original order.",
        spec: [
          ["Function", "`late_shipments(orders, max_hours)`"],
          ["Returns", "a list of `(order_id, whole hours)` tuples, slowest first"],
          ["Rule", "late means strictly more than `timedelta(hours=max_hours)`"],
          ["Example", "the starter's orders with 24 → `[('O100043', 58), ('O108752', 40), ('O108024', 35)]`"],
        ],
        starter: src`
from datetime import datetime, timedelta

def late_shipments(orders, max_hours):
    return []

orders = [
    {"order_id": "O100043", "ordered_at": "2024-01-03 18:35:10", "shipped_at": "2024-01-06 04:58:19"},
    {"order_id": "O101217", "ordered_at": "2024-03-13 17:16:09", "shipped_at": "2024-03-14 05:45:05"},
    {"order_id": "O108024", "ordered_at": "2024-12-03 23:16:00", "shipped_at": "2024-12-05 11:10:50"},
    {"order_id": "O108752", "ordered_at": "2024-12-21 19:58:19", "shipped_at": "2024-12-23 12:33:40"},
    {"order_id": "O108800", "ordered_at": "2024-12-22 09:15:00", "shipped_at": ""},
]
print(late_shipments(orders, 24))
`,
        answer: src`
from datetime import datetime, timedelta

def late_shipments(orders, max_hours):
    limit = timedelta(hours=max_hours)
    late = []
    for order in orders:
        if order["shipped_at"] == "":
            continue
        took = datetime.fromisoformat(order["shipped_at"]) - datetime.fromisoformat(order["ordered_at"])
        if took > limit:
            late.append((order["order_id"], int(took.total_seconds() // 3600)))
    return sorted(late, key=lambda pair: pair[1], reverse=True)

orders = [
    {"order_id": "O100043", "ordered_at": "2024-01-03 18:35:10", "shipped_at": "2024-01-06 04:58:19"},
    {"order_id": "O101217", "ordered_at": "2024-03-13 17:16:09", "shipped_at": "2024-03-14 05:45:05"},
    {"order_id": "O108024", "ordered_at": "2024-12-03 23:16:00", "shipped_at": "2024-12-05 11:10:50"},
    {"order_id": "O108752", "ordered_at": "2024-12-21 19:58:19", "shipped_at": "2024-12-23 12:33:40"},
    {"order_id": "O108800", "ordered_at": "2024-12-22 09:15:00", "shipped_at": ""},
]
print(late_shipments(orders, 24))
`,
        alternatives: [
          src`
from datetime import datetime

def hours_taken(order):
    took = datetime.fromisoformat(order["shipped_at"]) - datetime.fromisoformat(order["ordered_at"])
    return took.total_seconds() / 3600

def late_shipments(orders, max_hours):
    shipped = [o for o in orders if o["shipped_at"]]
    late = [(o["order_id"], int(hours_taken(o))) for o in shipped if hours_taken(o) > max_hours]
    return sorted(late, key=lambda item: -item[1])
`,
        ],
        wrong: [
          {
            code: src`
from datetime import datetime, timedelta

def late_shipments(orders, max_hours):
    limit = timedelta(hours=max_hours)
    late = []
    for order in orders:
        if order["shipped_at"] == "":
            continue
        took = datetime.fromisoformat(order["shipped_at"]) - datetime.fromisoformat(order["ordered_at"])
        if took > limit:
            late.append((order["order_id"], took.seconds // 3600))
    return sorted(late, key=lambda pair: pair[1], reverse=True)
`,
            fails: ["returns"],
            why: "`.seconds` drops the whole days, so 58 hours is reported as 10",
          },
          {
            code: src`
from datetime import datetime, timedelta

def late_shipments(orders, max_hours):
    limit = timedelta(hours=max_hours)
    late = []
    for order in orders:
        if order["shipped_at"] == "":
            continue
        took = datetime.fromisoformat(order["shipped_at"]) - datetime.fromisoformat(order["ordered_at"])
        if took >= limit:
            late.append((order["order_id"], int(took.total_seconds() // 3600)))
    return sorted(late, key=lambda pair: pair[1], reverse=True)
`,
            fails: ["returns"],
            why: "an order shipped in exactly `max_hours` kept the promise, but `>=` reports it",
          },
          {
            code: src`
from datetime import datetime, timedelta

def late_shipments(orders, max_hours):
    limit = timedelta(hours=max_hours)
    late = []
    for order in orders:
        if order["shipped_at"] == "":
            continue
        took = datetime.fromisoformat(order["shipped_at"]) - datetime.fromisoformat(order["ordered_at"])
        if took > limit:
            late.append((order["order_id"], int(took.total_seconds() // 3600)))
    return late
`,
            fails: ["returns"],
            why: "the orders keep their input order instead of slowest first",
          },
        ],
        hints: [
          "Turn `max_hours` into a timedelta once, so you can compare durations with durations.",
          "For each shipped order, compute how long it took; keep it when that's more than the limit, with its whole hours from `total_seconds() // 3600`.",
          "Sort the tuples by their second item with `reverse=True`; Python's sort is stable, so ties keep their order.",
        ],
        task: {
          checks: [
            fn("returns", "late_shipments", [
              example([shipments.slice(0, 2).concat(shipments.slice(3)), 24], py.list(pair("O100043", 58), pair("O108752", 40), pair("O108024", 35))),
              example([shipments, 48], py.list(pair("O100043", 58))),
              example([[], 24], py.list()),
              hiddenCase("shipped in exactly the promised time", [[{ order_id: "A", ordered_at: "2024-02-01 08:00:00", shipped_at: "2024-02-02 08:00:00" }], 24], py.list()),
              hiddenCase("two orders that took the same whole hours", [[{ order_id: "B", ordered_at: "2024-02-01 08:00:00", shipped_at: "2024-02-03 09:10:00" }, { order_id: "C", ordered_at: "2024-02-01 08:00:00", shipped_at: "2024-02-03 09:50:00" }, { order_id: "D", ordered_at: "2024-02-01 08:00:00", shipped_at: "2024-02-04 08:00:00" }], 12], py.list(pair("D", 72), pair("B", 49), pair("C", 49))),
              hiddenCase("a limit of zero hours", [[{ order_id: "E", ordered_at: "2024-02-01 08:00:00", shipped_at: "2024-02-01 08:30:00" }], 0], py.list(pair("E", 0))),
            ], { label: "late_shipments() lists slow shipments, slowest first" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from datetime import datetime, timedelta

placed = datetime.fromisoformat("2024-02-28 22:00:00")
due = placed + timedelta(days=1, hours=3)
print(due, (due - placed).total_seconds() / 3600)
`,
        choices: ["2024-03-01 01:00:00 27.0", "2024-02-30 01:00:00 27.0", "2024-03-01 01:00:00 3.0", "2024-02-29 01:00:00 27.0"],
        answer: 0,
        why: "2024 is a leap year, so a day after 28 February is the 29th, and three more hours past 22:00 is 01:00 on 1 March. The gap is 27 hours.",
      },
      {
        id: "q2",
        prompt: "A common mistake: reading `.seconds` as the total. What does this print?",
        program: src`
from datetime import timedelta

wait = timedelta(days=2, minutes=30)
print(wait.seconds, wait.total_seconds())
`,
        choices: ["1800 174600.0", "174600 174600.0", "1800 1800.0", "0 174600.0"],
        answer: 0,
        why: "`.seconds` is only the part after the whole days (30 minutes = 1800 seconds). `total_seconds()` includes the two days.",
      },
      {
        id: "q3",
        prompt: "You want orders from the last 7 days. Which test is right, with `now` and `placed` as datetimes?",
        choices: ["`now - placed <= timedelta(days=7)`", "`now - placed <= 7`", "`(now - placed).seconds <= 7 * 86400`", "`placed.day >= now.day - 7`"],
        answer: 0,
        why: "Compare a duration with a duration. A timedelta can't be compared with a number, `.seconds` ignores whole days, and day-of-month arithmetic breaks at the start of each month.",
      },
    ],
    review: [
      "`later - earlier` is a timedelta; `datetime + timedelta(...)` moves a date.",
      "`total_seconds()` is the whole duration; `.days` is whole days only and `.seconds` is just the remainder.",
      "Compare durations with timedeltas, and calendar days with `date()` values.",
      "Next: amounts of money that add up exactly, with Decimal.",
    ],
  },

  // ------------------------------------------------------------------ PY-L21-04 Decimal
  {
    id: "PY-L21-04",
    version: 2,
    slug: "exact-cents",
    title: "Exact money with Decimal",
    lede: "Floats are binary fractions, so `0.1 + 0.2` isn't exactly `0.3`. Decimal does decimal arithmetic exactly, and `quantize` rounds to cents with the rule you choose.",
    focus: "Calculate money with Decimal built from text, and round to cents with quantize and an explicit rounding rule.",
    minutes: 18,
    objectives: [
      "Explain why floats drift with money and why `Decimal(\"0.1\")` must be built from text",
      "Round a Decimal to cents with `quantize(Decimal(\"0.01\"), rounding=ROUND_HALF_UP)`",
      "Know that the default rounding is half-to-even, and keep floats and Decimals apart",
    ],
    requires: ["import-module", "function-def", "function-param", "function-return", "assignment", "reassignment", "arithmetic", "precedence", "comparison", "for-loop", "if-statement", "else-clause", "range-call", "list-literal", "list-mutate", "conversion", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "len-call", "string-format", "conditional-expr", "list-comp", "list-index", "membership", "print-number", "string-index"],
    teaches: ["decimal-call"],
    blocks: [
      {
        kind: "text",
        md: "Floats store numbers in binary, and most decimal fractions (0.1, 0.2, 0.07) have no exact binary form. The tiny errors are invisible in a single value and show up when you add, compare or round money: a total that should be 0.30 is `0.30000000000000004`, and a tax that should round up rounds down.\n\n`from decimal import Decimal` gives exact decimal numbers. **Build them from text**: `Decimal(\"0.1\")` is exactly one tenth, while `Decimal(0.1)` faithfully copies the float's binary error. Arithmetic between Decimals stays exact.",
      },
      {
        kind: "example",
        title: "Float drift and the exact version",
        code: src`
from decimal import Decimal

print(0.1 + 0.2)
print(Decimal("0.1") + Decimal("0.2"))
print(Decimal(0.1))
`,
        output: "0.30000000000000004\n0.3\n0.1000000000000000055511151231257827021181583404541015625\n",
        note: "The last line shows what the float `0.1` really is. That's why a Decimal is built from the text `\"0.1\"`, the way prices arrive from CSV and JSON anyway.",
      },
      {
        kind: "text",
        md: "Multiplying creates more decimal places: a 7% tax on 6.49 is 0.4543. `amount.quantize(Decimal(\"0.01\"), rounding=ROUND_HALF_UP)` rounds to cents. Name the rule: without it, Decimal rounds **half to even** (banker's rounding), so 0.125 becomes 0.12, while most receipts expect 0.13.",
      },
      {
        kind: "example",
        title: "Sales tax rounded to the cent",
        code: src`
from decimal import Decimal, ROUND_HALF_UP

def with_tax(subtotal_text, rate_text):
    subtotal = Decimal(subtotal_text)
    tax = (subtotal * Decimal(rate_text)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return subtotal + tax

print(with_tax("6.49", "0.07"))
print(with_tax("66.49", "0.07"))
print(Decimal("0.125").quantize(Decimal("0.01")), Decimal("0.125").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))
`,
        output: "6.94\n71.14\n0.12 0.13\n",
        note: "The first two match Runtime Market's own orders (tax 0.45 and 4.65). The last line shows the two rounding rules disagreeing on an exact half cent.",
      },
      {
        kind: "error-example",
        title: "Mixing Decimal and float",
        code: src`
from decimal import Decimal

price = Decimal("19.99")
print(price + 0.01)
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: unsupported operand type(s) for +: 'decimal.Decimal' and 'float'`. Python won't silently bring the float's error into exact arithmetic. Use `Decimal(\"0.01\")`. (Whole numbers like `price * 2` are fine.)",
      },
      {
        kind: "text",
        md: "**When to use it:** prices, tax, invoices, ledgers: anywhere two totals must match to the cent. Floats are fine for measurements (temperatures, distances). **Mistakes to avoid:** building Decimals from floats, rounding without naming the rule, and rounding each line differently from the total. `str(amount)` gives text like `43.77` for reports and APIs.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Always two decimals",
      prompt: "`price_text` returns the amount as it came in (`2.5`, `1.005`). Make it return the amount rounded to cents, half up, so it always has two decimals.",
      spec: [
        ["Function", "`price_text(amount_text)`"],
        ["Returns", "text with exactly two decimals, halves rounded up: `\"1.005\"` → `\"1.01\"`"],
      ],
      starter: src`
from decimal import Decimal, ROUND_HALF_UP

def price_text(amount_text):
    amount = Decimal(amount_text)
    return str(amount)

print(price_text("2.5"))
print(price_text("1.005"))
`,
      answer: src`
from decimal import Decimal, ROUND_HALF_UP

def price_text(amount_text):
    amount = Decimal(amount_text)
    return str(amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

print(price_text("2.5"))
print(price_text("1.005"))
`,
      wrong: [
        {
          code: src`
from decimal import Decimal

def price_text(amount_text):
    amount = Decimal(amount_text)
    return str(amount.quantize(Decimal("0.01")))
`,
          fails: ["returns"],
          why: "the default rule rounds half to even, so 1.005 becomes 1.00",
        },
      ],
      hints: ["`quantize` rounds a Decimal to the places of the Decimal you pass it.", "Pass `Decimal(\"0.01\")` for cents.", "Name the rounding rule too: `rounding=ROUND_HALF_UP`."],
      task: {
        checks: [
          fn("returns", "price_text", [
            example(["2.5"], "2.50"),
            example(["1.005"], "1.01"),
            hiddenCase("rounding up into the next whole number", ["19.999"], "20.00"),
            hiddenCase("an amount that is already in cents", ["47.99"], "47.99"),
          ], { label: "price_text() rounds to cents, half up" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Line totals that match the invoice",
        prompt: "Runtime Market's order lines store a `line_total` rounded to the cent: unit price × quantity × (1 − discount rate), rounded half up. Write `line_total(unit_price, quantity, discount_rate)`: prices and rates arrive as text, the quantity as a whole number. Return the total as text with two decimals.",
        spec: [
          ["Function", "`line_total(unit_price, quantity, discount_rate)`"],
          ["Types", "`unit_price` and `discount_rate` are text like `\"51.49\"` and `\"0.15\"`; `quantity` is an int"],
          ["Returns", "text such as `\"43.77\"`, rounded to cents half up"],
          ["Example", "`line_total(\"51.49\", 1, \"0.15\")` → `'43.77'`"],
        ],
        starter: src`
from decimal import Decimal, ROUND_HALF_UP

def line_total(unit_price, quantity, discount_rate):
    return ""

print(line_total("51.49", 1, "0.15"))
print(line_total("16.99", 2, "0.1"))
`,
        answer: src`
from decimal import Decimal, ROUND_HALF_UP

def line_total(unit_price, quantity, discount_rate):
    full = Decimal(unit_price) * quantity
    after = full * (1 - Decimal(discount_rate))
    return str(after.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))

print(line_total("51.49", 1, "0.15"))
print(line_total("16.99", 2, "0.1"))
`,
        alternatives: [
          src`
from decimal import Decimal, ROUND_HALF_UP

CENT = Decimal("0.01")

def line_total(unit_price, quantity, discount_rate):
    price = Decimal(unit_price)
    discount = price * quantity * Decimal(discount_rate)
    total = price * quantity - discount
    return f"{total.quantize(CENT, rounding=ROUND_HALF_UP)}"
`,
        ],
        wrong: [
          {
            code: src`
def line_total(unit_price, quantity, discount_rate):
    total = float(unit_price) * quantity * (1 - float(discount_rate))
    return f"{total:.2f}"
`,
            fails: ["returns"],
            why: "float arithmetic turns an exact half cent like 1.005 into 1.00499…, which rounds down",
          },
          {
            code: src`
from decimal import Decimal

def line_total(unit_price, quantity, discount_rate):
    total = Decimal(unit_price) * quantity * (1 - Decimal(discount_rate))
    return str(total.quantize(Decimal("0.01")))
`,
            fails: ["returns"],
            why: "the default half-to-even rule rounds an exact half cent down to an even cent",
          },
        ],
        hints: [
          "Turn the price and the rate into Decimals from their text; an int quantity can multiply a Decimal directly.",
          "Multiply out the full price, then apply `1 - rate`.",
          "Round once at the end with `quantize(Decimal(\"0.01\"), rounding=ROUND_HALF_UP)` and return `str` of it.",
        ],
        task: {
          checks: [
            fn("returns", "line_total", [
              example(["51.49", 1, "0.15"], "43.77"),
              example(["16.99", 2, "0.1"], "30.58"),
              example(["31", 1, "0"], "31.00"),
              hiddenCase("an exact half cent", ["2.01", 1, "0.5"], "1.01"),
              hiddenCase("several units with no discount", ["2.55", 12, "0"], "30.60"),
              hiddenCase("a full discount", ["26.99", 2, "1"], "0.00"),
            ], { label: "line_total() prices a line exactly, rounded half up" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Split a bill to the cent",
        prompt: "A group splits a restaurant bill evenly. Shares must be in whole cents and must add up to **exactly** the total. Write `split_bill(total_text, people)`: give everyone the total divided by `people`, rounded **down** to the cent (`ROUND_DOWN`), then hand the leftover cents out one each to the first people. Return the shares as text with two decimals.",
        spec: [
          ["Function", "`split_bill(total_text, people)`"],
          ["Returns", "a list of `people` texts like `\"33.34\"`, which add up exactly to the total"],
          ["Rule", "the first people get the extra cents, so the list never goes up from left to right"],
          ["Example", "`split_bill(\"100.00\", 3)` → `['33.34', '33.33', '33.33']`"],
        ],
        starter: src`
from decimal import Decimal, ROUND_DOWN

def split_bill(total_text, people):
    return []

print(split_bill("100.00", 3))
`,
        answer: src`
from decimal import Decimal, ROUND_DOWN

def split_bill(total_text, people):
    total = Decimal(total_text)
    cent = Decimal("0.01")
    share = (total / people).quantize(cent, rounding=ROUND_DOWN)
    leftover = int((total - share * people) / cent)
    shares = []
    for i in range(people):
        if i < leftover:
            shares.append(str(share + cent))
        else:
            shares.append(str(share))
    return shares

print(split_bill("100.00", 3))
`,
        alternatives: [
          src`
from decimal import Decimal

def split_bill(total_text, people):
    cents = int(Decimal(total_text) * 100)
    base = cents // people
    extra = cents % people
    shares = []
    for i in range(people):
        amount = base + 1 if i < extra else base
        shares.append(str(Decimal(amount) / 100))
    return [str(Decimal(s).quantize(Decimal("0.01"))) for s in shares]
`,
        ],
        wrong: [
          {
            code: src`
from decimal import Decimal, ROUND_HALF_UP

def split_bill(total_text, people):
    share = (Decimal(total_text) / people).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    shares = []
    for i in range(people):
        shares.append(str(share))
    return shares
`,
            fails: ["returns"],
            why: "rounding every share the same way loses or invents cents: three shares of 33.33 add up to 99.99",
          },
          {
            code: src`
from decimal import Decimal, ROUND_DOWN

def split_bill(total_text, people):
    total = Decimal(total_text)
    cent = Decimal("0.01")
    share = (total / people).quantize(cent, rounding=ROUND_DOWN)
    leftover = int((total - share * people) / cent)
    shares = []
    for i in range(people):
        if i >= people - leftover:
            shares.append(str(share + cent))
        else:
            shares.append(str(share))
    return shares
`,
            fails: ["returns"],
            why: "the extra cents go to the last people instead of the first",
          },
        ],
        hints: [
          "Divide and round **down** to the cent; that share times `people` can only be at or below the total.",
          "The difference is a whole number of leftover cents: divide it by `Decimal(\"0.01\")` and convert with `int`.",
          "Give `share + 0.01` to the first `leftover` people and `share` to the rest.",
        ],
        task: {
          checks: [
            fn("returns", "split_bill", [
              example(["100.00", 3], ["33.34", "33.33", "33.33"]),
              example(["10.00", 4], ["2.50", "2.50", "2.50", "2.50"]),
              example(["71.14", 1], ["71.14"]),
              hiddenCase("fewer cents than people", ["0.05", 3], ["0.02", "0.02", "0.01"]),
              hiddenCase("a total written without decimals", ["1", 3], ["0.34", "0.33", "0.33"]),
              hiddenCase("two cents left over", ["142.77", 5], ["28.56", "28.56", "28.55", "28.55", "28.55"]),
            ], { label: "split_bill() splits into whole cents that add up exactly" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from decimal import Decimal, ROUND_HALF_UP

cent = Decimal("0.01")
for amount in ["2.345", "2.355"]:
    print(Decimal(amount).quantize(cent), Decimal(amount).quantize(cent, rounding=ROUND_HALF_UP))
`,
        choices: ["2.34 2.35\n2.36 2.36", "2.35 2.35\n2.36 2.36", "2.34 2.34\n2.35 2.35", "2.34 2.35\n2.35 2.36"],
        answer: 0,
        why: "Half to even rounds an exact half towards the even cent: 2.345 → 2.34, 2.355 → 2.36. Half up always goes up: 2.35 and 2.36.",
      },
      {
        id: "q2",
        prompt: "A common mistake: building a Decimal from a float. What does this print?",
        program: src`
from decimal import Decimal

print(Decimal(1.1) == Decimal("1.1"), Decimal("1.10") == Decimal("1.1"))
`,
        choices: ["False True", "True True", "True False", "False False"],
        answer: 0,
        why: "`Decimal(1.1)` copies the float's binary approximation, so it isn't exactly 1.1. Decimals compare by value, so 1.10 equals 1.1 even though they print differently.",
      },
      {
        id: "q3",
        prompt: "Which of these should use Decimal rather than float?",
        choices: ["The tax and total on an invoice", "The average temperature over a month", "The distance between two airports", "The share of reviews that are 5 stars"],
        answer: 0,
        why: "Money has to add up to the cent and be rounded by a stated rule. Measurements and ratios tolerate tiny binary errors.",
      },
    ],
    review: [
      "Floats are binary approximations; money needs exact decimals.",
      "Build Decimals from text: `Decimal(\"19.99\")`. Don't mix them with floats.",
      "Round with `quantize(Decimal(\"0.01\"), rounding=...)`; the default is half to even, receipts usually want half up.",
      "Next: finding and checking patterns in text with regular expressions.",
    ],
  },

  // ------------------------------------------------------------------ PY-L21-05 regex
  {
    id: "PY-L21-05",
    version: 2,
    slug: "find-a-code",
    title: "Patterns in text with regular expressions",
    lede: "A regular expression describes a shape of text, such as \"O followed by six digits\". `re.search` and `re.findall` find it, groups pull out its parts, `re.sub` rewrites it and `re.fullmatch` checks that a whole value has it.",
    focus: "Find, extract, replace and validate patterns in text with re.search, findall, groups, sub and fullmatch.",
    minutes: 20,
    objectives: [
      "Write patterns with `\\d`, `[A-Z]`, `{n}`, `+`, `\\s` and `\\b`, in raw strings",
      "Pull out parts of a match with groups, and find every match with `findall`",
      "Rewrite matches with `re.sub`, and validate a whole value with `re.fullmatch`",
    ],
    requires: ["import-module", "function-def", "function-param", "function-return", "assignment", "for-loop", "if-statement", "comparison", "identity", "none-value", "boolean", "list-literal", "list-mutate", "tuple-literal", "string-method", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "comp-if", "list-comp", "logical", "membership", "else-clause", "match-case", "string-index", "truthiness"],
    teaches: ["regex-call", "regex-fullmatch"],
    blocks: [
      {
        kind: "text",
        md: "String methods find fixed text: `\"O104839\" in message`. Real questions are about **shapes**: any order ID (an `O` and six digits), any SKU (three capitals, a dash, five digits), any run of spaces. A **regular expression** describes such a shape.\n\nThe pieces you'll use most: `\\d` a digit, `[A-Z]` one capital letter, `{6}` exactly six of the previous thing, `+` one or more, `\\s` a space or tab, `\\b` a word boundary, and parentheses `( )` for a **group** you want to pull out. Write patterns as raw strings, `r\"O\\d{6}\"`, so Python leaves the backslashes for `re`.",
      },
      {
        kind: "example",
        title: "Order IDs in a support message",
        code: src`
import re

message = "Hi, order O104839 arrived damaged; O104900 is fine. Refund to card ending 4242."
match = re.search(r"\bO(\d{6})\b", message)
print(match.group(0), match.group(1))
print(re.findall(r"O\d{6}", message))
print(re.findall(r"\d{4}", message))
print(re.findall(r"\b\d{4}\b", message))
`,
        output: "O104839 104839\n['O104839', 'O104900']\n['1048', '1049', '4242']\n['4242']\n",
        note: "`search` returns the first match; `group(0)` is all of it and `group(1)` the part in parentheses. `findall` returns every match. The third line shows a pattern that is too loose: four digits also appear inside the order IDs. `\\b` requires the digits to stand alone.",
      },
      {
        kind: "error-example",
        title: "Using a match that didn't happen",
        code: src`
import re

match = re.search(r"O\d{6}", "Where is my parcel?")
print(match.group(0))
`,
        error: "AttributeError",
        output: "",
        note: "`AttributeError: 'NoneType' object has no attribute 'group'`. `re.search` returns `None` when nothing matches, so test `if match is not None:` before using it.",
      },
      {
        kind: "text",
        md: "`re.sub(pattern, replacement, text)` replaces every match, and `re.fullmatch(pattern, text)` matches only if the **whole** text has the shape, which is what validation needs (`re.search` would accept a valid code buried in junk). These two clean the double spaces out of Online Retail descriptions and validate Runtime Market SKUs.",
      },
      {
        kind: "example",
        title: "Tidy descriptions and validate SKUs",
        code: src`
import re

def tidy(description):
    return re.sub(r"\s+", " ", description).strip()

def valid_sku(code):
    return re.fullmatch(r"[A-Z]{3}-\d{5}", code) is not None

print(tidy("JUMBO  BAG BAROQUE   BLACK WHITE "))
for code in ["HOM-52782", "hom-52782", "HOM-527821", "SKU HOM-52782"]:
    print(code, valid_sku(code))
`,
        output: "JUMBO BAG BAROQUE BLACK WHITE\nHOM-52782 True\nhom-52782 False\nHOM-527821 False\nSKU HOM-52782 False\n",
        note: "`\\s+` matches any run of whitespace, replaced by one space. `fullmatch` rejects the six-digit code and the code with text in front, both of which `re.search` would have accepted.",
      },
      {
        kind: "text",
        md: "**When to use it:** extracting IDs, dates and amounts from free text, cleaning inconsistent spacing, and checking that a value has the right shape. **Mistakes to avoid:** patterns that are too loose (no `\\b` or `fullmatch`), forgetting that `search` can return `None`, and using a regex where a string method or a real parser (`csv`, `json`, `datetime`) would be clearer.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Every order ID, not just the first",
      prompt: "`order_ids` returns only the first order ID in a message, and crashes when there is none. Make it return every order ID (an `O` followed by six digits), or `[]`.",
      spec: [
        ["Function", "`order_ids(text)`"],
        ["Returns", "a list of every match of `O` followed by six digits, in order"],
      ],
      starter: src`
import re

def order_ids(text):
    match = re.search(r"O\d{6}", text)
    return [match.group(0)]

print(order_ids("Orders O104839 and O104900 were both late."))
`,
      answer: src`
import re

def order_ids(text):
    return re.findall(r"O\d{6}", text)

print(order_ids("Orders O104839 and O104900 were both late."))
`,
      wrong: [
        {
          code: src`
import re

def order_ids(text):
    return re.findall(r"\d{6}", text)
`,
          fails: ["returns"],
          why: "the pattern leaves out the `O`, so it returns bare digits, including the card's",
        },
      ],
      hints: ["`search` stops at the first match.", "Another function in `re` returns every match as a list.", "`re.findall` with the same pattern returns them all, and `[]` when there are none."],
      task: {
        checks: [
          fn("returns", "order_ids", [
            example(["Orders O104839 and O104900 were both late; card 424242 was charged."], ["O104839", "O104900"]),
            hiddenCase("no order ID at all", ["Where is my parcel?"], []),
            hiddenCase("IDs at the very start and end, joined by a slash", ["O100043/O108752"], ["O100043", "O108752"]),
          ], { label: "order_ids() finds every order ID" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Take a log line apart",
        prompt: "Server log lines look like `2025-03-03 09:15 ERROR timeout calling inventory service`: a date, a time (hours and minutes), a level that is `INFO`, `WARNING` or `ERROR`, and a message. Write `parse_log_line(line)`: if the **whole** line has that shape, return a tuple `(date, time, level, message)`; otherwise return `None`.",
        spec: [
          ["Function", "`parse_log_line(line)`"],
          ["Shape", "`YYYY-MM-DD HH:MM LEVEL message`, single spaces between the first four parts; the message is at least one character"],
          ["Returns", "a tuple of four texts, or `None`"],
          ["Groups", "`match.groups()` returns all the groups of a match as a tuple"],
          ["Example", "`parse_log_line(\"2025-03-03 09:15 ERROR timeout calling inventory service\")` → `('2025-03-03', '09:15', 'ERROR', 'timeout calling inventory service')`"],
        ],
        starter: src`
import re

def parse_log_line(line):
    return None

print(parse_log_line("2025-03-03 09:15 ERROR timeout calling inventory service"))
print(parse_log_line("server restarted"))
`,
        answer: src`
import re

def parse_log_line(line):
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) (INFO|WARNING|ERROR) (.+)", line)
    if match is None:
        return None
    return match.groups()

print(parse_log_line("2025-03-03 09:15 ERROR timeout calling inventory service"))
print(parse_log_line("server restarted"))
`,
        alternatives: [
          src`
import re

LINE = r"(\d{4}-\d\d-\d\d) (\d\d:\d\d) (INFO|WARNING|ERROR) (.+)"

def parse_log_line(line):
    found = re.fullmatch(LINE, line)
    if found:
        return (found.group(1), found.group(2), found.group(3), found.group(4))
    return None
`,
        ],
        wrong: [
          {
            code: src`
import re

def parse_log_line(line):
    match = re.search(r"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) (INFO|WARNING|ERROR) (.+)", line)
    if match is None:
        return None
    return match.groups()
`,
            fails: ["returns"],
            why: "`search` accepts a valid-looking line buried after other text",
          },
          {
            code: src`
import re

def parse_log_line(line):
    match = re.fullmatch(r"(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}) (\w+) (.+)", line)
    if match is None:
        return None
    return match.groups()
`,
            fails: ["returns"],
            why: "`\\w+` accepts any word as the level, such as `error` or `DEBUG`",
          },
          {
            code: src`
def parse_log_line(line):
    parts = line.split(" ", 3)
    if len(parts) < 4:
        return None
    return (parts[0], parts[1], parts[2], parts[3])
`,
            fails: ["returns"],
            why: "splitting on spaces checks nothing about the shape of each part",
          },
        ],
        hints: [
          "Write one pattern with four groups: date, time, level, message.",
          "The level is one of three fixed words: `(INFO|WARNING|ERROR)`. The message is `.+`, any characters.",
          "Use `re.fullmatch` so the whole line must fit; return `None` when it doesn't, and `groups()` when it does.",
        ],
        task: {
          checks: [
            fn("returns", "parse_log_line", [
              example(["2025-03-03 09:15 ERROR timeout calling inventory service"], py.tuple(py.str("2025-03-03"), py.str("09:15"), py.str("ERROR"), py.str("timeout calling inventory service"))),
              example(["server restarted"], null),
              example(["2025-03-03 08:59 INFO server started"], py.tuple(py.str("2025-03-03"), py.str("08:59"), py.str("INFO"), py.str("server started"))),
              hiddenCase("a lower-case level", ["2025-03-03 09:02 error card declined"], null),
              hiddenCase("an unknown level", ["2025-03-03 09:02 DEBUG retry 2"], null),
              hiddenCase("a valid line with other text in front", ["copy: 2025-03-03 09:02 WARNING retrying"], null),
              hiddenCase("no message after the level", ["2025-03-03 09:02 INFO "], null),
              hiddenCase("a message with extra spaces and symbols", ["2025-03-04 23:59 WARNING  disk at 91% (vol-2)"], py.tuple(py.str("2025-03-04"), py.str("23:59"), py.str("WARNING"), py.str(" disk at 91% (vol-2)"))),
            ], { label: "parse_log_line() splits a well-formed log line into its parts" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Mask card numbers in support notes",
        prompt: "Support agents sometimes paste full card numbers into notes, which must never be stored. Write `mask_cards(text)`: replace every 16-digit card number, written as four groups of four digits separated by a space, a dash or nothing, with `**** **** **** ` followed by its **last four digits**. Leave everything else alone, including longer or shorter digit runs and order IDs. In a replacement, `\\4` stands for the text matched by group 4.",
        spec: [
          ["Function", "`mask_cards(text)`"],
          ["Card numbers", "`4242 4242 4242 4242`, `4000-0566-5566-5556`, `5555555555554444`"],
          ["Returns", "the text with each card number replaced, e.g. `**** **** **** 4242`"],
          ["Not cards", "digit runs that aren't exactly 16 digits in this layout, such as `378282246310005` (15 digits) or `O104839`"],
        ],
        starter: src`
import re

def mask_cards(text):
    return text

print(mask_cards("Customer read out 4242 4242 4242 4242 for order O104839."))
`,
        answer: src`
import re

def mask_cards(text):
    return re.sub(r"\b(\d{4})[ -]?(\d{4})[ -]?(\d{4})[ -]?(\d{4})\b", r"**** **** **** \4", text)

print(mask_cards("Customer read out 4242 4242 4242 4242 for order O104839."))
`,
        alternatives: [
          src`
import re

CARD = re.compile(r"\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?(\d{4})\b")

def mask_cards(text):
    return CARD.sub(r"**** **** **** \1", text)
`,
        ],
        wrong: [
          {
            code: src`
import re

def mask_cards(text):
    return re.sub(r"\d{16}", "**** **** **** ****", text)
`,
            fails: ["returns"],
            why: "only unbroken 16-digit runs are found, and the last four digits are lost",
          },
          {
            code: src`
import re

def mask_cards(text):
    return re.sub(r"(\d{4})[ -]?(\d{4})[ -]?(\d{4})[ -]?(\d{4})", r"**** **** **** \4", text)
`,
            fails: ["returns"],
            why: "without `\\b`, 16 digits inside a longer number are masked too",
          },
          {
            code: src`
import re

def mask_cards(text):
    return re.sub(r"\b(\d{4})[ -]?(\d{4})[ -]?(\d{4})[ -]?(\d{4})\b", r"\1 **** **** ****", text)
`,
            fails: ["returns"],
            why: "it keeps the first four digits instead of the last four",
          },
        ],
        hints: [
          "Describe one card number: four digits, an optional separator, and so on four times. `[ -]?` is one optional space or dash.",
          "Put the last block of four digits in a group so the replacement can reuse it.",
          "Add `\\b` at both ends so digits inside a longer number aren't touched, and use `re.sub` with a raw-string replacement.",
        ],
        task: {
          checks: [
            fn("returns", "mask_cards", [
              example(["Customer read out 4242 4242 4242 4242 for order O104839."], "Customer read out **** **** **** 4242 for order O104839."),
              example(["Refund to 4000-0566-5566-5556 please"], "Refund to **** **** **** 5556 please"),
              example(["no card here"], "no card here"),
              hiddenCase("an unbroken 16-digit number", ["5555555555554444"], "**** **** **** 4444"),
              hiddenCase("two cards in one note", ["old 4242424242424242, new 5105 1051 0510 5100"], "old **** **** **** 4242, new **** **** **** 5100"),
              hiddenCase("a 15-digit number", ["Amex 378282246310005 declined"], "Amex 378282246310005 declined"),
              hiddenCase("a 20-digit reference", ["ref 12345678901234567890"], "ref 12345678901234567890"),
            ], { label: "mask_cards() hides every card number except its last four digits" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import re

line = "SKU HOM-52782 x2, SKU BOO-58412 x10"
print(re.findall(r"([A-Z]{3})-\d{5} x(\d+)", line))
`,
        choices: ["[('HOM', '2'), ('BOO', '10')]", "['HOM-52782 x2', 'BOO-58412 x10']", "[('HOM-52782', '2'), ('BOO-58412', '10')]", "['HOM', 'BOO']"],
        answer: 0,
        why: "With more than one group, `findall` returns a tuple of the groups for each match, not the whole match. Only the category letters and the quantity are in parentheses.",
      },
      {
        id: "q2",
        prompt: "A common mistake: validating with `search` instead of `fullmatch`. What does this print?",
        program: src`
import re

code = "HOM-52782-OLD"
print(re.search(r"[A-Z]{3}-\d{5}", code) is not None, re.fullmatch(r"[A-Z]{3}-\d{5}", code) is not None)
`,
        choices: ["True False", "True True", "False False", "False True"],
        answer: 0,
        why: "`search` finds a valid-looking piece inside the value and is satisfied. `fullmatch` requires the whole value to have the shape, so the suffix makes it invalid.",
      },
      {
        id: "q3",
        prompt: "Which job is a good fit for a regular expression?",
        choices: ["Pulling every order ID like `O104839` out of support emails", "Reading the columns of a CSV file", "Parsing a JSON API response", "Adding up a list of prices"],
        answer: 0,
        why: "Finding a shape inside free text is what regexes are for. CSV and JSON have real parsers that handle quoting and nesting; arithmetic needs numbers, not patterns.",
      },
    ],
    review: [
      "Patterns describe shapes: `\\d`, `[A-Z]`, `{n}`, `+`, `\\s`, `\\b`; write them as raw strings.",
      "`re.search` finds the first match (or None), `re.findall` every match; groups pull out parts.",
      "`re.sub` rewrites matches (with `\\1`, `\\2` for groups); `re.fullmatch` validates a whole value.",
      "Next module: splitting your own code into modules and packages.",
    ],
  },
];
