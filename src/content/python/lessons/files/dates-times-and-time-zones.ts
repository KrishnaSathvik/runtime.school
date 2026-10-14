import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;

export const datesTimesAndTimeZones: PyLesson = {
  slug: "dates-times-and-time-zones",
  ref: "python:dates-times-and-time-zones",
  module: "files",
  number: 4,
  title: "Dates, times and time zones",
  level: "intermediate",
  summary:
    "Turn date text into real `date` and `datetime` values, format them back into text, do arithmetic with `timedelta`, and handle time zones correctly: compare and group moments in UTC, and know which calendar day a timestamp falls on.",

  sections: [
    {
      label: "dates are values, not text",
      blocks: [
        {
          kind: "p",
          text: "Dates arrive as text: `\"2026-10-14\"`, `\"14/10/2026\"`. Compared as text, `\"9/1/2026\"` comes after `\"10/1/2026\"`, and you can't add a day to a string. The `datetime` module's `date` (a calendar day) and `datetime` (a moment, with a time) know about months, leap years and ordering.",
        },
        { kind: "code", code: 'from datetime import date, datetime\n\nday = date.fromisoformat("2026-10-14")          # ISO 8601: year-month-day\nalso = datetime.strptime("14/10/2026", "%d/%m/%Y").date()\nprint(day == also, day.strftime("%A %d %B %Y"))' },
        {
          kind: "p",
          text: "`fromisoformat` reads the international `YYYY-MM-DD` format (and `YYYY-MM-DDTHH:MM:SS`, with an optional offset). `strptime(text, format)` parses any layout you describe with codes: `%Y` year, `%m` month, `%d` day, `%H:%M` hours and minutes. `strftime(format)` goes the other way. Invalid dates, like 30 February, raise `ValueError`.",
        },
      ],
    },
    {
      label: "arithmetic with timedelta",
      blocks: [
        {
          kind: "p",
          text: "Subtracting two dates gives a `timedelta`; its `.days` is the number of days between them. Adding a `timedelta(days=30)` to a date moves it forward, rolling over months and leap years correctly. `date.weekday()` is 0 for Monday up to 6 for Sunday.",
        },
      ],
    },
    {
      label: "time zones",
      blocks: [
        {
          kind: "p",
          text: "A `datetime` without a time zone is **naive**: “23:30” could be any of 24 different moments. One with a zone is **aware**. `\"2026-10-14T23:30:00-05:00\"` is 23:30 at five hours behind UTC, which is 04:30 **the next day** in UTC. Store and compare moments in UTC (`dt.astimezone(timezone.utc)`), and convert to a local zone only for display.",
        },
        {
          kind: "p",
          text: "Which **day** a timestamp belongs to depends on the zone: the same moment is 14 October in New York and 15 October in UTC. Decide which zone defines your reporting day before grouping by date. For named zones with daylight-saving rules (`Europe/London`), Python's `zoneinfo.ZoneInfo` uses the system's time-zone database; this browser runtime doesn't include that database, so these lessons use UTC and fixed offsets, written `timezone(timedelta(hours=-5))`.",
        },
      ],
    },
  ],

  example: {
    caption: "Parsing, formatting, arithmetic and a time-zone conversion. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'from datetime import date, datetime, timedelta, timezone\n\norder_day = date.fromisoformat("2026-10-14")\nprint(order_day.strftime("%d/%m/%Y"), order_day.strftime("%A"))\nprint("Due:", order_day + timedelta(days=30))\nprint("Days to 25 Dec:", (date(2026, 12, 25) - order_day).days)\n\nplaced = datetime.fromisoformat("2026-10-14T23:30:00-05:00")\nin_utc = placed.astimezone(timezone.utc)\nprint(placed.date(), "local ->", in_utc.date(), "UTC", in_utc.strftime("%H:%M"))',
  },

  walkthrough: [
    {
      title: "Text dates sort wrongly; real dates don't",
      text: "As text, \"9/1\" sorts after \"10/1\". Parsed into dates, they sort by time.",
      code: 'from datetime import datetime\ntexts = ["10/1/2026", "9/1/2026", "11/1/2026"]\nprint(sorted(texts))\ndates = [datetime.strptime(t, "%m/%d/%Y").date() for t in texts]\nprint(sorted(dates))',
    },
    {
      title: "Formatting codes",
      text: "`strftime` lays out a date any way you like; `isoformat` gives the standard form.",
      code: 'from datetime import date\nd = date(2026, 10, 14)\nprint(d.isoformat())\nprint(d.strftime("%d %b %Y"), d.strftime("%Y%m%d"), d.strftime("%a"))',
    },
    {
      title: "timedelta handles the calendar",
      text: "Adding a day to 28 February gives 1 March in 2026 and 29 February in the leap year 2024.",
      code: "from datetime import date, timedelta\nprint(date(2026, 2, 28) + timedelta(days=1))\nprint(date(2024, 2, 28) + timedelta(days=1))\nprint((date(2026, 3, 1) - date(2026, 1, 1)).days)",
    },
    {
      title: "The same moment, two calendar days",
      text: "23:30 in New York's October offset (UTC−5) is already the next day in UTC.",
      code: 'from datetime import datetime, timezone, timedelta\nnew_york = timezone(timedelta(hours=-5))\nmoment = datetime(2026, 10, 14, 23, 30, tzinfo=new_york)\nprint(moment.isoformat())\nprint(moment.astimezone(timezone.utc).isoformat())\nprint(moment.date(), moment.astimezone(timezone.utc).date())',
    },
  ],

  mistakes: [
    {
      title: "Comparing naive and aware datetimes",
      text: "Python refuses to compare a moment with a zone to one without: `TypeError`. It can't know what the naive one means.",
      code: 'from datetime import datetime, timezone\na = datetime(2026, 10, 14, 9, 0)\nb = datetime(2026, 10, 14, 9, 0, tzinfo=timezone.utc)\nprint(a < b)',
      raises: "TypeError",
      fix: "Give every datetime a zone when it's parsed (for example `.replace(tzinfo=timezone.utc)` if you know the text is UTC), then compare.",
    },
    {
      title: "A date that doesn't exist",
      text: "There's no 30 February, so parsing it is a `ValueError`. Validating input catches it.",
      code: 'from datetime import date\nprint(date.fromisoformat("2026-02-30"))',
      raises: "ValueError",
      fix: "Wrap parsing in `try`/`except ValueError` when the text comes from outside.",
    },
    {
      title: "Mixing up day and month",
      text: "`%m/%d` reads 04/10 as 10 April; the file meant 4 October. Nothing fails, which is why this bug is dangerous.",
      code: 'from datetime import datetime\nprint(datetime.strptime("04/10/2026", "%m/%d/%Y").date())',
      fix: "Find out which layout the data uses, write the format to match, and test it on a day above 12.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Normalise dates to ISO",
      prompt:
        "Orders arrive with dates written in different ways. Write `to_iso(text)`, which returns the date as an ISO string (`YYYY-MM-DD`). Accept exactly these layouts: `2026-10-14`, `14/10/2026` (day first) and `14 Oct 2026`. Spaces around the text are ignored. Anything else, including impossible dates, raises `ValueError`.",
      looksFor: [
        "Each of the three layouts converts to `YYYY-MM-DD`.",
        "`14/10/2026` is read day-first.",
        "Other layouts and impossible dates (like 29 February 2026) raise `ValueError`.",
      ],
      starter: 'from datetime import datetime\n\n\ndef to_iso(text):\n    # Try each accepted layout; return "YYYY-MM-DD".\n    pass\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "to_iso",
            cases: [
              { args: [s("2026-10-14")], expected: s("2026-10-14") },
              { args: [s("14/10/2026")], expected: s("2026-10-14") },
              { args: [s("14 Oct 2026")], expected: s("2026-10-14") },
              { args: [s(" 03/02/2026 ")], expected: s("2026-02-03") },
              { args: [s("29/02/2026")], raises: "ValueError" },
              { args: [s("October 14, 2026")], raises: "ValueError" },
              { args: [s("29/02/2024")], expected: s("2024-02-29"), hidden: true },
              { args: [s("1 Jan 2027")], expected: s("2027-01-01"), hidden: true },
              { args: [s("2026/10/14")], raises: "ValueError", hidden: true },
            ],
            tip: 'Loop over the formats ["%Y-%m-%d", "%d/%m/%Y", "%d %b %Y"], try datetime.strptime with each, and raise ValueError if none worked.',
          },
        ],
      },
      hints: [
        'The three formats are "%Y-%m-%d", "%d/%m/%Y" and "%d %b %Y" (%b is a short month name).',
        "For each format: try: return datetime.strptime(text.strip(), fmt).date().isoformat() except ValueError: continue.",
        'After the loop: raise ValueError(f"unrecognised date: {text!r}").',
      ],
      answer: 'from datetime import datetime\n\nFORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d %b %Y"]\n\n\ndef to_iso(text):\n    """Return text as YYYY-MM-DD; accepts 2026-10-14, 14/10/2026 and 14 Oct 2026."""\n    for fmt in FORMATS:\n        try:\n            return datetime.strptime(text.strip(), fmt).date().isoformat()\n        except ValueError:\n            continue\n    raise ValueError(f"unrecognised date: {text!r}")',
      wrong: [
        { code: 'from datetime import datetime\n\ndef to_iso(text):\n    for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%d %b %Y"]:\n        try:\n            return datetime.strptime(text.strip(), fmt).date().isoformat()\n        except ValueError:\n            continue\n    raise ValueError(text)\n', fails: ["fn"], why: "month first" },
        { code: 'def to_iso(text):\n    text = text.strip()\n    if "/" in text:\n        d, m, y = text.split("/")\n        return f"{y}-{m}-{d}"\n    return text\n', fails: ["fn"], why: "string surgery: no validation" },
      ],
    },
    {
      id: "challenge-2",
      title: "Count orders per UTC day",
      prompt:
        "Each order timestamp is ISO text with an offset, like `2026-10-14T23:30:00-05:00`. The business reports by **UTC** day. Write `orders_per_utc_day(timestamps)`, which returns a dictionary from UTC date (as `YYYY-MM-DD` text) to the number of orders placed that day.",
      looksFor: [
        "Each timestamp is parsed with its offset and converted to UTC before taking the date.",
        "An order at 23:30 at UTC−5 counts for the next UTC day.",
        "Keys are ISO date strings; an empty list gives `{}`.",
      ],
      starter: 'from datetime import datetime, timezone\n\n\ndef orders_per_utc_day(timestamps):\n    # Return {"YYYY-MM-DD": count} by UTC day.\n    pass\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "orders_per_utc_day",
            cases: [
              { args: [py.list(s("2026-10-14T09:00:00+00:00"), s("2026-10-14T23:30:00-05:00"), s("2026-10-15T01:00:00+02:00"))], expected: py.dict([[s("2026-10-14"), i(2)], [s("2026-10-15"), i(1)]]) },
              { args: [py.list(s("2026-10-14T23:30:00-05:00"))], expected: py.dict([[s("2026-10-15"), i(1)]]) },
              { args: [py.list()], expected: py.dict([]) },
              { args: [py.list(s("2026-12-31T22:00:00-03:00"), s("2027-01-01T08:00:00+09:00"))], expected: py.dict([[s("2027-01-01"), i(1)], [s("2026-12-31"), i(1)]]), hidden: true },
            ],
            tip: 'datetime.fromisoformat(ts).astimezone(timezone.utc).date().isoformat() gives the UTC day.',
          },
        ],
      },
      hints: [
        "Parse with datetime.fromisoformat(ts): it understands the offset.",
        "Convert with .astimezone(timezone.utc), then take .date().isoformat().",
        "Count with counts[day] = counts.get(day, 0) + 1.",
      ],
      answer: 'from datetime import datetime, timezone\n\n\ndef orders_per_utc_day(timestamps):\n    """Return {UTC date as YYYY-MM-DD: number of orders}."""\n    counts = {}\n    for ts in timestamps:\n        day = datetime.fromisoformat(ts).astimezone(timezone.utc).date().isoformat()\n        counts[day] = counts.get(day, 0) + 1\n    return counts',
      wrong: [
        { code: 'def orders_per_utc_day(timestamps):\n    counts = {}\n    for ts in timestamps:\n        day = ts[:10]\n        counts[day] = counts.get(day, 0) + 1\n    return counts\n', fails: ["fn"], why: "local date, not UTC" },
      ],
    },
  ],

  quiz: [
    {
      id: "delta",
      prompt: "What does this program print?",
      code: "from datetime import date\nprint((date(2026, 3, 1) - date(2026, 2, 1)).days)",
      options: [
        { text: "`28`", correct: true, why: "February 2026 has 28 days, and subtracting dates counts them exactly." },
        { text: "`30`", why: "Months aren't all 30 days; `date` uses the real calendar." },
        { text: "`1`", why: "`.days` counts days, not months." },
        { text: "A `TypeError`", why: "Subtracting two dates is allowed and gives a `timedelta`." },
      ],
    },
    {
      id: "utc-day",
      prompt: "`2026-10-14T22:00:00-04:00` happened on which UTC date?",
      options: [
        { text: "15 October", correct: true, why: "22:00 at UTC−4 is 02:00 UTC the next day." },
        { text: "14 October", why: "That's the local date. In UTC the clock is four hours ahead, past midnight." },
        { text: "13 October", why: "A negative offset means UTC is ahead, not behind." },
        { text: "It can't be known", why: "The offset makes it an exact moment, so the UTC date is certain." },
      ],
    },
  ],

  outcomes: [
    "Parse dates with `fromisoformat` and `strptime`, and format them with `strftime`.",
    "Do date arithmetic with `timedelta`, trusting it with months and leap years.",
    "Tell naive from aware datetimes, and convert moments to UTC.",
    "Decide which time zone defines a reporting day before grouping by date.",
  ],
};
