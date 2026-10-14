import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const comparisonsAndBooleanValues: PyLesson = {
  slug: "comparisons-and-boolean-values",
  ref: "python:comparisons-and-boolean-values",
  module: "conditions",
  number: 1,
  title: "Comparisons and boolean values",
  level: "beginner",
  summary:
    "Compare values with `==`, `!=`, `<`, `>`, `<=` and `>=`, get `True` or `False` back, and avoid the classic traps: boundaries, comparing text, and comparing floats.",

  sections: [
    {
      label: "six comparison operators",
      blocks: [
        {
          kind: "p",
          text: "A comparison asks a question about two values and answers with a **boolean**: `True` or `False`. These are values of type `bool`, which you can print and store like any other value.",
        },
        { kind: "code", code: "total = 48.5\nprint(total == 50)   # equal to: False\nprint(total != 50)   # not equal to: True\nprint(total < 50)    # less than: True\nprint(total >= 50)   # greater than or equal to: False" },
        {
          kind: "p",
          text: "Boundaries matter. “Free delivery from 50 dollars” means `total >= 50`; “over 50” means `total > 50`. At exactly 50 the two give different answers, so read the rule carefully and test the boundary value itself.",
        },
        {
          kind: "p",
          text: "Comparisons can be chained: `0 <= score <= 100` means `0 <= score` **and** `score <= 100`. That's the clearest way to check a range.",
        },
      ],
    },
    {
      label: "comparing text",
      blocks: [
        {
          kind: "p",
          text: "Strings compare character by character, by their Unicode code points. So `\"apple\" < \"banana\"`, but also `\"Zebra\" < \"apple\"`, because every capital letter comes before every lowercase one, and `\"10\" < \"9\"`, because `\"1\"` comes before `\"9\"`. Normalise case before comparing words, and convert numbers before comparing them as numbers.",
        },
        {
          kind: "p",
          text: "`==` between different types is allowed and just gives `False` (`\"1\" == 1` is `False`), except that ints and floats compare by value: `1 == 1.0` is `True`. Ordering a string against a number with `<` is a `TypeError`.",
        },
      ],
    },
    {
      label: "comparing floats",
      blocks: [
        {
          kind: "p",
          text: "Because floats are approximations, `0.1 + 0.2 == 0.3` is `False`. To compare floats from calculations, check that they are **close**: `abs(a - b) < 0.000001`. `abs()` gives the size of a number without its sign, so `abs(-3)` is `3`.",
        },
      ],
    },
  ],

  example: {
    caption: "Checking an order against a free-delivery rule. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'total = 48.5\nthreshold = 50\n\nfree_delivery = total >= threshold\nprint("Free delivery:", free_delivery)\nprint("Exactly at the threshold:", total == threshold)\nprint("Valid total:", 0 <= total <= 10000)\nprint(type(free_delivery))',
  },

  walkthrough: [
    {
      title: "Comparisons give True or False",
      text: "Each line asks one question. The answers are booleans, and can be stored in variables.",
      code: "stock = 3\nprint(stock > 0)\nprint(stock == 0)\nin_stock = stock > 0\nprint(in_stock)",
    },
    {
      title: "> and >= differ at the boundary",
      text: "At exactly 50, `>` says no and `>=` says yes. Test the boundary value when a rule has one.",
      code: "total = 50\nprint(total > 50)\nprint(total >= 50)",
    },
    {
      title: "Text compares by character codes",
      text: "Capitals sort before lowercase letters, and digits in text compare one character at a time.",
      code: 'print("apple" < "banana")\nprint("Zebra" < "apple")\nprint("10" < "9")\nprint(int("10") < int("9"))',
    },
    {
      title: "Floats: check closeness, not equality",
      text: "The sum is a tiny bit more than 0.3, so `==` fails. The difference is far below 0.000001, so they are close.",
      code: "total = 0.1 + 0.2\nprint(total == 0.3)\nprint(abs(total - 0.3))\nprint(abs(total - 0.3) < 0.000001)",
    },
  ],

  mistakes: [
    {
      title: "Writing = instead of ==",
      text: "Inside `print()`'s brackets, `stock = 0` looks like a named argument, like `sep=\"/\"`. `print()` has no argument called `stock`, so this is a `TypeError`, not a comparison.",
      code: "stock = 0\nprint(stock = 0)",
      raises: "TypeError",
      fix: "Use `==` to compare: `print(stock == 0)`.",
    },
    {
      title: "Comparing numbers that are still text",
      text: "`\"9\"` and `\"10\"` are strings, so they compare character by character: `\"9\"` is greater because `9` comes after `1`.",
      code: 'a = "9"\nb = "10"\nprint(a > b)',
      fix: "Convert first: `int(a) > int(b)` is `False`, as expected.",
    },
    {
      title: "Ordering text against a number",
      text: "Python refuses to say whether a string is less than a number, and stops with a `TypeError`.",
      code: 'age = "17"\nprint(age >= 18)',
      raises: "TypeError",
      fix: "Convert the text first: `int(age) >= 18`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Check a free-delivery rule",
      prompt:
        "Orders get free delivery when the total is **at least** `threshold`. Store whether this order qualifies in `free_delivery`, and how much more the customer would need to spend in `short_by` (which may be zero or negative when they already qualify). Print both as shown. Check answer tries totals below, exactly at, and above the threshold.",
      expectedOutput: "Free delivery: False\nShort by: 1.5\n",
      looksFor: [
        "`free_delivery` is `True` exactly when `total` is at least `threshold` (the boundary counts).",
        "`short_by` is `threshold - total`.",
        "Both are calculated from the variables, and printed as shown.",
      ],
      starter: "total = 48.5\nthreshold = 50\n\n# Store free_delivery and short_by, then print them.\n",
      task: {
        checks: [
          { kind: "variable", id: "free", name: "free_delivery", expected: py.bool(false) },
          { kind: "variable", id: "short", name: "short_by", expected: py.float(1.5) },
          { kind: "output", id: "output", label: "Prints both", expected: "Free delivery: False\nShort by: 1.5\n" },
          { kind: "variant", id: "v-boundary", set: { total: py.int(50), threshold: py.int(50) }, output: "Free delivery: True\nShort by: 0\n", tip: "“At least” includes the threshold itself: use >=, not >." },
          { kind: "variant", id: "v-over", set: { total: py.float(72.25), threshold: py.int(50) }, vars: { free_delivery: py.bool(true), short_by: py.float(-22.25) } },
          { kind: "variant", id: "v-hidden", hidden: true, set: { total: py.float(29.99), threshold: py.int(30) }, vars: { free_delivery: py.bool(false) } },
        ],
      },
      hints: [
        "“At least 50” is total >= threshold.",
        "free_delivery = total >= threshold stores the True/False answer.",
        "short_by = threshold - total.",
      ],
      answer: 'total = 48.5\nthreshold = 50\n\nfree_delivery = total >= threshold\nshort_by = threshold - total\nprint("Free delivery:", free_delivery)\nprint("Short by:", short_by)',
      alternatives: ['total = 48.5\nthreshold = 50\nfree_delivery = threshold <= total\nshort_by = -(total - threshold)\nprint("Free delivery:", free_delivery)\nprint("Short by:", short_by)\n'],
      wrong: [
        { code: 'total = 48.5\nthreshold = 50\nfree_delivery = total > threshold\nshort_by = threshold - total\nprint("Free delivery:", free_delivery)\nprint("Short by:", short_by)\n', fails: ["v-boundary"], why: "> excludes the boundary" },
        { code: 'total = 48.5\nthreshold = 50\nfree_delivery = False\nshort_by = threshold - total\nprint("Free delivery:", free_delivery)\nprint("Short by:", short_by)\n', fails: ["v-boundary", "v-over"], why: "fixed answer" },
        { code: 'total = 48.5\nthreshold = 50\nfree_delivery = total >= threshold\nshort_by = total - threshold\nprint("Free delivery:", free_delivery)\nprint("Short by:", short_by)\n', fails: ["short", "output", "v-over"], why: "subtraction the wrong way round" },
      ],
    },
    {
      id: "challenge-2",
      title: "Compare sensor readings",
      prompt:
        "A sensor's `reading` is calculated, and must be compared with a `target`. Store the exact comparison in `exact` and a tolerant one in `close`: `True` when the two differ by less than `tolerance`. Print both as shown. With these numbers they disagree, which is the point.",
      expectedOutput: "Exact match: False\nClose enough: True\n",
      looksFor: [
        "`exact` is `reading == target`.",
        "`close` is `True` when the size of the difference is less than `tolerance`, whichever value is bigger.",
      ],
      starter: "reading = 0.1 + 0.2\ntarget = 0.3\ntolerance = 0.000001\n\n# Store exact and close, then print them.\n",
      task: {
        checks: [
          { kind: "variable", id: "exact", name: "exact", expected: py.bool(false) },
          { kind: "variable", id: "close", name: "close", expected: py.bool(true), tip: "abs(reading - target) < tolerance." },
          { kind: "output", id: "output", label: "Prints both", expected: "Exact match: False\nClose enough: True\n" },
          { kind: "variant", id: "v-below", set: { reading: py.float(0.2999999), target: py.float(0.3) }, vars: { close: py.bool(true) }, tip: "The reading can be below the target too: abs() ignores the sign of the difference." },
          { kind: "variant", id: "v-far", set: { reading: py.float(0.25), target: py.float(0.3) }, output: "Exact match: False\nClose enough: False\n", tip: "A reading far below the target has a big negative difference. Compare its size, abs(…), with the tolerance." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { reading: py.float(2.5), target: py.float(2.5) }, vars: { exact: py.bool(true), close: py.bool(true) } },
          { kind: "variant", id: "v-hidden-near", hidden: true, set: { reading: py.float(0.301), target: py.float(0.3) }, vars: { close: py.bool(false) } },
        ],
      },
      hints: [
        "exact = reading == target.",
        "The difference reading - target can be negative. abs() gives its size.",
        "close = abs(reading - target) < tolerance.",
      ],
      answer: 'reading = 0.1 + 0.2\ntarget = 0.3\ntolerance = 0.000001\n\nexact = reading == target\nclose = abs(reading - target) < tolerance\nprint("Exact match:", exact)\nprint("Close enough:", close)',
      alternatives: ['reading = 0.1 + 0.2\ntarget = 0.3\ntolerance = 0.000001\nexact = reading == target\nclose = -tolerance < reading - target < tolerance\nprint("Exact match:", exact)\nprint("Close enough:", close)\n'],
      wrong: [
        { code: 'reading = 0.1 + 0.2\ntarget = 0.3\ntolerance = 0.000001\nexact = reading == target\nclose = reading - target < tolerance\nprint("Exact match:", exact)\nprint("Close enough:", close)\n', fails: ["v-far"], why: "no abs: a big negative difference counts as close" },
        { code: 'reading = 0.1 + 0.2\ntarget = 0.3\ntolerance = 0.000001\nexact = reading == target\nclose = round(reading, 2) == target\nprint("Exact match:", exact)\nprint("Close enough:", close)\n', fails: ["v-hidden-near"], why: "rounding to 2 places is too loose" },
      ],
    },
  ],

  quiz: [
    {
      id: "chain",
      prompt: "What does this program print?",
      code: "score = 100\nprint(0 <= score < 100, score >= 100)",
      options: [
        { text: "`False True`", correct: true, why: "`score < 100` is false at exactly 100, so the chained range check is `False`. `score >= 100` includes 100." },
        { text: "`True True`", why: "The range uses `< 100`, which excludes 100 itself." },
        { text: "`True False`", why: "`>=` includes the boundary, so `100 >= 100` is `True`." },
        { text: "A `SyntaxError`", why: "Chained comparisons like `0 <= score < 100` are valid Python." },
      ],
    },
    {
      id: "text",
      prompt: "Which comparison is `True`?",
      options: [
        { text: '`"Zoo" < "apple"`', correct: true, why: "Capital `Z` (code 90) comes before lowercase `a` (code 97), and the first characters decide." },
        { text: '`"10" > "9"`', why: "As text, `\"1\"` comes before `\"9\"`, so `\"10\"` is the smaller string." },
        { text: '`"1" == 1`', why: "A string never equals a number, even when it spells it." },
        { text: "`0.1 + 0.2 == 0.3`", why: "The float sum is `0.30000000000000004`, not exactly `0.3`." },
      ],
    },
  ],

  outcomes: [
    "Compare values with the six comparison operators, and store the `True`/`False` result.",
    "Choose between `>` and `>=` (and `<`, `<=`) from the wording of a rule, and test the boundary.",
    "Predict how strings compare, and convert numbers in text before comparing them.",
    "Compare floats by closeness with `abs()`.",
  ],
};
