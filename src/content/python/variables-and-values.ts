import { py } from "@/engine/python/values";
import type { PyLesson } from "./types";

export const variablesAndValues: PyLesson = {
  slug: "variables-and-values",
  ref: "python:variables-and-values",
  module: "foundations",
  number: 1,
  title: "Variables and values",
  level: "beginner",
  summary:
    "A variable is a name for a value. You'll store numbers and text in variables, calculate with them, change them, and print the results.",

  sections: [
    {
      label: "what a variable is",
      blocks: [
        { kind: "p", text: "Programs work with values: a price, a quantity, a name. A **variable** is a name you give a value so you can use it again later." },
        { kind: "code", code: "price = 12" },
        {
          kind: "p",
          text: "Read this line as “price refers to 12”. The `=` sign is **assignment**: Python works out the value on the right, then stores it under the name on the left. It does not ask whether two things are equal; that is a different operator, `==`, covered under Watch for below.",
        },
      ],
    },
    {
      label: "numbers and text",
      blocks: [
        {
          kind: "p",
          text: "Whole numbers like `12` are **integers**. Numbers with a decimal point, like `0.25`, are **floats**. Text goes inside quotes and is called a **string**. Python treats `12` and `\"12\"` differently: the first is a number you can calculate with, the second is just the characters 1 and 2.",
        },
        { kind: "code", code: 'product = "notebook"\nquantity = 4\nweight_kg = 0.25' },
        {
          kind: "p",
          text: "Names use lowercase letters, digits and underscores, and can't start with a digit. They are case-sensitive: `total` and `Total` are two different variables.",
        },
      ],
    },
    {
      label: "calculating and printing",
      blocks: [
        {
          kind: "p",
          text: "Once a value has a name, you can use the name in a calculation. Python replaces each name with the value it holds right now, then works out the result. `*` multiplies, `+` adds, `-` subtracts and `/` divides.",
        },
        {
          kind: "p",
          text: "Calculating a value doesn't show it. To see a value, give it to `print()`, which writes it to the console.",
        },
      ],
    },
  ],

  example: {
    caption: "The whole idea in one program. Press Run to execute it with real Python; running examples never affects your progress.",
    code: "price = 12\nquantity = 3\ntotal = price * quantity\nprint(total)",
  },

  walkthrough: [
    {
      title: "Assignment stores a value",
      text: "Python stores `12` under the name `price`. Run it: nothing appears in the console, because storing a value doesn't print anything.",
      code: "price = 12",
    },
    {
      title: "Calculations use the current values",
      text: "On the last line, Python looks up `price` (12) and `quantity` (3), calculates `12 * 3`, and stores the result, `36`, in `total`. Still nothing is printed.",
      code: "price = 12\nquantity = 3\ntotal = price * quantity",
    },
    {
      title: "print() shows a value",
      text: "`print(total)` reads the value stored in `total` and writes it to the console.",
      code: "price = 12\nquantity = 3\ntotal = price * quantity\nprint(total)",
    },
    {
      title: "Assigning again replaces the value",
      text: "`quantity = 5` replaces 3 with 5. But `total` still holds 36: it was calculated before the change, and Python doesn't recalculate it for you. Only when `total = price * quantity` runs again does `total` become 60.",
      code: "price = 12\nquantity = 3\ntotal = price * quantity\nprint(total)\n\nquantity = 5\nprint(total)\n\ntotal = price * quantity\nprint(total)",
    },
  ],

  mistakes: [
    {
      title: "Forgetting the quotes around text",
      text: "Without quotes, Python reads `notebook` as the name of a variable. No variable has that name, so the program stops with a `NameError`. Run it to see Python's real message.",
      code: "product = notebook\nprint(product)",
      fix: 'Put text in quotes: `product = "notebook"`.',
    },
    {
      title: "Writing == when you mean =",
      text: "`==` compares two values and gives `True` or `False`. It never stores anything. Here `price == 15` is worked out and thrown away, so `price` is still 12.",
      code: "price = 12\nprice == 15\nprint(price)",
      fix: "To change a variable, assign to it: `price = 15`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Calculate an order total",
      prompt: "A café sells muffins for 3 dollars each, and a customer orders 7. Store the price and the quantity in variables, calculate the total cost from them, and print it.",
      looksFor: [
        "`price` holds the whole number `3`, and `quantity` holds `7`.",
        "`total` holds `21`, calculated from `price` and `quantity`.",
        "The program prints exactly `21`.",
      ],
      starter: "# Muffins cost 3 dollars each. The customer orders 7.\n",
      task: {
        checks: [
          { kind: "variable", id: "price", name: "price", expected: py.int(3), tip: "Store the price as a whole number without quotes: price = 3." },
          { kind: "variable", id: "quantity", name: "quantity", expected: py.int(7) },
          { kind: "variable", id: "total", name: "total", expected: py.int(21), tip: "Calculate total from the other two variables with *, the multiplication operator." },
          // The point of this challenge is calculating with variables, so typing total = 21 isn't enough.
          { kind: "uses-variables", id: "total-calculated", name: "total", uses: ["price", "quantity"], tip: "Write the calculation with the variable names, for example total = price * quantity." },
          { kind: "output", id: "output", label: "Prints 21", expected: "21\n", tip: "Print only the total: print(total)." },
        ],
      },
      hints: [
        "Create each variable on its own line, starting with price = 3.",
        "The total is the price multiplied by the quantity. In Python, multiplication is written with *.",
        "Store the result in a variable named total, then show it with print(total).",
      ],
      answer: "price = 3\nquantity = 7\ntotal = price * quantity\nprint(total)",
    },
    {
      id: "challenge-2",
      title: "Update and recalculate",
      prompt: "A bookstore order starts as 2 books at 15 dollars each. Print the total for that order. Then the customer adds 3 more books: change `quantity` to the new amount, calculate the total again, and print the new total.",
      looksFor: [
        "The program prints two lines: the starting total `30`, then the new total `75`.",
        "When the program ends, `quantity` holds `5` and `total` holds `75`.",
        "`price` still holds `15`.",
      ],
      starter: "# 2 books at 15 dollars each to start.\n# Then the customer adds 3 more books.\n",
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints 30, then 75", expected: "30\n75\n", tip: "Print the total twice: once for the starting order and once after changing quantity." },
          { kind: "variable", id: "quantity", label: "quantity ends as 5", name: "quantity", expected: py.int(5), tip: "Assign quantity again: quantity = 5, or quantity = quantity + 3." },
          { kind: "variable", id: "total", label: "total ends as 75", name: "total", expected: py.int(75), tip: "Changing quantity doesn't update total by itself. Calculate total again after the change." },
          { kind: "variable", id: "price", label: "price stays 15", name: "price", expected: py.int(15) },
        ],
      },
      hints: [
        "Start the same way as Challenge 1: price, quantity, total, then print(total).",
        "Assigning to quantity again replaces its value. Both quantity = 5 and quantity = quantity + 3 work.",
        "total won't change on its own. After changing quantity, run total = price * quantity again, then print it.",
      ],
      answer: "price = 15\nquantity = 2\ntotal = price * quantity\nprint(total)\n\nquantity = quantity + 3\ntotal = price * quantity\nprint(total)",
    },
  ],

  quiz: [
    {
      id: "predict",
      prompt: "What does this program print?",
      code: "score = 10\nprint(score + 5)\nscore = score + 1\nprint(score)",
      options: [
        { text: "15, then 11", correct: true, why: "`score + 5` is calculated and printed but not stored, so `score` stays 10. Then `score = score + 1` stores 11." },
        { text: "15, then 16", why: "`print(score + 5)` only reads `score`; it doesn't change it. `score` is still 10 when the next line adds 1." },
        { text: "10, then 11", why: "`print()` shows the value of the whole expression inside it. `score + 5` is 15." },
        { text: "15, then 10", why: "`score = score + 1` stores a new value in `score`: 11. The second `print` shows the updated value." },
      ],
    },
    {
      id: "changes",
      prompt: "Which line changes the value stored in `price`?",
      options: [
        { text: "`print(price * 2)`", why: "This prints a calculated value. `price` itself is unchanged." },
        { text: "`price * 2`", why: "Python works out the result and then discards it. Nothing is stored." },
        { text: "`price = price * 2`", correct: true, why: "Assignment stores the result of `price * 2` back in `price`." },
        { text: "`price == 24`", why: "`==` compares and gives `True` or `False`. It never changes `price`." },
      ],
    },
  ],

  outcomes: [
    "Store numbers and text in variables.",
    "Use variables in calculations.",
    "Change a variable by assigning to it again, and recalculate what depends on it.",
    "Show results with print().",
  ],
};
