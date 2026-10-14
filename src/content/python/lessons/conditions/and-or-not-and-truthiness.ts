import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const andOrNotAndTruthiness: PyLesson = {
  slug: "and-or-not-and-truthiness",
  ref: "python:and-or-not-and-truthiness",
  module: "conditions",
  number: 4,
  title: "and, or, not and truthiness",
  level: "beginner",
  summary:
    "Combine conditions with `and`, `or` and `not`, know which one Python works out first, and use truthiness: the rule that empty and zero values count as false.",

  sections: [
    {
      label: "combining conditions",
      blocks: [
        {
          kind: "p",
          text: "`a and b` is `True` only when **both** are true. `a or b` is `True` when **at least one** is true. `not a` flips `True` to `False` and back. These let one `if` express a whole rule.",
        },
        { kind: "code", code: 'if age >= 18 and income >= 20000 and not has_defaulted:\n    print("Eligible")' },
        {
          kind: "p",
          text: "When they're mixed, `not` is worked out first, then `and`, then `or`, much like `*` before `+`. So `a or b and c` means `a or (b and c)`. Add brackets whenever you mix `and` and `or`, so nobody has to remember.",
        },
      ],
    },
    {
      label: "short-circuiting",
      blocks: [
        {
          kind: "p",
          text: "Python stops as soon as it knows the answer. In `a and b`, if `a` is false, `b` is never evaluated; in `a or b`, if `a` is true, `b` is skipped. That's useful for guards: `orders > 0 and revenue / orders > 10` never divides by zero, because the division is skipped when there are no orders.",
        },
      ],
    },
    {
      label: "truthiness",
      blocks: [
        {
          kind: "p",
          text: "A condition doesn't have to be a boolean. Python treats some values as false: `0`, `0.0`, the empty string `\"\"`, `None` (next lesson), and empty collections. Everything else counts as true, including `\" \"` (a space) and the text `\"0\"`. `bool(value)` shows how a value will be treated.",
        },
        { kind: "code", code: 'nickname = ""\nif nickname:\n    print("Hi", nickname)\nelse:\n    print("Hi there")' },
        {
          kind: "p",
          text: "`and` and `or` actually return one of their operands rather than `True`/`False`: `nickname or \"Guest\"` gives `nickname` if it's non-empty, otherwise `\"Guest\"`. That's a common way to supply a default.",
        },
      ],
    },
  ],

  example: {
    caption: "A loan rule with three parts. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'age = 34\nincome = 28000\nhas_defaulted = False\n\neligible = age >= 18 and income >= 20000 and not has_defaulted\nprint("Eligible:", eligible)\n\nnickname = ""\nprint("Hello,", nickname or "Guest")',
  },

  walkthrough: [
    {
      title: "and needs both, or needs one",
      text: "The weekend is Saturday or Sunday; free delivery here needs a large order **and** a member.",
      code: 'day = "Sat"\ntotal = 80\nmember = False\nprint(day == "Sat" or day == "Sun")\nprint(total >= 50 and member)\nprint(not member)',
    },
    {
      title: "and before or, unless you add brackets",
      text: "The first line is read as `True or (False and False)`, which is `True`. The brackets in the second force the `or` first.",
      code: "a = True\nb = False\nc = False\nprint(a or b and c)\nprint((a or b) and c)",
    },
    {
      title: "Short-circuiting skips the risky part",
      text: "With no orders, `orders > 0` is `False`, so Python never evaluates the division.",
      code: "orders = 0\nrevenue = 0\nbig_spender = orders > 0 and revenue / orders > 10\nprint(big_spender)",
    },
    {
      title: "Truthy and falsy values",
      text: "Zero and empty text are false; any other number and any non-empty text, even `\"0\"` or a space, are true.",
      code: 'print(bool(0), bool(0.0), bool(""))\nprint(bool(7), bool("0"), bool(" "))\nname = ""\nprint(name or "Guest")',
    },
  ],

  mistakes: [
    {
      title: "Writing or with only one comparison",
      text: "This reads as `(day == \"Sat\") or (\"Sun\")`. The non-empty string `\"Sun\"` is truthy, so the condition is true for every day.",
      code: 'day = "Mon"\nif day == "Sat" or "Sun":\n    print("Weekend")\nelse:\n    print("Weekday")',
      fix: 'Repeat the comparison: `day == "Sat" or day == "Sun"`.',
    },
    {
      title: "Mixing and and or without brackets",
      text: "The rule is “a member, on a weekend”. Without brackets this means `day == \"Sat\" or (day == \"Sun\" and member)`, so a non-member gets the deal on Saturday.",
      code: 'day = "Sat"\nmember = False\nprint(day == "Sat" or day == "Sun" and member)',
      fix: 'Bracket the `or`: `(day == "Sat" or day == "Sun") and member`.',
    },
    {
      title: "Dividing before checking",
      text: "With the checks in this order, the division runs first and fails with `ZeroDivisionError` before `orders > 0` is ever looked at.",
      code: "orders = 0\nrevenue = 0\nprint(revenue / orders > 10 and orders > 0)",
      raises: "ZeroDivisionError",
      fix: "Put the guard first: `orders > 0 and revenue / orders > 10`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Decide loan eligibility",
      prompt:
        "An applicant is eligible when they are at least 18, earn at least 20000, and have **not** defaulted on a loan before. Store the answer in `eligible` using `and`/`not`, and print `Approved` or `Declined` with `if`/`else`. Check answer tries applicants who fail each rule.",
      expectedOutput: "Eligible: True\nApproved\n",
      looksFor: [
        "`eligible` is `True` only when all three rules hold, including exactly 18 and exactly 20000.",
        "The program prints `Eligible:` with the answer, then `Approved` or `Declined`.",
      ],
      starter: "age = 34\nincome = 28000\nhas_defaulted = False\n\n# Store eligible, then print it and Approved/Declined.\n",
      task: {
        checks: [
          { kind: "variable", id: "eligible", name: "eligible", expected: py.bool(true) },
          { kind: "output", id: "output", label: "Prints the decision", expected: "Eligible: True\nApproved\n" },
          { kind: "variant", id: "v-young", set: { age: py.int(17) }, output: "Eligible: False\nDeclined\n" },
          { kind: "variant", id: "v-defaulted", set: { has_defaulted: py.bool(true) }, vars: { eligible: py.bool(false) }, tip: "Someone who has defaulted is not eligible: use not has_defaulted." },
          { kind: "variant", id: "v-edges", set: { age: py.int(18), income: py.int(20000) }, vars: { eligible: py.bool(true) }, tip: "“At least” includes the edge: use >=." },
          { kind: "variant", id: "v-hidden", hidden: true, set: { income: py.int(19999) }, vars: { eligible: py.bool(false) } },
        ],
      },
      hints: [
        "Write each rule as a comparison: age >= 18, income >= 20000, not has_defaulted.",
        "Join them with and: eligible = age >= 18 and income >= 20000 and not has_defaulted.",
        'if eligible: print("Approved") else: print("Declined").',
      ],
      answer: 'age = 34\nincome = 28000\nhas_defaulted = False\n\neligible = age >= 18 and income >= 20000 and not has_defaulted\nprint("Eligible:", eligible)\nif eligible:\n    print("Approved")\nelse:\n    print("Declined")',
      wrong: [
        { code: 'age = 34\nincome = 28000\nhas_defaulted = False\neligible = age >= 18 and income >= 20000 or not has_defaulted\nprint("Eligible:", eligible)\nif eligible:\n    print("Approved")\nelse:\n    print("Declined")\n', fails: ["v-young", "v-defaulted", "v-hidden"], why: "or instead of and" },
        { code: 'age = 34\nincome = 28000\nhas_defaulted = False\neligible = age >= 18 and income >= 20000 and has_defaulted\nprint("Eligible:", eligible)\nif eligible:\n    print("Approved")\nelse:\n    print("Declined")\n', fails: ["eligible", "output", "v-defaulted", "v-edges"], why: "forgot not" },
        { code: 'age = 34\nincome = 28000\nhas_defaulted = False\neligible = age > 18 and income > 20000 and not has_defaulted\nprint("Eligible:", eligible)\nif eligible:\n    print("Approved")\nelse:\n    print("Declined")\n', fails: ["v-edges"], why: "> excludes the edges" },
      ],
    },
    {
      id: "challenge-2",
      title: "Greet with a fallback name",
      prompt:
        "A profile has an optional `nickname` (the empty string when not set) and a `first_name`. Store the name to greet in `display_name`: the nickname with spaces stripped if there is one, otherwise the first name. Also store in `has_phone` whether `phone` contains anything other than spaces. Print the two lines shown.",
      expectedOutput: "Hello, Ada!\nHas phone: False\n",
      looksFor: [
        "`display_name` is the stripped nickname when it isn't empty, otherwise `first_name`.",
        "A nickname of only spaces counts as not set.",
        "`has_phone` is `True` only when `phone` has something besides spaces.",
      ],
      starter: 'first_name = "Ada"\nnickname = ""\nphone = "   "\n\n# Store display_name and has_phone, then print them.\n',
      task: {
        checks: [
          { kind: "variable", id: "display", name: "display_name", expected: py.str("Ada") },
          { kind: "variable", id: "phone", name: "has_phone", expected: py.bool(false), tip: "bool(phone.strip()) is False for blank text and True otherwise." },
          { kind: "output", id: "output", label: "Prints the greeting and the phone check", expected: "Hello, Ada!\nHas phone: False\n" },
          { kind: "variant", id: "v-nick", set: { nickname: py.str(" Ace ") }, output: "Hello, Ace!\nHas phone: False\n" },
          { kind: "variant", id: "v-spaces", set: { nickname: py.str("   ") }, vars: { display_name: py.str("Ada") }, tip: "A nickname of only spaces is empty once stripped: strip before testing it." },
          { kind: "variant", id: "v-phone", set: { phone: py.str(" 020 7946 0018") }, vars: { has_phone: py.bool(true) } },
          { kind: "variant", id: "v-hidden", hidden: true, set: { first_name: py.str("Grace"), nickname: py.str("Amazing Grace"), phone: py.str("") }, vars: { display_name: py.str("Amazing Grace"), has_phone: py.bool(false) } },
        ],
      },
      hints: [
        "Strip the nickname first: an empty string is falsy, so it can be used directly as a condition.",
        'display_name = nickname.strip() or first_name gives the first non-empty value.',
        'has_phone = bool(phone.strip()). Then print(f"Hello, {display_name}!") and print("Has phone:", has_phone).',
      ],
      answer: 'first_name = "Ada"\nnickname = ""\nphone = "   "\n\ndisplay_name = nickname.strip() or first_name\nhas_phone = bool(phone.strip())\nprint(f"Hello, {display_name}!")\nprint("Has phone:", has_phone)',
      alternatives: ['first_name = "Ada"\nnickname = ""\nphone = "   "\nif nickname.strip():\n    display_name = nickname.strip()\nelse:\n    display_name = first_name\nhas_phone = phone.strip() != ""\nprint(f"Hello, {display_name}!")\nprint("Has phone:", has_phone)\n'],
      wrong: [
        { code: 'first_name = "Ada"\nnickname = ""\nphone = "   "\ndisplay_name = nickname or first_name\nhas_phone = bool(phone.strip())\nprint(f"Hello, {display_name}!")\nprint("Has phone:", has_phone)\n', fails: ["v-nick", "v-spaces"], why: "didn't strip the nickname" },
        { code: 'first_name = "Ada"\nnickname = ""\nphone = "   "\ndisplay_name = nickname.strip() or first_name\nhas_phone = bool(phone)\nprint(f"Hello, {display_name}!")\nprint("Has phone:", has_phone)\n', fails: ["phone", "output", "v-nick"], why: "a string of spaces is truthy" },
      ],
    },
  ],

  quiz: [
    {
      id: "precedence",
      prompt: "What does this program print?",
      code: "print(True or False and False)\nprint(not True or True)",
      options: [
        { text: "`True`, then `True`", correct: true, why: "`and` runs before `or`: `True or (False and False)` is `True`. `not` runs first in the second line: `(not True) or True` is `True`." },
        { text: "`False`, then `True`", why: "That would be `(True or False) and False`. Without brackets, `and` is evaluated before `or`." },
        { text: "`True`, then `False`", why: "`not` applies only to the value right after it: `(not True) or True`, which is `True`." },
        { text: "`False`, then `False`", why: "Work out `not` first, then `and`, then `or`." },
      ],
    },
    {
      id: "truthy",
      prompt: "Which value makes `if value:` run its block?",
      options: [
        { text: '`"0"`', correct: true, why: "Any non-empty string is truthy, even one that spells zero." },
        { text: "`0`", why: "The number zero is falsy." },
        { text: '`""`', why: "The empty string is falsy." },
        { text: "`0.0`", why: "Zero as a float is falsy too." },
      ],
    },
  ],

  outcomes: [
    "Combine conditions with `and`, `or` and `not`, adding brackets when they're mixed.",
    "Use short-circuiting to guard a risky check, such as a division.",
    "Predict which values are truthy and which are falsy.",
    "Supply a default with `value or default`.",
  ],
};
