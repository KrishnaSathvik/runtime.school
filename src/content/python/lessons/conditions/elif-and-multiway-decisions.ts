import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

export const elifAndMultiwayDecisions: PyLesson = {
  slug: "elif-and-multiway-decisions",
  ref: "python:elif-and-multiway-decisions",
  module: "conditions",
  number: 3,
  title: "elif and multiway decisions",
  level: "beginner",
  summary:
    "Choose between three or more paths with `elif`. Python tests the conditions in order and runs only the first one that is true, so the order of your conditions is part of the logic.",

  sections: [
    {
      label: "if, elif, else",
      blocks: [
        {
          kind: "p",
          text: "`elif` (short for “else if”) adds another condition to an `if` statement. Python checks the conditions **from the top**, runs the block of the **first** one that is `True`, and skips all the rest. `else`, if present, runs only when none of them was `True`.",
        },
        { kind: "code", code: 'if score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelse:\n    grade = "F"' },
        {
          kind: "p",
          text: "A score of 85 fails the first test and passes the second, so `grade` is `\"B\"`. It also passes `score >= 70`, but that line is never checked: once a branch has run, the statement is finished.",
        },
      ],
    },
    {
      label: "order matters",
      blocks: [
        {
          kind: "p",
          text: "Because only the first true condition counts, a broad condition placed early hides the narrower ones below it. With thresholds, go from the highest down (using `>=`) or from the lowest up (using `<` or `<=`), and be consistent.",
        },
        {
          kind: "p",
          text: "Each band then only needs one comparison: by the time `elif score >= 80` is checked, you already know the score is below 90.",
        },
      ],
    },
    {
      label: "boundaries and the final else",
      blocks: [
        {
          kind: "p",
          text: "Write the bands down with their exact edges before coding: “up to 1 kg”, “over 1 kg and up to 5 kg”, and so on. Then test one value in each band and one value on every edge.",
        },
        {
          kind: "p",
          text: "A final `else` catches everything the conditions didn't. Use it for the last ordinary case, or for values that should never happen, so they are reported instead of silently falling through.",
        },
      ],
    },
  ],

  example: {
    caption: "Exam grades by band. Press Run to execute it with real Python; running examples never affects your progress. Try 90, 89 and 59.",
    code: 'score = 85\n\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelif score >= 60:\n    grade = "D"\nelse:\n    grade = "F"\n\nprint(f"Score {score} is grade {grade}")',
  },

  walkthrough: [
    {
      title: "Only the first true branch runs",
      text: "85 passes `>= 80` and also `>= 70`, but only the first true branch runs, so only `B` is printed.",
      code: 'score = 85\nif score >= 90:\n    print("A")\nelif score >= 80:\n    print("B")\nelif score >= 70:\n    print("C")\nprint("done")',
    },
    {
      title: "else catches the rest",
      text: "None of the conditions is true for 40, so the `else` block runs.",
      code: 'score = 40\nif score >= 90:\n    grade = "A"\nelif score >= 60:\n    grade = "pass"\nelse:\n    grade = "fail"\nprint(grade)',
    },
    {
      title: "Separate ifs are not the same as elif",
      text: "With three separate `if` statements, every true condition runs, so 95 prints all three. `elif` makes them one decision.",
      code: 'score = 95\nif score >= 90:\n    print("A")\nif score >= 80:\n    print("B")\nif score >= 70:\n    print("C")',
    },
    {
      title: "Bands from the lowest up",
      text: "Going up with `<=` works just as well, as long as every condition goes the same direction.",
      code: 'weight_kg = 5\nif weight_kg <= 1:\n    band = "small"\nelif weight_kg <= 5:\n    band = "medium"\nelse:\n    band = "large"\nprint(band)',
    },
  ],

  mistakes: [
    {
      title: "Putting a broad condition first",
      text: "`score >= 60` is true for every passing score, so it catches 95 before the A test is ever reached.",
      code: 'score = 95\nif score >= 60:\n    grade = "D"\nelif score >= 90:\n    grade = "A"\nelse:\n    grade = "F"\nprint(grade)',
      fix: "Order thresholds from the highest down when using `>=`.",
    },
    {
      title: "elif without an if",
      text: "`elif` and `else` must follow an `if` at the same indentation. On its own, `elif` is a `SyntaxError`.",
      code: 'score = 70\nelif score >= 60:\n    print("D")',
      raises: "SyntaxError",
      fix: "Start the decision with `if`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Grade exam scores",
      prompt:
        "Turn a `score` (0–100) into a letter `grade`: 90 or more is `A`, 80–89 is `B`, 70–79 is `C`, 60–69 is `D`, and below 60 is `F`. Print the result as shown. Check answer tests a score in every band and on every edge.",
      expectedOutput: "Score 85: B\n",
      looksFor: [
        "`grade` follows the bands exactly, including the edges (90 is `A`, 89 is `B`, 60 is `D`, 59 is `F`).",
        "The program prints `Score <score>: <grade>`.",
      ],
      starter: "score = 85\n\n# Set grade with if/elif/else, then print it.\n",
      task: {
        checks: [
          { kind: "variable", id: "grade", name: "grade", expected: py.str("B") },
          { kind: "output", id: "output", label: "Prints the grade", expected: "Score 85: B\n", tip: 'print(f"Score {score}: {grade}").' },
          { kind: "variant", id: "v-90", set: { score: py.int(90) }, vars: { grade: py.str("A") }, tip: "“90 or more” includes 90: use >=." },
          { kind: "variant", id: "v-89", set: { score: py.int(89) }, vars: { grade: py.str("B") } },
          { kind: "variant", id: "v-60", set: { score: py.int(60) }, vars: { grade: py.str("D") } },
          { kind: "variant", id: "v-59", set: { score: py.int(59) }, output: "Score 59: F\n" },
          { kind: "variant", id: "v-hidden-100", hidden: true, set: { score: py.int(100) }, vars: { grade: py.str("A") } },
          { kind: "variant", id: "v-hidden-70", hidden: true, set: { score: py.int(70) }, vars: { grade: py.str("C") } },
          { kind: "variant", id: "v-hidden-0", hidden: true, set: { score: py.int(0) }, vars: { grade: py.str("F") } },
        ],
      },
      hints: [
        "Start with the highest band: if score >= 90: grade = \"A\".",
        "Each elif only needs a lower threshold, because higher scores were caught already: elif score >= 80: grade = \"B\".",
        "Anything that isn't 60 or more is an F: that's the final else.",
      ],
      answer: 'score = 85\n\nif score >= 90:\n    grade = "A"\nelif score >= 80:\n    grade = "B"\nelif score >= 70:\n    grade = "C"\nelif score >= 60:\n    grade = "D"\nelse:\n    grade = "F"\nprint(f"Score {score}: {grade}")',
      alternatives: ['score = 85\nif score < 60:\n    grade = "F"\nelif score < 70:\n    grade = "D"\nelif score < 80:\n    grade = "C"\nelif score < 90:\n    grade = "B"\nelse:\n    grade = "A"\nprint("Score " + str(score) + ": " + grade)\n'],
      wrong: [
        { code: 'score = 85\nif score > 90:\n    grade = "A"\nelif score > 80:\n    grade = "B"\nelif score > 70:\n    grade = "C"\nelif score > 60:\n    grade = "D"\nelse:\n    grade = "F"\nprint(f"Score {score}: {grade}")\n', fails: ["v-90", "v-60", "v-hidden-70"], why: "> misses every edge" },
        { code: 'score = 85\nif score >= 60:\n    grade = "D"\nelif score >= 70:\n    grade = "C"\nelif score >= 80:\n    grade = "B"\nelif score >= 90:\n    grade = "A"\nelse:\n    grade = "F"\nprint(f"Score {score}: {grade}")\n', fails: ["grade", "output", "v-90", "v-89", "v-hidden-100", "v-hidden-70"], why: "broad condition first" },
        { code: 'score = 85\ngrade = "F"\nif score >= 90:\n    grade = "A"\nif score >= 80:\n    grade = "B"\nif score >= 70:\n    grade = "C"\nif score >= 60:\n    grade = "D"\nprint(f"Score {score}: {grade}")\n', fails: ["grade", "output", "v-90", "v-89", "v-hidden-100", "v-hidden-70"], why: "separate ifs: the last true one wins" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix the parcel bands",
      prompt:
        "Parcels are priced by weight: up to 1 kg is `small` (3.50), over 1 kg up to 5 kg is `medium` (7.00), over 5 kg up to 20 kg is `large` (15.00), and anything heavier is `freight` (40.00). This program puts nearly every parcel in the large band. Fix the decision so `band` and `cost` are right for every weight, then print them as shown.",
      expectedOutput: "Band: medium\nCost: 7.0\n",
      looksFor: [
        "`band` and `cost` follow the table for every weight, including exactly 1, 5 and 20 kg.",
        "The program prints the band and the cost as shown.",
      ],
      starter: 'weight_kg = 2.5\n\nif weight_kg <= 20:\n    band = "large"\n    cost = 15.0\nelif weight_kg <= 5:\n    band = "medium"\n    cost = 7.0\nelif weight_kg <= 1:\n    band = "small"\n    cost = 3.5\nelse:\n    band = "freight"\n    cost = 40.0\n\nprint("Band:", band)\nprint("Cost:", cost)\n',
      task: {
        checks: [
          { kind: "variable", id: "band", name: "band", expected: py.str("medium") },
          { kind: "variable", id: "cost", name: "cost", expected: py.float(7.0) },
          { kind: "output", id: "output", label: "Prints band and cost", expected: "Band: medium\nCost: 7.0\n" },
          { kind: "variant", id: "v-1", set: { weight_kg: py.int(1) }, vars: { band: py.str("small"), cost: py.float(3.5) } },
          { kind: "variant", id: "v-5", set: { weight_kg: py.int(5) }, vars: { band: py.str("medium") } },
          { kind: "variant", id: "v-20", set: { weight_kg: py.int(20) }, vars: { band: py.str("large") } },
          { kind: "variant", id: "v-25", set: { weight_kg: py.float(20.5) }, output: "Band: freight\nCost: 40.0\n" },
          { kind: "variant", id: "v-hidden", hidden: true, set: { weight_kg: py.float(0.2) }, vars: { band: py.str("small") } },
        ],
      },
      hints: [
        "Run it with weight_kg = 0.5: which branch runs, and why?",
        "Any weight up to 1 kg is also up to 20 kg, so the first condition catches it. Check the narrowest band first.",
        "Reorder the branches: <= 1, then <= 5, then <= 20, then else.",
      ],
      answer: 'weight_kg = 2.5\n\nif weight_kg <= 1:\n    band = "small"\n    cost = 3.5\nelif weight_kg <= 5:\n    band = "medium"\n    cost = 7.0\nelif weight_kg <= 20:\n    band = "large"\n    cost = 15.0\nelse:\n    band = "freight"\n    cost = 40.0\n\nprint("Band:", band)\nprint("Cost:", cost)',
      alternatives: ['weight_kg = 2.5\nif weight_kg > 20:\n    band = "freight"\n    cost = 40.0\nelif weight_kg > 5:\n    band = "large"\n    cost = 15.0\nelif weight_kg > 1:\n    band = "medium"\n    cost = 7.0\nelse:\n    band = "small"\n    cost = 3.5\nprint("Band:", band)\nprint("Cost:", cost)\n'],
      wrong: [
        { code: 'weight_kg = 2.5\nif weight_kg < 1:\n    band = "small"\n    cost = 3.5\nelif weight_kg < 5:\n    band = "medium"\n    cost = 7.0\nelif weight_kg < 20:\n    band = "large"\n    cost = 15.0\nelse:\n    band = "freight"\n    cost = 40.0\nprint("Band:", band)\nprint("Cost:", cost)\n', fails: ["v-1", "v-5", "v-20"], why: "< puts each edge in the next band" },
      ],
    },
  ],

  quiz: [
    {
      id: "first-true",
      prompt: "What does this program print?",
      code: 'temp = 30\nif temp > 10:\n    print("mild")\nelif temp > 25:\n    print("hot")\nelse:\n    print("cold")',
      options: [
        { text: "`mild`", correct: true, why: "30 > 10 is the first true condition, so that branch runs and the rest are skipped, even though 30 > 25 is true too." },
        { text: "`hot`", why: "Python never reaches `temp > 25`: the first true condition wins. The thresholds are in the wrong order for this rule." },
        { text: "`mild`, then `hot`", why: "In an `if`/`elif` chain only one branch runs." },
        { text: "`cold`", why: "`else` runs only when every condition was `False`." },
      ],
    },
    {
      id: "edges",
      prompt: "A rule says “0–17 child, 18–64 adult, 65 and over senior”. Which code is correct for every whole-number age?",
      options: [
        { text: '`if age >= 65: … elif age >= 18: … else: …` with senior, adult, child', correct: true, why: "Highest threshold first with `>=`: 65 is senior, 64 and 18 are adults, 17 is a child." },
        { text: '`if age > 65: … elif age > 18: … else: …` with senior, adult, child', why: "`>` leaves out the edges: 65 would be an adult and 18 a child." },
        { text: '`if age >= 18: … elif age >= 65: … else: …` with adult, senior, child', why: "`age >= 18` is true for seniors too, so the senior branch can never run." },
        { text: "Three separate `if` statements", why: "Separate `if`s let a 70-year-old match both the adult and the senior conditions." },
      ],
    },
  ],

  outcomes: [
    "Write `if`/`elif`/`else` decisions with three or more paths.",
    "Predict which branch runs: the first true condition, from the top.",
    "Order conditions so narrow cases aren't hidden by broad ones.",
    "Test every band and every edge of a rule.",
  ],
};
