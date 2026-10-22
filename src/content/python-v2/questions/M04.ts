/**
 * M04 practice: ten questions on decisions. if, elif/else, an if inside an if, values that count as false,
 * a one-line choice and match. No def yet (functions arrive in M09), so every code question is a program that
 * Check runs again with other stored values or other typed lines, on both sides of every boundary.
 *
 * Version 2: rewritten. Two predictions with real reasoning, one completion, and independent problems:
 * fix overwritten tiers, a misattached else and a truthy "no"; validate an age and a calendar date; turn
 * seconds into a readable duration; price a cart with coupon codes.
 */
import type { PyQuestion } from "../model";
import { usesMatch } from "../checks";
import { rerun, retyped } from "../beginner-checks";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const out = (expected: string) => ({ kind: "output" as const, id: "output", label: "Prints exactly the expected lines", expected });
/** A public re-run: the learner sees the values it uses. */
const shown = (id: string, set: Record<string, unknown>, output: string) => rerun(id, set, output, { hidden: false });
const matched = usesMatch("matched", "Uses match");

export const m04Questions: PyQuestion[] = [
  {
    id: "PY-Q04-02",
    version: 2,
    slug: "wind-warning",
    title: "One forecast, two decisions",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 4,
    requires: ["assignment", "whole-number", "comparison", "if-statement", "else-clause", "print-call", "print-text", "unquoted-name", "top-level-indent"],
    prompt: "A weather app labels the wind speed (km/h), and separately warns people to tie things down. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: ["In an if/elif chain, only the first true test runs.", "60 is not at least 90, but it is at least 60.", "The second if is a new decision. It doesn't care what the chain above chose."],
    explanation: "The chain picks one label: 60 >= 90 is false, 60 >= 60 is true, so Gale prints and the Strong test is never tried. The next if is separate, so it is tested too: 60 >= 50, so the warning prints. The last line is at the left edge and always runs.",
    predict: {
      program: src`
wind = 60
if wind >= 90:
    print("Storm")
elif wind >= 60:
    print("Gale")
elif wind >= 40:
    print("Strong")
if wind >= 50:
    print("Secure loose items")
print("Forecast done")
`,
      output: "Gale\nSecure loose items\nForecast done\n",
      wrongPredictions: [
        "Gale\nForecast done",
        "Gale\nStrong\nSecure loose items\nForecast done",
        "Strong\nSecure loose items\nForecast done",
      ],
    },
  },
  {
    id: "PY-Q04-03",
    version: 2,
    slug: "loyalty-tier-rate",
    title: "Gold members earn too little",
    format: "debugging",
    difficulty: "easy",
    minutes: 5,
    requires: ["assignment", "reassignment", "whole-number", "arithmetic", "comparison", "if-statement", "else-clause", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent"],
    prompt: "A loyalty scheme gives Gold members (1000 points or more) 3 points per dollar, Silver members (500 or more) 2, and everyone else 1. A Gold member who spent 40 should earn 120 points, but the program says 80. Fix it.",
    spec: [
      ["Keep", "`points = 1200` and `spend = 40` as the first lines. Check runs your program again with other members"],
      ["Prints", "`Points earned: 120`"],
    ],
    hiddenKinds: ["exactly 1000 points", "one point short of Gold", "exactly 500 points", "one point short of Silver", "nothing spent"],
    hints: ["Follow a Gold member through the program. How many of the ifs are true for 1200 points?", "Two separate ifs can both run, and the second one overwrites the rate.", "Either make the second test part of the same chain, or make sure the stricter rule is the one that runs last."],
    explanation: "Both ifs were tested on their own. For 1200 points the first set rate to 3, and then the second, also true, replaced it with 2. With elif, the Silver test is only tried when the Gold test failed. Putting the Gold test after the Silver test also works, because then the stricter rule writes last.",
    code: {
      starter: src`
points = 1200
spend = 40
rate = 1
if points >= 1000:
    rate = 3
if points >= 500:
    rate = 2
print("Points earned:", spend * rate)
`,
      answer: src`
points = 1200
spend = 40
rate = 1
if points >= 1000:
    rate = 3
elif points >= 500:
    rate = 2
print("Points earned:", spend * rate)
`,
      alternatives: [src`
points = 1200
spend = 40
rate = 1
if points >= 500:
    rate = 2
if points >= 1000:
    rate = 3
print("Points earned:", spend * rate)
`, src`
points = 1200
spend = 40
if points >= 1000:
    rate = 3
elif points >= 500:
    rate = 2
else:
    rate = 1
print("Points earned:", spend * rate)
`],
      wrong: [
        { code: src`
points = 1200
spend = 40
rate = 1
if points >= 500:
    rate = 2
elif points >= 1000:
    rate = 3
print("Points earned:", spend * rate)
`, fails: ["output", "v1"], why: "the Silver test comes first, so a Gold member never reaches the Gold branch" },
        { code: src`
points = 1200
spend = 40
rate = 1
if points > 1000:
    rate = 3
elif points > 500:
    rate = 2
print("Points earned:", spend * rate)
`, fails: ["v1", "v3"], why: "exactly 1000 and exactly 500 points should reach the tier" },
      ],
      task: {
        checks: [
          out("Points earned: 120\n"),
          shown("p1", { points: 700, spend: 25 }, "Points earned: 50\n"),
          rerun("v1", { points: 1000 }, "Points earned: 120\n", { label: "exactly 1000 points" }),
          rerun("v2", { points: 999 }, "Points earned: 80\n", { label: "one point short of Gold" }),
          rerun("v3", { points: 500 }, "Points earned: 80\n", { label: "exactly 500 points" }),
          rerun("v4", { points: 499 }, "Points earned: 40\n", { label: "one point short of Silver" }),
          rerun("v5", { spend: 0 }, "Points earned: 0\n", { label: "nothing spent" }),
        ],
      },
    },
  },
  {
    id: "PY-Q04-06",
    version: 2,
    slug: "check-an-age",
    title: "Check a typed age",
    format: "validation",
    difficulty: "easy",
    minutes: 5,
    requires: ["assignment", "input", "conversion", "whole-number", "comparison", "if-statement", "else-clause", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "logical"],
    prompt: "A clinic form reads a patient's age. Before saving it, reject an age below 0 with `Age can't be negative`, and an age above 120 with `Please check the age`. Otherwise print `Age saved:` and the age. A newborn is 0.",
    spec: [
      ["Typed line", "`34` here, after the prompt `Age? `. Check also types other ages"],
      ["Prints", "`Age? Age saved: 34`"],
    ],
    hiddenKinds: ["a negative age", "a newborn", "exactly 120", "just over 120", "spaces around the number"],
    hints: ["The typed line is text, so convert it before comparing.", "There are three outcomes, so one if, one elif and an else.", "0 and 120 are both real ages."],
    explanation: "int() turns the typed text into a whole number (and ignores the spaces around it). The first true test wins: below 0, then above 120, otherwise save. Using <= 0 would turn away newborns, and >= 120 would reject a 120-year-old.",
    code: {
      starter: 'age_text = input("Age? ")\n',
      answer: src`
age_text = input("Age? ")
age = int(age_text)
if age < 0:
    print("Age can't be negative")
elif age > 120:
    print("Please check the age")
else:
    print("Age saved:", age)
`,
      alternatives: [src`
age = int(input("Age? "))
if age >= 0 and age <= 120:
    print("Age saved:", age)
elif age < 0:
    print("Age can't be negative")
else:
    print("Please check the age")
`],
      wrong: [
        { code: src`
age_text = input("Age? ")
age = int(age_text)
if age <= 0:
    print("Age can't be negative")
elif age > 120:
    print("Please check the age")
else:
    print("Age saved:", age)
`, fails: ["edges"], why: "a newborn is turned away" },
        { code: src`
age_text = input("Age? ")
age = int(age_text)
if age < 0:
    print("Age can't be negative")
elif age >= 120:
    print("Please check the age")
else:
    print("Age saved:", age)
`, fails: ["edges"], why: "120 is still a possible age" },
        { code: src`
age_text = input("Age? ")
age = int(age_text)
if age < 0:
    print("Age can't be negative")
if age > 120:
    print("Please check the age")
print("Age saved:", age)
`, fails: ["others"], why: "a rejected age is still saved, because the last print is not part of the decision" },
      ],
      task: {
        stdin: "34\n",
        checks: [
          out("Age? Age saved: 34\n"),
          retyped("others", [
            [["-1"], "Age? Age can't be negative\n"],
            [["121"], "Age? Please check the age\n"],
            [[" 7 "], "Age? Age saved: 7\n"],
          ], "Works for other typed ages"),
          retyped("edges", [
            [["0"], "Age? Age saved: 0\n"],
            [["120"], "Age? Age saved: 120\n"],
          ], "Accepts 0 and 120"),
        ],
      },
    },
  },
  {
    id: "PY-Q04-09",
    version: 2,
    slug: "readable-duration",
    title: "Say how long it took",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 8,
    requires: ["assignment", "whole-number", "arithmetic", "precedence", "if-statement", "else-clause", "truthiness", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "comparison"],
    prompt: "A video app stores how long someone watched in seconds. Show it the way people say it: with an hour or more, hours and minutes (`1 h 2 min`); under an hour but at least a minute, minutes and seconds (`2 min 5 s`); under a minute, just seconds (`45 s`).",
    spec: [
      ["First line", "`seconds = 3725`. Check runs your program again with other durations"],
      ["Prints", "`1 h 2 min`"],
      ["Rule", "the smaller unit is shown even when it is 0: `1 h 0 min`, `1 min 0 s`"],
    ],
    hiddenKinds: ["exactly one hour", "just under a minute", "exactly one minute", "zero seconds", "just under two hours", "a whole day"],
    hints: ["Split the seconds into hours, leftover minutes and leftover seconds with // and %.", "The leftover minutes are what remains after the whole hours are taken out, divided into minutes.", "Choose the format by the biggest unit that isn't zero."],
    explanation: "hours = seconds // 3600; minutes = seconds % 3600 // 60 (what is left after the hours, in whole minutes); secs = seconds % 60. Then the first non-zero unit picks the format. seconds // 60 alone would give the total minutes, so an hour and two minutes would read 1 h 62 min.",
    code: {
      starter: "seconds = 3725\n",
      answer: src`
seconds = 3725
hours = seconds // 3600
minutes = seconds % 3600 // 60
secs = seconds % 60
if hours:
    print(hours, "h", minutes, "min")
elif minutes:
    print(minutes, "min", secs, "s")
else:
    print(secs, "s")
`,
      alternatives: [src`
seconds = 3725
if seconds >= 3600:
    print(seconds // 3600, "h", (seconds - seconds // 3600 * 3600) // 60, "min")
elif seconds >= 60:
    print(seconds // 60, "min", seconds % 60, "s")
else:
    print(seconds, "s")
`],
      wrong: [
        { code: src`
seconds = 3725
hours = seconds // 3600
minutes = seconds // 60
secs = seconds % 60
if hours:
    print(hours, "h", minutes, "min")
elif minutes:
    print(minutes, "min", secs, "s")
else:
    print(secs, "s")
`, fails: ["output", "p1", "v1", "v5", "v6"], why: "seconds // 60 is the total minutes, not the minutes left after the hours" },
        { code: src`
seconds = 3725
hours = seconds // 3600
minutes = seconds % 3600 // 60
secs = seconds % 60
if seconds > 3600:
    print(hours, "h", minutes, "min")
elif seconds > 60:
    print(minutes, "min", secs, "s")
else:
    print(secs, "s")
`, fails: ["v1", "v3"], why: "exactly an hour or exactly a minute falls into the smaller format" },
      ],
      task: {
        checks: [
          out("1 h 2 min\n"),
          shown("p1", { seconds: 4500 }, "1 h 15 min\n"),
          shown("p2", { seconds: 125 }, "2 min 5 s\n"),
          rerun("v1", { seconds: 3600 }, "1 h 0 min\n", { label: "exactly one hour" }),
          rerun("v2", { seconds: 59 }, "59 s\n", { label: "just under a minute" }),
          rerun("v3", { seconds: 60 }, "1 min 0 s\n", { label: "exactly one minute" }),
          rerun("v4", { seconds: 0 }, "0 s\n", { label: "zero seconds" }),
          rerun("v5", { seconds: 7199 }, "1 h 59 min\n", { label: "just under two hours" }),
          rerun("v6", { seconds: 86400 }, "24 h 0 min\n", { label: "a whole day" }),
        ],
      },
    },
  },
  {
    id: "PY-Q04-10",
    version: 2,
    slug: "battery-indicator",
    title: "A battery indicator",
    format: "code_completion",
    difficulty: "easy",
    minutes: 5,
    requires: ["assignment", "whole-number", "boolean", "comparison", "if-statement", "else-clause", "truthiness", "print-call", "print-text", "unquoted-name", "top-level-indent"],
    prompt: "A phone shows one battery message. While it is charging it always says `Charging`. Otherwise it says `Charge now` at 10% or below, `Low` at 25% or below, and `OK` above that. Replace each `???` with a test.",
    spec: [
      ["First lines", "`battery = 18` and `charging = False`. Check runs your program again with other readings"],
      ["Prints", "`Low`"],
    ],
    hiddenKinds: ["exactly 10%", "just over 10%", "exactly 25%", "just over 25%", "charging on a low battery"],
    hints: ["Only the first true test runs, so the rule that overrides the others comes first.", "charging is already True or False, so it can be the test by itself.", "Of the two battery levels, test the lower one first, and include the boundary."],
    explanation: "charging comes first because it overrides everything. Then battery <= 10 must be tested before battery <= 25, because every battery at 10% or below is also at 25% or below; tested the other way round, Charge now could never print.",
    code: {
      starter: src`
battery = 18
charging = False
if ???:
    print("Charging")
elif ???:
    print("Charge now")
elif ???:
    print("Low")
else:
    print("OK")
`,
      answer: src`
battery = 18
charging = False
if charging:
    print("Charging")
elif battery <= 10:
    print("Charge now")
elif battery <= 25:
    print("Low")
else:
    print("OK")
`,
      alternatives: [src`
battery = 18
charging = False
if charging:
    print("Charging")
elif battery < 11:
    print("Charge now")
elif battery < 26:
    print("Low")
else:
    print("OK")
`],
      wrong: [
        { code: src`
battery = 18
charging = False
if charging:
    print("Charging")
elif battery <= 25:
    print("Charge now")
elif battery <= 10:
    print("Low")
else:
    print("OK")
`, fails: ["output", "v2", "v3"], why: "the 25% test is first and prints the wrong message" },
        { code: src`
battery = 18
charging = False
if charging:
    print("Charging")
elif battery < 10:
    print("Charge now")
elif battery < 25:
    print("Low")
else:
    print("OK")
`, fails: ["v1", "v3"], why: "10% and 25% belong to the lower message" },
        { code: src`
battery = 18
charging = False
if battery <= 10:
    print("Charge now")
elif battery <= 25:
    print("Low")
elif charging:
    print("Charging")
else:
    print("OK")
`, fails: ["v5"], why: "a low battery that is charging still says Charge now" },
      ],
      task: {
        checks: [
          out("Low\n"),
          shown("p1", { battery: 80 }, "OK\n"),
          rerun("v1", { battery: 10 }, "Charge now\n", { label: "exactly 10%" }),
          rerun("v2", { battery: 11 }, "Low\n", { label: "just over 10%" }),
          rerun("v3", { battery: 25 }, "Low\n", { label: "exactly 25%" }),
          rerun("v4", { battery: 26 }, "OK\n", { label: "just over 25%" }),
          rerun("v5", { battery: 5, charging: true }, "Charging\n", { label: "charging on a low battery" }),
        ],
      },
    },
  },
  {
    id: "PY-Q04-12",
    version: 2,
    slug: "what-counts-as-empty",
    title: "What counts as empty?",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 5,
    requires: ["assignment", "string-value", "decimal-number", "none-value", "logical", "if-statement", "else-clause", "truthiness", "print-call", "print-text", "unquoted-name", "top-level-indent"],
    prompt: "An order form passes on whatever was filled in. Decide which tests are true, and type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: ["A text is false only when it has nothing in it at all. A space is something.", "\"0\" is a one-character text, but 0.0 is a number equal to zero.", "None is false, and or needs at least one true side."],
    explanation: "note holds a space, so it is not empty and counts as true. code is the text \"0\", also true; qty is 0.0, false, so not qty is true and code only prints. coupon is None and qty is 0.0, both false, so the or is false and the else runs.",
    predict: {
      program: src`
note = " "
code = "0"
qty = 0.0
coupon = None
if note:
    print("note")
if code and not qty:
    print("code only")
if coupon or qty:
    print("extra")
else:
    print("nothing extra")
`,
      output: "note\ncode only\nnothing extra\n",
      wrongPredictions: [
        "code only\nnothing extra",
        "note\nnothing extra",
        "note\ncode only\nextra",
      ],
    },
  },
  {
    id: "PY-Q04-13",
    version: 2,
    slug: "free-shipping-rules",
    title: "The else in the wrong place",
    format: "debugging",
    difficulty: "medium",
    minutes: 6,
    requires: ["assignment", "boolean", "whole-number", "comparison", "if-statement", "else-clause", "nested-condition", "print-call", "print-text", "unquoted-name", "top-level-indent", "logical", "truthiness"],
    prompt: "Members get free shipping on orders of 25 or more; everyone else needs 50 or more. Below that, shipping is 4.99. The program prints nothing at all for a member's order of 20, and it never gives a non-member free shipping. Fix the decisions.",
    spec: [
      ["Keep", "`member = True` and `total = 20` as the first lines. Check runs your program again with other orders"],
      ["Prints", "`Shipping: 4.99`"],
    ],
    hiddenKinds: ["a member exactly at 25", "a member just under 25", "a non-member just under 50", "a non-member exactly at 50", "a small non-member order"],
    hints: ["Read the else's indentation: which if does it belong to?", "Each kind of customer needs both answers: free, or 4.99.", "The non-member branch needs its own test against 50."],
    explanation: "The else lined up with the outer if, so it answered \"not a member\", and a member under 25 fell through both branches and printed nothing. Each branch now asks its own threshold question with its own else. One combined test, (member and total >= 25) or total >= 50, works too.",
    code: {
      starter: src`
member = True
total = 20
if member:
    if total >= 25:
        print("Free shipping")
else:
    print("Shipping: 4.99")
`,
      answer: src`
member = True
total = 20
if member:
    if total >= 25:
        print("Free shipping")
    else:
        print("Shipping: 4.99")
else:
    if total >= 50:
        print("Free shipping")
    else:
        print("Shipping: 4.99")
`,
      alternatives: [src`
member = True
total = 20
if (member and total >= 25) or total >= 50:
    print("Free shipping")
else:
    print("Shipping: 4.99")
`],
      wrong: [
        { code: src`
member = True
total = 20
if member:
    if total >= 25:
        print("Free shipping")
    else:
        print("Shipping: 4.99")
else:
    print("Shipping: 4.99")
`, fails: ["v4"], why: "the else is fixed for members, but non-members still never get free shipping" },
        { code: src`
member = True
total = 20
if member:
    if total > 25:
        print("Free shipping")
    else:
        print("Shipping: 4.99")
else:
    if total > 50:
        print("Free shipping")
    else:
        print("Shipping: 4.99")
`, fails: ["v1", "v4"], why: "an order of exactly 25 or 50 should ship free" },
      ],
      task: {
        checks: [
          out("Shipping: 4.99\n"),
          shown("p1", { member: true, total: 40 }, "Free shipping\n"),
          rerun("v1", { total: 25 }, "Free shipping\n", { label: "a member exactly at 25" }),
          rerun("v2", { total: 24 }, "Shipping: 4.99\n", { label: "a member just under 25" }),
          rerun("v3", { member: false, total: 49 }, "Shipping: 4.99\n", { label: "a non-member just under 50" }),
          rerun("v4", { member: false, total: 50 }, "Free shipping\n", { label: "a non-member exactly at 50" }),
          rerun("v5", { member: false, total: 10 }, "Shipping: 4.99\n", { label: "a small non-member order" }),
        ],
      },
    },
  },
  {
    id: "PY-Q04-16",
    version: 2,
    slug: "coupon-checkout",
    title: "Price a cart with a coupon code",
    format: "integration",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "reassignment", "whole-number", "decimal-number", "boolean", "string-value", "arithmetic", "precedence", "comparison", "logical", "if-statement", "else-clause", "truthiness", "match-case", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent", "conditional-expr"],
    prompt: "A checkout accepts two coupon codes. `WELCOME10` takes 10% off the subtotal. `FREESHIP` makes shipping free. No code (empty text) means no coupon. Any other code prints `Unknown coupon:` and the code, and then works like no coupon. Shipping is 5, but free when the subtotal **after** the discount is 50 or more. Use `match` for the codes, then print the discount, the shipping and the total.",
    spec: [
      ["First lines", "`subtotal = 60` and `coupon = \"WELCOME10\"`. Check runs your program again with other carts"],
      ["Prints", "`Discount: 6.0`, `Shipping: 0`, `Total: 54.0`"],
      ["Discount", "always computed as subtotal × percent / 100, so it prints as a decimal, `0.0` with no coupon"],
    ],
    hiddenKinds: ["free shipping by coupon", "a discount that drops the subtotal under 50", "no coupon", "an unknown code", "exactly 50 with no coupon"],
    hints: ["Let each case set what the code changes: a percent, or a True/False for free shipping. Set their defaults before the match.", "The empty text is a code you can match too, so it doesn't reach the unknown case.", "Decide shipping after the discount is taken off."],
    explanation: "Defaults first (percent 0, no free shipping), then match sets what each code changes; case _ reports an unknown code. The discount is subtotal * percent / 100. Shipping is decided on the discounted amount, so 50 with WELCOME10 drops to 45.0 and pays 5.",
    code: {
      starter: 'subtotal = 60\ncoupon = "WELCOME10"\n',
      answer: src`
subtotal = 60
coupon = "WELCOME10"
percent = 0
free_shipping = False
match coupon:
    case "WELCOME10":
        percent = 10
    case "FREESHIP":
        free_shipping = True
    case "":
        percent = 0
    case _:
        print("Unknown coupon:", coupon)
discount = subtotal * percent / 100
after = subtotal - discount
if free_shipping or after >= 50:
    shipping = 0
else:
    shipping = 5
print("Discount:", discount)
print("Shipping:", shipping)
print("Total:", after + shipping)
`,
      alternatives: [src`
subtotal = 60
coupon = "WELCOME10"
percent = 0
free_shipping = False
if coupon:
    match coupon:
        case "WELCOME10":
            percent = 10
        case "FREESHIP":
            free_shipping = True
        case _:
            print("Unknown coupon:", coupon)
discount = subtotal * percent / 100
total = subtotal - discount
shipping = 0 if free_shipping or total >= 50 else 5
print("Discount:", discount)
print("Shipping:", shipping)
print("Total:", total + shipping)
`],
      wrong: [
        { code: src`
subtotal = 60
coupon = "WELCOME10"
percent = 0
free_shipping = False
match coupon:
    case "WELCOME10":
        percent = 10
    case "FREESHIP":
        free_shipping = True
    case "":
        percent = 0
    case _:
        print("Unknown coupon:", coupon)
discount = subtotal * percent / 100
after = subtotal - discount
if free_shipping or subtotal >= 50:
    shipping = 0
else:
    shipping = 5
print("Discount:", discount)
print("Shipping:", shipping)
print("Total:", after + shipping)
`, fails: ["v2"], why: "shipping is decided on the subtotal before the discount" },
        { code: src`
subtotal = 60
coupon = "WELCOME10"
percent = 0
free_shipping = False
match coupon:
    case "WELCOME10":
        percent = 10
    case "FREESHIP":
        free_shipping = True
    case _:
        print("Unknown coupon:", coupon)
discount = subtotal * percent / 100
after = subtotal - discount
if free_shipping or after >= 50:
    shipping = 0
else:
    shipping = 5
print("Discount:", discount)
print("Shipping:", shipping)
print("Total:", after + shipping)
`, fails: ["p1", "v3", "v5"], why: "an empty code reaches case _ and is reported as an unknown coupon" },
        { code: src`
subtotal = 60
coupon = "WELCOME10"
percent = 0
free_shipping = False
match coupon:
    case "WELCOME10":
        percent = 10
    case "FREESHIP":
        free_shipping = True
    case "":
        percent = 0
    case _:
        print("Unknown coupon:", coupon)
discount = percent
after = subtotal - discount
if free_shipping or after >= 50:
    shipping = 0
else:
    shipping = 5
print("Discount:", discount)
print("Shipping:", shipping)
print("Total:", after + shipping)
`, fails: ["output", "p1", "v1", "v2", "v3", "v4", "v5"], why: "10 is taken off as dollars instead of 10 percent" },
      ],
      task: {
        checks: [
          out("Discount: 6.0\nShipping: 0\nTotal: 54.0\n"),
          matched,
          shown("p1", { subtotal: 30, coupon: "" }, "Discount: 0.0\nShipping: 5\nTotal: 35.0\n"),
          rerun("v1", { subtotal: 40, coupon: "FREESHIP" }, "Discount: 0.0\nShipping: 0\nTotal: 40.0\n", { label: "free shipping by coupon" }),
          rerun("v2", { subtotal: 50, coupon: "WELCOME10" }, "Discount: 5.0\nShipping: 5\nTotal: 50.0\n", { label: "a discount that drops the subtotal under 50" }),
          rerun("v3", { subtotal: 20, coupon: "" }, "Discount: 0.0\nShipping: 5\nTotal: 25.0\n", { label: "no coupon" }),
          rerun("v4", { subtotal: 70, coupon: "BOGUS" }, "Unknown coupon: BOGUS\nDiscount: 0.0\nShipping: 0\nTotal: 70.0\n", { label: "an unknown code" }),
          rerun("v5", { subtotal: 50, coupon: "" }, "Discount: 0.0\nShipping: 0\nTotal: 50.0\n", { label: "exactly 50 with no coupon" }),
        ],
      },
    },
  },
  {
    id: "PY-Q04-20",
    version: 2,
    slug: "valid-date",
    title: "Is this a real date?",
    format: "validation",
    difficulty: "hard",
    minutes: 12,
    requires: ["assignment", "whole-number", "boolean", "arithmetic", "comparison", "logical", "precedence", "if-statement", "else-clause", "nested-condition", "conditional-expr", "print-call", "print-text", "unquoted-name", "top-level-indent", "reassignment"],
    prompt: "A booking form gets a year, a month and a day as numbers. Print `Bad month` for a month outside 1 to 12, `Bad day` for a day that doesn't exist in that month, and `Valid date` otherwise. April, June, September and November have 30 days; February has 29 in a leap year and 28 otherwise; the rest have 31. A leap year is divisible by 4, except years divisible by 100, which are leap years only when divisible by 400.",
    spec: [
      ["First lines", "`year = 2024`, `month = 2` and `day = 29`. Check runs your program again with other dates"],
      ["Prints", "`Valid date`"],
      ["Order", "check the month first"],
    ],
    hiddenKinds: ["29 February in a common year", "a century that is not a leap year", "a century that is a leap year", "31 April", "month 13", "day 0", "31 December"],
    hints: ["Work out how many days the month has first, then compare the day with it.", "Only February depends on the year. The leap-year rule has two parts joined by or.", "A day is valid from 1 up to and including the number of days in the month."],
    explanation: "After the month check, the number of days is chosen: February uses the leap-year rule (year % 4 == 0 and year % 100 != 0) or year % 400 == 0, so 1900 is not a leap year and 2000 is; the four 30-day months are tested together; every other month has 31. The day is valid when it is at least 1 and at most that number.",
    code: {
      starter: "year = 2024\nmonth = 2\nday = 29\n",
      answer: src`
year = 2024
month = 2
day = 29
if month < 1 or month > 12:
    print("Bad month")
else:
    if month == 2:
        leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
        days_in_month = 29 if leap else 28
    elif month == 4 or month == 6 or month == 9 or month == 11:
        days_in_month = 30
    else:
        days_in_month = 31
    if day >= 1 and day <= days_in_month:
        print("Valid date")
    else:
        print("Bad day")
`,
      alternatives: [src`
year = 2024
month = 2
day = 29
leap = year % 400 == 0 or (year % 4 == 0 and year % 100 != 0)
if month == 2:
    last = 29 if leap else 28
elif month == 4 or month == 6 or month == 9 or month == 11:
    last = 30
else:
    last = 31
if month < 1 or month > 12:
    print("Bad month")
elif day < 1 or day > last:
    print("Bad day")
else:
    print("Valid date")
`],
      wrong: [
        { code: src`
year = 2024
month = 2
day = 29
if month < 1 or month > 12:
    print("Bad month")
else:
    if month == 2:
        leap = year % 4 == 0
        days_in_month = 29 if leap else 28
    elif month == 4 or month == 6 or month == 9 or month == 11:
        days_in_month = 30
    else:
        days_in_month = 31
    if day >= 1 and day <= days_in_month:
        print("Valid date")
    else:
        print("Bad day")
`, fails: ["v2"], why: "1900 is divisible by 4, but as a century not divisible by 400 it is not a leap year" },
        { code: src`
year = 2024
month = 2
day = 29
if month < 1 or month > 12:
    print("Bad month")
else:
    if month == 2:
        leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
        days_in_month = 29 if leap else 28
    else:
        days_in_month = 31
    if day >= 1 and day <= days_in_month:
        print("Valid date")
    else:
        print("Bad day")
`, fails: ["p1", "v4"], why: "the 30-day months are given 31 days" },
        { code: src`
year = 2024
month = 2
day = 29
if month < 1 or month > 12:
    print("Bad month")
else:
    if month == 2:
        leap = (year % 4 == 0 and year % 100 != 0) or year % 400 == 0
        days_in_month = 29 if leap else 28
    elif month == 4 or month == 6 or month == 9 or month == 11:
        days_in_month = 30
    else:
        days_in_month = 31
    if day <= days_in_month:
        print("Valid date")
    else:
        print("Bad day")
`, fails: ["v6"], why: "day 0 is accepted" },
      ],
      task: {
        checks: [
          out("Valid date\n"),
          shown("p1", { year: 2025, month: 6, day: 31 }, "Bad day\n"),
          rerun("v1", { year: 2023 }, "Bad day\n", { label: "29 February in a common year" }),
          rerun("v2", { year: 1900 }, "Bad day\n", { label: "a century that is not a leap year" }),
          rerun("v3", { year: 2000 }, "Valid date\n", { label: "a century that is a leap year" }),
          rerun("v4", { month: 4, day: 31 }, "Bad day\n", { label: "31 April" }),
          rerun("v5", { month: 13, day: 1 }, "Bad month\n", { label: "month 13" }),
          rerun("v6", { month: 3, day: 0 }, "Bad day\n", { label: "day 0" }),
          rerun("v7", { month: 12, day: 31 }, "Valid date\n", { label: "31 December" }),
        ],
      },
    },
  },
  {
    id: "PY-Q04-22",
    version: 2,
    slug: "cinema-ticket-bugs",
    title: "Three bugs in the ticket desk",
    format: "debugging",
    difficulty: "hard",
    minutes: 12,
    requires: ["assignment", "reassignment", "input", "conversion", "whole-number", "string-value", "arithmetic", "comparison", "if-statement", "else-clause", "truthiness", "print-call", "print-text", "print-several", "unquoted-name", "top-level-indent"],
    prompt: "A cinema charges children under 12 `6`, people 65 and over `7`, and everyone else `11`. Students pay 2 less, whatever their ticket. The desk types the age and then `yes` or `no` for student. The program gives a 30-year-old non-student a student price, never sells a senior ticket, and has one more boundary bug. Fix all three.",
    spec: [
      ["Typed lines", "`30`, then `no`. Check also types other customers"],
      ["Prints", "`Age? Student? Price: 11`"],
    ],
    hiddenKinds: ["a student adult", "a senior", "exactly 65", "a student child", "exactly 12", "a student aged 64"],
    hints: ["Type no for student and follow the program: what does the test on student see?", "Any text with something in it counts as true, even no. Compare with \"yes\" instead.", "Only the first true branch runs, so a test that every senior also passes must not come first. Then check whether 65 itself is a senior."],
    explanation: "if student: is true for the text no, so everybody got the discount; student == \"yes\" asks the real question. age >= 12 came first, so every senior took the adult branch; testing under 12 first (or seniors first) fixes the order. And > 65 left a 65-year-old paying the adult price; >= 65 includes them.",
    code: {
      starter: src`
age = int(input("Age? "))
student = input("Student? ")
if age >= 12:
    price = 11
elif age > 65:
    price = 7
else:
    price = 6
if student:
    price = price - 2
print("Price:", price)
`,
      answer: src`
age = int(input("Age? "))
student = input("Student? ")
if age < 12:
    price = 6
elif age >= 65:
    price = 7
else:
    price = 11
if student == "yes":
    price = price - 2
print("Price:", price)
`,
      alternatives: [src`
age = int(input("Age? "))
student = input("Student? ")
if age >= 65:
    price = 7
elif age >= 12:
    price = 11
else:
    price = 6
if student == "yes":
    price -= 2
print("Price:", price)
`],
      wrong: [
        { code: src`
age = int(input("Age? "))
student = input("Student? ")
if age < 12:
    price = 6
elif age >= 65:
    price = 7
else:
    price = 11
if student:
    price = price - 2
print("Price:", price)
`, fails: ["output", "others", "edges"], why: "the text no still counts as true, so everyone gets the student discount" },
        { code: src`
age = int(input("Age? "))
student = input("Student? ")
if age < 12:
    price = 6
elif age > 65:
    price = 7
else:
    price = 11
if student == "yes":
    price = price - 2
print("Price:", price)
`, fails: ["edges"], why: "a 65-year-old still pays the adult price" },
        { code: src`
age = int(input("Age? "))
student = input("Student? ")
if age >= 12:
    price = 11
elif age >= 65:
    price = 7
else:
    price = 6
if student == "yes":
    price = price - 2
print("Price:", price)
`, fails: ["others", "edges"], why: "the adult test still comes first, so no one gets the senior price" },
      ],
      task: {
        stdin: "30\nno\n",
        checks: [
          out("Age? Student? Price: 11\n"),
          retyped("others", [
            [["30", "yes"], "Age? Student? Price: 9\n"],
            [["70", "no"], "Age? Student? Price: 7\n"],
            [["8", "yes"], "Age? Student? Price: 4\n"],
          ], "Works for other customers"),
          retyped("edges", [
            [["65", "no"], "Age? Student? Price: 7\n"],
            [["12", "no"], "Age? Student? Price: 11\n"],
            [["64", "yes"], "Age? Student? Price: 9\n"],
          ], "Works at the age boundaries"),
        ],
      },
    },
  },
];
