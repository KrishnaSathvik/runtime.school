/**
 * M03 Operators & Expressions: five lessons (PY-L03-01 … PY-L03-05), data F00 (inline).
 * Each lesson is one operator family. if, lists, and loops are later modules.
 *
 * Version 2: every challenge is a small real calculation (a cart total, a ticket age band, a delivery rule,
 * an allergy check, feature flags) and is re-run with other input values, including boundaries, so a program
 * that prints the expected answer without computing it does not pass.
 */
import { py, type PyValue } from "@/engine/python/values";
import type { PyLesson } from "../model";
import { usesBoolOp, groupsAddition } from "../checks";
import { rerun } from "../beginner-checks";

const out = (expected: string, tip?: string) => ({ kind: "output" as const, id: "output", label: "Prints exactly the expected lines", expected, ...(tip ? { tip } : {}) });
const held = (name: string, expected: PyValue) => ({ kind: "variable" as const, id: name, label: `${name} holds the right value`, name, expected });

export const arithmetic: PyLesson = {
  id: "PY-L03-01",
  version: 2,
  slug: "arithmetic",
  title: "Add, subtract, multiply, divide",
  lede: "Arithmetic operators compute a new number from values you have stored.",
  focus: "Compute a new number with +, -, *, /, //, %, and **.",
  minutes: 14,
  objectives: [
    "Add, subtract, and multiply stored numbers",
    "See that / gives a decimal, while // and % split a whole number",
    "Raise a number to a power with **",
  ],
  requires: ["assignment", "whole-number", "decimal-number", "string-value", "conversion", "print-call", "print-text", "print-number", "print-several", "unquoted-name"],
  teaches: ["arithmetic"],
  blocks: [
    { kind: "text", md: "Programs compute: a cart total, the change from a payment, how many boxes an order needs. `+`, `-`, and `*` compute a new number. Write each operation on its own line for now. `price + shipping` adds the two stored values. The names themselves do not change unless you store the result." },
    {
      kind: "example",
      title: "A total from stored numbers",
      code: 'price = 20\nshipping = 5\nitems = 3\nprint(price + shipping)\nprint(price - shipping)\nprint(items * price)\n',
      output: "25\n15\n60\n",
      note: "Each line does one operation. price is still 20 afterwards.",
    },
    { kind: "text", md: "`/` always gives a decimal, so `8 / 2` prints `4.0`. `//` divides and rounds down to a whole number. `%` is the remainder. Together they split a quantity: how many full boxes, and how many items left over. `**` raises to a power: `2 ** 3` is 2 times 2 times 2.\n\n`+` on text sticks the text together. `\"12\" + \"30\"` is the text `1230`. `int(\"12\") + int(\"30\")` is the number 42. That is why the previous module converts text before you do arithmetic." },
    {
      kind: "example",
      title: "Division, remainder, powers, and text",
      code: 'print(8 / 2)\nprint(8 // 3)\nprint(8 % 3)\nprint(2 ** 3)\nprint("12" + "30")\nprint(int("12") + int("30"))\n',
      output: "4.0\n2\n2\n8\n1230\n42\n",
      note: "8 / 2 is the decimal 4.0. 8 // 3 is 2 whole, and 8 % 3 is the remainder 2. The last two lines are text stuck together, then real addition.",
    },
    { kind: "text", md: "**Mistakes to avoid.** Using `/` when you need a count gives a decimal like `3.4`. Adding numbers that are still text sticks them together instead of adding. And decimals can show a tiny error: `0.1 + 0.2` prints `0.30000000000000004`, because decimals are stored in binary. That is normal, not a bug in your program." },
  ],
  tryIt: {
    id: "try",
    title: "Raise 2 to the third power",
    prompt: "This prints 6, because `*` multiplies. Change the operator so it prints `8`, the value of 2 to the power 3.",
    spec: [],
    starter: "print(2 * 3)\n",
    answer: "print(2 ** 3)\n",
    wrong: [{ code: "print(2 * 3)\n", fails: ["output"], why: "still multiplication" }],
    hints: ["A power uses two asterisks.", "Keep the numbers 2 and 3.", "The operator sits between them."],
    task: { checks: [out("8\n")] },
  },
  challenges: [
    {
      id: "c1",
      title: "Cart total",
      prompt: "A cart has `qty` items at `price` each, plus a flat `shipping` charge. Compute the items cost into `items` and the total into `total`, one operation per line, and print both with labels.",
      spec: [
        ["First lines", "`qty = 3`, `price = 12`, `shipping = 5`. Check runs your program again with other carts"],
        ["Prints", "`Items: 36`, then `Total: 41`"],
      ],
      starter: "qty = 3\nprice = 12\nshipping = 5\n",
      answer: 'qty = 3\nprice = 12\nshipping = 5\nitems = qty * price\ntotal = items + shipping\nprint("Items:", items)\nprint("Total:", total)\n',
      alternatives: ['qty = 3\nprice = 12\nshipping = 5\nitems = price * qty\ntotal = shipping + items\nprint("Items:", items)\nprint("Total:", total)\n'],
      wrong: [
        { code: 'qty = 3\nprice = 12\nshipping = 5\nitems = 36\ntotal = 41\nprint("Items:", items)\nprint("Total:", total)\n', fails: ["v1", "v2", "v3"], why: "the answers are typed in, so another cart still prints 36 and 41" },
        { code: 'qty = 3\nprice = 12\nshipping = 5\nitems = qty * price\ntotal = items\nprint("Items:", items)\nprint("Total:", total)\n', fails: ["output", "total", "v2", "v3"], why: "shipping is never added" },
        { code: 'qty = 3\nprice = 12\nshipping = 5\nitems = qty + price\ntotal = items + shipping\nprint("Items:", items)\nprint("Total:", total)\n', fails: ["output", "total", "v1", "v2", "v3"], why: "the quantity is added to the price instead of multiplying it" },
      ],
      hints: ["The items cost is the quantity times the price.", "Store that in items, then add the shipping to items for the total.", "Print the names, so a different cart prints different numbers."],
      task: {
        checks: [
          out("Items: 36\nTotal: 41\n"),
          held("total", py.int(41)),
          rerun("v1", { qty: 1, price: 40, shipping: 0 }, "Items: 40\nTotal: 40\n"),
          rerun("v2", { qty: 0, price: 12, shipping: 5 }, "Items: 0\nTotal: 5\n"),
          rerun("v3", { qty: 4, price: 7, shipping: 9 }, "Items: 28\nTotal: 37\n"),
        ],
      },
    },
    {
      id: "c2",
      title: "Running time",
      prompt: "A film runs for `minutes` minutes. Print its length as hours and leftover minutes, like `2 h 15 min`.",
      spec: [
        ["First line", "`minutes = 135`. Check runs your program again with other running times"],
        ["Prints", "`2 h 15 min`"],
      ],
      starter: "minutes = 135\n",
      answer: 'minutes = 135\nhours = minutes // 60\nleft = minutes % 60\nprint(hours, "h", left, "min")\n',
      wrong: [
        { code: 'minutes = 135\nhours = minutes / 60\nleft = minutes % 60\nprint(hours, "h", left, "min")\n', fails: ["output", "v1", "v2", "v3"], why: "/ gives 2.25 hours, not whole hours" },
        { code: 'minutes = 135\nhours = minutes % 60\nleft = minutes // 60\nprint(hours, "h", left, "min")\n', fails: ["output", "v1", "v2"], why: "// and % are swapped" },
        { code: 'minutes = 135\nprint(2, "h", 15, "min")\n', fails: ["v1", "v2", "v3"], why: "the answer is typed in, so every film is 2 h 15 min" },
      ],
      hints: ["An hour is 60 minutes.", "One operator gives how many whole times 60 fits. Another gives what is left over.", "Store both, then print them with the h and min labels between."],
      task: {
        checks: [
          out("2 h 15 min\n"),
          rerun("v1", { minutes: 59 }, "0 h 59 min\n"),
          rerun("v2", { minutes: 120 }, "2 h 0 min\n"),
          rerun("v3", { minutes: 61 }, "1 h 1 min\n"),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: "print(8 / 2)\nprint(17 // 5)\nprint(17 % 5)\n", choices: ["4.0\n3\n2", "4\n3\n2", "4.0\n3.4\n2", "4.0\n2\n3"], answer: 0, why: "/ always gives a decimal. 5 fits into 17 three whole times, with 2 left over." },
    { id: "q2", prompt: "What does this print?", program: 'print("12" + "30")\n', choices: ["42", "1230", "12\n30", "An error"], answer: 1, why: "+ on text sticks the characters together. Convert first to add numbers." },
    { id: "q3", prompt: "Which line gives the number of full boxes when 23 items go 6 to a box?", choices: ["23 // 6", "23 / 6", "23 % 6", "23 ** 6"], answer: 0, why: "// keeps the whole number of times 6 fits: 3 boxes. % would give the 5 items left over." },
  ],
  review: ["+ - and * compute a new number. Store the result if you need it later.", "/ gives a decimal. // rounds down to a whole number, and % is the remainder. ** is a power.", "+ on text sticks the text together. Convert with int() or float() before you add numbers that arrived as text. Next: comparing two values."],
};

export const comparison: PyLesson = {
  id: "PY-L03-02",
  version: 2,
  slug: "comparison",
  title: "Compare two values",
  lede: "A comparison asks a question and answers True or False.",
  focus: "Compare two values with ==, !=, <, >, <=, and >=.",
  minutes: 12,
  objectives: [
    "Compare numbers and read True or False",
    "Compare text, including capitals",
    "Tell = (store) from == (compare), and < from <=",
  ],
  requires: ["assignment", "boolean", "string-value", "whole-number", "decimal-number", "arithmetic", "print-call", "print-text", "print-number", "print-several", "unquoted-name", "case-sensitive"],
  teaches: ["comparison"],
  blocks: [
    { kind: "text", md: "Programs ask questions all the time: is this customer old enough, is the cart over the free-shipping line, is the status delivered. `==` asks whether two values are the same. `!=` asks whether they are different. `<`, `>`, `<=`, and `>=` compare order. The answer is `True` or `False`, the values from the previous module.\n\n`=` stores a value. `==` compares. They are different." },
    {
      kind: "example",
      title: "Questions about numbers",
      code: "print(3 < 10)\nprint(3 == 10)\nprint(3 != 10)\nprint(10 >= 10)\n",
      output: "True\nFalse\nTrue\nTrue\n",
      note: "Each line asks one question. Nothing is stored.",
    },
    {
      kind: "example",
      title: "Questions about text",
      code: 'status = "delivered"\nprint(status == "delivered")\nprint(status == "Delivered")\n',
      output: "True\nFalse\n",
      note: "Capitals count. Delivered and delivered are not the same text.",
    },
    { kind: "text", md: "**The boundary matters.** \"Free shipping from 50\" means a total of exactly 50 qualifies, so the test is `total >= 50`, not `total > 50`. Decide which side of the line the boundary value is on, then pick `<` or `<=`. A comparison is a value like any other: you can store it, `adult = age >= 18`, and print it later." },
  ],
  tryIt: {
    id: "try",
    title: "Ask whether the count is 3",
    prompt: "Print whether `count` is equal to 3. The program should print `True`.",
    spec: [],
    starter: "count = 3\nprint(count)\n",
    answer: "count = 3\nprint(count == 3)\n",
    wrong: [{ code: "count = 3\nprint(count)\n", fails: ["output"], why: "prints the number, not the comparison" }],
    hints: ["A comparison uses two equals signs.", "The question goes inside the print.", "Compare the name count with 3."],
    task: { checks: [out("True\n")] },
  },
  challenges: [
    {
      id: "c1",
      title: "Which ticket?",
      prompt: "A cinema sells child tickets to anyone **under 13** and senior tickets to anyone **65 or older**. Print whether `age` gets a child ticket, then whether it gets a senior ticket.",
      spec: [
        ["First line", "`age = 12`. Check runs your program again with other ages, including 13 and 65"],
        ["Prints", "`Child: True`, then `Senior: False`"],
      ],
      starter: "age = 12\n",
      answer: 'age = 12\nprint("Child:", age < 13)\nprint("Senior:", age >= 65)\n',
      alternatives: ['age = 12\nchild = age <= 12\nsenior = age > 64\nprint("Child:", child)\nprint("Senior:", senior)\n'],
      wrong: [
        { code: 'age = 12\nprint("Child:", age <= 13)\nprint("Senior:", age >= 65)\n', fails: ["v1"], why: "a 13-year-old is not under 13" },
        { code: 'age = 12\nprint("Child:", age < 13)\nprint("Senior:", age > 65)\n', fails: ["v2"], why: "someone who is exactly 65 is 65 or older" },
        { code: 'age = 12\nprint("Child:", True)\nprint("Senior:", False)\n', fails: ["v1", "v2"], why: "the answers are typed in instead of compared" },
      ],
      hints: ["Under 13 does not include 13 itself.", "65 or older does include 65.", "Each print has a label and one comparison of age."],
      task: {
        checks: [
          out("Child: True\nSenior: False\n"),
          rerun("v1", { age: 13 }, "Child: False\nSenior: False\n"),
          rerun("v2", { age: 65 }, "Child: False\nSenior: True\n"),
          rerun("v3", { age: 3 }, "Child: True\nSenior: False\n"),
        ],
      },
    },
    {
      id: "c2",
      title: "Within budget",
      prompt: "You can spend up to `budget`. Compute the cost of `qty` items at `price` each, print it, then print whether the cost fits the budget. Spending exactly the budget fits.",
      spec: [
        ["First lines", "`budget = 50`, `price = 12`, `qty = 4`. Check runs your program again with other carts"],
        ["Prints", "`Cost: 48`, then `Fits: True`"],
      ],
      starter: "budget = 50\nprice = 12\nqty = 4\n",
      answer: 'budget = 50\nprice = 12\nqty = 4\ncost = price * qty\nprint("Cost:", cost)\nprint("Fits:", cost <= budget)\n',
      wrong: [
        { code: 'budget = 50\nprice = 12\nqty = 4\ncost = price * qty\nprint("Cost:", cost)\nprint("Fits:", cost < budget)\n', fails: ["v1"], why: "a cost of exactly the budget should fit" },
        { code: 'budget = 50\nprice = 12\nqty = 4\ncost = price * qty\nprint("Cost:", cost)\nprint("Fits:", price <= budget)\n', fails: ["v2"], why: "it compares one item's price, not the whole cost" },
      ],
      hints: ["First work out the cost and store it.", "Then compare the cost with the budget.", "Exactly the budget fits, so the comparison includes equal."],
      task: {
        checks: [
          out("Cost: 48\nFits: True\n"),
          rerun("v1", { budget: 50, price: 12.5, qty: 4 }, "Cost: 50.0\nFits: True\n"),
          rerun("v2", { budget: 50, price: 13, qty: 4 }, "Cost: 52\nFits: False\n"),
          rerun("v3", { budget: 20, price: 9, qty: 0 }, "Cost: 0\nFits: True\n"),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: "total = 50\nprint(total > 50)\nprint(total >= 50)\n", choices: ["False\nTrue", "True\nTrue", "False\nFalse", "True\nFalse"], answer: 0, why: "50 is not greater than 50, but it is greater than or equal to 50." },
    { id: "q2", prompt: "What does this print?", program: 'print("A" == "a")\n', choices: ["True", "False", "A", "An error"], answer: 1, why: "Capitals count, so A and a are not the same text." },
    { id: "q3", prompt: "Which line compares two values?", choices: ["price = 12", "price == 12", "print(price)", "price = price"], answer: 1, why: "== compares. A single = stores." },
  ],
  review: ["==, !=, <, >, <=, and >= answer True or False.", "= stores a value. == compares two values. Decide whether the boundary value counts, then choose < or <=.", "Text comparison cares about capitals. Next: combining two answers with and, or, and not."],
};

export const logicalOperators: PyLesson = {
  id: "PY-L03-03",
  version: 2,
  slug: "logical-operators",
  title: "And, or, and not",
  lede: "and, or, and not combine True and False into one answer.",
  focus: "Combine True and False with and, or, and not.",
  minutes: 12,
  objectives: [
    "Use and when both sides must be True",
    "Use or when either side may be True",
    "Use not to flip True and False",
  ],
  requires: ["comparison", "boolean", "assignment", "whole-number", "print-call", "print-text", "print-number", "print-several", "unquoted-name"],
  teaches: ["logical"],
  blocks: [
    { kind: "text", md: "Real rules have more than one part: free delivery **if** the total is at least 50 **or** you are a member; a game goes ahead **if** it is warm enough **and** not raining. `and` is True only when **both** sides are True. `or` is True when **either** side is True. `not` flips one value: `not True` is False, and `not False` is True.\n\nThese words work on True and False. They are not the arithmetic operators." },
    {
      kind: "example",
      title: "Both, either, and the opposite",
      code: "print(True and False)\nprint(True or False)\nprint(not True)\nprint(not False)\n",
      output: "False\nTrue\nFalse\nTrue\n",
      note: "and needs both. or needs one. not flips the value.",
    },
    {
      kind: "example",
      title: "Two comparisons at once",
      code: "price = 12\nprint(price > 10 and price < 20)\nprint(price < 10 or price == 12)\n",
      output: "True\nTrue\n",
      note: "Each side of and or or is itself a comparison. The whole line is one True or False.",
    },
    { kind: "text", md: "**Mistake to avoid:** write the name on both sides. `price > 10 and < 20` is a syntax error; it has to be `price > 10 and price < 20`. And pick the word from the rule: \"both must hold\" is `and`, \"any one is enough\" is `or`." },
  ],
  tryIt: {
    id: "try",
    title: "Flip the answer",
    prompt: "This prints True. Flip it with `not`, so it prints False.",
    spec: [],
    starter: "print(True)\n",
    answer: "print(not True)\n",
    wrong: [{ code: "print(False)\n", fails: ["flips"], why: "prints False, but it does not use not" }],
    hints: ["not goes in front of a True or False value.", "Keep True in the print.", "The word not comes first."],
    task: { checks: [out("False\n"), usesBoolOp("flips", "Uses not", "not")] },
  },
  challenges: [
    {
      id: "c1",
      title: "Free delivery",
      prompt: "Delivery is free when the order total is **at least 50**, or when the customer is a member. Print whether this order gets free delivery.",
      spec: [
        ["First lines", "`total = 42` and `member = True`. Check runs your program again with other orders"],
        ["Prints", "`Free delivery: True`"],
      ],
      starter: "total = 42\nmember = True\n",
      answer: 'total = 42\nmember = True\nprint("Free delivery:", total >= 50 or member)\n',
      alternatives: ['total = 42\nmember = True\nfree = member or total >= 50\nprint("Free delivery:", free)\n'],
      wrong: [
        { code: 'total = 42\nmember = True\nprint("Free delivery:", total >= 50 and member)\n', fails: ["either", "output", "v1", "v3"], why: "and needs both, but either reason is enough" },
        { code: 'total = 42\nmember = True\nprint("Free delivery:", total > 50 or member)\n', fails: ["v1"], why: "a total of exactly 50 should qualify" },
        { code: 'total = 42\nmember = True\nprint("Free delivery:", member)\n', fails: ["either", "v1", "v3"], why: "the total is never checked" },
      ],
      hints: ["Either reason is enough on its own.", "One side compares the total with 50. The other side is the name member.", "At least 50 includes 50 itself."],
      task: {
        checks: [
          out("Free delivery: True\n"),
          usesBoolOp("either", "Uses or", "or"),
          rerun("v1", { total: 50, member: false }, "Free delivery: True\n"),
          rerun("v2", { total: 49.99, member: false }, "Free delivery: False\n"),
          rerun("v3", { total: 80, member: false }, "Free delivery: True\n"),
        ],
      },
    },
    {
      id: "c2",
      title: "Does the match go ahead?",
      prompt: "An outdoor match goes ahead when the temperature is **from 5 to 30** (both included) and it is **not** raining. Print the answer.",
      spec: [
        ["First lines", "`temp = 18` and `raining = False`. Check runs your program again with other weather, including 5 and 30"],
        ["Prints", "`Match on: True`"],
      ],
      starter: "temp = 18\nraining = False\n",
      answer: 'temp = 18\nraining = False\nprint("Match on:", temp >= 5 and temp <= 30 and not raining)\n',
      alternatives: ['temp = 18\nraining = False\nmild = temp >= 5 and temp <= 30\nprint("Match on:", mild and not raining)\n'],
      wrong: [
        { code: 'temp = 18\nraining = False\nprint("Match on:", temp >= 5 and temp <= 30)\n', fails: ["dry", "v4"], why: "rain is never checked" },
        { code: 'temp = 18\nraining = False\nprint("Match on:", temp > 5 and temp < 30 and not raining)\n', fails: ["v1", "v2"], why: "5 and 30 themselves are allowed" },
        { code: 'temp = 18\nraining = False\nprint("Match on:", temp >= 5 or temp <= 30 and not raining)\n', fails: ["v3", "v4"], why: "with or, any temperature at or above 5 is enough, even in rain or heat" },
      ],
      hints: ["Three things must all hold.", "Write the name on both sides of the temperature range: from 5 up, and 30 down.", "The rain part flips the yes-or-no value raining."],
      task: {
        checks: [
          out("Match on: True\n"),
          usesBoolOp("dry", "Uses not", "not"),
          rerun("v1", { temp: 5, raining: false }, "Match on: True\n"),
          rerun("v2", { temp: 30, raining: false }, "Match on: True\n"),
          rerun("v3", { temp: 31, raining: false }, "Match on: False\n"),
          rerun("v4", { temp: 18, raining: true }, "Match on: False\n"),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: "age = 15\nprint(age >= 13 and age < 18)\nprint(age < 13 or age > 64)\n", choices: ["True\nFalse", "True\nTrue", "False\nFalse", "False\nTrue"], answer: 0, why: "15 is at least 13 and under 18, so and is True. It is neither under 13 nor over 64, so or is False." },
    { id: "q2", prompt: "What does this print?", program: "print(False or True)\n", choices: ["False", "True", "False or True", "An error"], answer: 1, why: "or is True when either side is True." },
    { id: "q3", prompt: "Which line asks whether qty is between 1 and 10, both included?", choices: ["qty >= 1 and qty <= 10", "qty >= 1 and <= 10", "qty >= 1 or qty <= 10", "1 and 10"], answer: 0, why: "Both comparisons need the name. or would be True for every number." },
  ],
  review: ["and is True only when both sides are True.", "or is True when at least one side is True. not flips True and False.", "Write the name on both sides of a range. Next: in and is."],
};

export const membershipAndIdentity: PyLesson = {
  id: "PY-L03-04",
  version: 2,
  slug: "membership-and-identity",
  title: "In and is",
  lede: "in asks whether text contains a piece of text. is asks whether a value is None.",
  focus: "Use in for text, and is for None.",
  minutes: 12,
  objectives: [
    "Ask whether a piece of text appears inside other text",
    "See that capitals still count",
    "Ask whether a name is None",
  ],
  requires: ["logical", "comparison", "string-value", "none-value", "boolean", "assignment", "print-call", "print-text", "print-several", "unquoted-name", "case-sensitive"],
  teaches: ["membership", "identity"],
  blocks: [
    { kind: "text", md: "`in` asks whether the text on the left appears inside the text on the right: is there an @ in this email, does the ingredient list mention peanuts. `\"toy\" in \"toys\"` is True. `\"Toy\" in \"toys\"` is False, because capitals count. `not in` is the opposite question.\n\nThe piece you look for goes on the **left**. `\"SALE\" in subject` asks whether SALE appears in the subject. `subject in \"SALE\"` asks the reverse, which is almost never what you mean." },
    {
      kind: "example",
      title: "A code inside a message",
      code: 'message = "Use WELCOME10 at checkout"\nprint("WELCOME10" in message)\nprint("welcome10" in message)\nprint("SHIP" not in message)\n',
      output: "True\nFalse\nTrue\n",
      note: "The lowercase code is not in the message. SHIP is not in it either, so not in is True.",
    },
    { kind: "text", md: "`is` asks whether a value **is** None. `coupon is None` is True when there is no coupon. `coupon is not None` is True when a coupon was stored. Use `is` with None. Comparing ordinary text still uses `==`." },
    {
      kind: "example",
      title: "Is there a coupon?",
      code: "coupon = None\nprint(coupon is None)\nprint(coupon is not None)\n",
      output: "True\nFalse\n",
      note: "The name holds None, so the first question is True and the second is False.",
    },
  ],
  tryIt: {
    id: "try",
    title: "Is it a sale?",
    prompt: "Print whether `SALE` appears in `subject`.",
    spec: [],
    starter: 'subject = "Weekend SALE: 20% off"\nprint(subject)\n',
    answer: 'subject = "Weekend SALE: 20% off"\nprint("SALE" in subject)\n',
    wrong: [{ code: 'subject = "Weekend SALE: 20% off"\nprint(subject)\n', fails: ["output"], why: "prints the subject, not the question" }],
    hints: ["in sits between the piece you are looking for and the longer text.", "The piece is SALE, in quotes.", "Print the whole question."],
    task: { checks: [out("True\n")] },
  },
  challenges: [
    {
      id: "c1",
      title: "Allergy check",
      prompt: "A bakery label lists its ingredients as one piece of text. Print whether it contains `peanut`, then whether it is free of `milk`.",
      spec: [
        ["First line", "`ingredients = \"flour, sugar, peanuts, salt\"`. Check runs your program again with other labels"],
        ["Prints", "`Peanuts: True`, then `Milk-free: True`"],
      ],
      starter: 'ingredients = "flour, sugar, peanuts, salt"\n',
      answer: 'ingredients = "flour, sugar, peanuts, salt"\nprint("Peanuts:", "peanut" in ingredients)\nprint("Milk-free:", "milk" not in ingredients)\n',
      alternatives: ['ingredients = "flour, sugar, peanuts, salt"\nprint("Peanuts:", "peanut" in ingredients)\nprint("Milk-free:", not "milk" in ingredients)\n'],
      wrong: [
        { code: 'ingredients = "flour, sugar, peanuts, salt"\nprint("Peanuts:", "peanut" in ingredients)\nprint("Milk-free:", "milk" in ingredients)\n', fails: ["output", "v1", "v2", "v3"], why: "the second line asks whether milk is there, not whether it is absent" },
        { code: 'ingredients = "flour, sugar, peanuts, salt"\nprint("Peanuts:", ingredients == "peanut")\nprint("Milk-free:", ingredients != "milk")\n', fails: ["output", "v1", "v3"], why: "== compares the whole label, so peanuts inside a list is never found" },
        { code: 'ingredients = "flour, sugar, peanuts, salt"\nprint("Peanuts:", ingredients in "peanut")\nprint("Milk-free:", "milk" not in ingredients)\n', fails: ["output", "v3"], why: "the pieces are the wrong way round: it asks whether the whole label is inside the word peanut" },
      ],
      hints: ["The piece you look for goes on the left of in.", "\"free of\" is the opposite question.", "Print a label and one question on each line."],
      task: {
        checks: [
          out("Peanuts: True\nMilk-free: True\n"),
          rerun("v1", { ingredients: "oats, milk, honey" }, "Peanuts: False\nMilk-free: False\n"),
          rerun("v2", { ingredients: "rice, water" }, "Peanuts: False\nMilk-free: True\n"),
          rerun("v3", { ingredients: "peanut butter, milk chocolate" }, "Peanuts: True\nMilk-free: False\n"),
        ],
      },
    },
    {
      id: "c2",
      title: "Needs a manual check",
      prompt: "A warehouse checks an order by hand when a coupon was used **or** the delivery note mentions `urgent` (in lowercase). Print whether this order needs a manual check.",
      spec: [
        ["First lines", "`coupon = None` and `note = \"Leave at the back door\"`. Check runs your program again with other orders"],
        ["Prints", "`Manual check: False`"],
      ],
      starter: 'coupon = None\nnote = "Leave at the back door"\n',
      answer: 'coupon = None\nnote = "Leave at the back door"\nprint("Manual check:", coupon is not None or "urgent" in note)\n',
      alternatives: ['coupon = None\nnote = "Leave at the back door"\nused = coupon is not None\nprint("Manual check:", "urgent" in note or used)\n'],
      wrong: [
        { code: 'coupon = None\nnote = "Leave at the back door"\nprint("Manual check:", coupon is None or "urgent" in note)\n', fails: ["output", "v1", "v3"], why: "is None is True when there is no coupon, the opposite of what you need" },
        { code: 'coupon = None\nnote = "Leave at the back door"\nprint("Manual check:", "urgent" in note)\n', fails: ["v1"], why: "the coupon is never checked" },
        { code: 'coupon = None\nnote = "Leave at the back door"\nprint("Manual check:", coupon is not None and "urgent" in note)\n', fails: ["v1", "v2"], why: "and needs both reasons, but either is enough" },
      ],
      hints: ["A coupon was used when the name does not hold None.", "The note part asks whether a piece of text appears in it.", "Either reason is enough."],
      task: {
        checks: [
          out("Manual check: False\n"),
          rerun("v1", { coupon: "WELCOME10", note: "Leave at the back door" }, "Manual check: True\n"),
          rerun("v2", { coupon: null, note: "urgent: call on arrival" }, "Manual check: True\n"),
          rerun("v3", { coupon: null, note: "URGENT please" }, "Manual check: False\n"),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: 'email = "nora_garcia@fastmail.com"\nprint("@" in email)\nprint(".org" in email)\n', choices: ["True\nFalse", "True\nTrue", "False\nFalse", "@\n.org"], answer: 0, why: "The address contains @, but it ends in .com, not .org." },
    { id: "q2", prompt: "What does this print?", program: 'subject = "Weekend SALE"\nprint(subject in "SALE")\n', choices: ["False", "True", "SALE", "An error"], answer: 0, why: "This asks whether the whole subject appears inside the word SALE. It doesn't. The piece you look for goes on the left." },
    { id: "q3", prompt: "What does this print?", program: "coupon = None\nprint(coupon is None)\n", choices: ["True", "False", "None", "An error"], answer: 0, why: "The name holds None, so coupon is None is True." },
  ],
  review: ["in asks whether text contains a piece of text. The piece goes on the left. Capitals count.", "is None asks whether a name holds None. is not None asks the opposite.", "== still compares ordinary values. is is for None. Next: which operation happens first."],
};

export const precedenceAndBitwise: PyLesson = {
  id: "PY-L03-05",
  version: 2,
  slug: "precedence-and-bitwise",
  title: "What happens first",
  lede: "Multiplication happens before addition. Parentheses change that. Bitwise operators work on whole numbers.",
  focus: "Control which operation happens first, and use bitwise operators on whole numbers.",
  minutes: 14,
  objectives: [
    "Predict 2 + 3 * 4 as 14, because * happens first",
    "Use parentheses to add first",
    "Use &, |, ^, ~, <<, and >> on whole numbers",
  ],
  requires: ["arithmetic", "comparison", "logical", "assignment", "whole-number", "print-call", "print-text", "print-number", "print-several", "unquoted-name"],
  teaches: ["precedence", "bitwise"],
  blocks: [
    { kind: "text", md: "On one line, `*` and `/` happen before `+` and `-`. `2 + 3 * 4` is `2 + 12`, which is 14. Parentheses happen first: `(2 + 3) * 4` is `5 * 4`, which is 20. A classic slip is an average: `a + b / 2` halves only `b`. You need `(a + b) / 2`." },
    {
      kind: "example",
      title: "Which part runs first",
      code: "print(2 + 3 * 4)\nprint((2 + 3) * 4)\n",
      output: "14\n20\n",
      note: "Without parentheses, the multiplication runs first. With them, the addition runs first.",
    },
    { kind: "text", md: "**A separate family: bitwise operators.** These work on the binary digits, the bits, of whole numbers. They are not `and` and `or`. `bin(5)` shows 5 in binary as `0b101`, and `bin(3)` is `0b11`, which lines up as `011`.\n\n`&` keeps a 1 only where both numbers have a 1: `101 & 011` is `001`, which is 1. `|` keeps a 1 where either has one: `111`, which is 7. `^` keeps a 1 where exactly one has it: `110`, which is 6.\n\n`<<` shifts the bits left and `>>` shifts them right. `n << 1` is n times 2, and `n >> 1` is `n // 2`. `~n` flips every bit, which for a whole number gives `-(n + 1)`, so `~5` is -6. Bitwise operators come after `+` and `-` in the order, so use parentheses when you mix them." },
    {
      kind: "example",
      title: "Operators on bits",
      code: "print(bin(5))\nprint(bin(3))\nprint(5 & 3)\nprint(5 | 3)\nprint(5 ^ 3)\nprint(~5)\nprint(1 << 2)\nprint(8 >> 1)\n",
      output: "0b101\n0b11\n1\n7\n6\n-6\n4\n4\n",
      note: "bin shows the bits that &, |, and ^ compare. 1 << 2 is 4, which is 1 doubled twice. 8 >> 1 is 4. ~5 is -6.",
    },
    { kind: "text", md: "**Where bits are used.** One whole number can hold several yes-or-no settings, one per bit. With gift wrap as 1 and express as 4, the number 5 (`101`) means both are on. `options & 4` is 4 when the express bit is on and 0 when it is off. `options | 1` switches gift wrap on, and leaves it on if it already was, which `options + 1` would not do." },
  ],
  tryIt: {
    id: "try",
    title: "Add first",
    prompt: "This prints 14, because the multiplication runs first. Add parentheses so the addition runs first and the program prints 20.",
    spec: [],
    starter: "print(2 + 3 * 4)\n",
    answer: "print((2 + 3) * 4)\n",
    wrong: [{ code: "print(2 + 3 * 4)\n", fails: ["output"], why: "the multiplication still runs first" }],
    hints: ["Parentheses around an addition make that addition happen first.", "The addition is 2 + 3.", "The multiplication by 4 stays outside the parentheses."],
    task: { checks: [out("20\n")] },
  },
  challenges: [
    {
      id: "c1",
      title: "Shipping on every order",
      prompt: "A business sends `orders` separate orders. Each one costs `item` plus `shipping`. Print the total in **one** expression, with the addition happening before the multiplication.",
      spec: [
        ["First lines", "`orders = 4`, `item = 10`, `shipping = 2`. Check runs your program again with other values"],
        ["Prints", "`48`"],
      ],
      starter: "orders = 4\nitem = 10\nshipping = 2\nprint(orders * item + shipping)\n",
      answer: "orders = 4\nitem = 10\nshipping = 2\nprint(orders * (item + shipping))\n",
      alternatives: ["orders = 4\nitem = 10\nshipping = 2\nprint((item + shipping) * orders)\n"],
      wrong: [
        { code: "orders = 4\nitem = 10\nshipping = 2\nprint(orders * item + shipping)\n", fails: ["output", "grouped", "v1", "v2"], why: "this is 42: the multiplication runs first, then shipping is added once" },
        { code: "orders = 4\nitem = 10\nshipping = 2\nprint(orders * item + orders * shipping)\n", fails: ["grouped"], why: "right total, but the addition is not grouped" },
      ],
      hints: ["The starter multiplies first, then adds shipping once.", "Each order's cost is the item plus its shipping. Group that.", "Multiply orders by the grouped sum."],
      task: {
        checks: [
          out("48\n"),
          groupsAddition("grouped", "Adds before multiplying", "Put the addition in parentheses."),
          rerun("v1", { orders: 3, item: 7, shipping: 3 }, "30\n"),
          rerun("v2", { orders: 2, item: 25, shipping: 5 }, "60\n"),
        ],
      },
    },
    {
      id: "c2",
      title: "Gift options in one number",
      prompt: "An order stores its options as bits: **1** means gift wrap and **4** means express. Print whether express is on, whether gift wrap is on, and then the options with gift wrap switched on.",
      spec: [
        ["First line", "`options = 4`. Check runs your program again with other option numbers"],
        ["Prints", "`Express: True`, `Gift wrap: False`, `With gift wrap: 5`"],
      ],
      starter: "options = 4\n",
      answer: 'options = 4\nprint("Express:", options & 4 == 4)\nprint("Gift wrap:", options & 1 == 1)\nprint("With gift wrap:", options | 1)\n',
      alternatives: ['options = 4\nprint("Express:", (options & 4) != 0)\nprint("Gift wrap:", (options & 1) != 0)\nprint("With gift wrap:", options | 1)\n'],
      wrong: [
        { code: 'options = 4\nprint("Express:", options & 4 == 4)\nprint("Gift wrap:", options & 1 == 1)\nprint("With gift wrap:", options + 1)\n', fails: ["v1", "v3"], why: "adding 1 to options that already include gift wrap changes another bit" },
        { code: 'options = 4\nprint("Express:", options >= 4)\nprint("Gift wrap:", options & 1 == 1)\nprint("With gift wrap:", options | 1)\n', fails: ["v2"], why: "a number of 4 or more doesn't mean the express bit is on (2 + 8 is 10)" },
        { code: 'options = 4\nprint("Express:", options == 4)\nprint("Gift wrap:", options == 1)\nprint("With gift wrap:", options | 1)\n', fails: ["v1"], why: "== is only True when that one option is on and nothing else" },
      ],
      hints: ["& with a single bit's value keeps only that bit: the result is the bit's value, or 0.", "Compare that result with the bit's value to get True or False.", "| switches a bit on and leaves it on if it already was."],
      task: {
        checks: [
          out("Express: True\nGift wrap: False\nWith gift wrap: 5\n"),
          rerun("v1", { options: 5 }, "Express: True\nGift wrap: True\nWith gift wrap: 5\n"),
          rerun("v2", { options: 10 }, "Express: False\nGift wrap: False\nWith gift wrap: 11\n"),
          rerun("v3", { options: 1 }, "Express: False\nGift wrap: True\nWith gift wrap: 1\n"),
          rerun("v4", { options: 0 }, "Express: False\nGift wrap: False\nWith gift wrap: 1\n"),
        ],
      },
    },
  ],
  concept: [
    { id: "q1", prompt: "What does this print?", program: "a = 80\nb = 90\nprint(a + b / 2)\nprint((a + b) / 2)\n", choices: ["125.0\n85.0", "85.0\n85.0", "125\n85", "85.0\n125.0"], answer: 0, why: "Without parentheses only b is halved: 80 + 45.0. With them, the sum is halved: 170 / 2." },
    { id: "q2", prompt: "What does this print?", program: "print(5 & 3)\nprint(5 and 3)\n", choices: ["1\n3", "1\n1", "True\nTrue", "8\n3"], answer: 0, why: "& compares bits: 101 & 011 is 001. and is a different operator: it is not about bits, and here it gives back 3." },
    { id: "q3", prompt: "What does this print?", program: "print(~5)\n", choices: ["-5", "-6", "5", "4"], answer: 1, why: "~n is -(n + 1), so ~5 is -6." },
  ],
  review: ["* and / happen before + and -. Parentheses happen first, so an average needs them.", "& | and ^ combine bits of whole numbers. They are not and, or, or +.", "bin(n) shows the bits. << 1 doubles, >> 1 is // 2, and ~n is -(n + 1). Next module: choosing what to run with if."],
};

export const m03Lessons: PyLesson[] = [arithmetic, comparison, logicalOperators, membershipAndIdentity, precedenceAndBitwise];
