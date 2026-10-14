import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const ifElseAndIndentation: PyLesson = {
  slug: "if-else-and-indentation",
  ref: "python:if-else-and-indentation",
  module: "conditions",
  number: 2,
  title: "if, else and indentation",
  level: "beginner",
  summary:
    "Run code only when a condition is true with `if`, choose between two paths with `else`, and use indentation to show Python which lines belong to which path.",

  sections: [
    {
      label: "if runs a block when a condition is true",
      blocks: [
        {
          kind: "p",
          text: "An `if` statement has a condition, a colon, and an **indented block** of one or more lines. Python works out the condition; if it is `True`, the block runs, and if it is `False`, the block is skipped. Either way, the program continues with the first line after the block.",
        },
        { kind: "code", code: 'stock = 0\nif stock == 0:\n    print("Sold out")\n    print("Restock soon")\nprint("Checked")' },
        {
          kind: "p",
          text: "The lines indented under the `if` are the block. `print(\"Checked\")` isn't indented, so it isn't part of the `if`: it always runs.",
        },
      ],
    },
    {
      label: "else: the other path",
      blocks: [
        {
          kind: "p",
          text: "`else:` adds a block that runs when the condition is `False`. Exactly one of the two blocks runs, never both and never neither. `else` has no condition of its own, and it lines up with its `if`.",
        },
        { kind: "code", code: 'if total >= 50:\n    fee = 0\nelse:\n    fee = 4.99' },
        {
          kind: "p",
          text: "Setting a variable in both blocks, as here, is a common pattern: whichever path runs, `fee` exists afterwards.",
        },
      ],
    },
    {
      label: "indentation is part of the code",
      blocks: [
        {
          kind: "p",
          text: "In Python, indentation isn't decoration: it decides which lines are in a block. Use 4 spaces per level (the editor does this when you press Tab or Enter after a colon). Every line of a block must be indented by the same amount.",
        },
        {
          kind: "p",
          text: "Forgetting to indent after a colon is an `IndentationError`, and so is indenting a line that doesn't follow one. Both are found before anything runs, like any syntax error. A line indented at the wrong level, though, can run without an error and still be wrong, which is harder to spot.",
        },
      ],
    },
  ],

  example: {
    caption: "Choosing a delivery fee. Press Run to execute it with real Python; running examples never affects your progress. Change `total` and run it again.",
    code: 'total = 42.5\n\nif total >= 50:\n    fee = 0\n    print("Free delivery")\nelse:\n    fee = 4.99\n    print("Delivery costs", fee)\n\nprint("To pay:", total + fee)',
  },

  walkthrough: [
    {
      title: "The block runs only when the condition is True",
      text: "`stock` is 3, so `stock == 0` is `False` and the indented line is skipped. The last line isn't in the block, so it runs.",
      code: 'stock = 3\nif stock == 0:\n    print("Sold out")\nprint("Checked stock:", stock)',
    },
    {
      title: "else runs when it is False",
      text: "Exactly one of the two blocks runs. Change `stock` to 0 and run it again to see the other path.",
      code: 'stock = 3\nif stock == 0:\n    print("Sold out")\nelse:\n    print("In stock:", stock)\nprint("Done")',
    },
    {
      title: "A variable set on both paths",
      text: "Whichever block runs assigns `fee`, so it exists afterwards.",
      code: "total = 60\nif total >= 50:\n    fee = 0\nelse:\n    fee = 4.99\nprint(fee)",
    },
    {
      title: "Indentation decides what's in the block",
      text: "These two programs differ only in the indentation of the last line. In the first it's inside the `if`, so it's skipped; in the second it's outside, so it runs.",
      code: 'stock = 3\nif stock == 0:\n    print("Sold out")\n    print("Reorder placed")\nprint("---")\nif stock == 0:\n    print("Sold out")\nprint("Reorder placed")',
    },
  ],

  mistakes: [
    {
      title: "Forgetting to indent the block",
      text: "After a colon, Python expects an indented block. Line 3 isn't indented, so this is an `IndentationError`, and nothing runs.",
      code: 'stock = 0\nif stock == 0:\nprint("Sold out")',
      raises: "IndentationError",
      fix: "Indent the block by 4 spaces.",
    },
    {
      title: "Forgetting the colon",
      text: "The colon is what tells Python a block follows. Without it, the line can't be read: a `SyntaxError`.",
      code: 'stock = 0\nif stock == 0\n    print("Sold out")',
      raises: "SyntaxError",
      fix: "End the `if` line (and the `else` line) with `:`.",
    },
    {
      title: "Using a variable that only one path sets",
      text: "`total` is 60, so the `if` block is skipped and `fee` is never assigned. The last line fails with a `NameError`.",
      code: "total = 60\nif total < 50:\n    fee = 4.99\nprint(fee)",
      raises: "NameError",
      fix: "Give the variable a value on every path: add `else:` with `fee = 0`, or set `fee = 0` before the `if`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Set a delivery fee",
      prompt:
        "Orders of `free_from` dollars or more ship free; smaller orders pay `standard_fee`. Use `if`/`else` to set `fee`, then calculate `to_pay` (the total plus the fee) and print both as shown. Check answer tries orders on both sides of the limit, and exactly on it.",
      expectedOutput: "Fee: 4.99\nTo pay: 47.49\n",
      looksFor: [
        "`fee` is `0` when `total` is at least `free_from`, and `standard_fee` otherwise.",
        "`to_pay` is `total + fee`, and both are printed as shown.",
      ],
      starter: "total = 42.5\nfree_from = 50\nstandard_fee = 4.99\n\n# Set fee with if/else, then calculate and print to_pay.\n",
      task: {
        checks: [
          { kind: "variable", id: "fee", name: "fee", expected: py.float(4.99) },
          { kind: "variable", id: "to-pay", name: "to_pay", expected: py.float(47.49) },
          { kind: "output", id: "output", label: "Prints the fee and the amount to pay", expected: "Fee: 4.99\nTo pay: 47.49\n", tip: "Print after the if/else, not inside one block, so both lines appear whichever path runs." },
          { kind: "variant", id: "v-free", set: { total: py.int(80) }, output: "Fee: 0\nTo pay: 80\n" },
          { kind: "variant", id: "v-boundary", set: { total: py.int(50) }, vars: { fee: py.int(0) }, tip: "Orders of exactly free_from qualify: use >=." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { total: py.float(10), standard_fee: py.float(2.5) }, vars: { fee: py.float(2.5), to_pay: py.float(12.5) } },
        ],
      },
      hints: [
        "if total >= free_from: then an indented fee = 0.",
        "else: then an indented fee = standard_fee.",
        'After the if/else (not indented): to_pay = total + fee, then print("Fee:", fee) and print("To pay:", to_pay).',
      ],
      answer: 'total = 42.5\nfree_from = 50\nstandard_fee = 4.99\n\nif total >= free_from:\n    fee = 0\nelse:\n    fee = standard_fee\nto_pay = total + fee\nprint("Fee:", fee)\nprint("To pay:", to_pay)',
      alternatives: ['total = 42.5\nfree_from = 50\nstandard_fee = 4.99\nfee = standard_fee\nif total >= free_from:\n    fee = 0\nto_pay = total + fee\nprint("Fee:", fee)\nprint("To pay:", to_pay)\n'],
      wrong: [
        { code: 'total = 42.5\nfree_from = 50\nstandard_fee = 4.99\nif total > free_from:\n    fee = 0\nelse:\n    fee = standard_fee\nto_pay = total + fee\nprint("Fee:", fee)\nprint("To pay:", to_pay)\n', fails: ["v-boundary"], why: "> excludes the limit" },
        { code: 'total = 42.5\nfree_from = 50\nstandard_fee = 4.99\nif total >= free_from:\n    fee = 0\nelse:\n    fee = standard_fee\n    to_pay = total + fee\n    print("Fee:", fee)\n    print("To pay:", to_pay)\n', fails: ["v-free"], why: "printing inside else only" },
        { code: 'total = 42.5\nfree_from = 50\nstandard_fee = 4.99\nif total < free_from:\n    fee = standard_fee\nto_pay = total + fee\nprint("Fee:", fee)\nprint("To pay:", to_pay)\n', fails: ["v-free", "v-boundary"], why: "fee only set on one path" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix a stock check that won't run",
      prompt:
        "This program should report whether a product is in stock, and set `status` either way, but it doesn't run. Fix the indentation (and anything else that stops it) so that it prints the lines shown for 3 items in stock, and `Sold out` with status `sold out` when `stock` is 0.",
      expectedOutput: "In stock: 3\nStatus: available\n",
      looksFor: [
        "The program runs, and prints `In stock: 3` and `Status: available` for the given stock.",
        "With `stock = 0` it prints `Sold out` and `Status: sold out`.",
        "`Status:` is printed once, whichever path runs.",
      ],
      starter: 'stock = 3\n\nif stock > 0:\nprint("In stock:", stock)\n    status = "available"\nelse\n    print("Sold out")\n    status = "sold out"\n    print("Status:", status)\n',
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the in-stock report", expected: "In stock: 3\nStatus: available\n" },
          { kind: "variable", id: "status", name: "status", expected: py.str("available") },
          { kind: "variant", id: "v-zero", set: { stock: py.int(0) }, output: "Sold out\nStatus: sold out\n", vars: { status: py.str("sold out") }, tip: "Status should print on both paths, so its print() goes after the if/else, not inside the else block." },
        ],
      },
      hints: [
        "Run it and read the first error: it points to the line that needs indenting.",
        "Each block's lines need the same indentation, and else needs a colon.",
        'The print("Status:", status) line belongs to neither block: move it back to the left edge, after the else block.',
      ],
      answer: 'stock = 3\n\nif stock > 0:\n    print("In stock:", stock)\n    status = "available"\nelse:\n    print("Sold out")\n    status = "sold out"\nprint("Status:", status)',
      wrong: [
        { code: 'stock = 3\n\nif stock > 0:\n    print("In stock:", stock)\n    status = "available"\nelse:\n    print("Sold out")\n    status = "sold out"\n    print("Status:", status)\n', fails: ["output"], why: "Status printed only on the else path" },
        { code: 'stock = 3\nif stock > 0:\n    print("In stock:", stock)\n    status = "available"\nelse\n    print("Sold out")\nprint("Status:", status)\n', fails: "program", why: "else without a colon" },
      ],
    },
  ],

  quiz: [
    {
      id: "which-runs",
      prompt: "What does this program print?",
      code: 'points = 12\nif points >= 10:\n    print("bonus")\n    points = 0\nelse:\n    print("no bonus")\nprint(points)',
      options: [
        { text: "`bonus`, then `0`", correct: true, why: "12 >= 10, so the `if` block runs: it prints `bonus` and resets `points`. The `else` block is skipped, and the last line prints the new value." },
        { text: "`bonus`, then `no bonus`, then `0`", why: "Exactly one of the `if` and `else` blocks runs, never both." },
        { text: "`bonus`, then `12`", why: "`points = 0` is inside the `if` block, so it runs before the last line." },
        { text: "`0`", why: "The condition is `True`, so the `if` block (including its `print`) runs." },
      ],
    },
    {
      id: "indent",
      prompt: "What does this program print?",
      code: 'stock = 0\nif stock > 0:\n    print("A")\nprint("B")\nif stock == 0:\n    print("C")',
      options: [
        { text: "`B`, then `C`", correct: true, why: "`A` is in the first block, which is skipped because `0 > 0` is `False`. `B` isn't in any block, so it always prints. The second condition is `True`." },
        { text: "`A`, then `B`", why: "`stock > 0` is `False`, so the first block, `print(\"A\")`, is skipped." },
        { text: "`C`", why: "`print(\"B\")` isn't indented, so it isn't part of any `if` and always runs." },
        { text: "An `IndentationError`", why: "Every block here is indented consistently, so the program runs." },
      ],
    },
  ],

  outcomes: [
    "Write an `if` statement with a condition, a colon and an indented block.",
    "Add an `else` block for the other path, and know that exactly one block runs.",
    "Read indentation to tell which lines belong to a block, and fix `IndentationError`s.",
    "Make sure a variable is assigned on every path before it's used.",
  ],
};
