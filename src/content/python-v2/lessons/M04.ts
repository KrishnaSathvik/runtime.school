/**
 * M04 Conditional Logic: five lessons (PY-L04-01 … PY-L04-05).
 * if, then elif/else, then an if inside an if, then values that count as false, then a one-line choice and match.
 *
 * Version 2: every challenge is a decision with boundaries (a reorder level, a fee cap, grade bands, a return
 * window, parking rules, a display-name fallback, plural labels, delivery estimates). Check re-runs the program
 * with other input values on both sides of each boundary, so a program without the decision cannot pass.
 */
import type { PyLesson } from "../model";
import { usesBareTest, usesElif, usesElse, usesIf, usesIfExpr, usesMatch, usesNestedIf } from "../checks";
import { rerun } from "../beginner-checks";

const out = (expected: string) => ({ kind: "output" as const, id: "output", label: "Prints exactly the expected lines", expected });
const branch = usesIf("branch", "Uses if");
const other = usesElse("other", "Uses else");
const mid = usesElif("mid", "Uses elif");
const bare = usesBareTest("bare", "Uses the value itself as the test");
const inside = usesNestedIf("inside", "Uses an if inside an if");
const picked = usesIfExpr("picked", "Uses a one-line if else");
const matched = usesMatch("matched", "Uses match");

