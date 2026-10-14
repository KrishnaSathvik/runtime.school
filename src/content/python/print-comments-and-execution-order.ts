import { py } from "@/engine/python/values";
import type { PyLesson } from "./types";

export const printCommentsAndExecutionOrder: PyLesson = {
  slug: "print-comments-and-execution-order",
  ref: "python:print-comments-and-execution-order",
  module: "foundations",
  number: 2,
  title: "Print, comments and execution order",
  level: "beginner",
  summary:
    "Label your output and lay it out over several lines, leave notes in your code, and predict which lines of a program run, including what happens when one of them fails.",

  sections: [
    {
      label: "several values in one print()",
      blocks: [
        {
          kind: "p",
          text: "So far each `print()` has shown one value. It can show several: separate them with commas, and `print()` writes them on one line, in order, with a single space between each.",
        },
        { kind: "code", code: 'print("Total:", 12)' },
        {
          kind: "p",
          text: "This prints `Total: 12`. The label and the number are two separate values. The comma isn't printed, and you don't add the space yourself. Labels tell whoever reads the output what each number means.",
        },
        {
          kind: "p",
          text: "Every `print()` finishes its line, so the next `print()` starts on a new one. A `print()` with nothing inside prints an empty line, which is how you split output into groups.",
        },
      ],
    },
    {
      label: "comments",
      blocks: [
        {
          kind: "p",
          text: "A **comment** starts with `#`. Python ignores everything from the `#` to the end of that line. Comments are notes for people reading the code, including you, later.",
        },
        { kind: "code", code: "# Prices are in dollars.\nprice = 4\nquantity = 3  # one box holds 3" },
        {
          kind: "p",
          text: "Useful comments say what a value means or why the code does something, rather than repeating the code. A `#` inside quotes is ordinary text, not a comment: `print(\"#1 seller\")` prints `#1 seller`.",
        },
        {
          kind: "p",
          text: "Putting `#` at the start of a line of code is called **commenting it out**. The line stays in your file but doesn't run, which is a quick way to switch something off while you test.",
        },
      ],
    },
    {
      label: "one line at a time",
      blocks: [
        {
          kind: "p",
          text: "Python runs a program from the top, one line at a time. When a line uses a name, that name must already have been assigned by a line that ran earlier. An assignment further down doesn't count, because it hasn't run yet.",
        },
        {
          kind: "p",
          text: "If a line fails while the program is running, Python stops at that line and shows the error. The lines before it have already run, so anything they printed stays in the Console. The lines after it never run.",
        },
        {
          kind: "p",
          text: "A **syntax error** is different. Before running anything, Python reads the whole file to check that it is valid Python. If any line can't be read, such as a note without a `#`, nothing runs at all, not even the first line.",
        },
      ],
    },
  ],

  example: {
    caption: "A labelled summary, with comments. Press Run to execute it with real Python; running examples never affects your progress.",
    code: '# Summary for one line of an order\nitem = "notebook"\nprice = 4\nquantity = 3\ntotal = price * quantity  # in dollars\n\nprint("Order summary")\nprint()\nprint("Item:", item)\nprint("Total:", total, "dollars")',
  },

  walkthrough: [
    {
      title: "Commas separate values",
      text: "Each `print()` shows its values with one space between them. Values can be text or numbers, in any order, as many as you need.",
      code: 'print("Item:", "notebook")\nprint("Quantity:", 3)\nprint("Parcel:", 3, "kg")',
    },
    {
      title: "An empty print() makes a blank line",
      text: "`print()` with no values prints an empty line, separating the heading from the rest.",
      code: 'print("Order summary")\nprint()\nprint("Total:", 12)',
    },
    {
      title: "Comments don't run",
      text: "Only `first` and `third` are printed. The second `print` has been commented out, and the note at the end of the last line is ignored.",
      code: '# This line is a note for people.\nprint("first")\n# print("second")\nprint("third")  # a comment can follow code',
    },
    {
      title: "An error stops the program partway",
      text: "`Starting` is printed, then line 2 fails with a `NameError`: `price` was never assigned. Python stops there, so line 3 never runs. The output from before the error stays.",
      code: 'print("Starting")\ntotal = price * quantity\nprint("Total:", total)',
    },
  ],

  mistakes: [
    {
      title: "Writing a note without #",
      text: "Line 2 isn't Python, so this is a syntax error. Look closely: `Order received` is **not** printed. Python checks the whole file before running any of it.",
      code: 'print("Order received")\nCheck the delivery address\nprint("Order packed")',
      fix: "Start every note with `#`: `# Check the delivery address`.",
    },
    {
      title: "Using a name before the line that assigns it",
      text: "Python runs line 1 first. At that moment `total` doesn't exist, because its assignment on line 2 hasn't run yet.",
      code: 'print("Total:", total)\ntotal = 4 * 3',
      fix: "Assign first, then print: move `total = 4 * 3` above the `print()`.",
    },
    {
      title: "Joining a label and a number with +",
      text: "`+` can't join text to a number, so the program stops with a `TypeError`.",
      code: 'total = 12\nprint("Total: " + total)',
      fix: 'Separate the values with a comma instead: `print("Total:", total)`.',
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Print an order summary",
      prompt:
        "A stationery order is for 3 notebooks at 4 dollars each, and the starter code already stores those values. Calculate `total` from `price` and `quantity`, then print a summary that matches the one below exactly.",
      expectedOutput: "Order summary\n\nItem: notebook\nQuantity: 3\nTotal: 12 dollars\n",
      looksFor: [
        "`total` holds `12`, calculated from `price` and `quantity`.",
        "The program prints the summary exactly as shown: five lines, and the second one is empty.",
      ],
      starter: 'item = "notebook"\nprice = 4\nquantity = 3\n\n# Calculate total, then print the summary.\n',
      task: {
        checks: [
          { kind: "variable", id: "total", name: "total", expected: py.int(12), tip: "Calculate total from the other variables before printing it: total = price * quantity." },
          { kind: "uses-variables", id: "total-calculated", name: "total", uses: ["price", "quantity"], tip: "Write the calculation with the variable names, total = price * quantity, rather than typing 12." },
          {
            kind: "output",
            id: "output",
            label: "Prints the summary exactly",
            expected: "Order summary\n\nItem: notebook\nQuantity: 3\nTotal: 12 dollars\n",
            tip: "Compare your Console with the expected output line by line. Separate values with commas and don't add spaces inside the quotes: the comma adds one. Use print() on its own for the empty line.",
          },
        ],
      },
      hints: [
        "Calculate first, with total = price * quantity. A line can only use total after that line has run.",
        'Give print() a label and a variable, separated by a comma: print("Item:", item). The comma adds the space, so don\'t put one inside the quotes.',
        'print() with nothing inside prints the empty line. The last line has three values: print("Total:", total, "dollars").',
      ],
      answer:
        'item = "notebook"\nprice = 4\nquantity = 3\n\ntotal = price * quantity\n\nprint("Order summary")\nprint()\nprint("Item:", item)\nprint("Quantity:", quantity)\nprint("Total:", total, "dollars")',
    },
    {
      id: "challenge-2",
      title: "Fix a program that won't run",
      prompt:
        "This program should report the cost of shipping a parcel, but it doesn't run. Fix it **without changing what any line does**: turn the note on line 1 into a comment, then put the lines in an order that works. It should print the lines below.",
      expectedOutput: "Parcel: 3 kg\nRate: 4 per kg\nCost: 12\n",
      looksFor: [
        "The program runs without errors and prints the three lines shown, in that order.",
        "`cost` holds `12`, still calculated as `weight_kg * rate`.",
      ],
      starter:
        'Parcel cost: weight times rate per kg\nprint("Cost:", cost)\nrate = 4\nprint("Parcel:", weight_kg, "kg")\ncost = weight_kg * rate\nweight_kg = 3\nprint("Rate:", rate, "per kg")\n',
      task: {
        checks: [
          {
            kind: "output",
            id: "output",
            label: "Prints the three lines in order",
            expected: "Parcel: 3 kg\nRate: 4 per kg\nCost: 12\n",
            tip: "Each line can only use names assigned above it. Move each assignment above the first line that uses it, and keep the three print() lines in the order shown.",
          },
          { kind: "variable", id: "cost", name: "cost", expected: py.int(12), tip: "Keep the line cost = weight_kg * rate, and move it below both of the assignments it uses." },
          { kind: "uses-variables", id: "cost-calculated", name: "cost", uses: ["weight_kg", "rate"], tip: "Move the calculation rather than replacing it with a number: cost = weight_kg * rate." },
        ],
      },
      hints: [
        "Press Run first and read the error. It's on line 1: that line is a note, not Python. Put # at the start of it.",
        "Run again. Now a name is used before the line that assigns it. Which lines have to come before it?",
        "The assignments weight_kg = 3 and rate = 4 go first, then cost = weight_kg * rate, then the three print() lines in the order shown.",
      ],
      answer:
        '# Parcel cost: weight times rate per kg\nweight_kg = 3\nrate = 4\ncost = weight_kg * rate\nprint("Parcel:", weight_kg, "kg")\nprint("Rate:", rate, "per kg")\nprint("Cost:", cost)',
    },
  ],

  quiz: [
    {
      id: "predict-error",
      prompt: "What does this program print?",
      code: 'print("A")\nprint("B", price)\nprice = 5\nprint("C")',
      options: [
        { text: "`A`, then a `NameError` on line 2", correct: true, why: "Line 1 runs and prints `A`. Line 2 needs `price`, which isn't assigned until line 3, so the program stops there. Line 4 never runs." },
        { text: "`A`, then `B 5`, then `C`", why: "Python doesn't look ahead for assignments. When line 2 runs, line 3 hasn't run yet, so `price` doesn't exist." },
        { text: "Only the error, nothing printed", why: "That happens with a syntax error, when Python can't read the file. This file is valid Python, so it starts running, and line 1 prints `A` before line 2 fails." },
        { text: "`A`, then the error, then `C`", why: "An error stops the program at that line. The lines after it never run." },
      ],
    },
    {
      id: "print-and-comments",
      prompt: "What does this line print?",
      code: 'print("Total:", 3 * 4)  # in dollars',
      options: [
        { text: "`Total: 12`", correct: true, why: "`3 * 4` is calculated first, the comma prints as one space, and everything from `#` onwards is a comment." },
        { text: "`Total:12`", why: "Values separated by commas are printed with one space between them." },
        { text: "`Total: 3 * 4`", why: "Without quotes, `3 * 4` is a calculation, so `print()` shows its result, 12." },
        { text: "`Total: 12  # in dollars`", why: "The `#` is outside the quotes, so it starts a comment, which Python ignores. It isn't text to print." },
      ],
    },
  ],

  outcomes: [
    "Print several values on one line with labels, and use empty lines to group output.",
    "Write comments, and comment out a line to switch it off.",
    "Predict the order a program runs in, and what it printed before an error stopped it.",
    "Tell a syntax error (nothing runs) from an error partway through (earlier lines already ran).",
  ],
};
