import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { printedBy as printed } from "../../checks";


export const definingAndCallingFunctions: PyLesson = {
  slug: "defining-and-calling-functions",
  ref: "python:defining-and-calling-functions",
  module: "functions",
  number: 1,
  title: "Defining and calling functions",
  level: "intermediate",
  summary:
    "Give a block of code a name with `def`, run it by calling it as often as you like, pass it values through parameters, and describe what it does in a docstring.",

  sections: [
    {
      label: "def gives code a name",
      blocks: [
        {
          kind: "p",
          text: "A **function** is a named block of code. `def` defines it: the name, brackets with its **parameters**, a colon, and an indented body. Defining a function doesn't run the body; it only stores it under the name.",
        },
        { kind: "code", code: 'def print_line(item, price):\n    """Print one receipt line: the item, then the price in a column."""\n    print(f"{item:<10}{price:>8.2f}")' },
        {
          kind: "p",
          text: "The string in triple quotes right after the header is a **docstring**: a short description of what the function does, for people reading or using it. `help(print_line)` shows it.",
        },
      ],
    },
    {
      label: "calling",
      blocks: [
        {
          kind: "p",
          text: "**Calling** the function runs its body: `print_line(\"Tea\", 2.5)`. The values in the call are **arguments**; each is assigned to the parameter in the same position, so inside the body `item` is `\"Tea\"` and `price` is `2.5`. You can call a function as many times as you like with different arguments, which is the whole point: write the logic once, use it everywhere.",
        },
        {
          kind: "p",
          text: "A call must pass one argument per parameter. Too few or too many is a `TypeError` that names the function. And Python must have run the `def` before the call, so define functions above the code that uses them.",
        },
      ],
    },
    {
      label: "why functions",
      blocks: [
        {
          kind: "p",
          text: "Functions remove repetition (fix a bug once, not in five copies), give a meaningful name to a step (`print_line` says what the code is for), and let you test one piece on its own. The rest of this module builds on that: returning results, clear contracts, defaults, and modules.",
        },
      ],
    },
  ],

  example: {
    caption: "One function, called three times. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'def print_line(item, price):\n    """Print one receipt line: the item, then the price in a column."""\n    print(f"{item:<10}{price:>8.2f}")\n\n\nprint_line("Tea", 2.5)\nprint_line("Cake", 3.75)\nprint_line("Sandwich", 6)\nhelp(print_line)',
  },

  walkthrough: [
    {
      title: "Defining doesn't run the body",
      text: "Only `Defined` is printed: the body runs when the function is called, and it never is.",
      code: 'def say_hello():\n    print("Hello!")\n\nprint("Defined")',
    },
    {
      title: "Calling runs it, as often as you like",
      text: "Each call runs the whole body again.",
      code: 'def say_hello():\n    print("Hello!")\n\nsay_hello()\nsay_hello()',
    },
    {
      title: "Arguments fill the parameters in order",
      text: "In the first call `item` is `\"Tea\"` and `price` is `2.5`; in the second, the next pair.",
      code: 'def print_line(item, price):\n    print(f"{item:<10}{price:>8.2f}")\n\nprint_line("Tea", 2.5)\nprint_line("Cake", 3.75)',
    },
    {
      title: "Functions can call functions",
      text: "`print_receipt` uses `print_line` for each item, plus a heading and a divider of its own.",
      code: 'def print_line(item, price):\n    print(f"{item:<10}{price:>8.2f}")\n\ndef print_receipt(title):\n    print(title)\n    print("-" * 18)\n    print_line("Tea", 2.5)\n    print_line("Cake", 3.75)\n\nprint_receipt("Cafe receipt")',
    },
  ],

  mistakes: [
    {
      title: "Calling before defining",
      text: "Line 1 runs before the `def` on line 3 has, so the name doesn't exist yet: `NameError`.",
      code: 'greet("Ada")\n\ndef greet(name):\n    print("Hello,", name)',
      raises: "NameError",
      fix: "Put the `def` above the first call.",
    },
    {
      title: "Passing the wrong number of arguments",
      text: "`print_line` needs two arguments, an item and a price; the call gives one: `TypeError`.",
      code: 'def print_line(item, price):\n    print(f"{item:<10}{price:>8.2f}")\n\nprint_line("Tea")',
      raises: "TypeError",
      fix: "Pass one argument per parameter: `print_line(\"Tea\", 2.5)`.",
    },
    {
      title: "Forgetting the brackets",
      text: "Without `()`, `say_hello` is just the function's name, so nothing is called and nothing is printed.",
      code: 'def say_hello():\n    print("Hello!")\n\nsay_hello',
      fix: "Call it: `say_hello()`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Print receipt lines with a function",
      prompt:
        "Define `print_line(item, price)`, which prints one receipt line: the item left-aligned in 10 characters, then the price right-aligned in 8 with 2 decimal places. Then call it for the three items shown. Check answer also calls your function with other items.",
      expectedOutput: "Tea           2.50\nCake          3.75\nSandwich      6.00\n",
      looksFor: [
        "`print_line(item, price)` prints exactly one line in the format shown.",
        "The program calls it three times to print the receipt.",
      ],
      starter: "# Define print_line(item, price) here.\n\n\n# Then call it for Tea (2.5), Cake (3.75) and Sandwich (6).\n",
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints the three receipt lines", expected: "Tea           2.50\nCake          3.75\nSandwich      6.00\n" },
          { kind: "expr", id: "call-pen", label: 'print_line("Pen", 1.5) prints one formatted line', show: 'print_line("Pen", 1.5)', expr: printed('print_line("Pen", 1.5)'), expected: py.str("Pen           1.50\n"), tip: 'Inside the function, use the parameters: print(f"{item:<10}{price:>8.2f}").' },
          { kind: "expr", id: "call-hidden", label: "Works for other items", hidden: true, expr: printed('print_line("Notebook", 12)'), expected: py.str("Notebook     12.00\n") },
        ],
      },
      hints: [
        "def print_line(item, price): then an indented body.",
        'The body is one line: print(f"{item:<10}{price:>8.2f}").',
        'After the def (not indented): print_line("Tea", 2.5), and the other two calls.',
      ],
      answer: 'def print_line(item, price):\n    """Print one receipt line."""\n    print(f"{item:<10}{price:>8.2f}")\n\n\nprint_line("Tea", 2.5)\nprint_line("Cake", 3.75)\nprint_line("Sandwich", 6)',
      wrong: [
        { code: 'def print_line(item, price):\n    print(f"{\'Tea\':<10}{2.5:>8.2f}")\n\nprint("Tea           2.50")\nprint("Cake          3.75")\nprint("Sandwich      6.00")\n', fails: ["call-pen", "call-hidden"], why: "the function ignores its parameters" },
        { code: 'def print_line(item, price):\n    print(f"{item:<10}{price:>8.2f}")\n', fails: ["output"], why: "never called" },
        { code: 'def print_line(item, price):\n    print(item, price)\n\nprint_line("Tea", 2.5)\nprint_line("Cake", 3.75)\nprint_line("Sandwich", 6)\n', fails: ["output", "call-pen", "call-hidden"], why: "no formatting" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix a program that calls too early",
      prompt:
        "This program should print two labelled parcels using a `print_label(name, city)` function, but it stops with an error. Fix it, keeping the function and the two calls, so it prints the output shown.",
      expectedOutput: "To: Ada (London)\nTo: Grace (New York)\n",
      looksFor: [
        "The program runs and prints the two labels shown.",
        "`print_label(name, city)` still prints one label for any name and city.",
      ],
      starter: 'print_label("Ada", "London")\nprint_label("Grace")\n\ndef print_label(name, city):\n    print(f"To: {name} ({city})")\n',
      task: {
        checks: [
          { kind: "output", id: "output", label: "Prints both labels", expected: "To: Ada (London)\nTo: Grace (New York)\n" },
          { kind: "expr", id: "call", label: 'print_label("Kai", "Oslo") prints one label', show: 'print_label("Kai", "Oslo")', expr: printed('print_label("Kai", "Oslo")'), expected: py.str("To: Kai (Oslo)\n") },
        ],
      },
      hints: [
        "Run it and read the error: on line 1, print_label doesn't exist yet.",
        "Move the def to the top, above both calls.",
        'Then Python tells you the second call is missing an argument: Grace lives in "New York".',
      ],
      answer: 'def print_label(name, city):\n    print(f"To: {name} ({city})")\n\n\nprint_label("Ada", "London")\nprint_label("Grace", "New York")',
      wrong: [
        { code: 'def print_label(name, city):\n    print(f"To: {name} ({city})")\n\nprint_label("Ada", "London")\nprint_label("Grace")\n', fails: "program", why: "missing argument" },
      ],
    },
  ],

  quiz: [
    {
      id: "when-runs",
      prompt: "What does this program print?",
      code: 'def shout(word):\n    print(word.upper())\n\nprint("start")\nshout("hi")\nshout("bye")',
      options: [
        { text: "`start`, `HI`, `BYE`", correct: true, why: "The `def` only stores the function. `print(\"start\")` runs first, then each call runs the body once." },
        { text: "`HI`, `start`, `HI`, `BYE`", why: "Defining a function doesn't run its body; there's no call before `start`." },
        { text: "`start`, `HI`", why: "There are two calls, and each runs the body again." },
        { text: "A `NameError`", why: "The function is defined above the calls, so `shout` exists when they run." },
      ],
    },
    {
      id: "args",
      prompt: "In `def area(width, height):` called as `area(3, 5)`, what is `height` inside the body?",
      options: [
        { text: "`5`", correct: true, why: "Arguments fill parameters by position: `width` gets 3, `height` gets 5." },
        { text: "`3`", why: "The first argument goes to the first parameter, `width`." },
        { text: "`15`", why: "Nothing has been calculated yet; parameters just hold the arguments." },
        { text: "It's undefined until the function returns", why: "Parameters are assigned as soon as the call starts running the body." },
      ],
    },
  ],

  outcomes: [
    "Define a function with `def`, parameters, a body and a docstring.",
    "Call a function with arguments, and predict which parameter gets which value.",
    "Define functions before the code that calls them.",
    "Use a function to remove repeated code.",
  ],
};
