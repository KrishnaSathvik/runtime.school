import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const strs = (...xs: string[]) => py.list(...xs.map(s));

/** Capture what a logger named "pipeline" records while `call` runs, as "LEVEL message" lines. */
const captureLogs = (call: string) => `import logging
class _Collect(logging.Handler):
    def __init__(self):
        super().__init__()
        self.lines = []
    def emit(self, record):
        self.lines.append(f"{record.levelname} {record.getMessage()}")
_h = _Collect()
_logger = logging.getLogger("pipeline")
_logger.addHandler(_h)
_logger.setLevel(logging.DEBUG)
try:
    _value = ${call}
finally:
    _logger.removeHandler(_h)
result = (_value, _h.lines)`;

export const loggingConfigurationAndProjectStructure: PyLesson = {
  slug: "logging-configuration-and-project-structure",
  ref: "python:logging-configuration-and-project-structure",
  module: "patterns",
  number: 6,
  title: "Logging, configuration and project structure",
  level: "advanced",
  summary:
    "Make programs that explain themselves and adapt without code changes: report what happened with the `logging` module at the right level, keep settings in a configuration with defaults and validated overrides, and organise a growing project into focused modules.",

  sections: [
    {
      label: "logging instead of print",
      blocks: [
        {
          kind: "p",
          text: "`print` is for a program's **output**. For messages **about** the program, such as progress, skipped records and failures, use `logging`. Each message has a **level**: `DEBUG` (details for developers), `INFO` (normal progress), `WARNING` (something odd, but carrying on), `ERROR` (something failed) and `CRITICAL`. The configuration decides which levels are shown and where they go (the console, a file, a monitoring service), without touching the code that logs.",
        },
        { kind: "code", code: 'import logging\n\nlogger = logging.getLogger("pipeline")\nlogger.info("read %d rows", 120)\nlogger.warning("skipped row %d: missing id", 7)' },
        {
          kind: "p",
          text: "Get a named logger with `logging.getLogger(name)`, usually one per module. Pass values as arguments (`\"read %d rows\", n`) rather than building the string yourself: the message is only formatted if it will actually be shown. `logging.basicConfig(level=logging.INFO, format=...)` sets up simple console logging once, at the start of a program.",
        },
      ],
    },
    {
      label: "configuration",
      blocks: [
        {
          kind: "p",
          text: "Values that change between runs or environments (file paths, thresholds, a currency) belong in **configuration**, not scattered through the code. A common shape: a dictionary of `DEFAULTS`, overridden by values from a JSON file or environment variables. Validate the result: reject unknown keys (they're usually typos, like `treshold`), and check types and ranges, so a bad setting fails at start-up with a clear message instead of half-way through a run.",
        },
      ],
    },
    {
      label: "project structure",
      blocks: [
        {
          kind: "p",
          text: "As a script grows, split it by responsibility: `config.py` (loading settings), `readers.py` (getting data in), `rules.py` (validation and calculations), `writers.py` (exports), and a small `main.py` that wires them together. Keep functions that do calculations free of input, output and globals, so they're easy to test. A `tests/` folder holds test files that import the modules. Each module gets its logger with `logging.getLogger(__name__)`.",
        },
      ],
    },
  ],

  example: {
    caption: "Logging with levels, and configuration with defaults and overrides. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'import logging\nimport sys\n\nlogging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s", stream=sys.stdout, force=True)\nlogger = logging.getLogger("pipeline")\n\nDEFAULTS = {"currency": "GBP", "min_amount": 0, "output": "report.csv"}\n\n\ndef load_config(overrides):\n    unknown = set(overrides) - set(DEFAULTS)\n    if unknown:\n        raise KeyError(f"unknown settings: {sorted(unknown)}")\n    return {**DEFAULTS, **overrides}\n\n\nconfig = load_config({"min_amount": 5})\nlogger.info("config: %s", config)\nrows = [12.5, 3.0, 40.0]\nkept = [r for r in rows if r >= config["min_amount"]]\nlogger.debug("this detail is hidden at INFO level")\nlogger.warning("dropped %d row(s) below %s", len(rows) - len(kept), config["min_amount"])\nprint("Total:", sum(kept), config["currency"])',
  },

  walkthrough: [
    {
      title: "Levels filter what you see",
      text: "With the level set to WARNING, the DEBUG and INFO messages are dropped; WARNING and above get through.",
      code: 'import logging, sys\nlogging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s", stream=sys.stdout, force=True)\nlog = logging.getLogger("demo")\nlog.debug("debug detail")\nlog.info("normal progress")\nlog.warning("something odd")\nlog.error("something failed")',
    },
    {
      title: "Arguments, not f-strings",
      text: "The message and its values are kept separately, and only joined if the message is shown.",
      code: 'import logging, sys\nlogging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stdout, force=True)\nlog = logging.getLogger("demo")\nrows, skipped = 120, 3\nlog.info("read %d rows, skipped %d", rows, skipped)',
    },
    {
      title: "Defaults, overrides and a typo caught",
      text: "`{**DEFAULTS, **overrides}` lets overrides win. The misspelt key is rejected instead of silently ignored.",
      code: 'DEFAULTS = {"threshold": 10, "currency": "GBP"}\n\ndef load_config(overrides):\n    unknown = set(overrides) - set(DEFAULTS)\n    if unknown:\n        raise KeyError(f"unknown settings: {sorted(unknown)}")\n    return {**DEFAULTS, **overrides}\n\nprint(load_config({"currency": "EUR"}))\ntry:\n    load_config({"treshold": 5})\nexcept KeyError as error:\n    print("Rejected:", error)',
    },
    {
      title: "A module-sized layout",
      text: "A typical layout for a small data project, printed as a tree. Each file has one job.",
      code: 'layout = {\n    "main.py": "wires the steps together",\n    "config.py": "DEFAULTS and load_config()",\n    "readers.py": "read_orders(path)",\n    "rules.py": "validate(row), totals(rows): no I/O",\n    "writers.py": "write_report(rows, path)",\n    "tests/test_rules.py": "tests for rules.py",\n}\nfor path, job in layout.items():\n    print(f"{path:<22} {job}")',
    },
  ],

  mistakes: [
    {
      title: "Logging at the wrong level",
      text: "A real failure logged as INFO disappears when the level is WARNING, as it usually is in production.",
      code: 'import logging, sys\nlogging.basicConfig(level=logging.WARNING, format="%(levelname)s: %(message)s", stream=sys.stdout, force=True)\nlog = logging.getLogger("demo")\nlog.info("could not write report.csv")\nprint("done")',
      fix: "Use `log.error(...)` for failures and `log.warning(...)` for problems you carry on past.",
    },
    {
      title: "Silently ignoring a misspelt setting",
      text: "Merging without validation keeps the typo as a new key, and the real `threshold` stays at its default.",
      code: 'DEFAULTS = {"threshold": 10}\nconfig = {**DEFAULTS, **{"treshold": 5}}\nprint(config["threshold"], config)',
      fix: "Reject keys that aren't in the defaults.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Load a validated configuration",
      prompt:
        "Write `load_config(overrides)`. Start from `DEFAULTS` (in the editor) and apply `overrides`. Raise `KeyError` for any key not in `DEFAULTS`, and `ValueError` if `min_amount` isn't a number of at least 0, or `currency` isn't a 3-letter uppercase code. Return a **new** dictionary; `DEFAULTS` must not change.",
      looksFor: [
        "Overrides replace defaults; missing keys keep their default values.",
        "Unknown keys raise `KeyError`; a bad `min_amount` or `currency` raises `ValueError`.",
        "`DEFAULTS` itself is never changed.",
      ],
      starter: 'DEFAULTS = {"currency": "GBP", "min_amount": 0, "output": "report.csv"}\n\n\ndef load_config(overrides):\n    # Merge, validate, and return a new dict.\n    pass\n',
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "load_config",
            cases: [
              { args: [py.dict([[s("min_amount"), i(5)]])], expected: py.dict([[s("currency"), s("GBP")], [s("min_amount"), i(5)], [s("output"), s("report.csv")]]) },
              { args: [py.dict([])], expected: py.dict([[s("currency"), s("GBP")], [s("min_amount"), i(0)], [s("output"), s("report.csv")]]) },
              { args: [py.dict([[s("treshold"), i(5)]])], raises: "KeyError" },
              { args: [py.dict([[s("min_amount"), i(-1)]])], raises: "ValueError" },
              { args: [py.dict([[s("currency"), s("euro")]])], raises: "ValueError" },
              { args: [py.dict([[s("min_amount"), s("5")]])], raises: "ValueError", hidden: true },
              { args: [py.dict([[s("currency"), s("EUR")], [s("min_amount"), py.float(2.5)]])], expected: py.dict([[s("currency"), s("EUR")], [s("min_amount"), py.float(2.5)], [s("output"), s("report.csv")]]), hidden: true },
            ],
          },
          { kind: "expr", id: "defaults", label: "DEFAULTS is unchanged afterwards", show: 'load_config({"currency": "EUR"}); DEFAULTS', expr: 'load_config({"currency": "EUR"})\nresult = DEFAULTS["currency"]', expected: s("GBP"), tip: "Build a new dict, {**DEFAULTS, **overrides}, instead of calling DEFAULTS.update(...)." },
        ],
      },
      hints: [
        "unknown = set(overrides) - set(DEFAULTS); if unknown: raise KeyError(...).",
        "config = {**DEFAULTS, **overrides} makes a new dictionary.",
        'Check isinstance(config["min_amount"], (int, float)) and >= 0, and that currency is a str with len 3 and .isupper().',
      ],
      answer: 'DEFAULTS = {"currency": "GBP", "min_amount": 0, "output": "report.csv"}\n\n\ndef load_config(overrides):\n    """Return DEFAULTS with overrides applied, after validating them."""\n    unknown = set(overrides) - set(DEFAULTS)\n    if unknown:\n        raise KeyError(f"unknown settings: {sorted(unknown)}")\n    config = {**DEFAULTS, **overrides}\n    amount = config["min_amount"]\n    if not isinstance(amount, (int, float)) or isinstance(amount, bool) or amount < 0:\n        raise ValueError(f"min_amount must be a number of at least 0, got {amount!r}")\n    currency = config["currency"]\n    if not (isinstance(currency, str) and len(currency) == 3 and currency.isalpha() and currency.isupper()):\n        raise ValueError(f"currency must be a 3-letter code like GBP, got {currency!r}")\n    return config',
      wrong: [
        { code: 'DEFAULTS = {"currency": "GBP", "min_amount": 0, "output": "report.csv"}\n\ndef load_config(overrides):\n    for key in overrides:\n        if key not in DEFAULTS:\n            raise KeyError(key)\n    DEFAULTS.update(overrides)\n    if not isinstance(DEFAULTS["min_amount"], (int, float)) or DEFAULTS["min_amount"] < 0:\n        raise ValueError("min_amount")\n    if len(DEFAULTS["currency"]) != 3 or not DEFAULTS["currency"].isupper():\n        raise ValueError("currency")\n    return DEFAULTS\n', fails: ["fn", "defaults"], why: "changes DEFAULTS" },
        { code: 'DEFAULTS = {"currency": "GBP", "min_amount": 0, "output": "report.csv"}\n\ndef load_config(overrides):\n    return {**DEFAULTS, **overrides}\n', fails: ["fn"], why: "no validation" },
      ],
    },
    {
      id: "challenge-2",
      title: "Log what a cleaning step does",
      prompt:
        "Write `clean_amounts(values)` that returns the valid amounts (numbers above 0, as floats, from text or numbers) and **logs** with the logger named `\"pipeline\"`: a `WARNING` for each value it skips, saying which value and why, and one `INFO` at the end with how many were kept and skipped. Don't print anything.",
      looksFor: [
        "The function returns the valid amounts as floats, in order.",
        "Each skipped value produces one `WARNING` on the `pipeline` logger.",
        "A final `INFO` message reports the counts, and nothing is printed.",
      ],
      starter: 'import logging\n\nlogger = logging.getLogger("pipeline")\n\n\ndef clean_amounts(values):\n    # Return valid amounts; log a warning per skipped value and a summary.\n    pass\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "logs",
            label: "Returns the valid amounts, warning once per skipped value, then a summary",
            show: 'clean_amounts(["12.5", "abc", -3, 7]) with the "pipeline" logger captured',
            expr: captureLogs('clean_amounts(["12.5", "abc", -3, 7])') + '\nresult = (result[0], [line.split(" ")[0] for line in result[1]])',
            expected: py.tuple(py.list(py.float(12.5), py.float(7)), strs("WARNING", "WARNING", "INFO")),
            tip: 'logger.warning("skipped %r: not a positive number", value) inside the loop, and logger.info("kept %d, skipped %d", ...) after it.',
          },
          {
            kind: "expr",
            id: "mentions",
            label: "Each warning names the skipped value",
            show: 'the warning for "abc"',
            expr: captureLogs('clean_amounts(["abc"])') + '\nresult = any("abc" in line for line in result[1] if line.startswith("WARNING"))',
            expected: py.bool(true),
          },
          {
            kind: "expr",
            id: "quiet",
            label: "Prints nothing",
            show: "what clean_amounts prints",
            expr: 'import io, contextlib\n_buf = io.StringIO()\nwith contextlib.redirect_stdout(_buf):\n    clean_amounts(["1", "x"])\nresult = _buf.getvalue()',
            expected: s(""),
            tip: "Use the logger, not print.",
          },
        ],
      },
      hints: [
        "for value in values: try: amount = float(value) except (TypeError, ValueError): warn and continue.",
        'If amount <= 0: logger.warning("skipped %r: not positive", value) and continue; otherwise keep it.',
        'After the loop: logger.info("kept %d, skipped %d", len(kept), skipped). Return kept.',
      ],
      answer: 'import logging\n\nlogger = logging.getLogger("pipeline")\n\n\ndef clean_amounts(values):\n    """Return the positive amounts as floats, logging every value that\'s skipped."""\n    kept = []\n    skipped = 0\n    for value in values:\n        try:\n            amount = float(value)\n        except (TypeError, ValueError):\n            logger.warning("skipped %r: not a number", value)\n            skipped += 1\n            continue\n        if amount <= 0:\n            logger.warning("skipped %r: not positive", value)\n            skipped += 1\n            continue\n        kept.append(amount)\n    logger.info("kept %d, skipped %d", len(kept), skipped)\n    return kept',
      wrong: [
        { code: 'def clean_amounts(values):\n    kept = []\n    for value in values:\n        try:\n            amount = float(value)\n        except ValueError:\n            print("skipped", value)\n            continue\n        if amount > 0:\n            kept.append(amount)\n    return kept\n', fails: ["logs", "mentions", "quiet"], why: "prints instead of logging" },
        { code: 'import logging\nlogger = logging.getLogger("pipeline")\n\ndef clean_amounts(values):\n    kept = []\n    for value in values:\n        try:\n            amount = float(value)\n        except ValueError:\n            logger.info("skipped %r", value)\n            continue\n        if amount > 0:\n            kept.append(amount)\n    logger.info("kept %d", len(kept))\n    return kept\n', fails: ["logs", "mentions"], why: "skips logged at INFO, and the negative value isn't logged" },
      ],
    },
  ],

  quiz: [
    {
      id: "level",
      prompt: "A row is skipped because its date is invalid, and processing continues. Which level fits?",
      options: [
        { text: "`WARNING`", correct: true, why: "Something unexpected happened, but the program carries on: that's what WARNING is for." },
        { text: "`DEBUG`", why: "DEBUG is for developer details, usually hidden; a skipped row is something operators should see." },
        { text: "`CRITICAL`", why: "CRITICAL means the program can't continue at all." },
        { text: "`INFO`", why: "INFO is for normal progress; a skipped row is a problem worth flagging." },
      ],
    },
    {
      id: "config",
      prompt: "Why reject unknown keys when loading configuration?",
      options: [
        { text: "An unknown key is usually a typo, and ignoring it means the real setting silently keeps its default", correct: true, why: "Failing at start-up with the bad key's name is much easier to fix than wrong results later." },
        { text: "Dictionaries can't hold extra keys", why: "They can; that's exactly why typos go unnoticed without a check." },
        { text: "JSON doesn't allow them", why: "JSON allows any keys; validation is your program's job." },
        { text: "To make loading faster", why: "It's about correctness, not speed." },
      ],
    },
  ],

  outcomes: [
    "Log with named loggers at the right level, passing values as arguments.",
    "Configure logging once with `basicConfig`.",
    "Load configuration from defaults plus overrides, rejecting unknown keys and invalid values.",
    "Organise a growing project into focused modules with a thin `main.py`.",
  ],
};
