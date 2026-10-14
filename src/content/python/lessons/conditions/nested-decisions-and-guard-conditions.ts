import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const nestedDecisionsAndGuardConditions: PyLesson = {
  slug: "nested-decisions-and-guard-conditions",
  ref: "python:nested-decisions-and-guard-conditions",
  module: "conditions",
  number: 6,
  title: "Nested decisions and guard conditions",
  level: "beginner",
  summary:
    "Put one decision inside another when a question only makes sense after an earlier answer, check for invalid input first so the rest of the logic can trust its values, and write short either/or choices as conditional expressions.",

  sections: [
    {
      label: "decisions inside decisions",
      blocks: [
        {
          kind: "p",
          text: "An `if` block can contain another `if`. The inner decision is only reached when the outer condition is true, so it's the right tool when the second question depends on the first: only ask whether a member's subscription has expired once you know they're a member.",
        },
        { kind: "code", code: 'if is_member:\n    if months_left > 0:\n        price = 0\n    else:\n        price = 5\nelse:\n    price = 8' },
        {
          kind: "p",
          text: "Every level adds indentation and something to keep in your head. Two levels are fine; beyond that, look for a flatter way, such as combining conditions with `and` or using `elif`.",
        },
      ],
    },
    {
      label: "guard conditions",
      blocks: [
        {
          kind: "p",
          text: "A **guard** checks for the cases that would make the main calculation fail or meaningless (no orders, a negative weight, missing data) and handles them first. In an `if`/`elif` chain, put the guards at the top; the later branches can then assume the input is valid.",
        },
        { kind: "code", code: 'if orders == 0:\n    message = "No orders yet"\nelif revenue < 0:\n    message = "Invalid revenue"\nelse:\n    message = f"Average order: {revenue / orders:.2f}"' },
        {
          kind: "p",
          text: "The division in the `else` can't fail, because the only input that would break it was handled earlier.",
        },
      ],
    },
    {
      label: "conditional expressions",
      blocks: [
        {
          kind: "p",
          text: "When a decision just picks one of two values, a **conditional expression** fits it on one line: `fee = 0 if total >= 50 else 4.99`. Read it as “0 if the total is at least 50, otherwise 4.99”. It's an expression, so it can go anywhere a value can, including inside an f-string. Keep it for simple choices; anything with more steps reads better as `if`/`else`.",
        },
      ],
    },
  ],

  example: {
    caption: "Ticket prices with a guard for invalid ages. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'age = 34\nis_student = True\n\nif age < 0 or age > 120:\n    price = None\nelif age < 5:\n    price = 0\nelif age < 18:\n    price = 6\nelse:\n    if is_student:\n        price = 8\n    else:\n        price = 12\n\nlabel = "invalid age" if price is None else f"{price} dollars"\nprint("Ticket:", label)',
  },

  walkthrough: [
    {
      title: "The inner decision runs only inside the outer one",
      text: "`months_left` is only looked at for members. A non-member skips the whole inner `if`.",
      code: 'is_member = True\nmonths_left = 0\nif is_member:\n    if months_left > 0:\n        print("Active member")\n    else:\n        print("Membership expired")\nelse:\n    print("Not a member")',
    },
    {
      title: "Flattening with and",
      text: "The same rule with one level: the conditions are combined, and `elif`/`else` handle the rest. Both versions print the same thing.",
      code: 'is_member = True\nmonths_left = 0\nif is_member and months_left > 0:\n    print("Active member")\nelif is_member:\n    print("Membership expired")\nelse:\n    print("Not a member")',
    },
    {
      title: "A guard handles the dangerous case first",
      text: "With no orders, the first branch runs and the division in the `else` is never reached.",
      code: 'orders = 0\nrevenue = 0\nif orders == 0:\n    message = "No orders yet"\nelse:\n    message = f"Average order: {revenue / orders:.2f}"\nprint(message)',
    },
    {
      title: "A conditional expression picks a value",
      text: "Each line chooses between two values in one expression.",
      code: 'total = 42\nfee = 0 if total >= 50 else 4.99\nprint(fee)\nitems = 1\nprint(f"{items} item{\'\' if items == 1 else \'s\'}")',
    },
  ],

  mistakes: [
    {
      title: "Checking the guard too late",
      text: "The average is calculated before the zero check, so the program fails with `ZeroDivisionError` on line 3 and the guard never gets a chance.",
      code: 'orders = 0\nrevenue = 0\naverage = revenue / orders\nif orders == 0:\n    print("No orders yet")',
      raises: "ZeroDivisionError",
      fix: "Test for the bad case first, and only calculate in the branch where it's safe.",
    },
    {
      title: "An else attached to the wrong if",
      text: "The `else` is indented to line up with the **inner** `if`, so non-members get no message at all.",
      code: 'is_member = False\nmonths_left = 3\nif is_member:\n    if months_left > 0:\n        print("Active member")\n    else:\n        print("Not a member")',
      fix: "Line `else` up with the `if` it belongs to. Indentation decides which decision it completes.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Report an average order safely",
      prompt:
        "Store a summary line in `message`: `No orders yet` when `orders` is 0, `Invalid data` when either value is negative, and otherwise `Average order: ` followed by `revenue / orders` with 2 decimal places. Put the guards first so the division can never fail. Print the message.",
      expectedOutput: "Average order: 41.67\n",
      looksFor: [
        "`message` follows the three rules, for zero orders, negative values and normal data.",
        "The program never divides by zero.",
      ],
      starter: "revenue = 250\norders = 6\n\n# Store message with guards first, then print it.\n",
      task: {
        checks: [
          { kind: "variable", id: "message", name: "message", expected: py.str("Average order: 41.67") },
          { kind: "output", id: "output", label: "Prints the message", expected: "Average order: 41.67\n" },
          { kind: "variant", id: "v-zero", set: { revenue: py.int(0), orders: py.int(0) }, output: "No orders yet\n", tip: "Check orders == 0 before dividing." },
          { kind: "variant", id: "v-negative", set: { revenue: py.int(-10), orders: py.int(2) }, vars: { message: py.str("Invalid data") } },
          { kind: "variant", id: "v-negative-orders", set: { revenue: py.int(100), orders: py.int(-1) }, vars: { message: py.str("Invalid data") } },
          { kind: "variant", id: "v-hidden", hidden: true, set: { revenue: py.int(99), orders: py.int(4) }, vars: { message: py.str("Average order: 24.75") } },
        ],
      },
      hints: [
        'Start with the case that would break the division: if orders == 0: message = "No orders yet".',
        'Next, elif revenue < 0 or orders < 0: message = "Invalid data".',
        'Finally else: message = f"Average order: {revenue / orders:.2f}", then print(message).',
      ],
      answer: 'revenue = 250\norders = 6\n\nif orders == 0:\n    message = "No orders yet"\nelif revenue < 0 or orders < 0:\n    message = "Invalid data"\nelse:\n    message = f"Average order: {revenue / orders:.2f}"\nprint(message)',
      alternatives: ['revenue = 250\norders = 6\nif revenue < 0 or orders < 0:\n    message = "Invalid data"\nelif orders == 0:\n    message = "No orders yet"\nelse:\n    average = revenue / orders\n    message = "Average order: " + f"{average:.2f}"\nprint(message)\n'],
      wrong: [
        { code: 'revenue = 250\norders = 6\naverage = revenue / orders\nif orders == 0:\n    message = "No orders yet"\nelif revenue < 0 or orders < 0:\n    message = "Invalid data"\nelse:\n    message = f"Average order: {average:.2f}"\nprint(message)\n', fails: ["v-zero"], why: "divides before the guard" },
        { code: 'revenue = 250\norders = 6\nif orders == 0:\n    message = "No orders yet"\nelif revenue < 0:\n    message = "Invalid data"\nelse:\n    message = f"Average order: {revenue / orders:.2f}"\nprint(message)\n', fails: ["v-negative-orders"], why: "doesn't check negative orders" },
      ],
    },
    {
      id: "challenge-2",
      title: "Price a cinema ticket",
      prompt:
        "Set `price` from `age`, `is_student` and `day`: under 5 is free (0); 5–17 pays 6; 65 and over pays 7; other adults pay 12, except students, who pay 8 on weekdays and 12 at the weekend (`day` is `Sat` or `Sun`). An age below 0 is invalid: set `price` to `None`. Then print `Ticket: <price>` or `Ticket: invalid age`.",
      expectedOutput: "Ticket: 8\n",
      looksFor: [
        "`price` follows every rule, including the edges 5, 18 and 65, and `None` for a negative age.",
        "Students only get the 8 price on weekdays, and only as adults under 65.",
        "The program prints the ticket line as shown.",
      ],
      starter: 'age = 20\nis_student = True\nday = "Wed"\n\n# Set price, then print the ticket line.\n',
      task: {
        checks: [
          { kind: "variable", id: "price", name: "price", expected: py.int(8) },
          { kind: "output", id: "output", label: "Prints the ticket", expected: "Ticket: 8\n" },
          { kind: "variant", id: "v-weekend", set: { day: py.str("Sat") }, vars: { price: py.int(12) } },
          { kind: "variant", id: "v-child", set: { age: py.int(5), is_student: py.bool(false) }, vars: { price: py.int(6) }, tip: "5 is the first age that pays the child price: under 5 means age < 5." },
          { kind: "variant", id: "v-senior", set: { age: py.int(65), is_student: py.bool(true) }, vars: { price: py.int(7) } },
          { kind: "variant", id: "v-invalid", set: { age: py.int(-1) }, output: "Ticket: invalid age\n", tip: "Guard first: if age < 0, set price = None." },
          { kind: "variant", id: "v-hidden-adult", hidden: true, set: { age: py.int(18), is_student: py.bool(false), day: py.str("Mon") }, vars: { price: py.int(12) } },
          { kind: "variant", id: "v-hidden-baby", hidden: true, set: { age: py.int(0) }, vars: { price: py.int(0) } },
        ],
      },
      hints: [
        "Order the branches: the invalid-age guard, then under 5, under 18, 65 and over, and finally adults.",
        "For adults, nest a decision (or combine with and): is_student and day not in (\"Sat\", \"Sun\") pays 8.",
        'Print with a conditional expression: "invalid age" if price is None else price.',
      ],
      answer: 'age = 20\nis_student = True\nday = "Wed"\n\nif age < 0:\n    price = None\nelif age < 5:\n    price = 0\nelif age < 18:\n    price = 6\nelif age >= 65:\n    price = 7\nelse:\n    if is_student and day not in ("Sat", "Sun"):\n        price = 8\n    else:\n        price = 12\n\nlabel = "invalid age" if price is None else price\nprint("Ticket:", label)',
      alternatives: ['age = 20\nis_student = True\nday = "Wed"\nweekend = day == "Sat" or day == "Sun"\nif age < 0:\n    price = None\nelif age < 5:\n    price = 0\nelif age <= 17:\n    price = 6\nelif age >= 65:\n    price = 7\nelif is_student and not weekend:\n    price = 8\nelse:\n    price = 12\nif price is None:\n    print("Ticket: invalid age")\nelse:\n    print(f"Ticket: {price}")\n'],
      wrong: [
        { code: 'age = 20\nis_student = True\nday = "Wed"\nif age < 0:\n    price = None\nelif age < 5:\n    price = 0\nelif age < 18:\n    price = 6\nelif age >= 65:\n    price = 7\nelif is_student:\n    price = 8\nelse:\n    price = 12\nlabel = "invalid age" if price is None else price\nprint("Ticket:", label)\n', fails: ["v-weekend"], why: "ignores the weekend rule" },
        { code: 'age = 20\nis_student = True\nday = "Wed"\nif is_student and day not in ("Sat", "Sun"):\n    price = 8\nelif age < 0:\n    price = None\nelif age < 5:\n    price = 0\nelif age < 18:\n    price = 6\nelif age >= 65:\n    price = 7\nelse:\n    price = 12\nlabel = "invalid age" if price is None else price\nprint("Ticket:", label)\n', fails: ["v-senior", "v-invalid", "v-hidden-baby"], why: "student rule checked first" },
        { code: 'age = 20\nis_student = True\nday = "Wed"\nif age < 0:\n    price = None\nelif age <= 5:\n    price = 0\nelif age < 18:\n    price = 6\nelif age > 65:\n    price = 7\nelse:\n    if is_student and day not in ("Sat", "Sun"):\n        price = 8\n    else:\n        price = 12\nlabel = "invalid age" if price is None else price\nprint("Ticket:", label)\n', fails: ["v-child", "v-senior"], why: "edges in the wrong band" },
      ],
    },
  ],

  quiz: [
    {
      id: "nested",
      prompt: "What does this program print?",
      code: 'logged_in = False\nis_admin = True\nif logged_in:\n    if is_admin:\n        print("admin panel")\n    else:\n        print("dashboard")\nelse:\n    print("please log in")',
      options: [
        { text: "`please log in`", correct: true, why: "The outer condition is `False`, so the inner decision is never reached, and the outer `else` runs." },
        { text: "`admin panel`", why: "`is_admin` is only checked inside the `logged_in` block, which doesn't run." },
        { text: "`dashboard`", why: "That `else` belongs to the inner `if`, which is skipped entirely." },
        { text: "Nothing", why: "The outer `else` runs when `logged_in` is `False`." },
      ],
    },
    {
      id: "conditional-expression",
      prompt: "`count = 1`. What is `f\"{count} file{'' if count == 1 else 's'}\"`?",
      options: [
        { text: '`"1 file"`', correct: true, why: "The condition is true, so the conditional expression gives `''` and nothing is added." },
        { text: '`"1 files"`', why: "`'s'` is only chosen when the condition `count == 1` is false." },
        { text: '`"1 file\'\'"`', why: "The quotes are part of the Python expression; the value is the empty string." },
        { text: "A `SyntaxError`", why: "Conditional expressions can go anywhere a value can, including inside f-string braces." },
      ],
    },
  ],

  outcomes: [
    "Nest one decision inside another when the second question depends on the first.",
    "Flatten nesting with `and` and `elif` when it gets deep.",
    "Handle invalid or dangerous input first with guard conditions.",
    "Write simple either/or choices as conditional expressions.",
  ],
};
