import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const fStringsAndFormatting: PyLesson = {
  slug: "f-strings-and-formatting",
  ref: "python:f-strings-and-formatting",
  module: "strings",
  number: 5,
  title: "f-strings and formatting",
  level: "beginner",
  summary:
    "Put values straight into text with f-strings, and control exactly how they look: decimal places, percentages, thousands separators, and columns that line up.",

  sections: [
    {
      label: "f-strings",
      blocks: [
        {
          kind: "p",
          text: "An **f-string** is a string with an `f` before the opening quote. Anything inside `{` `}` is worked out as Python and its value is put into the text, converted for you: no `str()` and no `+`.",
        },
        { kind: "code", code: 'name = "Ada"\nitems = 3\nprint(f"{name} ordered {items} items")    # Ada ordered 3 items\nprint(f"Twice that is {items * 2}")       # Twice that is 6' },
        {
          kind: "p",
          text: "Without the `f`, the braces are printed as they are. To print a literal brace inside an f-string, double it: `{{`.",
        },
      ],
    },
    {
      label: "format specs",
      blocks: [
        {
          kind: "p",
          text: "After the value, a colon starts a **format spec** that says how to show it. The most useful:",
        },
        {
          kind: "code",
          code: 'price = 4.5\nprint(f"{price:.2f}")       # 4.50      two decimal places\nprint(f"{0.375:.1%}")       # 37.5%     a fraction as a percentage\nprint(f"{1234567.891:,.2f}")  # 1,234,567.89\nprint(f"{7:03d}")           # 007       pad with zeros to width 3',
        },
        {
          kind: "p",
          text: "`.2f` rounds only what is shown; the variable keeps its full value. `%` multiplies by 100 and adds the percent sign, so give it the fraction (0.375), not 37.5.",
        },
      ],
    },
    {
      label: "columns",
      blocks: [
        {
          kind: "p",
          text: "A number before the type sets a minimum **width**, and `<`, `>` or `^` aligns the value left, right or centred within it: `f\"{name:<10}\"` pads `name` with spaces to 10 characters. Text aligns left by default and numbers right, so tables need `<` for text columns and `>` for numbers only when you want to be explicit.",
        },
        {
          kind: "p",
          text: "While debugging, `f\"{total=}\"` prints both the expression and its value: `total=13.5`.",
        },
      ],
    },
  ],

  example: {
    caption: "A small receipt laid out in columns. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'item = "Notebook"\nquantity = 3\nunit_price = 4.5\nline_total = quantity * unit_price\n\nprint(f"{\'Item\':<12}{\'Qty\':>3}{\'Total\':>10}")\nprint(f"{item:<12}{quantity:>3}{line_total:>10.2f}")\nprint(f"Paid in full: {line_total:.2f} dollars")',
  },

  walkthrough: [
    {
      title: "Values go inside the braces",
      text: "The braces can hold any expression, including a calculation or a method call.",
      code: 'name = "ada"\nitems = 3\nprint(f"{name.title()} ordered {items} items, {items * 2} next month")',
    },
    {
      title: "Decimal places, percentages and separators",
      text: "Each spec changes only how the value is shown.",
      code: 'price = 4.5\nrate = 0.375\nrevenue = 1234567.891\nprint(f"{price:.2f}")\nprint(f"{rate:.1%}")\nprint(f"{revenue:,.2f}")\nprint(price)',
    },
    {
      title: "Width and alignment",
      text: "The bars show where each value starts and ends. Each value is padded to 8 characters.",
      code: 'print(f"|{\'left\':<8}|{\'right\':>8}|{\'mid\':^8}|")\nprint(f"|{42:<8}|{42:>8}|{42:^8}|")',
    },
    {
      title: "The = shortcut for debugging",
      text: "Adding `=` shows the expression as well as its value.",
      code: "quantity = 3\nunit_price = 4.5\nprint(f\"{quantity=}, {unit_price=}, {quantity * unit_price=}\")",
    },
  ],

  mistakes: [
    {
      title: "Forgetting the f",
      text: "Without the `f`, this is an ordinary string and the braces are printed as they are.",
      code: 'total = 12\nprint("Total: {total}")',
      fix: 'Put `f` before the quote: `f"Total: {total}"`.',
    },
    {
      title: "Using % on a value that is already a percentage",
      text: "`:.0%` multiplies by 100, so 37.5 becomes `3750%`.",
      code: 'percent = 37.5\nprint(f"{percent:.0%}")',
      fix: 'Give `%` the fraction (`0.375`), or print the number with a plain `%` sign after it: `f"{percent}%"`.',
    },
    {
      title: "A number format on text",
      text: "`.2f` is for numbers. `price` is still a string here, so formatting it is a `ValueError`.",
      code: 'price = "4.5"\nprint(f"{price:.2f}")',
      raises: "ValueError",
      fix: 'Convert first: `f"{float(price):.2f}"`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Format a receipt line",
      prompt:
        "Store one receipt line in `line` using an f-string: the item name left-aligned in 12 characters, the quantity right-aligned in 3, then ` x `, the unit price with 2 decimal places, then ` = ` and the line total with 2 decimal places. Print it. Check answer also tries other items.",
      expectedOutput: "Notebook      3 x 4.50 = 13.50\n",
      looksFor: [
        "`line` is exactly `\"Notebook      3 x 4.50 = 13.50\"`: the name padded to 12 characters, the quantity to 3.",
        "Both money amounts show 2 decimal places, and the total is calculated, not typed.",
      ],
      starter: 'item = "Notebook"\nquantity = 3\nunit_price = 4.5\n\n# Build line with an f-string, then print it.\n',
      task: {
        checks: [
          { kind: "variable", id: "line", name: "line", expected: py.str("Notebook      3 x 4.50 = 13.50"), tip: "{item:<12} pads the name to 12 characters; {quantity:>3} right-aligns the quantity in 3." },
          { kind: "output", id: "output", label: "Prints the line", expected: "Notebook      3 x 4.50 = 13.50\n" },
          { kind: "variant", id: "v-other", set: { item: py.str("Pen"), quantity: py.int(12), unit_price: py.float(1.25) }, output: "Pen          12 x 1.25 = 15.00\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { item: py.str("Desk lamp"), quantity: py.int(1), unit_price: py.float(24.5) }, vars: { line: py.str("Desk lamp     1 x 24.50 = 24.50") } },
        ],
      },
      hints: [
        'Start with line = f"{item:<12}" and print it to see the padding.',
        "Add {quantity:>3}, then the text \" x \", then {unit_price:.2f}.",
        'The total can be calculated inside the braces: {quantity * unit_price:.2f}.',
      ],
      answer: 'item = "Notebook"\nquantity = 3\nunit_price = 4.5\n\nline = f"{item:<12}{quantity:>3} x {unit_price:.2f} = {quantity * unit_price:.2f}"\nprint(line)',
      alternatives: ['item = "Notebook"\nquantity = 3\nunit_price = 4.5\ntotal = quantity * unit_price\nline = f"{item:12}{quantity:3} x {unit_price:.2f} = {total:.2f}"\nprint(line)\n'],
      wrong: [
        { code: 'item = "Notebook"\nquantity = 3\nunit_price = 4.5\nline = f"{item} {quantity} x {unit_price} = {quantity * unit_price}"\nprint(line)\n', fails: ["line", "output", "v-other", "v-hidden"], why: "no specs" },
        { code: 'item = "Notebook"\nquantity = 3\nunit_price = 4.5\nline = f"{item:>12}{quantity:>3} x {unit_price:.2f} = {quantity * unit_price:.2f}"\nprint(line)\n', fails: ["line", "output", "v-other", "v-hidden"], why: "name right-aligned" },
        { code: 'item = "Notebook"\nquantity = 3\nunit_price = 4.5\nline = f"{item:<12}{quantity:>3} x {unit_price:.2f} = 13.50"\nprint(line)\n', fails: ["v-other", "v-hidden"], why: "typed the total" },
      ],
    },
    {
      id: "challenge-2",
      title: "Write a sales summary",
      prompt:
        "Print a two-line sales summary from `sold`, `stock` and `revenue`. The first line gives the share of stock sold as a percentage with one decimal place; the second gives the revenue with a thousands separator and two decimal places. Calculate the share in `sell_through` (a fraction such as 0.375) and let the format spec turn it into a percentage.",
      expectedOutput: "Sold 45 of 120 (37.5%)\nRevenue: $1,234,567.89\n",
      looksFor: [
        "`sell_through` is the fraction `sold / stock` (`0.375`), not a number already multiplied by 100.",
        "The two lines are printed exactly as shown, and work for other figures.",
      ],
      starter: "sold = 45\nstock = 120\nrevenue = 1234567.891\n\n# Calculate sell_through, then print the two lines with f-strings.\n",
      task: {
        checks: [
          { kind: "variable", id: "sell-through", name: "sell_through", expected: py.float(0.375), tip: "Keep the fraction: sell_through = sold / stock. The :.1% spec multiplies by 100 for you." },
          { kind: "output", id: "output", label: "Prints both lines", expected: "Sold 45 of 120 (37.5%)\nRevenue: $1,234,567.89\n", tip: "{sell_through:.1%} and {revenue:,.2f}." },
          { kind: "variant", id: "v-other", set: { sold: py.int(3), stock: py.int(8), revenue: py.float(999.5) }, output: "Sold 3 of 8 (37.5%)\nRevenue: $999.50\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { sold: py.int(1), stock: py.int(3), revenue: py.float(2500000) }, output: "Sold 1 of 3 (33.3%)\nRevenue: $2,500,000.00\n" },
        ],
      },
      hints: [
        "sell_through = sold / stock gives 0.375.",
        'The percent spec: f"{sell_through:.1%}" shows 37.5%.',
        'For the revenue: f"Revenue: ${revenue:,.2f}". The $ is ordinary text before the braces.',
      ],
      answer: 'sold = 45\nstock = 120\nrevenue = 1234567.891\n\nsell_through = sold / stock\nprint(f"Sold {sold} of {stock} ({sell_through:.1%})")\nprint(f"Revenue: ${revenue:,.2f}")',
      wrong: [
        { code: 'sold = 45\nstock = 120\nrevenue = 1234567.891\nsell_through = sold / stock * 100\nprint(f"Sold {sold} of {stock} ({sell_through:.1%})")\nprint(f"Revenue: ${revenue:,.2f}")\n', fails: ["sell-through", "output", "v-other", "v-hidden"], why: "multiplied by 100 twice" },
        { code: 'sold = 45\nstock = 120\nrevenue = 1234567.891\nsell_through = sold / stock\nprint(f"Sold {sold} of {stock} ({sell_through:.1%})")\nprint(f"Revenue: ${revenue:.2f}")\n', fails: ["output", "v-hidden"], why: "no thousands separator" },
      ],
    },
  ],

  quiz: [
    {
      id: "spec",
      prompt: "What does this program print?",
      code: 'price = 2.5\nprint(f"[{price:>6.2f}]")',
      options: [
        { text: "`[  2.50]`", correct: true, why: "`.2f` shows `2.50` (4 characters), and `>6` right-aligns it in 6, adding two spaces in front." },
        { text: "`[2.50  ]`", why: "`>` aligns to the right, so the padding goes before the value." },
        { text: "`[2.5]`", why: "`.2f` always shows two decimal places, and the width pads to 6 characters." },
        { text: "`[{price:>6.2f}]`", why: "The `f` before the quote makes this an f-string, so the braces are replaced by the formatted value." },
      ],
    },
    {
      id: "rounding",
      prompt: "After `total = 13.456` and `print(f\"{total:.1f}\")`, what is `total`?",
      options: [
        { text: "`13.456`", correct: true, why: "A format spec only changes how the value is shown. The variable is untouched." },
        { text: "`13.5`", why: "`13.5` is what was printed, but formatting doesn't store anything back in `total`." },
        { text: '`"13.5"`', why: "The f-string is a new string; `total` is still the float it was." },
        { text: "`13.4`", why: "`.1f` rounds to the nearest (13.5) for display, and doesn't change `total` either way." },
      ],
    },
  ],

  outcomes: [
    "Put values and expressions into text with f-strings.",
    "Show numbers with fixed decimal places, as percentages, and with thousands separators.",
    "Line values up in columns with width and alignment.",
    "Use `f\"{name=}\"` to print a value with its name while debugging.",
  ],
};
