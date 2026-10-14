import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const membershipAndNoneChecks: PyLesson = {
  slug: "membership-and-none-checks",
  ref: "python:membership-and-none-checks",
  module: "conditions",
  number: 5,
  title: "Membership and None checks",
  level: "beginner",
  summary:
    "Check whether a value is one of a set of allowed values with `in` and `not in`, and represent “no value” with `None`, testing for it with `is None` so that a real zero or empty value isn't mistaken for a missing one.",

  sections: [
    {
      label: "in and not in",
      blocks: [
        {
          kind: "p",
          text: "You've used `in` to look inside text: `\"@\" in email`. It also checks whether a value is one of a group of values written in brackets. A group in round brackets is a **tuple**, which Collections and Records covers properly; for now it's a handy fixed list of allowed values.",
        },
        { kind: "code", code: 'status = "shipped"\nif status in ("pending", "shipped", "delivered"):\n    print("Known status")' },
        {
          kind: "p",
          text: "This replaces a long chain like `status == \"pending\" or status == \"shipped\" or …`. `not in` is the opposite: `if country not in (\"UK\", \"IE\"):` is true for any other country. Membership is exact, so normalise text first: `status.lower() in (…)`.",
        },
      ],
    },
    {
      label: "None means “no value”",
      blocks: [
        {
          kind: "p",
          text: "`None` is Python's value for “nothing here”: a discount that wasn't set, a middle name that doesn't exist, a result that couldn't be calculated. Its type is `NoneType`, and there is only one `None`.",
        },
        {
          kind: "p",
          text: "Test for it with `is None` (or `is not None`), not `== None`. `is` asks whether two names refer to the very same object, and since there's only one `None`, that's exactly the question. It also can't be fooled by objects that define their own `==`.",
        },
      ],
    },
    {
      label: "missing is not the same as zero",
      blocks: [
        {
          kind: "p",
          text: "`None`, `0` and `\"\"` are all falsy, so `if not discount:` can't tell “no discount was set” from “a discount of 0”. When zero or empty is a legitimate value, check `is None` explicitly. Use plain truthiness only when the empty value and the missing value really mean the same thing.",
        },
      ],
    },
  ],

  example: {
    caption: "Checking a status and an optional discount. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'status = "Shipped"\ndiscount = None\nprice = 40\n\nif status.lower() in ("pending", "shipped", "delivered"):\n    print("Status OK:", status.lower())\n\nif discount is None:\n    final_price = price\nelse:\n    final_price = price * (1 - discount)\nprint("Final price:", final_price)',
  },

  walkthrough: [
    {
      title: "in checks a group of values",
      text: "Each line asks whether the value is one of those in the brackets. The match must be exact.",
      code: 'size = "M"\nprint(size in ("S", "M", "L"))\nprint(size not in ("S", "M", "L"))\nprint("m" in ("S", "M", "L"))',
    },
    {
      title: "None is a value of its own",
      text: "`None` prints as `None` and has its own type. A variable can hold it like any other value.",
      code: "middle_name = None\nprint(middle_name)\nprint(type(middle_name))\nprint(middle_name is None)",
    },
    {
      title: "is None tells missing from zero",
      text: "Both values are falsy, so `not` treats them the same. Only `is None` separates them.",
      code: 'set_discount = 0\nno_discount = None\nprint(not set_discount, not no_discount)\nprint(set_discount is None, no_discount is None)',
    },
    {
      title: "Using None as a default",
      text: "Start with `None`, and only replace it when there's a real value. Afterwards, `is not None` says whether one was found.",
      code: 'note = "  "\nclean_note = None\nif note.strip():\n    clean_note = note.strip()\nprint(clean_note is not None)\nprint(clean_note)',
    },
  ],

  mistakes: [
    {
      title: "Treating zero as missing",
      text: "A discount of 0 was set on purpose, but `if not discount` treats it as missing and prints the wrong message.",
      code: 'discount = 0\nif not discount:\n    print("No discount set")\nelse:\n    print("Discount:", discount)',
      fix: "Check for missing explicitly: `if discount is None:`.",
    },
    {
      title: "Calculating with None",
      text: "`None` isn't a number, so arithmetic with it is a `TypeError`.",
      code: "discount = None\nprice = 40\nprint(price * (1 - discount))",
      raises: "TypeError",
      fix: "Check `if discount is None:` first and handle that case separately.",
    },
    {
      title: "Forgetting that in is exact",
      text: "`\"Shipped\"` with a capital S isn't in the group, so a valid status is reported as unknown.",
      code: 'status = "Shipped"\nprint(status in ("pending", "shipped", "delivered"))',
      fix: "Normalise first: `status.strip().lower() in (…)`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Validate an order status",
      prompt:
        "Order statuses come from several systems with inconsistent spacing and capitals. Store the cleaned status (stripped, lowercase) in `clean_status`, then store whether it's one of `pending`, `shipped`, `delivered` or `cancelled` in `is_known`. Print `Unknown status: <status>` for unknown ones, and `OK: <status>` otherwise.",
      expectedOutput: "OK: shipped\n",
      looksFor: [
        "`clean_status` is the stripped, lowercase status.",
        "`is_known` is `True` exactly for the four known statuses, whatever their case and spacing.",
        "The program prints `OK: …` or `Unknown status: …` with the clean status.",
      ],
      starter: 'status = "  Shipped "\n\n# Store clean_status and is_known, then print the result.\n',
      task: {
        checks: [
          { kind: "variable", id: "clean", name: "clean_status", expected: py.str("shipped") },
          { kind: "variable", id: "known", name: "is_known", expected: py.bool(true), tip: 'clean_status in ("pending", "shipped", "delivered", "cancelled").' },
          { kind: "output", id: "output", label: "Prints the result", expected: "OK: shipped\n" },
          { kind: "variant", id: "v-unknown", set: { status: py.str("Lost") }, output: "Unknown status: lost\n", vars: { is_known: py.bool(false) } },
          { kind: "variant", id: "v-cancelled", set: { status: py.str("CANCELLED") }, vars: { is_known: py.bool(true) } },
          { kind: "variant", id: "v-hidden", hidden: true, set: { status: py.str("deliver") }, vars: { is_known: py.bool(false) } },
        ],
      },
      hints: [
        "clean_status = status.strip().lower().",
        'is_known = clean_status in ("pending", "shipped", "delivered", "cancelled").',
        'if is_known: print("OK:", clean_status) else: print("Unknown status:", clean_status).',
      ],
      answer: 'status = "  Shipped "\n\nclean_status = status.strip().lower()\nis_known = clean_status in ("pending", "shipped", "delivered", "cancelled")\nif is_known:\n    print("OK:", clean_status)\nelse:\n    print("Unknown status:", clean_status)',
      alternatives: ['status = "  Shipped "\nclean_status = status.strip().lower()\nis_known = clean_status == "pending" or clean_status == "shipped" or clean_status == "delivered" or clean_status == "cancelled"\nif not is_known:\n    print(f"Unknown status: {clean_status}")\nelse:\n    print(f"OK: {clean_status}")\n'],
      wrong: [
        { code: 'status = "  Shipped "\nclean_status = status.strip().lower()\nis_known = clean_status in "pending shipped delivered cancelled"\nif is_known:\n    print("OK:", clean_status)\nelse:\n    print("Unknown status:", clean_status)\n', fails: ["v-hidden"], why: "in on one long string matches pieces of words" },
        { code: 'status = "  Shipped "\nclean_status = status.strip()\nis_known = clean_status in ("pending", "shipped", "delivered", "cancelled")\nif is_known:\n    print("OK:", clean_status)\nelse:\n    print("Unknown status:", clean_status)\n', fails: ["clean", "known", "output", "v-unknown", "v-cancelled"], why: "didn't lowercase" },
        { code: 'status = "  Shipped "\nclean_status = status.strip().lower()\nis_known = clean_status in ("pending", "shipped", "delivered")\nif is_known:\n    print("OK:", clean_status)\nelse:\n    print("Unknown status:", clean_status)\n', fails: ["v-cancelled"], why: "left out cancelled" },
      ],
    },
    {
      id: "challenge-2",
      title: "Apply an optional discount",
      prompt:
        "`discount` is a fraction (0.25 means 25% off), or `None` when the customer has no discount. Note that a discount of `0` is a real discount that happens to be zero. Store the price to pay in `final_price`, and a label in `discount_label`: `none` when there is no discount, otherwise the discount as a percentage like `25%`. Print both.",
      expectedOutput: "Final price: 30.0\nDiscount: 25%\n",
      looksFor: [
        "With no discount (`None`), `final_price` is the price and `discount_label` is `\"none\"`.",
        "Otherwise `final_price` is `price * (1 - discount)` and the label shows the percentage, even for `0`.",
      ],
      starter: "price = 40\ndiscount = 0.25\n\n# Store final_price and discount_label, then print them.\n",
      task: {
        checks: [
          { kind: "variable", id: "final", name: "final_price", expected: py.float(30.0) },
          { kind: "variable", id: "label", name: "discount_label", expected: py.str("25%"), tip: 'f"{discount:.0%}" shows 0.25 as 25%.' },
          { kind: "output", id: "output", label: "Prints both", expected: "Final price: 30.0\nDiscount: 25%\n" },
          { kind: "variant", id: "v-none", set: { discount: py.none }, output: "Final price: 40\nDiscount: none\n", tip: "Test discount is None first: arithmetic with None is a TypeError." },
          { kind: "variant", id: "v-zero", set: { discount: py.int(0) }, vars: { final_price: py.int(40), discount_label: py.str("0%") }, tip: "0 is falsy, but it is a real discount. Use is None rather than not discount." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { price: py.int(80), discount: py.float(0.1) }, vars: { final_price: py.float(72.0), discount_label: py.str("10%") } },
        ],
      },
      hints: [
        "Start with if discount is None: and set final_price = price and discount_label = \"none\".",
        "In the else block: final_price = price * (1 - discount).",
        'The label is f"{discount:.0%}". Print with print("Final price:", final_price) and print("Discount:", discount_label).',
      ],
      answer: 'price = 40\ndiscount = 0.25\n\nif discount is None:\n    final_price = price\n    discount_label = "none"\nelse:\n    final_price = price * (1 - discount)\n    discount_label = f"{discount:.0%}"\nprint("Final price:", final_price)\nprint("Discount:", discount_label)',
      wrong: [
        { code: 'price = 40\ndiscount = 0.25\nif not discount:\n    final_price = price\n    discount_label = "none"\nelse:\n    final_price = price * (1 - discount)\n    discount_label = f"{discount:.0%}"\nprint("Final price:", final_price)\nprint("Discount:", discount_label)\n', fails: ["v-zero"], why: "0 treated as missing" },
        { code: 'price = 40\ndiscount = 0.25\nfinal_price = price * (1 - discount)\ndiscount_label = f"{discount:.0%}"\nprint("Final price:", final_price)\nprint("Discount:", discount_label)\n', fails: ["v-none"], why: "doesn't handle None" },
      ],
    },
  ],

  quiz: [
    {
      id: "none-vs-zero",
      prompt: "What does this program print?",
      code: 'stock = 0\nif stock is None:\n    print("unknown")\nelif not stock:\n    print("sold out")\nelse:\n    print("available")',
      options: [
        { text: "`sold out`", correct: true, why: "`0 is None` is `False`, so the first branch is skipped. `not 0` is `True`, so the second branch runs." },
        { text: "`unknown`", why: "`0` is a number, not `None`. `is None` is true only for `None` itself." },
        { text: "`available`", why: "`0` is falsy, so `not stock` is `True` and the `elif` branch runs first." },
        { text: "A `TypeError`", why: "Comparing anything with `is None` is always allowed." },
      ],
    },
    {
      id: "membership",
      prompt: '`country = "uk"`. Which expression is `True`?',
      options: [
        { text: '`country.upper() in ("UK", "IE")`', correct: true, why: "`\"uk\".upper()` is `\"UK\"`, which is one of the values in the group." },
        { text: '`country in ("UK", "IE")`', why: "Membership is exact: `\"uk\"` is not `\"UK\"`." },
        { text: '`country not in ("uk", "ie")`', why: "`\"uk\"` is in the group, so `not in` is `False`." },
        { text: "`country is None`", why: "`country` holds a string, not `None`." },
      ],
    },
  ],

  outcomes: [
    "Check membership in a group of values with `in` and `not in`, normalising text first.",
    "Use `None` to mean “no value”, and test it with `is None` / `is not None`.",
    "Explain why `if not value:` can't tell a missing value from zero or empty text.",
  ],
};
