import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const breakContinueAndLoopElse: PyLesson = {
  slug: "break-continue-and-loop-else",
  ref: "python:break-continue-and-loop-else",
  module: "loops",
  number: 5,
  title: "break, continue and loop else",
  level: "beginner",
  summary:
    "Leave a loop early with `break` when you've found what you were looking for, skip the rest of one iteration with `continue`, and use a loop's `else` block to handle the case where nothing was found.",

  sections: [
    {
      label: "break: stop the loop now",
      blocks: [
        {
          kind: "p",
          text: "`break` ends the loop immediately, even if there are items left, and the program continues after the loop. It's the natural tool for searching: once you've found the first match, there's no reason to keep looking.",
        },
        { kind: "code", code: 'for reading in readings:\n    if reading > limit:\n        print("Too high:", reading)\n        break' },
        {
          kind: "p",
          text: "`break` only leaves the innermost loop it's in. In a `while True:` loop, a `break` is the only way out, which suits “keep going until …” logic where the stopping test sits in the middle of the body.",
        },
      ],
    },
    {
      label: "continue: skip to the next item",
      blocks: [
        {
          kind: "p",
          text: "`continue` skips the rest of the body for this iteration and moves straight on to the next one. Use it to skip items that shouldn't be processed (blank lines, invalid values) without wrapping the rest of the body in an extra `if`.",
        },
      ],
    },
    {
      label: "else on a loop",
      blocks: [
        {
          kind: "p",
          text: "A `for` or `while` loop can have an `else` block. It runs when the loop finishes **normally**, having gone through every item, and is skipped when the loop ends with `break`. Read it as “no break”: it's where “not found” goes.",
        },
        { kind: "code", code: 'for name in names:\n    if name == wanted:\n        print("Found")\n        break\nelse:\n    print("Not found")' },
        {
          kind: "p",
          text: "Many programmers find loop `else` surprising, so a found/not-found variable (`position = None` before the loop, set inside it) is a common and equally good alternative.",
        },
      ],
    },
  ],

  example: {
    caption: "Searching sensor readings for the first problem. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'readings = [21.5, 22.0, 35.2, 23.1, 40.0]\nlimit = 30\n\nposition = 0\nfor reading in readings:\n    if reading > limit:\n        print(f"First reading over {limit}: {reading} at position {position}")\n        break\n    position += 1\nelse:\n    print("All readings OK")',
  },

  walkthrough: [
    {
      title: "break stops at the first match",
      text: "The loop stops at 35.2, so 40.0 is never checked and `checked` stays at 3.",
      code: "readings = [21.5, 22.0, 35.2, 23.1, 40.0]\nchecked = 0\nfor reading in readings:\n    checked += 1\n    if reading > 30:\n        print(\"Too high:\", reading)\n        break\nprint(\"Checked\", checked, \"readings\")",
    },
    {
      title: "continue skips one iteration",
      text: "Blank entries are skipped before they reach the `print`; the loop carries on with the next item.",
      code: 'items = ["apple", "", "pear", "  ", "plum"]\nfor item in items:\n    if not item.strip():\n        continue\n    print("Packing", item)',
    },
    {
      title: "else runs only when there was no break",
      text: "No reading is over 50, so the loop finishes normally and `else` runs. Change the limit to 30 to see it skipped.",
      code: 'readings = [21.5, 22.0, 35.2]\nlimit = 50\nfor reading in readings:\n    if reading > limit:\n        print("Problem:", reading)\n        break\nelse:\n    print("All readings OK")',
    },
    {
      title: "while True with a break",
      text: "The stopping test is in the middle of the body: the loop runs until the running total would pass the budget.",
      code: "prices = [12, 30, 25, 40]\nbudget = 60\nspent = 0\ni = 0\nwhile True:\n    if i == len(prices) or spent + prices[i] > budget:\n        break\n    spent += prices[i]\n    i += 1\nprint(\"Bought\", i, \"items for\", spent)",
    },
  ],

  mistakes: [
    {
      title: "Putting “not found” inside the loop",
      text: "The `else` belongs to the `if`, so `Not found` is printed for every name that doesn't match, before the match is found.",
      code: 'names = ["Ana", "Ben", "Cai"]\nfor name in names:\n    if name == "Cai":\n        print("Found")\n        break\n    else:\n        print("Not found")',
      fix: "Line the `else` up with the `for`, so it runs once, only if the loop never hit `break`.",
    },
    {
      title: "Updating the counter after continue",
      text: "`continue` jumps back to the top before `i += 1` runs, so `i` never moves past the blank entry and the loop never ends.",
      code: 'items = ["a", "", "b"]\ni = 0\nwhile i < len(items):\n    if items[i] == "":\n        continue\n    print(items[i])\n    i += 1',
      raises: "timeout",
      fix: "Update the counter before `continue`, or use a `for` loop, which moves on by itself.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Find the first failed reading",
      prompt:
        "Readings outside the safe range `low` to `high` (inclusive) are failures. Find the position (index) of the **first** failure in `readings`, store it in `first_bad`, and stop looking once it's found. If every reading is safe, `first_bad` is `None`. Print the result as shown, or `All readings OK`.",
      expectedOutput: "First failure at position 2: 35.2\n",
      looksFor: [
        "`first_bad` is the position of the first reading below `low` or above `high`, or `None` if there is none.",
        "Readings exactly at `low` or `high` are safe.",
        "The program prints the failure line, or `All readings OK`.",
      ],
      starter: "readings = [21.5, 22.0, 35.2, 23.1, 40.0]\nlow = 18\nhigh = 30\n\n# Find the first failure, stopping as soon as it's found.\n",
      task: {
        checks: [
          { kind: "variable", id: "first-bad", name: "first_bad", expected: py.int(2) },
          { kind: "output", id: "output", label: "Prints the first failure", expected: "First failure at position 2: 35.2\n" },
          { kind: "variant", id: "v-none", set: { readings: py.list(py.int(20), py.int(30), py.int(18)) }, output: "All readings OK\n", vars: { first_bad: py.none }, tip: "Readings equal to low or high are safe; and with no failure, first_bad stays None." },
          { kind: "variant", id: "v-low", set: { readings: py.list(py.int(25), py.int(10), py.int(50)) }, vars: { first_bad: py.int(1) }, tip: "A reading below low is a failure too." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { readings: py.list(py.float(30.5)) }, vars: { first_bad: py.int(0) } },
          { kind: "variant", id: "v-hidden-empty", hidden: true, set: { readings: py.list() }, vars: { first_bad: py.none } },
        ],
      },
      hints: [
        "first_bad = None before the loop. To get positions, loop over range(len(readings)) (or use enumerate, next lesson).",
        "A failure is readings[i] < low or readings[i] > high. When you find one, store i and break.",
        'After the loop: if first_bad is None: print("All readings OK"), else print the position and the reading.',
      ],
      answer: 'readings = [21.5, 22.0, 35.2, 23.1, 40.0]\nlow = 18\nhigh = 30\n\nfirst_bad = None\nfor i in range(len(readings)):\n    if readings[i] < low or readings[i] > high:\n        first_bad = i\n        break\n\nif first_bad is None:\n    print("All readings OK")\nelse:\n    print(f"First failure at position {first_bad}: {readings[first_bad]}")',
      alternatives: ['readings = [21.5, 22.0, 35.2, 23.1, 40.0]\nlow = 18\nhigh = 30\nfirst_bad = None\nposition = 0\nfor reading in readings:\n    if not (low <= reading <= high):\n        first_bad = position\n        print(f"First failure at position {first_bad}: {reading}")\n        break\n    position += 1\nelse:\n    print("All readings OK")\n'],
      wrong: [
        { code: 'readings = [21.5, 22.0, 35.2, 23.1, 40.0]\nlow = 18\nhigh = 30\nfirst_bad = None\nfor i in range(len(readings)):\n    if readings[i] < low or readings[i] > high:\n        first_bad = i\nif first_bad is None:\n    print("All readings OK")\nelse:\n    print(f"First failure at position {first_bad}: {readings[first_bad]}")\n', fails: ["first-bad", "output", "v-low"], why: "no break: finds the last failure" },
        { code: 'readings = [21.5, 22.0, 35.2, 23.1, 40.0]\nlow = 18\nhigh = 30\nfirst_bad = None\nfor i in range(len(readings)):\n    if readings[i] <= low or readings[i] >= high:\n        first_bad = i\n        break\nif first_bad is None:\n    print("All readings OK")\nelse:\n    print(f"First failure at position {first_bad}: {readings[first_bad]}")\n', fails: ["v-none"], why: "edges counted as failures" },
      ],
    },
    {
      id: "challenge-2",
      title: "Read a list until END",
      prompt:
        "A scanner sends `lines`: item names, with blank lines in between (empty or only spaces), and the word `END` after the last real item. Anything after `END` is noise. Collect the stripped item names, in order, joined with `, ` into `items_text`, and count them in `count`. Use `continue` for blanks and `break` at `END`. Print both as shown.",
      expectedOutput: "Items: apple, pear\nCount: 2\n",
      looksFor: [
        "Blank lines are skipped; names are stripped.",
        "Nothing at or after `END` is included.",
        "`items_text` and `count` are right for other inputs, including `END` first and no `END` at all.",
      ],
      starter: 'lines = ["apple", "", " pear ", "END", "plum"]\n\n# Collect names until END, skipping blanks.\n',
      task: {
        checks: [
          { kind: "variable", id: "text", name: "items_text", expected: py.str("apple, pear") },
          { kind: "variable", id: "count", name: "count", expected: py.int(2) },
          { kind: "output", id: "output", label: "Prints both", expected: "Items: apple, pear\nCount: 2\n" },
          { kind: "variant", id: "v-no-end", set: { lines: py.list(py.str("a"), py.str("  "), py.str("b")) }, vars: { items_text: py.str("a, b"), count: py.int(2) } },
          { kind: "variant", id: "v-end-first", set: { lines: py.list(py.str("END"), py.str("x")) }, output: "Items: \nCount: 0\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { lines: py.list(py.str(""), py.str("milk"), py.str("eggs"), py.str("bread"), py.str("END"), py.str("END")) }, vars: { items_text: py.str("milk, eggs, bread"), count: py.int(3) } },
        ],
      },
      hints: [
        "Start with items_text = \"\" and count = 0, then loop: for line in lines: name = line.strip().",
        'if name == "END": break. if name == "": continue.',
        'To join with ", ": if count > 0, add ", " before the name. Then count += 1.',
      ],
      answer: 'lines = ["apple", "", " pear ", "END", "plum"]\n\nitems_text = ""\ncount = 0\nfor line in lines:\n    name = line.strip()\n    if name == "END":\n        break\n    if name == "":\n        continue\n    if count > 0:\n        items_text += ", "\n    items_text += name\n    count += 1\nprint("Items:", items_text)\nprint("Count:", count)',
      alternatives: ['lines = ["apple", "", " pear ", "END", "plum"]\nkept = []\nfor line in lines:\n    if line.strip() == "END":\n        break\n    if not line.strip():\n        continue\n    kept.append(line.strip())\nitems_text = ", ".join(kept)\ncount = len(kept)\nprint("Items:", items_text)\nprint("Count:", count)\n'],
      wrong: [
        { code: 'lines = ["apple", "", " pear ", "END", "plum"]\nitems_text = ""\ncount = 0\nfor line in lines:\n    name = line.strip()\n    if name == "END":\n        continue\n    if name == "":\n        continue\n    if count > 0:\n        items_text += ", "\n    items_text += name\n    count += 1\nprint("Items:", items_text)\nprint("Count:", count)\n', fails: ["text", "count", "output", "v-end-first"], why: "continue instead of break at END" },
        { code: 'lines = ["apple", "", " pear ", "END", "plum"]\nitems_text = ""\ncount = 0\nfor line in lines:\n    name = line.strip()\n    if name == "END":\n        break\n    if count > 0:\n        items_text += ", "\n    items_text += name\n    count += 1\nprint("Items:", items_text)\nprint("Count:", count)\n', fails: ["text", "count", "output", "v-no-end", "v-hidden"], why: "blanks not skipped" },
      ],
    },
  ],

  quiz: [
    {
      id: "loop-else",
      prompt: "What does this program print?",
      code: 'for n in [3, 7, 9]:\n    if n % 2 == 0:\n        print("even found")\n        break\nelse:\n    print("no even numbers")',
      options: [
        { text: "`no even numbers`", correct: true, why: "No number is even, so `break` never runs; the loop finishes normally and its `else` runs." },
        { text: "`even found`", why: "`print(\"even found\")` only runs inside the `if`, and none of 3, 7, 9 is even." },
        { text: "Nothing", why: "The loop `else` runs whenever the loop ends without `break`." },
        { text: "`no even numbers` three times", why: "The `else` lines up with the `for`, not the `if`, so it runs once, after the loop." },
      ],
    },
    {
      id: "continue",
      prompt: "What does this program print?",
      code: "total = 0\nfor n in range(1, 6):\n    if n == 3:\n        continue\n    total += n\nprint(total)",
      options: [
        { text: "`12`", correct: true, why: "`continue` skips the `total += n` for 3 only: 1 + 2 + 4 + 5 is 12." },
        { text: "`3`", why: "`continue` doesn't stop the loop; that's `break`. Only the iteration for 3 is skipped." },
        { text: "`15`", why: "When `n` is 3, `continue` jumps to the next iteration before 3 is added." },
        { text: "`10`", why: "Only 3 is skipped; 5 is still added." },
      ],
    },
  ],

  outcomes: [
    "Stop a loop early with `break` once the answer is known.",
    "Skip unwanted items with `continue`.",
    "Handle the “nothing found” case with a loop `else` or a `None` result variable.",
    "Write `while True` loops whose stopping test is in the middle of the body.",
  ],
};
