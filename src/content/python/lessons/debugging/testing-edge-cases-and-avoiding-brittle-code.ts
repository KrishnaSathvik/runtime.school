import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { mutationCheck } from "../../checks";

const t = py.bool(true);
const x = py.bool(false);

const BAND_OK = `def shipping_band(weight_kg):
    if weight_kg <= 0:
        raise ValueError("weight must be positive")
    if weight_kg <= 1:
        return "small"
    if weight_kg <= 5:
        return "medium"
    if weight_kg <= 20:
        return "large"
    return "freight"`;
const BAND_EDGE_1 = BAND_OK.replace("weight_kg <= 1:", "weight_kg < 1:");
const BAND_EDGE_20 = BAND_OK.replace("weight_kg <= 20:", "weight_kg < 20:");
const BAND_NO_GUARD = BAND_OK.replace('    if weight_kg <= 0:\n        raise ValueError("weight must be positive")\n', "");

const SPLIT_FIRST = `def split_bill(total, people):
    cents = round(total * 100)
    base, extra = divmod(cents, people)
    return [(base + (1 if i < extra else 0)) / 100 for i in range(people)]`;
const SPLIT_LAST = `def split_bill(total, people):
    cents = round(total * 100)
    base, extra = divmod(cents, people)
    return [(base + (1 if i >= people - extra else 0)) / 100 for i in range(people)]`;
const SPLIT_ROUNDED = `def split_bill(total, people):
    return [round(total / people, 2) for _ in range(people)]`;
const SPLIT_UP = `def split_bill(total, people):
    cents = round(total * 100)
    return [-(-cents // people) / 100 for _ in range(people)]`;

