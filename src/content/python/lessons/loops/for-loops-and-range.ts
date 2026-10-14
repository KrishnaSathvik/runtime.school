import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const forLoopsAndRange: PyLesson = {
  slug: "for-loops-and-range",
  ref: "python:for-loops-and-range",
  module: "loops",
  number: 1,
  title: "for loops and range",
  level: "beginner",
  summary:
    "Repeat a block of code with a `for` loop, and use `range()` to loop a set number of times, count between two numbers, or count in steps, including backwards.",

  sections: [
    {
      label: "a for loop repeats a block",
      blocks: [
        {
          kind: "p",
          text: "A `for` loop runs its indented block once for each value in a sequence. Each time round, the **loop variable** holds the next value. The block is called the **body**, and one run through it is an **iteration**.",
        },
        { kind: "code", code: 'for n in range(3):\n    print("Iteration", n)\nprint("Finished")' },
        {
          kind: "p",
          text: "This prints `Iteration 0`, `Iteration 1`, `Iteration 2`, then `Finished`. Like `if`, the header ends with a colon and the body is indented; the first unindented line runs once, after the loop has finished.",
        },
      ],
    },
    {
      label: "range()",
      blocks: [
        {
          kind: "p",
          text: "`range(stop)` counts from 0 up to, but not including, `stop`, so `range(3)` is 0, 1, 2: three values, which is why it's the usual way to repeat something a number of times. `range(start, stop)` starts somewhere else: `range(1, 6)` is 1 to 5. As with slices, the stop is excluded.",
        },
        {
          kind: "p",
          text: "A third argument is the **step**: `range(0, 10, 2)` is 0, 2, 4, 6, 8, and a negative step counts down: `range(5, 0, -1)` is 5, 4, 3, 2, 1. `range()` doesn't build all its numbers up front; it produces them as the loop asks. `list(range(5))` shows them all at once, which is handy for checking.",
        },
      ],
    },
    {
      label: "the loop variable",
      blocks: [
        {
          kind: "p",
          text: "The loop variable is an ordinary variable that the loop reassigns on every iteration. Use it in the body to calculate. After the loop, it keeps the last value it had. If you don't need it, the convention is to name it `_`: `for _ in range(3):`.",
        },
      ],
    },
  ],

  example: {
    caption: "Three uses of range(). Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'print(list(range(5)))\nprint(list(range(1, 6)))\nprint(list(range(0, 20, 5)))\n\nfor seconds in range(3, 0, -1):\n    print(seconds, "...")\nprint("Go!")',
  },

  walkthrough: [
    {
      title: "The body runs once per value",
      text: "The loop variable takes each value in turn. The line after the loop runs once, at the end.",
      code: 'for n in range(3):\n    print("Iteration", n)\nprint("Finished, n is", n)',
    },
    {
      title: "Start and stop",
      text: "`range(1, 6)` starts at 1 and stops before 6. Squaring each value shows the loop variable being used in a calculation.",
      code: "for n in range(1, 6):\n    print(n, n ** 2)",
    },
    {
      title: "Steps, forwards and backwards",
      text: "A step of 5 counts in fives; a step of -2 counts down in twos. Each stop is still excluded.",
      code: "print(list(range(0, 20, 5)))\nprint(list(range(10, 0, -2)))\nprint(list(range(3, 3)))",
    },
    {
      title: "Repeating without using the variable",
      text: "When only the number of repeats matters, name the variable `_`.",
      code: 'for _ in range(3):\n    print("Hip hip hooray!")',
    },
  ],

  mistakes: [
    {
      title: "Expecting range to include the stop",
      text: "The pages are numbered 1 to 5, but `range(1, 5)` stops before 5, so page 5 is missing.",
      code: "for page in range(1, 5):\n    print(\"Page\", page)",
      fix: "Add one to the stop: `range(1, 6)`, or `range(1, last + 1)`.",
    },
    {
      title: "Counting down with a positive step",
      text: "`range(5, 0)` counts **up** from 5, and 5 is already past 0, so it produces nothing and the loop body never runs.",
      code: 'for n in range(5, 0):\n    print(n)\nprint("done")',
      fix: "Give a negative step to count down: `range(5, 0, -1)`.",
    },
    {
      title: "Forgetting to indent the body",
      text: "The body of a loop must be indented, just like an `if` block: an `IndentationError`, and nothing runs.",
      code: "for n in range(3):\nprint(n)",
      raises: "IndentationError",
      fix: "Indent the body by 4 spaces.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Print a countdown",
      prompt:
        "Print a countdown from `start` down to 1, one number per line, followed by `Liftoff!`. Use a `for` loop over a `range()`; Check answer also tries other starting numbers.",
      expectedOutput: "5\n4\n3\n2\n1\nLiftoff!\n",
      looksFor: [
        "The numbers from `start` down to 1, one per line, then `Liftoff!`.",
        "It works for any starting number, including 1.",
      ],
      starter: "start = 5\n\n# Count down with a for loop, then print Liftoff!\n",
      task: {
        checks: [
          { kind: "output", id: "output", label: "Counts down from 5", expected: "5\n4\n3\n2\n1\nLiftoff!\n", tip: "range(start, 0, -1) counts down and stops before 0." },
          { kind: "variant", id: "v-3", set: { start: py.int(3) }, output: "3\n2\n1\nLiftoff!\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { start: py.int(1) }, output: "1\nLiftoff!\n" },
        ],
      },
      hints: [
        "A negative step counts down: range(start, 0, -1).",
        "The stop is excluded, so a stop of 0 ends at 1.",
        'for n in range(start, 0, -1): print(n), then, after the loop and not indented, print("Liftoff!").',
      ],
      answer: 'start = 5\n\nfor n in range(start, 0, -1):\n    print(n)\nprint("Liftoff!")',
      alternatives: ['start = 5\nfor i in range(start):\n    print(start - i)\nprint("Liftoff!")\n'],
      wrong: [
        { code: 'start = 5\nfor n in range(start, 1, -1):\n    print(n)\nprint("Liftoff!")\n', fails: ["output", "v-3", "v-hidden"], why: "stops before 1" },
        { code: 'start = 5\nfor n in range(start, 0, -1):\n    print(n)\n    print("Liftoff!")\n', fails: ["output", "v-3"], why: "Liftoff inside the loop" },
        { code: 'start = 5\nprint(5)\nprint(4)\nprint(3)\nprint(2)\nprint(1)\nprint("Liftoff!")\n', fails: ["v-3", "v-hidden"], why: "no loop" },
      ],
    },
    {
      id: "challenge-2",
      title: "Print a times-table row",
      prompt:
        "Print the times table for `number`, from 1 up to and including `up_to`, one line each in the form shown. Check answer tries other numbers and lengths.",
      expectedOutput: "7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35\n",
      looksFor: [
        "One line per multiplier from 1 to `up_to` (inclusive), each `<number> x <i> = <product>`.",
        "It works for other numbers and lengths.",
      ],
      starter: "number = 7\nup_to = 5\n\n# Print one line per multiplier.\n",
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the 7 times table to 5", expected: "7 x 1 = 7\n7 x 2 = 14\n7 x 3 = 21\n7 x 4 = 28\n7 x 5 = 35\n" },
          { kind: "variant", id: "v-other", set: { number: py.int(3), up_to: py.int(2) }, output: "3 x 1 = 3\n3 x 2 = 6\n", tip: "range(1, up_to + 1) includes up_to." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { number: py.int(12), up_to: py.int(10) }, output: Array.from({ length: 10 }, (_, i) => `12 x ${i + 1} = ${12 * (i + 1)}\n`).join("") },
        ],
      },
      hints: [
        "The multipliers are 1 to up_to, so the range needs a stop of up_to + 1.",
        "Calculate the product inside the loop: number * i.",
        'print(f"{number} x {i} = {number * i}").',
      ],
      answer: 'number = 7\nup_to = 5\n\nfor i in range(1, up_to + 1):\n    print(f"{number} x {i} = {number * i}")',
      wrong: [
        { code: 'number = 7\nup_to = 5\nfor i in range(1, up_to):\n    print(f"{number} x {i} = {number * i}")\n', fails: ["output", "v-other", "v-hidden"], why: "stops one short" },
        { code: 'number = 7\nup_to = 5\nfor i in range(up_to):\n    print(f"{number} x {i} = {number * i}")\n', fails: ["output", "v-other", "v-hidden"], why: "starts at 0" },
      ],
    },
  ],

  quiz: [
    {
      id: "range-values",
      prompt: "Which numbers does `range(2, 11, 3)` produce?",
      code: "print(list(range(2, 11, 3)))",
      options: [
        { text: "2, 5, 8", correct: true, why: "Start at 2 and add 3 each time: 2, 5, 8. The next would be 11, which is the stop, so it's excluded." },
        { text: "2, 5, 8, 11", why: "The stop is never included, even when the step lands on it exactly." },
        { text: "3, 6, 9", why: "The first argument is where counting starts, so the first value is 2." },
        { text: "2, 3, 4, …, 10", why: "The third argument is the step, so the values go up in threes." },
      ],
    },
    {
      id: "after-loop",
      prompt: "What does this program print?",
      code: "total = 0\nfor n in range(4):\n    total = total + n\nprint(total, n)",
      options: [
        { text: "`6 3`", correct: true, why: "`n` takes 0, 1, 2 and 3, and their sum is 6. After the loop, `n` keeps its last value, 3." },
        { text: "`10 4`", why: "`range(4)` stops before 4: the values are 0 to 3." },
        { text: "`6 4`", why: "The loop variable keeps the last value it actually took, which is 3." },
        { text: "`0 3`", why: "The body runs four times, each time adding `n` to `total`." },
      ],
    },
  ],

  outcomes: [
    "Write a `for` loop with a correctly indented body.",
    "Use `range()` with a stop, a start and stop, or a step, including counting down.",
    "Predict how many times a loop runs, remembering that the stop is excluded.",
    "Use the loop variable in calculations inside the loop.",
  ],
};
