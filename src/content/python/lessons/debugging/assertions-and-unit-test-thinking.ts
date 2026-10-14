import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";
import { mutationCheck } from "../../checks";

const DISCOUNT_OK = "def discount(price, percent):\n    return round(price * (1 - percent / 100), 2)";
const DISCOUNT_NO_ROUND = "def discount(price, percent):\n    return price * (1 - percent / 100)";
const DISCOUNT_WRONG_WAY = "def discount(price, percent):\n    return round(price * percent / 100, 2)";
const DISCOUNT_FRACTION = "def discount(price, percent):\n    return round(price * (1 - percent), 2)";

const CHECK_OK = 'def check_quantity(q):\n    if q < 0:\n        raise ValueError("negative quantity")\n    return q';
const CHECK_SILENT = "def check_quantity(q):\n    return max(q, 0)";
const CHECK_WRONG_TYPE = 'def check_quantity(q):\n    if q < 0:\n        raise TypeError("negative quantity")\n    return q';

export const assertionsAndUnitTestThinking: PyLesson = {
  slug: "assertions-and-unit-test-thinking",
  ref: "python:assertions-and-unit-test-thinking",
  module: "debugging",
  number: 5,
  title: "Assertions and unit-test thinking",
  level: "intermediate",
  summary:
    "Check your own code automatically: `assert` that something is true, write small test functions that call your code with known inputs and compare the results, and test that bad input raises the right error. A test is only useful if it fails when the code is wrong.",

  sections: [
    {
      label: "assert",
      blocks: [
        {
          kind: "p",
          text: "`assert condition, message` does nothing when the condition is true, and raises `AssertionError` with the message when it's false. It's a statement of what you believe must be true at that point.",
        },
        { kind: "code", code: 'assert discount(100, 10) == 90.0, "10% off 100 should be 90"' },
        {
          kind: "p",
          text: "Use `assert` in tests and for internal sanity checks. Don't use it to validate input from users or files: Python can be run with assertions switched off (`python -O`), and the right tool for bad input is `raise ValueError`.",
        },
      ],
    },
    {
      label: "a test is a function that checks a function",
      blocks: [
        {
          kind: "p",
          text: "A **unit test** calls one piece of code with inputs whose correct answer you already know, and asserts the result. Test functions are conventionally named `test_…`, take no arguments and return nothing: passing means they finish without an error. Tools like `pytest` find and run every `test_…` function and report which failed.",
        },
        { kind: "code", code: 'def test_discount():\n    assert discount(100, 10) == 90.0     # an ordinary case\n    assert discount(19.99, 0) == 19.99   # no discount\n    assert discount(50, 100) == 0.0      # everything off\n    assert discount(9.99, 15) == 8.49    # rounding' },
        {
          kind: "p",
          text: "Each assertion has three parts: arrange the input, act (call the function), assert the expected result. Choose cases that would catch a real mistake: the normal case, the boundaries, and the case where rounding or ordering matters.",
        },
      ],
    },
    {
      label: "testing that errors are raised",
      blocks: [
        {
          kind: "p",
          text: "To check that bad input is rejected, call the function inside `try`, fail if it **didn't** raise, and catch the specific error you expect:",
        },
        { kind: "code", code: 'def test_rejects_negative():\n    try:\n        check_quantity(-1)\n    except ValueError:\n        pass\n    else:\n        raise AssertionError("check_quantity(-1) should raise ValueError")' },
        {
          kind: "p",
          text: "`pytest.raises(ValueError)` does the same thing more compactly, if you use pytest. The question to ask of every test: **would it fail if the code were wrong?** A test that passes for broken code is worse than no test, because it gives false confidence.",
        },
      ],
    },
  ],

  example: {
    caption: "A function, its tests, and a tiny runner. Press Run to execute it with real Python; running examples never affects your progress.",
    code: `${DISCOUNT_OK}


def test_discount():
    assert discount(100, 10) == 90.0
    assert discount(50, 100) == 0.0
    assert discount(9.99, 15) == 8.49


def test_no_discount():
    assert discount(19.99, 0) == 19.99


for test in [test_discount, test_no_discount]:
    test()
    print("passed:", test.__name__)`,
  },

  walkthrough: [
    {
      title: "assert is silent when true",
      text: "The first assertion holds, so nothing happens. The second is false, so it raises `AssertionError` with its message.",
      code: 'total = 2 + 2\nassert total == 4, "maths still works"\nprint("first assertion passed")\nassert total == 5, f"expected 5, got {total}"',
    },
    {
      title: "A test catches a real bug",
      text: "This version forgets to round. The ordinary case still passes, but the rounding case fails, which is exactly why it's in the test.",
      code: `${DISCOUNT_NO_ROUND}

assert discount(100, 10) == 90.0
print("ordinary case passed")
assert discount(9.99, 15) == 8.49, f"got {discount(9.99, 15)}"`,
    },
    {
      title: "Testing for an expected error",
      text: "The test passes only if `ValueError` is raised; if the function quietly returns, `else` fails the test.",
      code: `${CHECK_OK}


def test_rejects_negative():
    try:
        check_quantity(-1)
    except ValueError:
        pass
    else:
        raise AssertionError("check_quantity(-1) should raise ValueError")


test_rejects_negative()
print("passed")`,
    },
    {
      title: "Running tests and reporting failures",
      text: "A small loop runs every test and reports failures without stopping at the first one, like a test runner does.",
      code: `def double(n):
    return n + n

def test_positive():
    assert double(3) == 6

def test_zero():
    assert double(0) == 0

def test_wrong():
    assert double(2) == 5, "this test itself is wrong"

for test in [test_positive, test_zero, test_wrong]:
    try:
        test()
        print("PASS", test.__name__)
    except AssertionError as error:
        print("FAIL", test.__name__, "-", error)`,
    },
  ],

  mistakes: [
    {
      title: "A test that can't fail",
      text: "This “test” calls the function but asserts nothing about the result, so it passes even though the function is wrong.",
      code: `${DISCOUNT_WRONG_WAY}


def test_discount():
    result = discount(100, 10)
    assert result is not None


test_discount()
print("passed, but discount(100, 10) is", discount(100, 10))`,
      fix: "Assert the exact expected value: `assert discount(100, 10) == 90.0`.",
    },
    {
      title: "Comparing floats exactly in a test",
      text: "The sum is `0.30000000000000004`, so the exact comparison fails although the code is right.",
      code: "def total(prices):\n    return sum(prices)\n\nassert total([0.1, 0.2]) == 0.3",
      raises: "AssertionError",
      fix: "Compare floats with a tolerance: `assert math.isclose(total([0.1, 0.2]), 0.3)`.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Write tests that catch a broken discount",
      prompt:
        "`discount(price, percent)` returns the price after taking `percent` percent off, rounded to 2 decimal places. Write `test_discount()`, with `assert` statements, so that it **passes** for the correct `discount` in the editor and **fails** for broken versions. Check answer swaps in three realistic bugs: one that forgets to round, one that returns the discount instead of the new price, and one that treats `percent` as a fraction.",
      looksFor: [
        "`test_discount()` passes when `discount` is correct.",
        "It fails (raises `AssertionError`) for each of the three broken versions.",
      ],
      starter: `${DISCOUNT_OK}


def test_discount():
    # Assert results for a few well-chosen inputs.
    pass


test_discount()
print("test_discount passed")
`,
      task: {
        checks: [
          { kind: "output", id: "output", label: "Your test passes for the correct discount", expected: "test_discount passed\n" },
          {
            kind: "expr",
            id: "catches",
            label: "Your test fails for the broken versions (no rounding, discount returned, percent as a fraction)",
            show: "test_discount() with the correct discount, then with three broken ones",
            expr: mutationCheck("test_discount", "discount", [DISCOUNT_OK, DISCOUNT_NO_ROUND, DISCOUNT_WRONG_WAY, DISCOUNT_FRACTION]),
            expected: py.list(py.bool(true), py.bool(false), py.bool(false), py.bool(false)),
            tip: "Include a case where rounding matters (like 9.99 with 15% off), and check the exact expected price.",
          },
        ],
      },
      hints: [
        "Work out a few answers by hand: 10% off 100 is 90.0.",
        "A case like 15% off 9.99 is 8.4915 before rounding, so it catches the missing round.",
        "assert discount(100, 10) == 90.0 and assert discount(9.99, 15) == 8.49.",
      ],
      answer: `${DISCOUNT_OK}


def test_discount():
    assert discount(100, 10) == 90.0
    assert discount(9.99, 15) == 8.49
    assert discount(50, 100) == 0.0


test_discount()
print("test_discount passed")`,
      wrong: [
        { code: `${DISCOUNT_OK}\n\ndef test_discount():\n    assert discount(100, 10) == 90.0\n\ntest_discount()\nprint("test_discount passed")\n`, fails: ["catches"], why: "misses the rounding bug" },
        { code: `${DISCOUNT_OK}\n\ndef test_discount():\n    assert discount(100, 10) is not None\n\ntest_discount()\nprint("test_discount passed")\n`, fails: ["catches"], why: "can't fail" },
      ],
    },
    {
      id: "challenge-2",
      title: "Test that bad input is rejected",
      prompt:
        "`check_quantity(q)` should return `q` for 0 and above, and raise `ValueError` for negative numbers. Write `test_check_quantity()`: it must pass for the correct version, and fail for a version that silently turns negatives into 0, and for one that raises the wrong type of error.",
      looksFor: [
        "`test_check_quantity()` passes for the correct `check_quantity`.",
        "It fails for a version that doesn't raise, and for one that raises `TypeError` instead of `ValueError`.",
      ],
      starter: `${CHECK_OK}


def test_check_quantity():
    # Check a valid quantity, and that -1 raises ValueError.
    pass


test_check_quantity()
print("test_check_quantity passed")
`,
      task: {
        checks: [
          { kind: "output", id: "output", label: "Your test passes for the correct function", expected: "test_check_quantity passed\n" },
          {
            kind: "expr",
            id: "catches",
            label: "Your test fails when negatives aren't rejected, or the wrong error is raised",
            show: "test_check_quantity() with the correct function, then with two broken ones",
            expr: mutationCheck("test_check_quantity", "check_quantity", [CHECK_OK, CHECK_SILENT, CHECK_WRONG_TYPE]),
            expected: py.list(py.bool(true), py.bool(false), py.bool(false)),
            tip: "Use try / except ValueError / else: raise AssertionError(...), so the test fails when no error is raised. Catch only ValueError.",
          },
        ],
      },
      hints: [
        "First an ordinary case: assert check_quantity(3) == 3.",
        "Then call check_quantity(-1) inside try:, with except ValueError: pass.",
        'Add else: raise AssertionError("expected ValueError"), so a missing error fails the test.',
      ],
      answer: `${CHECK_OK}


def test_check_quantity():
    assert check_quantity(3) == 3
    assert check_quantity(0) == 0
    try:
        check_quantity(-1)
    except ValueError:
        pass
    else:
        raise AssertionError("check_quantity(-1) should raise ValueError")


test_check_quantity()
print("test_check_quantity passed")`,
      wrong: [
        { code: `${CHECK_OK}\n\ndef test_check_quantity():\n    assert check_quantity(3) == 3\n    try:\n        check_quantity(-1)\n    except Exception:\n        pass\n\ntest_check_quantity()\nprint("test_check_quantity passed")\n`, fails: ["catches"], why: "passes when nothing is raised, and accepts any error" },
      ],
    },
  ],

  quiz: [
    {
      id: "good-test",
      prompt: "`average([2, 4])` should be `3.0`. Which test is most useful?",
      options: [
        { text: "`assert average([2, 4]) == 3.0` and `assert average([5]) == 5.0`", correct: true, why: "Exact expected values for an ordinary case and an edge case: both fail if the function is wrong." },
        { text: "`assert average([2, 4])`", why: "Any non-zero result passes, so this barely checks anything." },
        { text: "`assert isinstance(average([2, 4]), float)`", why: "The right type with the wrong value would still pass." },
        { text: "`print(average([2, 4]))`", why: "Printing needs a person to read and judge it; a test should decide by itself." },
      ],
    },
    {
      id: "assert-input",
      prompt: "Why shouldn't you use `assert` to reject bad user input?",
      options: [
        { text: "Assertions can be switched off, and `AssertionError` doesn't say the input was wrong", correct: true, why: "With `python -O` assertions don't run at all. Validate input with `raise ValueError(...)`." },
        { text: "`assert` can't have a message", why: "It can: `assert condition, \"message\"`." },
        { text: "`assert` only works inside test functions", why: "It works anywhere; it's just the wrong tool for input validation." },
        { text: "`assert` is slower than `if`", why: "Speed isn't the problem; reliability is." },
      ],
    },
  ],

  outcomes: [
    "Use `assert` for tests and internal checks, and `raise` for invalid input.",
    "Write `test_…` functions with exact expected values for ordinary and edge cases.",
    "Test that bad input raises the expected exception type.",
    "Judge a test by whether it would fail for broken code.",
  ],
};