export const testingEdgeCasesAndAvoidingBrittleCode: PyLesson = {
  slug: "testing-edge-cases-and-avoiding-brittle-code",
  ref: "python:testing-edge-cases-and-avoiding-brittle-code",
  module: "debugging",
  number: 6,
  title: "Testing edge cases and avoiding brittle code",
  level: "intermediate",
  summary:
    "Choose test cases that find bugs: boundaries, empty and single inputs, and one case from each kind of input. And write tests that check what the code promises, not accidental details like float digits or the order of a set, so they don't break when the code is still right.",

  sections: [
    {
      label: "where bugs live",
      blocks: [
        {
          kind: "p",
          text: "Split the possible inputs into groups that should behave the same (**equivalence classes**): for parcel bands, “small”, “medium”, “large”, “freight” and “invalid”. Test one value from the middle of each group, then **every boundary** between them, on both sides: 1 and just over 1, 5 and just over 5, 20 and just over 20, and 0. Off-by-one mistakes (`<` instead of `<=`) only show up exactly on a boundary.",
        },
        {
          kind: "p",
          text: "Add the shapes that break code: empty input, a single item, duplicates, the largest and smallest values, and invalid input that should raise. A table of `(input, expected)` pairs keeps many cases readable:",
        },
        { kind: "code", code: 'cases = [(0.5, "small"), (1, "small"), (1.01, "medium"), (5, "medium"), (20, "large"), (20.5, "freight")]\nfor weight, expected in cases:\n    assert shipping_band(weight) == expected, f"{weight}: expected {expected}"' },
      ],
    },
    {
      label: "brittle tests",
      blocks: [
        {
          kind: "p",
          text: "A **brittle** test fails when the code is still correct, because it checks something the code never promised. The usual causes: comparing floats with `==` (use `math.isclose`), depending on the order of a set or on which of two equal items comes first (compare `sorted(...)`, or check the property you care about), comparing printed text instead of values, and depending on randomness or the current time (seed the generator, or pass the time in).",
        },
        {
          kind: "p",
          text: "Test the **contract**, not the implementation. If a function promises “shares that differ by at most a cent and add up to the total”, test exactly that, so a different correct implementation still passes, and a wrong one still fails.",
        },
      ],
    },
  ],

  example: {
    caption: "A table of boundary cases, and a contract test that doesn't depend on order or float digits. Press Run to execute it with real Python; running examples never affects your progress.",
    code: `import math

${BAND_OK}


cases = [(0.5, "small"), (1, "small"), (1.01, "medium"), (5, "medium"), (5.01, "large"), (20, "large"), (20.01, "freight")]
for weight, expected in cases:
    assert shipping_band(weight) == expected, f"{weight}: expected {expected}"
print(len(cases), "band cases passed")

${SPLIT_FIRST}


shares = split_bill(10, 3)
print(shares)
assert len(shares) == 3
assert math.isclose(sum(shares), 10)
assert max(shares) - min(shares) <= 0.01 + 1e-9
print("contract holds")`,
  },

  walkthrough: [
    {
      title: "The boundary finds the off-by-one",
      text: "Both versions agree in the middle of each band. Only the boundary value, exactly 1 kg, shows the difference.",
      code: `${BAND_EDGE_1}

print(shipping_band(0.5), shipping_band(3))
print(shipping_band(1))`,
    },
    {
      title: "Floats: isclose, not ==",
      text: "The average is correct, but its last digit isn't what a person would write, so `==` fails and `isclose` passes.",
      code: "import math\nvalues = [0.1, 0.2, 0.3]\navg = sum(values) / len(values)\nprint(avg, avg == 0.2, math.isclose(avg, 0.2))",
    },
    {
      title: "Order isn't always part of the contract",
      text: "Both lists are valid splits of 10 between three people. Comparing sorted lists (or checking properties) accepts both.",
      code: "a = [3.34, 3.33, 3.33]\nb = [3.33, 3.33, 3.34]\nprint(a == b, sorted(a) == sorted(b))",
    },
    {
      title: "Seed randomness in tests",
      text: "With a fixed seed the “random” sample is the same on every run, so a test can rely on it.",
      code: "import random\nrandom.seed(1)\nfirst = random.sample(range(100), 3)\nrandom.seed(1)\nprint(first, random.sample(range(100), 3) == first)",
    },
  ],

  mistakes: [
    {
      title: "A test that depends on order",
      text: "The function is correct, but the test expects the extra cent to go to the last person; this implementation gives it to the first, so the test fails.",
      code: `${SPLIT_FIRST}


assert split_bill(10, 3) == [3.33, 3.33, 3.34]`,
      raises: "AssertionError",
      fix: "Check what the function promises: `sorted(shares) == [3.33, 3.33, 3.34]`, or that the shares add up to the total and differ by at most a cent.",
    },
    {
      title: "Only testing the middle of each range",
      text: "Every case passes, yet the function puts exactly 1 kg in the wrong band. The test never looked at a boundary.",
      code: `${BAND_EDGE_1}


for weight, expected in [(0.5, "small"), (3, "medium"), (10, "large"), (50, "freight")]:
    assert shipping_band(weight) == expected
print("all passed, but shipping_band(1) is", shipping_band(1))`,
      fix: "Add each boundary to the cases: 1, 5 and 20, and the values just above them.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Test the parcel bands at every edge",
      prompt:
        "`shipping_band(weight_kg)` returns `small` (up to 1 kg), `medium` (over 1, up to 5), `large` (over 5, up to 20) or `freight` (over 20), and raises `ValueError` for 0 or less. Write `test_shipping_band()` so it passes for the correct function in the editor, and fails for three broken versions: one with the wrong edge at 1 kg, one with the wrong edge at 20 kg, and one that doesn't reject 0.",
      looksFor: [
        "`test_shipping_band()` passes for the correct function.",
        "It fails for each broken version: wrong edge at 1, wrong edge at 20, and no error for 0.",
      ],
      starter: `${BAND_OK}


def test_shipping_band():
    # Test each band, each boundary, and that 0 raises ValueError.
    pass


test_shipping_band()
print("test_shipping_band passed")
`,
      task: {
        checks: [
          { kind: "output", id: "output", label: "Your test passes for the correct function", expected: "test_shipping_band passed\n" },
          {
            kind: "expr",
            id: "catches",
            label: "Your test fails for each broken version",
            show: "test_shipping_band() with the correct function, then three broken ones",
            expr: mutationCheck("test_shipping_band", "shipping_band", [BAND_OK, BAND_EDGE_1, BAND_EDGE_20, BAND_NO_GUARD]),
            expected: py.list(t, x, x, x),
            tip: "Test the boundary values themselves (1 and 20), not just values in the middle of each band, and check that 0 raises ValueError.",
          },
        ],
      },
      hints: [
        "Make a table of (weight, expected) pairs that includes 1, 5 and 20 exactly.",
        'Loop over it: assert shipping_band(weight) == expected.',
        "Then try: shipping_band(0) / except ValueError: pass / else: raise AssertionError(...).",
      ],
      answer: `${BAND_OK}


def test_shipping_band():
    cases = [(0.5, "small"), (1, "small"), (1.5, "medium"), (5, "medium"), (6, "large"), (20, "large"), (20.5, "freight")]
    for weight, expected in cases:
        assert shipping_band(weight) == expected, f"{weight}: expected {expected}"
    try:
        shipping_band(0)
    except ValueError:
        pass
    else:
        raise AssertionError("shipping_band(0) should raise ValueError")


test_shipping_band()
print("test_shipping_band passed")`,
      wrong: [
        { code: `${BAND_OK}\n\ndef test_shipping_band():\n    for weight, expected in [(0.5, "small"), (3, "medium"), (10, "large"), (50, "freight")]:\n        assert shipping_band(weight) == expected\n\ntest_shipping_band()\nprint("test_shipping_band passed")\n`, fails: ["catches"], why: "no boundaries, no error case" },
      ],
    },
    {
      id: "challenge-2",
      title: "Fix a brittle test",
      prompt:
        "`split_bill(total, people)` promises: a list with one share per person, shares that differ by at most one cent, adding up to the total. The test in the editor fails even though `split_bill` is correct, because it expects the extra cent in one particular place. Rewrite `test_split_bill()` to check the **contract** instead, so it passes for any correct implementation and still fails for wrong ones.",
      looksFor: [
        "`test_split_bill()` passes for the correct function in the editor, and for another correct version that gives the extra cents to the last people instead.",
        "It fails for a version whose shares don't add up to the total, and for one that rounds every share up.",
      ],
      starter: `${SPLIT_FIRST}


def test_split_bill():
    assert split_bill(10, 3) == [3.33, 3.33, 3.34]
    assert split_bill(100, 7) == [14.28, 14.28, 14.28, 14.29, 14.29, 14.29, 14.29]


test_split_bill()
print("test_split_bill passed")
`,
      task: {
        checks: [
          { kind: "output", id: "output", label: "Your test passes for the correct function", expected: "test_split_bill passed\n" },
          {
            kind: "expr",
            id: "contract",
            label: "Passes for both correct versions; fails for the broken ones",
            show: "test_split_bill() with two correct and two broken versions",
            expr: mutationCheck("test_split_bill", "split_bill", [SPLIT_FIRST, SPLIT_LAST, SPLIT_ROUNDED, SPLIT_UP]),
            expected: py.list(t, t, x, x),
            tip: "Check the length, that math.isclose(sum(shares), total), and that max(shares) - min(shares) is at most 0.01 (plus a tiny tolerance).",
          },
        ],
      },
      hints: [
        "Run it: the test fails on a correct result. The order of the shares isn't part of the promise.",
        "Check properties instead: len(shares) == people, math.isclose(sum(shares), total), max(shares) - min(shares) <= 0.01 + 1e-9.",
        "Check those properties for a few calls, such as (10, 3), (100, 7) and (1, 4).",
      ],
      answer: `import math

${SPLIT_FIRST}


def test_split_bill():
    for total, people in [(10, 3), (100, 7), (1, 4), (0.05, 2)]:
        shares = split_bill(total, people)
        assert len(shares) == people
        assert math.isclose(sum(shares), total), f"shares of {total} add up to {sum(shares)}"
        assert max(shares) - min(shares) <= 0.01 + 1e-9


test_split_bill()
print("test_split_bill passed")`,
      alternatives: [
        `${SPLIT_FIRST}\n\ndef test_split_bill():\n    assert sorted(split_bill(10, 3)) == [3.33, 3.33, 3.34]\n    assert sorted(split_bill(100, 7)) == [14.28, 14.28, 14.28, 14.29, 14.29, 14.29, 14.29]\n\ntest_split_bill()\nprint("test_split_bill passed")\n`,
      ],
      wrong: [
        { code: `${SPLIT_FIRST}\n\ndef test_split_bill():\n    shares = split_bill(10, 3)\n    assert len(shares) == 3\n\ntest_split_bill()\nprint("test_split_bill passed")\n`, fails: ["contract"], why: "too weak: wrong totals pass" },
      ],
    },
  ],

  quiz: [
    {
      id: "boundaries",
      prompt: "A discount applies to orders “over 100”. Which set of test totals is best?",
      options: [
        { text: "50, 100, 100.01 and 500", correct: true, why: "One value well inside each side, plus the boundary itself and the smallest value just over it." },
        { text: "50 and 500", why: "Both are far from the boundary, so `>` and `>=` would both pass." },
        { text: "100 only", why: "One case can't tell you how the rest of each range behaves." },
        { text: "Every whole number from 1 to 1000", why: "That's slow and still misses 100.01; well-chosen cases beat many cases." },
      ],
    },
    {
      id: "brittle",
      prompt: "Which assertion is brittle?",
      options: [
        { text: '`assert str(unique_tags(posts)) == "{\'sale\', \'new\'}"`', correct: true, why: "It depends on the order of a set and on its printed form, neither of which is promised." },
        { text: '`assert unique_tags(posts) == {"sale", "new"}`', why: "Set comparison ignores order, so this checks exactly the contract." },
        { text: "`assert math.isclose(average([0.1, 0.2]), 0.15)`", why: "`isclose` allows for float rounding, so it's robust." },
        { text: "`assert sorted(names) == [\"Ana\", \"Ben\"]`", why: "Sorting first removes any dependence on the original order." },
      ],
    },
  ],

  outcomes: [
    "Choose test cases from each kind of input and at every boundary.",
    "Include empty, single, duplicate and invalid inputs.",
    "Avoid brittle tests: use `math.isclose`, compare sorted or set values, and seed randomness.",
    "Test the contract, so any correct implementation passes and wrong ones fail.",
  ],
};
