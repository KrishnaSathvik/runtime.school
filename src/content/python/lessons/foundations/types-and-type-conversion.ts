import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const typesAndTypeConversion: PyLesson = {
  slug: "types-and-type-conversion",
  ref: "python:types-and-type-conversion",
  module: "foundations",
  number: 4,
  title: "Types and type conversion",
  level: "beginner",
  summary:
    "Every value has a type. Find it with `type()`, convert between text and numbers with `int()`, `float()` and `str()`, and recognise the errors you get when a conversion or a mix of types doesn't make sense.",

  sections: [
    {
      label: "every value has a type",
      blocks: [
        {
          kind: "p",
          text: "You've met three types already: `int` (whole numbers), `float` (numbers with a decimal point) and `str` (text). A fourth, `bool`, has just two values, `True` and `False`, which you'll use for decisions in Conditions and Logic.",
        },
        {
          kind: "p",
          text: "`type(value)` tells you a value's type. `print(type(12))` prints `<class 'int'>`. The type decides what you can do with a value: you can multiply two ints, but not two strings.",
        },
        {
          kind: "p",
          text: "Mixing an int and a float in a calculation gives a float: `3 + 2.0` is `5.0`. Python widens the int so nothing is lost.",
        },
      ],
    },
    {
      label: "converting text to numbers",
      blocks: [
        {
          kind: "p",
          text: "Data from files, forms and websites usually arrives as **text**, even when it looks like a number. `\"12\"` is a string of two characters; you can't do arithmetic with it until you convert it.",
        },
        { kind: "code", code: 'quantity = int("12")      # 12, an int\nprice = float("4.50")     # 4.5, a float' },
        {
          kind: "p",
          text: "`int()` only accepts text that is a whole number (spaces around it are fine). `int(\"3.5\")` stops with a `ValueError`, because 3.5 isn't a whole number. Use `float()` for text with a decimal point.",
        },
      ],
    },
    {
      label: "converting between numbers, and back to text",
      blocks: [
        {
          kind: "p",
          text: "`int()` of a float **drops** the fractional part rather than rounding: `int(3.9)` is `3`, and `int(-3.9)` is `-3`. If you want the nearest whole number, use `round(3.9)`, which is `4`.",
        },
        {
          kind: "p",
          text: "`str()` turns any value into text: `str(42)` is `\"42\"`. You'll need it when you build text out of numbers in Strings and Text.",
        },
        {
          kind: "p",
          text: "When types don't fit an operation, Python stops with a `TypeError` rather than guessing what you meant. `\"12\" + 3` is a `TypeError`: should the answer be 15 or \"123\"? Convert first, so the meaning is clear.",
        },
      ],
    },
  ],

  example: {
    caption: "Quantities typed into a form arrive as text. Press Run to execute it with real Python; running examples never affects your progress.",
    code: '# From an order form: everything arrives as text.\nquantity_text = "3"\nprice_text = "4.50"\n\nquantity = int(quantity_text)\nprice = float(price_text)\ntotal = quantity * price\n\nprint(type(quantity_text), type(quantity))\nprint("Total:", total)',
  },

  walkthrough: [
    {
      title: "type() shows a value's type",
      text: "Each line prints the type of one value. `\"12\"` is a `str`, whatever characters are inside the quotes.",
      code: 'print(type(12))\nprint(type(12.0))\nprint(type("12"))\nprint(type(True))',
    },
    {
      title: "Text has to be converted before arithmetic",
      text: "`*` with a string and an int repeats the text, so the first line prints `121212`. After `int()`, the same `*` multiplies.",
      code: 'quantity_text = "12"\nprint(quantity_text * 3)\nquantity = int(quantity_text)\nprint(quantity * 3)',
    },
    {
      title: "int() drops the fraction; round() rounds",
      text: "`int()` keeps the whole-number part, towards zero. `round()` goes to the nearest whole number.",
      code: "print(int(3.9))\nprint(int(-3.9))\nprint(round(3.9))",
    },
    {
      title: "Mixing ints and floats gives a float",
      text: "Adding a float to an int gives a float, even when the result is a whole number.",
      code: "boxes = 3\nextra = 2.0\nprint(boxes + extra)\nprint(type(boxes + extra))",
    },
  ],

  mistakes: [
    {
      title: "Adding numbers that are still text",
      text: "Both values are strings, so `+` joins the text instead of adding: this prints `1230`, not `42`. No error tells you something is wrong.",
      code: 'first = "12"\nsecond = "30"\nprint(first + second)',
      fix: "Convert before calculating: `int(first) + int(second)` is `42`.",
    },
    {
      title: "Converting decimal text with int()",
      text: "`\"3.5\"` isn't a whole number, so `int()` refuses it with a `ValueError` and the program stops on line 2.",
      code: 'weight_text = "3.5"\nweight = int(weight_text)\nprint(weight)',
      raises: "ValueError",
      fix: "Use `float(weight_text)` for text that may contain a decimal point.",
    },
    {
      title: "Mixing text and a number with +",
      text: "Python won't guess whether you meant to add or to join, so this is a `TypeError`.",
      code: 'count = "12"\nprint(count + 3)',
      raises: "TypeError",
      fix: "Decide which you mean: `int(count) + 3` to add, or `count + str(3)` to join text.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Add up quantities from a form",
      prompt:
        "Two stock counts arrive from a form as text, in `count_a` and `count_b`. Calculate the total number of items as an **int** in `total_items`, and print it as shown. Check answer also tries other counts.",
      expectedOutput: "Total items: 42\n",
      looksFor: [
        "`total_items` is the int `42`, not the text `\"1230\"` or the float `42.0`.",
        "The program prints the line shown.",
        "It works for other counts too.",
      ],
      starter: 'count_a = "12"\ncount_b = "30"\n\n# Calculate total_items as a number, then print it.\n',
      task: {
        checks: [
          { kind: "variable", id: "total", name: "total_items", expected: py.int(42), tip: "Convert each count with int() before adding them." },
          { kind: "output", id: "output", label: "Prints the total", expected: "Total items: 42\n" },
          { kind: "variant", id: "v-other", set: { count_a: py.str("5"), count_b: py.str("7") }, output: "Total items: 12\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { count_a: py.str("0"), count_b: py.str("100") }, output: "Total items: 100\n", vars: { total_items: py.int(100) } },
        ],
      },
      hints: [
        "count_a holds text. int(count_a) gives the number it spells.",
        "Add the two converted values: total_items = int(count_a) + int(count_b).",
        'Print it with a label: print("Total items:", total_items).',
      ],
      answer: 'count_a = "12"\ncount_b = "30"\n\ntotal_items = int(count_a) + int(count_b)\nprint("Total items:", total_items)',
      alternatives: ['count_a = "12"\ncount_b = "30"\na = int(count_a)\nb = int(count_b)\ntotal_items = a + b\nprint("Total items:", total_items)\n'],
      wrong: [
        { code: 'count_a = "12"\ncount_b = "30"\ntotal_items = count_a + count_b\nprint("Total items:", total_items)\n', fails: ["total", "output", "v-other", "v-hidden"], why: "joined text" },
        { code: 'count_a = "12"\ncount_b = "30"\ntotal_items = float(count_a) + float(count_b)\nprint("Total items:", total_items)\n', fails: ["total", "output", "v-other", "v-hidden"], why: "float, not int" },
        { code: 'count_a = "12"\ncount_b = "30"\ntotal_items = 42\nprint("Total items:", total_items)\n', fails: ["v-other", "v-hidden"], why: "typed the answer" },
        { code: 'count_a = "12"\ncount_b = "30"\ntotal_items = count_a + 30\nprint("Total items:", total_items)\n', fails: "program", why: "TypeError" },
      ],
    },
    {
      id: "challenge-2",
      title: "Price a line of an order",
      prompt:
        "An order line arrives as text: `price_text` (the price of one item, which may have a decimal point) and `quantity_text` (a whole number). Convert them into `price` (a float) and `quantity` (an int), calculate `total`, and print it as shown.",
      expectedOutput: "Total: 13.5\n",
      looksFor: [
        "`price` is the float `4.5` and `quantity` is the int `3`.",
        "`total` is `13.5`, calculated from them, and the program prints the line shown.",
        "It works for other prices and quantities too.",
      ],
      starter: 'price_text = "4.50"\nquantity_text = "3"\n\n# Convert, calculate total, print it.\n',
      task: {
        checks: [
          { kind: "variable", id: "price", name: "price", expected: py.float(4.5), tip: "The price can have a decimal point, so convert it with float()." },
          { kind: "variable", id: "quantity", name: "quantity", expected: py.int(3), tip: "The quantity is a whole number: convert it with int()." },
          { kind: "variable", id: "total", name: "total", expected: py.float(13.5) },
          { kind: "output", id: "output", label: "Prints the total", expected: "Total: 13.5\n" },
          { kind: "variant", id: "v-other", set: { price_text: py.str("2.25"), quantity_text: py.str("4") }, output: "Total: 9.0\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { price_text: py.str("10"), quantity_text: py.str("0") }, output: "Total: 0.0\n" },
        ],
      },
      hints: [
        "Which conversion accepts \"4.50\"? int() refuses decimal points; float() doesn't.",
        "price = float(price_text) and quantity = int(quantity_text).",
        'total = price * quantity, then print("Total:", total).',
      ],
      answer: 'price_text = "4.50"\nquantity_text = "3"\n\nprice = float(price_text)\nquantity = int(quantity_text)\ntotal = price * quantity\nprint("Total:", total)',
      wrong: [
        { code: 'price_text = "4.50"\nquantity_text = "3"\nprice = int(price_text)\nquantity = int(quantity_text)\ntotal = price * quantity\nprint("Total:", total)\n', fails: "program", why: "int() of decimal text" },
        { code: 'price_text = "4.50"\nquantity_text = "3"\nprice = float(price_text)\nquantity = float(quantity_text)\ntotal = price * quantity\nprint("Total:", total)\n', fails: ["quantity"], why: "quantity as float" },
        { code: 'price_text = "4.50"\nquantity_text = "3"\nprice = float(price_text)\nquantity = int(quantity_text)\ntotal = price * quantity\nprint("Total:", round(total))\n', fails: ["output", "v-other", "v-hidden"], why: "rounded to a whole number" },
      ],
    },
  ],

  quiz: [
    {
      id: "conversion-error",
      prompt: "Which line stops the program with a `ValueError`?",
      options: [
        { text: '`int("7.0")`', correct: true, why: "`int()` only accepts text that spells a whole number. `\"7.0\"` has a decimal point, so it's a `ValueError`, even though 7.0 equals 7." },
        { text: '`float("7")`', why: "`float()` accepts whole-number text too: this gives `7.0`." },
        { text: "`int(7.9)`", why: "Converting a float (not text) to an int works: it drops the fraction and gives `7`." },
        { text: "`str(7.0)`", why: "`str()` can turn any value into text. This gives `\"7.0\"`." },
      ],
    },
    {
      id: "predict-types",
      prompt: "What does this program print?",
      code: 'a = "5"\nb = 2\nprint(a * b, int(a) * b)',
      options: [
        { text: "`55 10`", correct: true, why: "A string times an int repeats the string, so `\"5\" * 2` is `55`. After `int()`, `5 * 2` is `10`." },
        { text: "`10 10`", why: "`a` is still text. `*` with text repeats it rather than multiplying." },
        { text: "A `TypeError`", why: "`+` between a string and an int is a `TypeError`, but `*` is allowed: it repeats the text." },
        { text: "`5 2 10`", why: "`print()` here has two values: `a * b` and `int(a) * b`. Each is calculated before printing." },
      ],
    },
  ],

  outcomes: [
    "Find a value's type with `type()`, and tell `int`, `float`, `str` and `bool` apart.",
    "Convert text to numbers with `int()` and `float()`, and numbers to text with `str()`.",
    "Predict when a conversion raises `ValueError` and when mixing types raises `TypeError`.",
    "Explain the difference between `int()` (drops the fraction) and `round()`.",
  ],
};
