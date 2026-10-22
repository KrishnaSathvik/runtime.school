/**
 * M02 practice: ten questions. Uses names, input(), numbers, True and False, conversion, None, and type().
 * Arithmetic waits until M03. Programs that read input() are re-run with other typed lines, and programs that
 * store values are re-run with other stored values, so printing the expected words cannot pass.
 * Version 2: rebuilt from store-and-print drills into debugging, refactoring and prediction with real reasoning.
 */
import { py } from "@/engine/python/values";
import type { PyQuestion } from "../model";
import { callsFunction } from "../checks";
import { rerun, retyped } from "../beginner-checks";

const out = (expected: string, tip?: string) => ({ kind: "output" as const, id: "output", label: "Prints exactly the expected lines", expected, ...(tip ? { tip } : {}) });
const reads = callsFunction("reads", "Reads a typed line with input()", "input");

export const m02Questions: PyQuestion[] = [
  {
    id: "PY-Q02-02",
    version: 2,
    slug: "the-name-that-changed",
    title: "A copy before the change",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 3,
    requires: ["assignment", "reassignment", "print-call", "unquoted-name"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: ["previous = status stores the value status holds at that moment.", "Storing a new value in status later does not reach back into previous.", "Work out what each name holds when the two prints run."],
    explanation: "previous = status stores packing in previous. Then status gets a new value, shipped. previous still holds packing, because storing in one name never changes another name.",
    predict: {
      program: 'status = "packing"\nprevious = status\nstatus = "shipped"\nprint(previous)\nprint(status)\n',
      output: "packing\nshipped\n",
      wrongPredictions: ["shipped\nshipped", "packing\npacking", "status\nshipped", "previous\nstatus"],
    },
  },
  {
    id: "PY-Q02-12",
    version: 2,
    slug: "two-kinds-of-number",
    title: "What each conversion gives",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 4,
    requires: ["conversion", "whole-number", "decimal-number", "string-value", "print-call", "print-text", "print-number"],
    prompt: "Type exactly what this program prints. Each line converts one value.",
    spec: [],
    hiddenKinds: [],
    hints: ["int() of whole-number text ignores spaces around it and zeros in front.", "float() of whole-number text still gives a decimal, and a decimal prints with a point.", "int() of a decimal value keeps only the whole part."],
    explanation: "int(\"007\") is 7. float(\"3\") is the decimal 3.0. int(7.9) keeps the whole part, 7, without rounding. str(4.0) is the text 4.0, printed without quotes. int(\" 12 \") allows the spaces and gives 12.",
    predict: {
      program: 'print(int("007"))\nprint(float("3"))\nprint(int(7.9))\nprint(str(4.0))\nprint(int(" 12 "))\n',
      output: "7\n3.0\n7\n4.0\n12\n",
      wrongPredictions: ["007\n3.0\n7\n4.0\n12", "7\n3\n7\n4.0\n12", "7\n3.0\n8\n4.0\n12", "7\n3.0\n7\n4\n12"],
    },
  },
  {
    id: "PY-Q02-22",
    version: 2,
    slug: "a-label-and-a-no",
    title: "Same word, different kinds",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 4,
    requires: ["assignment", "reassignment", "string-value", "boolean", "none-value", "type-call", "print-call", "print-text", "print-several", "unquoted-name"],
    prompt: "Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: ["Each print shows the value, then its kind.", "With quotes, False is text. Without quotes, it is the yes-or-no value.", "None prints as None, and its kind is NoneType."],
    explanation: "The first answer is the text False, so its kind is str. After the second store it is the value False, kind bool. None prints as the word None, with kind NoneType. The printed words alone can't tell text from a real value; type() can.",
    predict: {
      program: 'answer = "False"\nprint(answer, type(answer))\nanswer = False\nprint(answer, type(answer))\nprint(None, type(None))\n',
      output: "False <class 'str'>\nFalse <class 'bool'>\nNone <class 'NoneType'>\n",
      wrongPredictions: [
        "False <class 'bool'>\nFalse <class 'bool'>\nNone <class 'NoneType'>",
        "\"False\" <class 'str'>\nFalse <class 'bool'>\nNone <class 'NoneType'>",
        "False <class 'str'>\nFalse <class 'bool'>\nNone <class 'None'>",
      ],
    },
  },
  {
    id: "PY-Q02-03",
    version: 2,
    slug: "name-used-too-soon",
    title: "The name used too soon",
    format: "debugging",
    difficulty: "easy",
    minutes: 4,
    requires: ["assignment", "print-call", "print-text", "print-several", "unquoted-name", "runtime-error"],
    prompt: "This program stops before it prints anything useful. The order id should be stored before it is printed. Fix the order of the lines so it prints the order line and the status line.",
    spec: [["Keep", "`order = \"O100376\"` as a line of its own. Check runs your program again with another order id"]],
    hiddenKinds: ["another order id"],
    hints: ["Run it and read the name in the error.", "Python runs lines from the top. A name has to be stored before a later line can use it.", "Move the store, not the prints."],
    explanation: "print uses order before any value is stored there, so Python stops with NameError on that line. Storing the order id first lets both prints run, and both use the name, so another order id prints correctly too.",
    code: {
      starter: 'print("Order", order)\norder = "O100376"\nprint(order, "is out for delivery")\n',
      answer: 'order = "O100376"\nprint("Order", order)\nprint(order, "is out for delivery")\n',
      wrong: [
        { code: 'order = "O100376"\nprint("Order O100376")\nprint("O100376 is out for delivery")\n', fails: ["v1"], why: "prints the right lines, but the id is typed in, so another order still prints O100376" },
        { code: 'print("Order", "order")\norder = "O100376"\nprint(order, "is out for delivery")\n', fails: ["output", "v1"], why: "quoting the name prints the word order" },
      ],
      task: {
        checks: [
          out("Order O100376\nO100376 is out for delivery\n"),
          rerun("v1", { order: "O108858" }, "Order O108858\nO108858 is out for delivery\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q02-13",
    version: 2,
    slug: "true-is-not-true",
    title: "true is not True",
    format: "debugging",
    difficulty: "easy",
    minutes: 4,
    requires: ["assignment", "boolean", "string-value", "print-call", "print-text", "print-several", "unquoted-name", "case-sensitive", "runtime-error"],
    prompt: "This program should store whether the order is gift-wrapped as a yes-or-no value and print it with a label. It stops instead. Fix the stored value.",
    spec: [["Prints", "`Gift wrap: True`"]],
    hiddenKinds: [],
    hints: ["Run it. The error names a word Python does not know.", "True and False have a capital first letter, and no quotes.", "The fix is on the line that stores the value."],
    explanation: "true is a different name from True, and nothing was stored in it, so Python stops with NameError. True is the yes-or-no value. \"True\" in quotes would print the same word, but it would be text.",
    code: {
      starter: 'gift_wrap = true\nprint("Gift wrap:", gift_wrap)\n',
      answer: 'gift_wrap = True\nprint("Gift wrap:", gift_wrap)\n',
      wrong: [
        { code: 'gift_wrap = "True"\nprint("Gift wrap:", gift_wrap)\n', fails: ["gift_wrap"], why: "prints the same word, but it is text" },
        { code: 'gift_wrap = 1\nprint("Gift wrap:", gift_wrap)\n', fails: ["output", "gift_wrap"], why: "1 is a number, and it prints as 1" },
      ],
      task: {
        checks: [
          out("Gift wrap: True\n"),
          { kind: "variable", id: "gift_wrap", label: "gift_wrap is the value True", name: "gift_wrap", expected: py.bool(true) },
        ],
      },
    },
  },
  {
    id: "PY-Q02-23",
    version: 2,
    slug: "still-text",
    title: "The price that crashes the till",
    format: "debugging",
    difficulty: "medium",
    minutes: 5,
    requires: ["assignment", "input", "string-value", "decimal-number", "conversion", "print-call", "print-text", "print-several", "unquoted-name", "runtime-error"],
    prompt: "The till reads a typed price and prints it. With the price `4.50` it stops with an error. Fix it so any typed price, with or without cents, prints as a decimal.",
    spec: [["Typed line", "`4.50` here; Check also types other prices, including a whole number"], ["Prints", "`Price? Price: 4.5`"]],
    hiddenKinds: ["a price with cents", "a whole-number price", "a price under one dollar"],
    hints: ["Run it and read the error type and its message.", "One conversion accepts only whole-number text. The other accepts a decimal point.", "Every price should come out as a decimal, even one typed without cents."],
    explanation: "int() refuses text with a decimal point, so int(\"4.50\") raises ValueError. float() reads 4.50 as 4.5, and it also reads 12 as 12.0, so every price prints as a decimal.",
    code: {
      starter: 'price_text = input("Price? ")\nprice = int(price_text)\nprint("Price:", price)\n',
      answer: 'price_text = input("Price? ")\nprice = float(price_text)\nprint("Price:", price)\n',
      wrong: [
        { code: 'price_text = input("Price? ")\nprice = price_text\nprint("Price:", price)\n', fails: ["output", "others"], why: "the typed text is printed as typed, with its trailing zero" },
        { code: 'price_text = input("Price? ")\nprice = int(float(price_text))\nprint("Price:", price)\n', fails: ["output", "others"], why: "the cents are dropped" },
      ],
      task: {
        stdin: "4.50\n",
        checks: [
          out("Price? Price: 4.5\n"),
          retyped("others", [
            [["12.99"], "Price? Price: 12.99\n"],
            [["12"], "Price? Price: 12.0\n"],
            [["0.75"], "Price? Price: 0.75\n"],
          ]),
        ],
      },
    },
  },
  {
    id: "PY-Q02-10",
    version: 2,
    slug: "ask-the-type",
    title: "The coupon that says None",
    format: "debugging",
    difficulty: "medium",
    minutes: 4,
    requires: ["assignment", "none-value", "string-value", "type-call", "print-call", "print-text", "print-several", "unquoted-name"],
    prompt: "This order has no coupon, and the program should record that there is no value. The printout looks right, but the kind line shows the program stored something else. Fix the stored value.",
    spec: [["Prints", "`Coupon: None`, then `Kind: <class 'NoneType'>`"]],
    hiddenKinds: [],
    hints: ["Look at the kind line, not the coupon line.", "Text in quotes is str, even when it spells None.", "The value that means \"no value\" is written without quotes."],
    explanation: "\"None\" in quotes is a four-letter piece of text, so its kind is str. The real no-value is None without quotes; it prints the same word, and type() reports NoneType.",
    code: {
      starter: 'coupon = "None"\nprint("Coupon:", coupon)\nprint("Kind:", type(coupon))\n',
      answer: 'coupon = None\nprint("Coupon:", coupon)\nprint("Kind:", type(coupon))\n',
      wrong: [
        { code: 'coupon = none\nprint("Coupon:", coupon)\nprint("Kind:", type(coupon))\n', fails: ["output", "coupon"], why: "none with a small n is an unknown name, so the program stops" },
        { code: 'coupon = ""\nprint("Coupon:", coupon)\nprint("Kind:", type(coupon))\n', fails: ["output", "coupon"], why: "empty text is still text, kind str" },
        { code: 'coupon = 0\nprint("Coupon:", coupon)\nprint("Kind:", type(coupon))\n', fails: ["output", "coupon"], why: "0 is a number, not the missing value" },
      ],
      task: {
        checks: [
          out("Coupon: None\nKind: <class 'NoneType'>\n"),
          { kind: "variable", id: "coupon", label: "coupon is None", name: "coupon", expected: py.none },
        ],
      },
    },
  },
  {
    id: "PY-Q02-16",
    version: 2,
    slug: "store-the-price",
    title: "Store the name once",
    format: "refactoring",
    difficulty: "medium",
    minutes: 5,
    requires: ["assignment", "string-value", "print-call", "print-text", "print-several", "unquoted-name"],
    prompt: "This label printer types the customer's name into every line, so changing the customer means editing three lines. Store the name once, in `customer`, and make every line use it. The output must stay exactly the same.",
    spec: [["First line", "`customer = \"Grace Walker\"`. Check runs your program again with another customer"], ["Prints", "the same three lines as the starter"]],
    hiddenKinds: ["another customer's name"],
    hints: ["Run the starter first and keep its output in view.", "The name goes in quotes once, on the right of =.", "Each print then has its label as text and the name without quotes."],
    explanation: "With the name stored once, each print joins its label and the name with a space, which reproduces the original lines. Changing the first line now changes all three, which Check confirms by running the program with another customer.",
    code: {
      starter: 'print("Ship to: Grace Walker")\nprint("Gift message for Grace Walker")\nprint("Signed for by Grace Walker")\n',
      answer: 'customer = "Grace Walker"\nprint("Ship to:", customer)\nprint("Gift message for", customer)\nprint("Signed for by", customer)\n',
      wrong: [
        { code: 'customer = "Grace Walker"\nprint("Ship to:", customer)\nprint("Gift message for Grace Walker")\nprint("Signed for by Grace Walker")\n', fails: ["v1"], why: "only the first line uses the name" },
        { code: 'customer = "Grace Walker"\nprint("Ship to:", customer)\nprint("Gift message for", "customer")\nprint("Signed for by", customer)\n', fails: ["output", "v1"], why: "a quoted name prints the word customer" },
      ],
      task: {
        checks: [
          out("Ship to: Grace Walker\nGift message for Grace Walker\nSigned for by Grace Walker\n"),
          rerun("v1", { customer: "Nora Garcia" }, "Ship to: Nora Garcia\nGift message for Nora Garcia\nSigned for by Nora Garcia\n"),
        ],
      },
    },
  },
  {
    id: "PY-Q02-06",
    version: 2,
    slug: "read-the-city",
    title: "Welcome back",
    format: "code_completion",
    difficulty: "medium",
    minutes: 5,
    requires: ["assignment", "input", "print-call", "print-text", "print-several", "end", "sep", "newline-escape", "unquoted-name"],
    prompt: "The app greets a returning customer by the name they type. Replace `???` so the greeting ends with an exclamation mark straight after the name, with no space before it.",
    spec: [["Typed line", "`Maya` here; Check also types other names"], ["Prints", "`Name? Welcome back, Maya!`"]],
    hiddenKinds: ["another first name", "a name with a space in it"],
    hints: ["print puts a space between values, so an exclamation mark given as a third value would get a space before it.", "What comes after the last value is controlled by end.", "The ending has to be the exclamation mark and then a new line."],
    explanation: "Welcome back, and the name are two values, joined by a space. end=\"!\\n\" replaces the normal new line with an exclamation mark followed by a new line, so the mark sits right after the name.",
    code: {
      starter: 'name = input("Name? ")\nprint("Welcome back,", ???)\n',
      answer: 'name = input("Name? ")\nprint("Welcome back,", name, end="!\\n")\n',
      alternatives: ['name = input("Name? ")\nprint("Welcome back, ", name, "!", sep="")\n'],
      wrong: [
        { code: 'name = input("Name? ")\nprint("Welcome back,", name, "!")\n', fails: ["output", "others"], why: "a space appears before the exclamation mark" },
        { code: 'name = input("Name? ")\nprint("Welcome back, Maya!")\n', fails: ["others"], why: "Maya is typed in, so every customer is greeted as Maya" },
      ],
      task: {
        stdin: "Maya\n",
        checks: [
          out("Name? Welcome back, Maya!\n"),
          reads,
          retyped("others", [
            [["Theo"], "Name? Welcome back, Theo!\n"],
            [["Ana Lucia"], "Name? Welcome back, Ana Lucia!\n"],
          ]),
        ],
      },
    },
  },
  {
    id: "PY-Q02-25",
    version: 2,
    slug: "name-city-no-coupon",
    title: "An order intake card",
    format: "code_completion",
    difficulty: "hard",
    minutes: 8,
    requires: ["assignment", "input", "conversion", "whole-number", "none-value", "type-call", "print-call", "print-text", "print-several", "print-blank", "unquoted-name"],
    prompt: "An intake screen reads a quantity and records that no coupon was given. Replace the two `???` so the card shows a whole-number quantity and a missing coupon, each followed by its kind.",
    spec: [["Typed line", "`3` here; Check also types other quantities"], ["Prints", "`Qty? ` on its own line, then `qty: 3 <class 'int'>`, then `coupon: None <class 'NoneType'>`"]],
    hiddenKinds: ["a two-digit quantity", "a quantity of zero"],
    hints: ["The typed line is text. The card needs its whole-number value.", "No coupon means no value at all, not a piece of text.", "The kind lines tell you whether each name holds what it should."],
    explanation: "qty must be the typed text converted with int(), so its kind is int and it follows the typed line. coupon must be None, without quotes, so its kind is NoneType.",
    code: {
      starter: 'qty_text = input("Qty? ")\nprint()\nqty = ???\ncoupon = ???\nprint("qty:", qty, type(qty))\nprint("coupon:", coupon, type(coupon))\n',
      answer: 'qty_text = input("Qty? ")\nprint()\nqty = int(qty_text)\ncoupon = None\nprint("qty:", qty, type(qty))\nprint("coupon:", coupon, type(coupon))\n',
      wrong: [
        { code: 'qty_text = input("Qty? ")\nprint()\nqty = qty_text\ncoupon = None\nprint("qty:", qty, type(qty))\nprint("coupon:", coupon, type(coupon))\n', fails: ["output", "others"], why: "qty is still text, kind str" },
        { code: 'qty_text = input("Qty? ")\nprint()\nqty = int(qty_text)\ncoupon = "None"\nprint("qty:", qty, type(qty))\nprint("coupon:", coupon, type(coupon))\n', fails: ["output", "coupon", "others"], why: "the coupon is the text None, kind str" },
        { code: 'qty_text = input("Qty? ")\nprint()\nqty = 3\ncoupon = None\nprint("qty:", qty, type(qty))\nprint("coupon:", coupon, type(coupon))\n', fails: ["others"], why: "3 is typed in, so other quantities still show 3" },
      ],
      task: {
        stdin: "3\n",
        checks: [
          out("Qty? \nqty: 3 <class 'int'>\ncoupon: None <class 'NoneType'>\n"),
          { kind: "variable", id: "coupon", label: "coupon is None", name: "coupon", expected: py.none },
          retyped("others", [
            [["12"], "Qty? \nqty: 12 <class 'int'>\ncoupon: None <class 'NoneType'>\n"],
            [["0"], "Qty? \nqty: 0 <class 'int'>\ncoupon: None <class 'NoneType'>\n"],
          ]),
        ],
      },
    },
  },
];