const base = ["assignment", "whole-number", "string-value", "boolean", "comparison", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent"] as const;

export const m04Lessons: PyLesson[] = [
  {
    id: "PY-L04-01",
    version: 2,
    slug: "if-statement",
    title: "Choose with if",
    lede: "if runs the indented lines only when its test is true. The next line at the left still runs.",
    focus: "Run indented lines only when a test is true.",
    minutes: 12,
    objectives: ["Write an if whose test is a comparison", "See that a false test skips only the indented lines", "Leave the following line at the left edge"],
    requires: [...base, "arithmetic", "reassignment"],
    teaches: ["if-statement"],
    blocks: [
      { kind: "text", md: "Until now every line ran, every time. Real programs react to their data: warn when stock is low, cap a fee, ship free over a threshold. `if` asks a question. When the answer is true, Python runs the lines that are indented under it. When the answer is false, it skips those lines.\n\nThe `if` line ends with a colon. The next line that starts at the left edge runs either way. Indenting (four spaces) is how Python knows which lines belong to the `if`." },
      {
        kind: "example",
        title: "A test that is true",
        code: 'price = 20\nif price >= 15:\n    print("Ships free")\nprint("Done")\n',
        output: "Ships free\nDone\n",
        note: "20 is at least 15, so the indented print runs. Done is at the left edge, so it runs too.",
      },
      {
        kind: "example",
        title: "A test that is false",
        code: 'qty = 0\nif qty > 0:\n    print("In the box")\nprint("Done")\n',
        output: "Done\n",
        note: "0 is not greater than 0, so the indented line is skipped. Done still prints.",
      },
      { kind: "text", md: "An `if` can also **change a value** instead of printing. Compute something, then let an `if` correct it when a rule applies, and print the result once, at the left edge, after the `if`.\n\n**Mistakes to avoid:** a missing colon at the end of the `if` line is a syntax error. Forgetting to indent the line under it is an `IndentationError`. Indenting the final print by accident moves it inside the `if`, so it only prints some of the time." },
    ],
    tryIt: {
      id: "try",
      title: "Make the test true",
      prompt: "This skips the indented line, because 12 is not greater than 20. Change the number in the test so it prints `Review`.",
      spec: [],
      starter: 'price = 12\nif price > 20:\n    print("Review")\n',
      answer: 'price = 12\nif price > 10:\n    print("Review")\n',
      wrong: [{ code: 'price = 12\nprint("Review")\n', fails: ["branch"], why: "prints the line, but there is no if" }],
      hints: ["The indented line runs only when the test is true.", "12 has to be greater than the number you compare with.", "The number on the right of > should be smaller than 12."],
      task: { checks: [out("Review\n"), branch] },
    },
    challenges: [
      {
        id: "c1",
        title: "Low stock warning",
        prompt: "A shop reorders a product when its stock falls to the reorder level **or below**. Always print the stock. Under it, print `Reorder now` only when a reorder is needed.",
        spec: [
          ["First lines", "`stock = 3` and `reorder_level = 5`. Check runs your program again with other stock counts, including exactly the reorder level"],
          ["Prints", "`Stock: 3`, then `Reorder now`"],
        ],
        starter: "stock = 3\nreorder_level = 5\n",
        answer: 'stock = 3\nreorder_level = 5\nprint("Stock:", stock)\nif stock <= reorder_level:\n    print("Reorder now")\n',
        wrong: [
          { code: 'stock = 3\nreorder_level = 5\nprint("Stock:", stock)\nprint("Reorder now")\n', fails: ["branch", "v2"], why: "Reorder now prints even when there is plenty of stock" },
          { code: 'stock = 3\nreorder_level = 5\nprint("Stock:", stock)\nif stock < reorder_level:\n    print("Reorder now")\n', fails: ["v1"], why: "stock exactly at the reorder level also needs a reorder" },
        ],
        hints: ["The stock line prints every time, so it is not inside the if.", "Falling to the level counts, so the test includes equal.", "Only the warning is indented under the if."],
        task: {
          checks: [
            out("Stock: 3\nReorder now\n"),
            branch,
            rerun("v1", { stock: 5 }, "Stock: 5\nReorder now\n"),
            rerun("v2", { stock: 6 }, "Stock: 6\n"),
            rerun("v3", { stock: 0, reorder_level: 2 }, "Stock: 0\nReorder now\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "A capped late fee",
        prompt: "A library charges 2 per day late, but never more than 20 for one book. Compute the fee, let an `if` cap it, then print it once.",
        spec: [
          ["First line", "`days_late = 3`. Check runs your program again with other numbers of days"],
          ["Prints", "`Fee: 6`"],
        ],
        starter: "days_late = 3\n",
        answer: 'days_late = 3\nfee = days_late * 2\nif fee > 20:\n    fee = 20\nprint("Fee:", fee)\n',
        alternatives: ['days_late = 3\nfee = days_late * 2\nif days_late > 10:\n    fee = 20\nprint("Fee:", fee)\n'],
        wrong: [
          { code: 'days_late = 3\nfee = days_late * 2\nprint("Fee:", fee)\n', fails: ["branch", "v1", "v3"], why: "there is no cap, so a very late book costs more than 20" },
          { code: 'days_late = 3\nfee = days_late * 2\nif fee > 20:\n    fee = 20\n    print("Fee:", fee)\n', fails: ["output", "v2", "v4"], why: "the print is indented, so it only runs when the fee was capped" },
          { code: 'days_late = 3\nfee = days_late * 2\nif days_late > 20:\n    fee = 20\nprint("Fee:", fee)\n', fails: ["v1", "v3"], why: "it compares days with 20, not the fee" },
        ],
        hints: ["Start with the plain fee: days times 2.", "If that is over the cap, store the cap in the same name instead.", "The print sits at the left edge after the if, so it runs either way."],
        task: {
          checks: [
            out("Fee: 6\n"),
            branch,
            rerun("v1", { days_late: 15 }, "Fee: 20\n"),
            rerun("v2", { days_late: 10 }, "Fee: 20\n"),
            rerun("v3", { days_late: 11 }, "Fee: 20\n"),
            rerun("v4", { days_late: 0 }, "Fee: 0\n"),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: 'fee = 24\nif fee > 20:\n    fee = 20\nprint(fee)\n', choices: ["20", "24", "24\n20", "(nothing)"], answer: 0, why: "24 is over 20, so the indented line stores 20. The print at the left edge then shows the new value." },
      { id: "q2", prompt: "What does this print?", program: 'price = 5\nif price > 10:\n    print("Yes")\nprint("No")\n', choices: ["Yes\nNo", "No", "Yes", "(nothing)"], answer: 1, why: "5 is not greater than 10, so Yes is skipped. No is at the left edge, so it prints." },
      { id: "q3", prompt: "A program has `if price > 10` with no colon, then an indented print. What happens?", choices: ["A syntax error: the if line needs a colon", "It prints when price is over 10", "It always prints", "It never prints, but runs"], answer: 0, why: "The colon marks where the test ends and the indented block begins. Without it Python can't read the file." },
    ],
    review: ["if runs its indented lines only when the test is true.", "A false test skips those lines and nothing else. A line at the left edge runs either way.", "An if can correct a value, and one print after it shows the result. Next: else and elif for the other cases."],
  },
  {
    id: "PY-L04-02",
    version: 2,
    slug: "elif-and-else",
    title: "elif and else",
    lede: "elif tries another test. else runs when every test above it was false.",
    focus: "Choose among branches with elif and else.",
    minutes: 14,
    objectives: ["Add an else for the case the if skipped", "Chain another test with elif", "Order the tests so the right branch runs first"],
    requires: [...base, "if-statement", "arithmetic", "precedence", "decimal-number", "reassignment"],
    teaches: ["else-clause"],
    blocks: [
      { kind: "text", md: "An `if` by itself does nothing when the test is false. `else` is the branch for that case. It has no test of its own.\n\n`elif` means \"else, if\". Python tries it only when the `if` above was false. Only one of the branches runs: the **first** one whose test is true." },
      {
        kind: "example",
        title: "else when the count is zero",
        code: 'qty = 0\nif qty > 0:\n    print("A few")\nelse:\n    print("None yet")\n',
        output: "None yet\n",
        note: "The if is false, so else runs.",
      },
      {
        kind: "example",
        title: "Three labels for a status",
        code: 'status = "packing"\nif status == "delivered":\n    print("Send")\nelif status == "packing":\n    print("Wait")\nelse:\n    print("Check")\n',
        output: "Wait\n",
        note: "delivered fails, packing matches, and Check is never reached.",
      },
      { kind: "text", md: "**Order matters with bands.** Because the first true test wins, check the strictest band first. With a score of 95, `if score >= 70` would be true before `score >= 90` is ever tried. Put `>= 90` first, then `>= 80`, and so on down." },
    ],
    tryIt: {
      id: "try",
      title: "Add the empty case",
      prompt: "Nothing prints, because qty is 0. Add an `else` that prints `None yet`.",
      spec: [],
      starter: 'qty = 0\nif qty > 0:\n    print("A few")\n',
      answer: 'qty = 0\nif qty > 0:\n    print("A few")\nelse:\n    print("None yet")\n',
      wrong: [{ code: 'qty = 0\nif qty > 0:\n    print("A few")\nprint("None yet")\n', fails: ["other"], why: "None yet is not an else, so it would also print when qty is above 0" }],
      hints: ["else comes after the if, at the same indent as if.", "else has a colon and no test.", "None yet is indented under else."],
      task: { checks: [out("None yet\n"), other] },
    },
    challenges: [
      {
        id: "c1",
        title: "Grade from a score",
        prompt: "Turn an exam score into a grade: 90 and up is `A`, 80 and up is `B`, 70 and up is `C`, anything lower is `F`. Print `Grade:` and the letter.",
        spec: [
          ["First line", "`score = 84`. Check runs your program again with other scores, including every boundary"],
          ["Prints", "`Grade: B`"],
        ],
        starter: "score = 84\n",
        answer: 'score = 84\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "F"\nprint("Grade:", grade)\n',
        alternatives: ['score = 84\nif score >= 90:\n    print("Grade: A")\nelif score >= 80:\n    print("Grade: B")\nelif score >= 70:\n    print("Grade: C")\nelse:\n    print("Grade: F")\n'],
        wrong: [
          { code: 'score = 84\nif score >= 70:\n    grade = "C"\nelif score >= 80:\n    grade = "B"\nelif score >= 90:\n    grade = "A"\nelse:\n    grade = "F"\nprint("Grade:", grade)\n', fails: ["output", "v1", "v2", "v5"], why: "the loosest band is tested first, so every passing score is a C" },
          { code: 'score = 84\nif score > 90:\n    grade = "A"\nelif score > 80:\n    grade = "B"\nelif score > 70:\n    grade = "C"\nelse:\n    grade = "F"\nprint("Grade:", grade)\n', fails: ["v1", "v3"], why: "a score of exactly 90 or 70 lands in the band below" },
        ],
        hints: ["Only the first true test runs, so start with the highest band.", "\"90 and up\" includes 90.", "Store the letter in each branch, then print it once after the whole if."],
        task: {
          checks: [
            out("Grade: B\n"),
            branch,
            mid,
            other,
            rerun("v1", { score: 90 }, "Grade: A\n"),
            rerun("v2", { score: 89 }, "Grade: B\n"),
            rerun("v3", { score: 70 }, "Grade: C\n"),
            rerun("v4", { score: 69 }, "Grade: F\n"),
            rerun("v5", { score: 100 }, "Grade: A\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Shipping by weight",
        prompt: "A courier charges 5 for parcels up to 2 kg. Up to 10 kg it charges 5 plus 2 for every kg over 2. Heavier parcels can't be sent; print `Freight only` for them instead of a price.",
        spec: [
          ["First line", "`weight = 3`. Check runs your program again with other weights, including 2 and 10"],
          ["Prints", "`Shipping: 7`"],
        ],
        starter: "weight = 3\n",
        answer: 'weight = 3\nif weight <= 2:\n    print("Shipping:", 5)\nelif weight <= 10:\n    print("Shipping:", 5 + (weight - 2) * 2)\nelse:\n    print("Freight only")\n',
        alternatives: ['weight = 3\nif weight > 10:\n    print("Freight only")\nelif weight > 2:\n    print("Shipping:", 5 + (weight - 2) * 2)\nelse:\n    print("Shipping:", 5)\n'],
        wrong: [
          { code: 'weight = 3\nif weight <= 2:\n    print("Shipping:", 5)\nelif weight <= 10:\n    print("Shipping:", 5 + weight * 2)\nelse:\n    print("Freight only")\n', fails: ["output", "v2", "v4"], why: "it charges 2 for every kg, not only the kg over 2" },
          { code: 'weight = 3\nif weight <= 2:\n    print("Shipping:", 5)\nelif weight < 10:\n    print("Shipping:", 5 + (weight - 2) * 2)\nelse:\n    print("Freight only")\n', fails: ["v2"], why: "a parcel of exactly 10 kg can still be sent" },
          { code: 'weight = 3\nif weight <= 2:\n    print("Shipping:", 5)\nelse:\n    print("Shipping:", 5 + (weight - 2) * 2)\n', fails: ["mid", "v3"], why: "heavy parcels get a price instead of Freight only" },
        ],
        hints: ["There are three bands. Test the lightest first.", "In the middle band, only the kg above 2 cost extra. Group that subtraction.", "The heaviest band prints a message, not a price."],
        task: {
          checks: [
            out("Shipping: 7\n"),
            mid,
            other,
            rerun("v1", { weight: 2 }, "Shipping: 5\n"),
            rerun("v2", { weight: 10 }, "Shipping: 21\n"),
            rerun("v3", { weight: 11 }, "Freight only\n"),
            rerun("v4", { weight: 2.5 }, "Shipping: 6.0\n"),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: 'score = 95\nif score >= 70:\n    print("C")\nelif score >= 90:\n    print("A")\nelse:\n    print("F")\n', choices: ["C", "A", "C\nA", "F"], answer: 0, why: "95 >= 70 is already true, so the first branch runs and the elif is never tried. Test the highest band first." },
      { id: "q2", prompt: "What does this print?", program: 'status = "delivered"\nif status == "delivered":\n    print("Send")\nelif status == "packing":\n    print("Wait")\nelse:\n    print("Check")\n', choices: ["Send", "Wait", "Check", "Send\nWait"], answer: 0, why: "The first test matches, so Python does not try elif or else." },
      { id: "q3", prompt: "When does else run?", choices: ["When every test above it was false", "When the if was true", "On every run", "Only when you write elif"], answer: 0, why: "else has no test. It runs only after the if and every elif failed." },
    ],
    review: ["else runs when the if was false. elif tries another test only after the previous one failed.", "Only one branch runs: the first true one. Test the strictest band first.", "Watch each boundary: does 90 belong to A or B? Next: an if inside an if."],
  },
  {
    id: "PY-L04-03",
    version: 2,
    slug: "nested-conditions",
    title: "An if inside an if",
    lede: "The inner if runs only when the outer test is already true.",
    focus: "Put an if inside an if when the second question matters only after the first.",
    minutes: 14,
    objectives: ["Indent a second if under the first", "Give the inner if its own else", "See that the inner test is skipped when the outer test is false"],
    requires: [...base, "if-statement", "else-clause", "arithmetic", "precedence", "reassignment"],
    teaches: ["nested-condition"],
    blocks: [
      { kind: "text", md: "Sometimes the second question only matters after the first one is true. A return is only worth checking for condition if it is still inside the return window. Put that second `if` indented under the first.\n\nThe inner `else` belongs to the inner `if`. It must line up with that inner `if`, not with the outer one. `and` can ask both questions at once, but then you get only one answer for \"no\". Nesting lets each \"no\" say something different." },
      {
        kind: "example",
        title: "Packed, and expensive enough",
        code: 'price = 20\nstatus = "packed"\nif price >= 15:\n    if status == "packed":\n        print("Ship")\n    else:\n        print("Pack first")\nelse:\n    print("Add more")\n',
        output: "Ship\n",
        note: "The price passes, and the status is packed, so the inner print runs.",
      },
      {
        kind: "example",
        title: "A ticket, then an age limit",
        code: 'tickets = 1\nage = 15\nif tickets > 0:\n    if age >= 17:\n        print("Enjoy the film")\n    else:\n        print("An adult must come too")\nelse:\n    print("Buy a ticket first")\nprint("Next customer")\n',
        output: "An adult must come too\nNext customer\n",
        note: "The outer test passes, so Python asks the inner one. 15 is under 17, so the inner else runs. Each \"no\" has its own message.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Not packed yet",
      prompt: "This prints `Ship`. Change `status` to `\"open\"` so the inner else runs and it prints `Pack first`.",
      spec: [],
      starter: 'price = 20\nstatus = "packed"\nif price >= 15:\n    if status == "packed":\n        print("Ship")\n    else:\n        print("Pack first")\nelse:\n    print("Add more")\n',
      answer: 'price = 20\nstatus = "open"\nif price >= 15:\n    if status == "packed":\n        print("Ship")\n    else:\n        print("Pack first")\nelse:\n    print("Add more")\n',
      wrong: [{ code: 'price = 8\nstatus = "packed"\nif price >= 15:\n    if status == "packed":\n        print("Ship")\n    else:\n        print("Pack first")\nelse:\n    print("Add more")\n', fails: ["output"], why: "the outer test fails, so the inner else never runs" }],
      hints: ["The inner else runs when the price test passes and the status is not packed.", "Leave the price at 20.", "Store open in status."],
      task: { checks: [out("Pack first\n"), inside] },
    },
    challenges: [
      {
        id: "c1",
        title: "The return window",
        prompt: "A shop accepts returns up to 30 days after delivery. Inside that window, an `unopened` item gets `Full refund` and anything else gets `Store credit`. Outside it, print `Too late to return`.",
        spec: [
          ["First lines", "`days = 12` and `condition = \"unopened\"`. Check runs your program again with other returns, including day 30 and day 31"],
          ["Prints", "`Full refund`"],
        ],
        starter: 'days = 12\ncondition = "unopened"\n',
        answer: 'days = 12\ncondition = "unopened"\nif days <= 30:\n    if condition == "unopened":\n        print("Full refund")\n    else:\n        print("Store credit")\nelse:\n    print("Too late to return")\n',
        wrong: [
          { code: 'days = 12\ncondition = "unopened"\nif days <= 30 and condition == "unopened":\n    print("Full refund")\nelse:\n    print("Too late to return")\n', fails: ["inside", "v3"], why: "an opened item inside the window is told it is too late" },
          { code: 'days = 12\ncondition = "unopened"\nif days < 30:\n    if condition == "unopened":\n        print("Full refund")\n    else:\n        print("Store credit")\nelse:\n    print("Too late to return")\n', fails: ["v1"], why: "day 30 is still inside the window" },
        ],
        hints: ["The window is the outer question.", "The condition only matters inside the window, so it is the inner if.", "Each if needs its own else, lined up under it."],
        task: {
          checks: [
            out("Full refund\n"),
            inside,
            rerun("v1", { days: 30, condition: "unopened" }, "Full refund\n"),
            rerun("v2", { days: 31, condition: "unopened" }, "Too late to return\n"),
            rerun("v3", { days: 5, condition: "opened" }, "Store credit\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Parking fee",
        prompt: "A car park charges guests 4 per hour. Members park free for the first 2 hours, then pay 3 for each hour after that. Store the fee and print it once at the end.",
        spec: [
          ["First lines", "`plan = \"member\"` and `hours = 3`. Check runs your program again with members and guests"],
          ["Prints", "`Fee: 3`"],
        ],
        starter: 'plan = "member"\nhours = 3\n',
        answer: 'plan = "member"\nhours = 3\nif plan == "member":\n    if hours <= 2:\n        fee = 0\n    else:\n        fee = (hours - 2) * 3\nelse:\n    fee = hours * 4\nprint("Fee:", fee)\n',
        wrong: [
          { code: 'plan = "member"\nhours = 3\nif plan == "member":\n    fee = (hours - 2) * 3\nelse:\n    fee = hours * 4\nprint("Fee:", fee)\n', fails: ["inside", "v1"], why: "a member parking 1 or 2 hours gets a negative or zero fee by accident, not by rule" },
          { code: 'plan = "member"\nhours = 3\nif plan == "member":\n    if hours <= 2:\n        fee = 0\n    else:\n        fee = hours - 2 * 3\nelse:\n    fee = hours * 4\nprint("Fee:", fee)\n', fails: ["output", "v2"], why: "without parentheses only the 2 is multiplied" },
        ],
        hints: ["The plan is the outer question; the hours only matter for members.", "A member's paid hours are the hours above 2. Group that subtraction before multiplying.", "Store the fee in every branch, and print it once, at the left edge."],
        task: {
          checks: [
            out("Fee: 3\n"),
            inside,
            rerun("v1", { plan: "member", hours: 1 }, "Fee: 0\n"),
            rerun("v2", { plan: "member", hours: 5 }, "Fee: 9\n"),
            rerun("v3", { plan: "guest", hours: 2 }, "Fee: 8\n"),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: 'price = 20\nstatus = "open"\nif price >= 15:\n    if status == "packed":\n        print("Ship")\n    else:\n        print("Pack first")\nelse:\n    print("Add more")\n', choices: ["Ship", "Pack first", "Add more", "Ship\nPack first"], answer: 1, why: "The price passes, so Python asks the inner question. The status is open, not packed, so Pack first prints." },
      { id: "q2", prompt: "What does this print?", program: 'price = 8\nstatus = "packed"\nif price >= 15:\n    if status == "packed":\n        print("Ship")\n    else:\n        print("Pack first")\nelse:\n    print("Add more")\n', choices: ["Ship", "Pack first", "Add more", "(nothing)"], answer: 2, why: "The outer test fails, so the inner if is never asked." },
      { id: "q3", prompt: "Where does the inner else line up?", choices: ["With the inner if", "With the outer if", "At the left edge", "With the print"], answer: 0, why: "An else belongs to the if it lines up with. Line it up with the outer if and it answers the outer question instead." },
    ],
    review: ["The inner if runs only when the outer test is true.", "An else lines up with the if it belongs to.", "Nested ifs can give each \"no\" its own answer, which one combined test can't. Next: values that count as true or false by themselves."],
  },
  {
    id: "PY-L04-04",
    version: 2,
    slug: "truthiness",
    title: "What counts as true",
    lede: "A test can be the value itself. Empty text, 0, and None count as false.",
    focus: "Use a value directly as a test: empty text, 0, and None are false.",
    minutes: 12,
    objectives: ["Use a name by itself as the test", "Treat empty text, 0, and None as false", "Treat other text and other numbers as true"],
    requires: [...base, "if-statement", "else-clause", "nested-condition", "none-value", "logical"],
    teaches: ["truthiness"],
    blocks: [
      { kind: "text", md: "A comparison is not the only test. `if name:` asks whether the value itself counts as true. It is the short, usual way to ask \"is there anything here?\": a nickname that may be blank, a coupon that may be missing, a cart that may be empty.\n\nEmpty text `\"\"`, the number `0`, and `None` count as false. Any other text, and any other number, counts as true. `True` and `False` still mean what they did before." },
      {
        kind: "example",
        title: "Empty text is false",
        code: 'code = ""\nif code:\n    print("Has a code")\nelse:\n    print("No code")\n',
        output: "No code\n",
        note: "The quotes have nothing between them, so the test is false.",
      },
      {
        kind: "example",
        title: "None and zero",
        code: 'coupon = None\nqty = 0\nif coupon:\n    print("Coupon")\nelse:\n    print("No coupon")\nif qty:\n    print("Some")\nelse:\n    print("Zero")\n',
        output: "No coupon\nZero\n",
        note: "None and 0 both count as false. A stored 3, or the text WELCOME, would count as true.",
      },
      { kind: "text", md: "**Mistake to avoid:** text is true whenever it isn't empty, whatever it says. `\"0\"`, `\"False\"` and `\" \"` (one space) all count as **true**. Only `\"\"` is false. And `if qty:` treats 0 as \"nothing\", which is right for a count but wrong if 0 is a real value you care about, like a temperature of 0." },
    ],
    tryIt: {
      id: "try",
      title: "Clear the name",
      prompt: "This prints Maya, because that text counts as true. Store empty text instead, so the else prints `Missing`.",
      spec: [],
      starter: 'name = "Maya"\nif name:\n    print(name)\nelse:\n    print("Missing")\n',
      answer: 'name = ""\nif name:\n    print(name)\nelse:\n    print("Missing")\n',
      wrong: [{ code: 'name = ""\nif name == "":\n    print("Missing")\nelse:\n    print(name)\n', fails: ["bare"], why: "prints Missing, but the test is a comparison" }],
      hints: ["Empty text is two quotes with nothing between them.", "Leave the if as if name, with no comparison.", "The else prints Missing."],
      task: { checks: [out("Missing\n"), bare] },
    },
    challenges: [
      {
        id: "c1",
        title: "Greet by nickname",
        prompt: "An app greets people by their nickname, and falls back to their full name when the nickname is blank. Use the nickname itself as the test.",
        spec: [
          ["First lines", "`nickname = \"\"` and `full_name = \"Grace Walker\"`. Check runs your program again with other people"],
          ["Prints", "`Hi, Grace Walker`"],
        ],
        starter: 'nickname = ""\nfull_name = "Grace Walker"\n',
        answer: 'nickname = ""\nfull_name = "Grace Walker"\nif nickname:\n    print("Hi,", nickname)\nelse:\n    print("Hi,", full_name)\n',
        wrong: [
          { code: 'nickname = ""\nfull_name = "Grace Walker"\nif nickname == "":\n    print("Hi,", full_name)\nelse:\n    print("Hi,", nickname)\n', fails: ["bare"], why: "right answers, but the test is a comparison, not the value itself" },
          { code: 'nickname = ""\nfull_name = "Grace Walker"\nprint("Hi,", full_name)\n', fails: ["branch", "bare", "v1"], why: "the nickname is never used" },
          { code: 'nickname = ""\nfull_name = "Grace Walker"\nif full_name:\n    print("Hi,", full_name)\nelse:\n    print("Hi,", nickname)\n', fails: ["v1"], why: "it tests the full name, which is never blank" },
        ],
        hints: ["Empty text counts as false.", "The test is the name nickname by itself.", "The true branch greets by nickname; else greets by full name."],
        task: {
          checks: [
            out("Hi, Grace Walker\n"),
            branch,
            bare,
            rerun("v1", { nickname: "Gee", full_name: "Grace Walker" }, "Hi, Gee\n"),
            rerun("v2", { nickname: "", full_name: "Theo Williams" }, "Hi, Theo Williams\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "The cart banner",
        prompt: "A cart banner says `Your cart is empty` when there are no items. With items, it says `Coupon applied:` and the coupon when there is one, and otherwise `Items:`, the count, and `| no coupon`. Use the values themselves as the tests.",
        spec: [
          ["First lines", "`items = 0` and `coupon = None`. Check runs your program again with other carts"],
          ["Prints", "`Your cart is empty`"],
        ],
        starter: "items = 0\ncoupon = None\n",
        answer: 'items = 0\ncoupon = None\nif items:\n    if coupon:\n        print("Coupon applied:", coupon)\n    else:\n        print("Items:", items, "| no coupon")\nelse:\n    print("Your cart is empty")\n',
        alternatives: ['items = 0\ncoupon = None\nif not items:\n    print("Your cart is empty")\nelif coupon:\n    print("Coupon applied:", coupon)\nelse:\n    print("Items:", items, "| no coupon")\n'],
        wrong: [
          { code: 'items = 0\ncoupon = None\nif coupon:\n    print("Coupon applied:", coupon)\nelif items:\n    print("Items:", items, "| no coupon")\nelse:\n    print("Your cart is empty")\n', fails: ["v3"], why: "an empty cart with a coupon still shows the coupon" },
          { code: 'items = 0\ncoupon = None\nif items:\n    print("Items:", items, "| no coupon")\nelse:\n    print("Your cart is empty")\n', fails: ["v2"], why: "the coupon is never shown" },
        ],
        hints: ["0 items and a None coupon both count as false.", "The coupon only matters when the cart has items.", "Three messages, so you need two tests."],
        task: {
          checks: [
            out("Your cart is empty\n"),
            bare,
            rerun("v1", { items: 3, coupon: null }, "Items: 3 | no coupon\n"),
            rerun("v2", { items: 2, coupon: "WELCOME10" }, "Coupon applied: WELCOME10\n"),
            rerun("v3", { items: 0, coupon: "WELCOME10" }, "Your cart is empty\n"),
            rerun("v4", { items: 1, coupon: "" }, "Items: 1 | no coupon\n"),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: 'code = ""\nif code:\n    print("Has a code")\nelse:\n    print("No code")\n', choices: ["Has a code", "No code", "\"\"", "(nothing)"], answer: 1, why: "Empty text counts as false, so else runs." },
      { id: "q2", prompt: "What does this print?", program: 'answer = "False"\nif answer:\n    print("Yes")\nelse:\n    print("No")\n', choices: ["Yes", "No", "False", "(nothing)"], answer: 0, why: "This is the text False, five letters long. Any non-empty text counts as true." },
      { id: "q3", prompt: "Which value counts as false?", choices: ["0", "1", "\"0\"", "\"None\""], answer: 0, why: "The number 0 counts as false. The text 0 and the text None are not empty, so they count as true." },
    ],
    review: ["if name: uses the value itself as the test.", "Empty text, 0, and None count as false. Other text and other numbers count as true.", "\"0\" and \"False\" are text, so they count as true. Next: choosing a value on one line, and match."],
  },
  {
    id: "PY-L04-05",
    version: 2,
    slug: "choose-a-value",
    title: "One-line choice and match",
    lede: "Pick a value with if and else on one line, or match one value against case lines.",
    focus: "Choose a value with a one-line if else, and match one value against cases.",
    minutes: 14,
    objectives: ["Write value-if-test-else-other", "Match one stored value against case lines", "Use case _ for every value you did not name"],
    requires: [...base, "if-statement", "else-clause", "truthiness", "identity", "none-value", "reassignment"],
    teaches: ["conditional-expr", "match-case"],
    blocks: [
      { kind: "text", md: "When each branch is just a value, you can choose it on one line:\n\n`label = \"ship\" if price >= 15 else \"hold\"`\n\nRead it as: ship when the test is true, otherwise hold. The whole line is a value, so you can print it or store it. It always needs both parts: a one-line choice without `else` is a syntax error." },
      {
        kind: "example",
        title: "ship or hold",
        code: 'price = 20\nlabel = "ship" if price >= 15 else "hold"\nprint(label)\n',
        output: "ship\n",
        note: "The test is true, so the value before if is chosen.",
      },
      { kind: "text", md: "`match` compares one value with several `case` lines. Python runs the first case that fits. `case _` fits anything left over. `_` is the wildcard: it matches any value and stores nothing. Use `match` when you are comparing one value against a list of known options; it reads more clearly than a long `elif` chain." },
      {
        kind: "example",
        title: "Match a status",
        code: 'status = "delivered"\nmatch status:\n    case "packing":\n        print("Wait")\n    case "delivered":\n        print("Send")\n    case _:\n        print("Check")\n',
        output: "Send\n",
        note: "delivered matches the second case, so Send prints. The other cases are skipped.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Hold the cheap order",
      prompt: "This always prints ship. Choose `ship` when price is at least 15, and `hold` otherwise, on one line.",
      spec: [],
      starter: 'price = 8\nprint("ship")\n',
      answer: 'price = 8\nprint("ship" if price >= 15 else "hold")\n',
      alternatives: ['price = 8\nlabel = "ship" if price >= 15 else "hold"\nprint(label)\n'],
      wrong: [{ code: 'price = 8\nif price >= 15:\n    print("ship")\nelse:\n    print("hold")\n', fails: ["picked"], why: "right output, but it is an if statement, not a one-line choice" }],
      hints: ["The chosen values go on either side of if and else.", "The test stays in the middle.", "8 is not at least 15, so the else value is the one that prints."],
      task: { checks: [out("hold\n"), picked] },
    },
    challenges: [
      {
        id: "c1",
        title: "One item or many",
        prompt: "A cart line shows the count and then `item` or `items`. Choose the word on one line: `item` only when the count is exactly 1.",
        spec: [
          ["First line", "`count = 1`. Check runs your program again with other counts, including 0"],
          ["Prints", "`1 item`"],
        ],
        starter: "count = 1\n",
        answer: 'count = 1\nprint(count, "item" if count == 1 else "items")\n',
        alternatives: ['count = 1\nword = "items" if count != 1 else "item"\nprint(count, word)\n'],
        wrong: [
          { code: 'count = 1\nprint(count, "item" if count <= 1 else "items")\n', fails: ["v1"], why: "0 takes the plural: 0 items" },
          { code: 'count = 1\nprint(count, "item")\n', fails: ["picked", "v1", "v2", "v3"], why: "every count says item" },
          { code: 'count = 1\nif count == 1:\n    print(count, "item")\nelse:\n    print(count, "items")\n', fails: ["picked"], why: "right output, written as a statement" },
        ],
        hints: ["The word depends on the count, so it is chosen.", "Only exactly 1 is singular. 0 is plural.", "The whole choice can sit inside the print, after the count."],
        task: {
          checks: [
            out("1 item\n"),
            picked,
            rerun("v1", { count: 0 }, "0 items\n"),
            rerun("v2", { count: 2 }, "2 items\n"),
            rerun("v3", { count: 12 }, "12 items\n"),
          ],
        },
      },
      {
        id: "c2",
        title: "Delivery estimate",
        prompt: "Match the shipping speed: `standard` takes 5 days, `express` 2, `overnight` 1. Store the days, or `None` for a speed you don't know. Then print `Unknown speed`, or `Arrives in`, the days, and `day` or `days`.",
        spec: [
          ["First line", "`speed = \"express\"`. Check runs your program again with every speed and an unknown one"],
          ["Prints", "`Arrives in 2 days`"],
        ],
        starter: 'speed = "express"\n',
        answer: 'speed = "express"\nmatch speed:\n    case "standard":\n        days = 5\n    case "express":\n        days = 2\n    case "overnight":\n        days = 1\n    case _:\n        days = None\nif days is None:\n    print("Unknown speed")\nelse:\n    print("Arrives in", days, "day" if days == 1 else "days")\n',
        wrong: [
          { code: 'speed = "express"\nmatch speed:\n    case "standard":\n        days = 5\n    case "express":\n        days = 2\n    case "overnight":\n        days = 1\nprint("Arrives in", days, "day" if days == 1 else "days")\n', fails: ["v3"], why: "an unknown speed leaves days unset, and the print stops with NameError" },
          { code: 'speed = "express"\nmatch speed:\n    case "standard":\n        days = 5\n    case "express":\n        days = 2\n    case "overnight":\n        days = 1\n    case _:\n        days = None\nif days is None:\n    print("Unknown speed")\nelse:\n    print("Arrives in", days, "days")\n', fails: ["picked", "v2"], why: "overnight says 1 days" },
        ],
        hints: ["Each case stores a number of days; case _ stores None.", "After the match, ask whether days is None.", "The last word is chosen on one line, like the previous challenge."],
        task: {
          checks: [
            out("Arrives in 2 days\n"),
            matched,
            picked,
            rerun("v1", { speed: "standard" }, "Arrives in 5 days\n"),
            rerun("v2", { speed: "overnight" }, "Arrives in 1 day\n"),
            rerun("v3", { speed: "drone" }, "Unknown speed\n"),
          ],
        },
      },
    ],
    concept: [
      { id: "q1", prompt: "What does this print?", program: 'price = 8\nprint("ship" if price >= 15 else "hold")\n', choices: ["ship", "hold", "ship\nhold", "8"], answer: 1, why: "8 is not at least 15, so the value after else is chosen." },
      { id: "q2", prompt: "What does this print?", program: 'status = "returned"\nmatch status:\n    case "packing":\n        print("Wait")\n    case "delivered":\n        print("Send")\n    case _:\n        print("Check")\n', choices: ["Wait", "Send", "Check", "returned"], answer: 2, why: "returned fits none of the named cases, so case _ runs." },
      { id: "q3", prompt: "What happens with `label = \"ship\" if price >= 15`, with no else?", choices: ["A syntax error: a one-line choice needs else", "label is None when the test is false", "label is ship every time", "label is not stored"], answer: 0, why: "A one-line choice must say what to pick in both cases, so the else part is required." },
    ],
    review: ["value if test else other chooses one of two values, and always needs the else.", "match runs the first case that fits. case _ fits every value you did not name.", "Store a value in each case, then use it once after the match. Next module: repeating with loops."],
  },
];
