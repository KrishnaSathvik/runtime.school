/**
 * M29 practice: ten independent problems on advanced object-oriented design (PY-L29-01 … PY-L29-05).
 *
 * Mix: 1 function implementation (the C3 method resolution order, computed from a table of bases), 1 debugging
 * (mixins listed in the wrong order, one that drops the return value), 2 validation (rules built on an abstract base
 * class; a descriptor that checks codes against a pattern), 1 data transformation (line parsers sharing a template
 * method), 1 refactoring (a hard-wired clock turned into an injected one with the same default behaviour),
 * 2 integration (shutting down resources by what they can do; an order service with injected payments, storage and
 * notifications), and 2 output predictions about runtime protocols and ABCs.
 * Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 22.
 *
 * Fixtures are Runtime Market (R01) orders, products, customers and payments. Collaborators are always injected
 * fakes in the checks (fake clocks, fake payment providers), so nothing pretends to reach a network.
 * Version 2: every question was replaced; the old set checked a HAT label through a protocol.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, raisesCase } from "../checks";
import { pv } from "../fn-checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const expr = (id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: pv(expected),
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});
const raisesExpr = (id: string, label: string, code: string, exception: string, o: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  raises: exception,
  ...(o.hidden ? { hidden: true } : {}),
  ...(o.show ? { show: o.show } : {}),
});

const repoBases = { object: [], Repository: ["object"], AuditMixin: ["object"], TimestampMixin: ["object"], OrderRepository: ["AuditMixin", "TimestampMixin", "Repository"] };
const diamond = { object: [], Listing: ["object"], Sale: ["Listing"], Featured: ["Listing"], FeaturedSale: ["Sale", "Featured"] };

export const m29Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q29-02 output prediction, easy
  {
    id: "PY-Q29-02",
    version: 2,
    slug: "what-counts-as-closable",
    title: "What counts as closable",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["assignment", "boolean", "class-def", "exc-name", "except-type", "for-loop", "function-def", "function-doc", "function-param", "if-statement", "import-module", "list-comp", "list-literal", "membership", "method-def", "none-value", "plain-class", "print-call", "print-several", "print-text", "protocol-base", "return-hint", "runtime-protocol", "self-name", "subclass", "top-level-indent", "truthiness", "try-except", "type-call"],
    prompt: "A clean-up routine closes everything that looks closable. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "A runtime-checkable protocol only asks: does the object have a member called `close`?",
      "Door has a `close`, but it is a text, not a method.",
      "Report's `close` prints something itself before the loop prints its own line.",
    ],
    explanation: "`isinstance` against a runtime-checkable Protocol is True for Report, Door and StringIO, because each has something named `close`; Draft has `closed`, which is a different name, and a text has neither. Calling Report's method prints `report closed`, then the loop's line. Door passes the check but its `close` is a text, so calling it raises TypeError: the check confirms names, not behaviour.",
    predict: {
      program: src`
import io
from typing import Protocol, runtime_checkable

@runtime_checkable
class Closable(Protocol):
    def close(self) -> None:
        """Release the resource."""

class Report:
    def close(self):
        print("report closed")

class Draft:
    closed = False

class Door:
    close = "the shop door"

things = [Report(), Draft(), Door(), io.StringIO(), "text"]
print([isinstance(thing, Closable) for thing in things])
for thing in things:
    if isinstance(thing, Closable):
        try:
            thing.close()
            print(type(thing).__name__, "closed")
        except TypeError:
            print(type(thing).__name__, "can't be closed")
`,
      output: "[True, False, True, True, False]\nreport closed\nReport closed\nDoor can't be closed\nStringIO closed\n",
      wrongPredictions: [
        "[True, False, False, True, False]\nreport closed\nReport closed\nStringIO closed",
        "[True, True, True, True, False]\nreport closed\nReport closed\nDraft closed\nDoor can't be closed\nStringIO closed",
        "[True, False, True, False, False]\nReport closed\nDoor can't be closed",
      ],
    },
  },

  // ------------------------------------------------------------------ PY-Q29-03 debugging, easy
  {
    id: "PY-Q29-03",
    version: 2,
    slug: "mixins-that-never-run",
    title: "Mixins that never run",
    format: "debugging",
    difficulty: "easy",
    minutes: 12,
    requires: ["assignment", "attr-assign", "class-def", "dict-comp", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "init-method", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "mixin-class", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "string-index", "string-method", "subclass", "super-call", "top-level-indent"],
    prompt: "`OrderRepository` should tidy each record's keys (strip and lower-case them), refuse records without an `order_id`, and then store them, returning the stored record. Records are being stored untidied and unchecked, and when that is fixed, `save` returns None. Fix the class line and the mixin that loses the result.",
    spec: [
      ["`save(record)`", "keys stripped and lower-cased, then checked for `order_id` (ValueError if missing, nothing stored), then stored; returns the stored record"],
      ["Order", "tidy first, then validate, then store"],
    ],
    hiddenKinds: ["a record whose key only matches after tidying", "a record without an order_id", "two records in a row"],
    hints: [
      "Print `[c.__name__ for c in OrderRepository.__mro__]`: which class's `save` is found first?",
      "The mixins must come before Repository in the class line, in the order their steps should run.",
      "Every `save` in the chain should hand back what `super().save(...)` returns.",
    ],
    explanation: "With Repository listed first, its `save` is found first and the mixins are never reached. Listing `NormaliseMixin, ValidateMixin, Repository` makes the MRO run tidy → check → store, each passing on with `super()`. ValidateMixin also dropped the result: without `return`, the chain's return value is lost and the caller gets None. Putting ValidateMixin before NormaliseMixin would check the untidied keys and wrongly refuse `\" Order_ID \"`.",
    code: {
      starter: src`
class Repository:
    def __init__(self):
        self.saved = []

    def save(self, record):
        self.saved.append(record)
        return record

class NormaliseMixin:
    def save(self, record):
        record = {key.strip().lower(): value for key, value in record.items()}
        return super().save(record)

class ValidateMixin:
    def save(self, record):
        if "order_id" not in record:
            raise ValueError("record has no order_id")
        super().save(record)

class OrderRepository(Repository, NormaliseMixin, ValidateMixin):
    pass

repo = OrderRepository()
print(repo.save({" Order_ID ": "O100282", "Total": 35.84}))
print(repo.saved)
`,
      answer: src`
class Repository:
    def __init__(self):
        self.saved = []

    def save(self, record):
        self.saved.append(record)
        return record

class NormaliseMixin:
    def save(self, record):
        record = {key.strip().lower(): value for key, value in record.items()}
        return super().save(record)

class ValidateMixin:
    def save(self, record):
        if "order_id" not in record:
            raise ValueError("record has no order_id")
        return super().save(record)

class OrderRepository(NormaliseMixin, ValidateMixin, Repository):
    pass

repo = OrderRepository()
print(repo.save({" Order_ID ": "O100282", "Total": 35.84}))
print(repo.saved)
`,
      alternatives: [
        src`
class Repository:
    def __init__(self):
        self.saved = []

    def save(self, record):
        self.saved.append(record)
        return record

class NormaliseMixin:
    def save(self, record):
        tidy = {}
        for key, value in record.items():
            tidy[key.strip().lower()] = value
        return super().save(tidy)

class ValidateMixin:
    def save(self, record):
        if "order_id" not in record:
            raise ValueError("no order_id")
        stored = super().save(record)
        return stored

class OrderRepository(NormaliseMixin, ValidateMixin, Repository):
    pass
`,
      ],
      wrong: [
        {
          code: src`
class Repository:
    def __init__(self):
        self.saved = []

    def save(self, record):
        self.saved.append(record)
        return record

class NormaliseMixin:
    def save(self, record):
        record = {key.strip().lower(): value for key, value in record.items()}
        return super().save(record)

class ValidateMixin:
    def save(self, record):
        if "order_id" not in record:
            raise ValueError("record has no order_id")
        super().save(record)

class OrderRepository(NormaliseMixin, ValidateMixin, Repository):
    pass
`,
          fails: ["returns", "tidy-first", "two"],
          why: "the order is fixed, but ValidateMixin still drops the result, so `save` returns None",
        },
        {
          code: src`
class Repository:
    def __init__(self):
        self.saved = []

    def save(self, record):
        self.saved.append(record)
        return record

class NormaliseMixin:
    def save(self, record):
        record = {key.strip().lower(): value for key, value in record.items()}
        return super().save(record)

class ValidateMixin:
    def save(self, record):
        if "order_id" not in record:
            raise ValueError("record has no order_id")
        return super().save(record)

class OrderRepository(ValidateMixin, NormaliseMixin, Repository):
    pass
`,
          fails: ["returns", "tidy-first", "two"],
          why: "validating before tidying looks for `order_id` among the untidied keys and refuses valid records",
        },
      ],
      task: {
        checks: [
          expr("returns", "Tidy, check, store", "_r = OrderRepository()\n_out = _r.save({' Order_ID ': 'O100282', 'Total': 35.84})\nresult = [_out, _r.saved]", [{ order_id: "O100282", total: 35.84 }, [{ order_id: "O100282", total: 35.84 }]], { show: "save({\" Order_ID \": \"O100282\", \"Total\": 35.84}) and repo.saved" }),
          expr("refused", "A record without an order_id", "_r = OrderRepository()\ntry:\n    _r.save({'total': 10})\n    _x = 'saved'\nexcept ValueError:\n    _x = 'refused'\nresult = [_x, _r.saved]", ["refused", []], { show: "save({\"total\": 10})" }),
          expr("tidy-first", "A key that only matches after tidying", "_r = OrderRepository()\nresult = _r.save({'ORDER_ID': 'O1'})", { order_id: "O1" }, { hidden: true }),
          expr("two", "Two records in a row", "_r = OrderRepository()\n_a = _r.save({'order_id': 'A'})\n_b = _r.save({' order_id': 'B'})\nresult = [_a, _b, len(_r.saved)]", [{ order_id: "A" }, { order_id: "B" }, 2], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q29-06 validation, easy
  {
    id: "PY-Q29-06",
    version: 2,
    slug: "rules-from-an-abc",
    title: "Validation rules from one base class",
    format: "validation",
    difficulty: "easy",
    minutes: 15,
    requires: ["abstract-method", "arithmetic", "assignment", "attr-assign", "class-def", "comp-if", "comparison", "conditional-expr", "dict-literal", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "print-call", "print-several", "print-text", "reassignment", "self-name", "string-format", "string-index", "subclass", "super-call", "top-level-indent"],
    prompt: "The abstract `Rule` class is given: each rule checks one field of a record, and its concrete `check(record)` handles missing fields and message formatting, calling the abstract `problem(value)`. Write two rules, `MaxLength(field, limit)` (text longer than `limit`) and `OneOf(field, choices)` (a value not among the choices), and `validate(record, rules)` returning every message, in rule order.",
    spec: [
      ["`MaxLength(field, limit)`", "`problem` → `\"longer than <limit> characters\"`, or None"],
      ["`OneOf(field, choices)`", "`problem` → `\"<value> is not one of <choices joined with ', '>\"`, or None"],
      ["`validate(record, rules)`", "the non-None results of `rule.check(record)`, in order"],
      ["Given", "`Rule.check` returns `\"<field>: missing\"`, `\"<field>: <problem>\"`, or None"],
    ],
    hiddenKinds: ["a value exactly at the length limit", "a missing field", "no rules"],
    hints: [
      "Each rule is a subclass of Rule with its own `__init__` (which lets the parent store the field with `super()`) and a `problem` method.",
      "`problem` returns None when the value is fine; `check` (inherited) does the rest.",
      "`validate` asks each rule to `check` the record and keeps the messages that aren't None.",
    ],
    explanation: "The base class fixes the shared steps (missing field, message prefix) once; each rule only answers *what is wrong with this value?* Because `problem` is abstract, a rule that forgets it can't even be created. `validate` is polymorphic: it doesn't know which rules it is running.",
    code: {
      starter: src`
from abc import ABC, abstractmethod

class Rule(ABC):
    def __init__(self, field):
        self.field = field

    @abstractmethod
    def problem(self, value):
        """A message if the value breaks the rule, otherwise None."""

    def check(self, record):
        if self.field not in record:
            return f"{self.field}: missing"
        message = self.problem(record[self.field])
        return None if message is None else f"{self.field}: {message}"

def validate(record, rules):
    return []

order = {"order_id": "O100282", "channel": "fax", "note": "Please leave the parcel with the neighbour at number 12"}
print(validate(order, []))
`,
      answer: src`
from abc import ABC, abstractmethod

class Rule(ABC):
    def __init__(self, field):
        self.field = field

    @abstractmethod
    def problem(self, value):
        """A message if the value breaks the rule, otherwise None."""

    def check(self, record):
        if self.field not in record:
            return f"{self.field}: missing"
        message = self.problem(record[self.field])
        return None if message is None else f"{self.field}: {message}"

class MaxLength(Rule):
    def __init__(self, field, limit):
        super().__init__(field)
        self.limit = limit

    def problem(self, value):
        if len(value) > self.limit:
            return f"longer than {self.limit} characters"
        return None

class OneOf(Rule):
    def __init__(self, field, choices):
        super().__init__(field)
        self.choices = choices

    def problem(self, value):
        if value not in self.choices:
            return f"{value} is not one of {', '.join(self.choices)}"
        return None

def validate(record, rules):
    messages = []
    for rule in rules:
        message = rule.check(record)
        if message is not None:
            messages.append(message)
    return messages

order = {"order_id": "O100282", "channel": "fax", "note": "Please leave the parcel with the neighbour at number 12"}
print(validate(order, [OneOf("channel", ["web", "app", "phone"]), MaxLength("note", 40), MaxLength("gift_message", 100)]))
`,
      alternatives: [
        src`
from abc import ABC, abstractmethod

class Rule(ABC):
    def __init__(self, field):
        self.field = field

    @abstractmethod
    def problem(self, value):
        """A message if the value breaks the rule, otherwise None."""

    def check(self, record):
        if self.field not in record:
            return f"{self.field}: missing"
        message = self.problem(record[self.field])
        return None if message is None else f"{self.field}: {message}"

class MaxLength(Rule):
    def __init__(self, field, limit):
        super().__init__(field)
        self.limit = limit

    def problem(self, value):
        return f"longer than {self.limit} characters" if len(value) > self.limit else None

class OneOf(Rule):
    def __init__(self, field, choices):
        super().__init__(field)
        self.choices = list(choices)

    def problem(self, value):
        return None if value in self.choices else value + " is not one of " + ", ".join(self.choices)

def validate(record, rules):
    results = [rule.check(record) for rule in rules]
    return [r for r in results if r is not None]
`,
      ],
      wrong: [
        {
          code: src`
from abc import ABC, abstractmethod

class Rule(ABC):
    def __init__(self, field):
        self.field = field

    @abstractmethod
    def problem(self, value):
        """A message if the value breaks the rule, otherwise None."""

    def check(self, record):
        if self.field not in record:
            return f"{self.field}: missing"
        message = self.problem(record[self.field])
        return None if message is None else f"{self.field}: {message}"

class MaxLength(Rule):
    def __init__(self, field, limit):
        super().__init__(field)
        self.limit = limit

    def problem(self, value):
        if len(value) >= self.limit:
            return f"longer than {self.limit} characters"
        return None

class OneOf(Rule):
    def __init__(self, field, choices):
        super().__init__(field)
        self.choices = choices

    def problem(self, value):
        if value not in self.choices:
            return f"{value} is not one of {', '.join(self.choices)}"
        return None

def validate(record, rules):
    return [m for m in (rule.check(record) for rule in rules) if m is not None]
`,
          fails: ["edge"],
          why: "`>=` refuses text of exactly the allowed length",
        },
        {
          code: src`
from abc import ABC, abstractmethod

class Rule(ABC):
    def __init__(self, field):
        self.field = field

    @abstractmethod
    def problem(self, value):
        """A message if the value breaks the rule, otherwise None."""

    def check(self, record):
        if self.field not in record:
            return f"{self.field}: missing"
        message = self.problem(record[self.field])
        return None if message is None else f"{self.field}: {message}"

class MaxLength(Rule):
    def __init__(self, field, limit):
        super().__init__(field)
        self.limit = limit

    def problem(self, value):
        if len(value) > self.limit:
            return f"longer than {self.limit} characters"
        return None

class OneOf(Rule):
    def __init__(self, field, choices):
        super().__init__(field)
        self.choices = choices

    def problem(self, value):
        if value not in self.choices:
            return f"{value} is not one of {', '.join(self.choices)}"
        return None

def validate(record, rules):
    return [rule.check(record) for rule in rules]
`,
          fails: ["messages", "edge"],
          why: "the Nones from rules that passed are kept in the list",
        },
      ],
      task: {
        checks: [
          expr("messages", "Messages for a record with three problems", "_o = {'order_id': 'O100282', 'channel': 'fax', 'note': 'Please leave the parcel with the neighbour at number 12'}\nresult = validate(_o, [OneOf('channel', ['web', 'app', 'phone']), MaxLength('note', 40), MaxLength('gift_message', 100), OneOf('order_id', ['O100282'])])", ["channel: fax is not one of web, app, phone", "note: longer than 40 characters", "gift_message: missing"], { show: "validate(order, [OneOf(\"channel\", ...), MaxLength(\"note\", 40), MaxLength(\"gift_message\", 100), OneOf(\"order_id\", ...)])" }),
          expr("rules", "The rules are Rules", "result = [issubclass(MaxLength, Rule), issubclass(OneOf, Rule), MaxLength('a', 3).problem('abcd'), OneOf('c', ['web']).problem('web')]", [true, true, "longer than 3 characters", null], { hidden: true }),
          expr("edge", "A value exactly at the length limit", "result = validate({'code': 'ABCDE'}, [MaxLength('code', 5)])", [], { hidden: true }),
          expr("none", "No rules", "result = validate({'x': 1}, [])", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q29-10 refactoring, easy
  {
    id: "PY-Q29-10",
    version: 2,
    slug: "tokens-with-an-injected-clock",
    title: "Session tokens with an injected clock",
    format: "refactoring",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "conditional-expr", "dict-literal", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "list-mutate", "logical", "membership", "method-def", "none-value", "plain-class", "print-call", "print-text", "self-name", "string-index", "timedelta-call", "top-level-indent"],
    prompt: "`SessionTokens` calls `datetime.now()` directly, so nobody can test whether a token really expires after 30 minutes without waiting 30 minutes. Refactor it so the time comes from a `clock` parameter: a function returning the current `datetime`, defaulting to `datetime.now` so existing callers don't change.",
    spec: [
      ["Class", "`SessionTokens(ttl_minutes=30, clock=datetime.now)`"],
      ["Behaviour", "`issue(user)` records the time; `is_valid(user)` is True while less than `ttl_minutes` have passed since it was issued"],
      ["Unchanged", "`SessionTokens()` still works with the real clock"],
    ],
    hiddenKinds: ["a token checked at exactly the expiry time", "a user who was never issued a token", "the default clock"],
    hints: [
      "Add the parameter with `datetime.now` as its default: the function itself, without brackets.",
      "Store it in `__init__` and call `self.clock()` wherever the code asked for the current time.",
      "Both methods need the injected clock, not just one.",
    ],
    explanation: "Passing the clock in makes time a value tests control: a fake clock can jump forward 29 or 31 minutes instantly. The default must be the *function* `datetime.now`, not `datetime.now()`: a default is evaluated once, when `def` runs, so calling it there would freeze one moment forever. Behaviour for existing callers is unchanged, which is what makes this a refactoring.",
    code: {
      starter: src`
from datetime import datetime, timedelta

class SessionTokens:
    def __init__(self, ttl_minutes=30):
        self.ttl = timedelta(minutes=ttl_minutes)
        self.issued = {}

    def issue(self, user):
        self.issued[user] = datetime.now()

    def is_valid(self, user):
        return user in self.issued and datetime.now() - self.issued[user] < self.ttl

tokens = SessionTokens()
tokens.issue("C00077")
print(tokens.is_valid("C00077"), tokens.is_valid("C01338"))
`,
      answer: src`
from datetime import datetime, timedelta

class SessionTokens:
    def __init__(self, ttl_minutes=30, clock=datetime.now):
        self.ttl = timedelta(minutes=ttl_minutes)
        self.clock = clock
        self.issued = {}

    def issue(self, user):
        self.issued[user] = self.clock()

    def is_valid(self, user):
        return user in self.issued and self.clock() - self.issued[user] < self.ttl

tokens = SessionTokens()
tokens.issue("C00077")
print(tokens.is_valid("C00077"), tokens.is_valid("C01338"))
`,
      alternatives: [
        src`
from datetime import datetime, timedelta

class SessionTokens:
    def __init__(self, ttl_minutes=30, clock=None):
        self.ttl = timedelta(minutes=ttl_minutes)
        self.clock = clock if clock is not None else datetime.now
        self.issued = {}

    def issue(self, user):
        self.issued[user] = self.clock()

    def is_valid(self, user):
        if user not in self.issued:
            return False
        return self.clock() - self.issued[user] < self.ttl
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime, timedelta

class SessionTokens:
    def __init__(self, ttl_minutes=30, clock=datetime.now):
        self.ttl = timedelta(minutes=ttl_minutes)
        self.clock = clock
        self.issued = {}

    def issue(self, user):
        self.issued[user] = self.clock()

    def is_valid(self, user):
        return user in self.issued and datetime.now() - self.issued[user] < self.ttl
`,
          fails: ["expiry"],
          why: "`is_valid` still reads the real clock, so moving the injected clock forward never expires anything",
        },
        {
          code: src`
from datetime import datetime, timedelta

class SessionTokens:
    def __init__(self, ttl_minutes=30, clock=datetime.now()):
        self.ttl = timedelta(minutes=ttl_minutes)
        self.clock = clock
        self.issued = {}

    def issue(self, user):
        self.issued[user] = self.clock()

    def is_valid(self, user):
        return user in self.issued and self.clock() - self.issued[user] < self.ttl
`,
          fails: ["default"],
          why: "`datetime.now()` in the default is called once, when the class is defined, so the default clock is a datetime, not a function, and calling it fails",
        },
      ],
      task: {
        checks: [
          expr("expiry", "A token expires after its time to live", "from datetime import datetime as _dt, timedelta as _td\n_now = [_dt(2025, 3, 15, 9, 0)]\n_t = SessionTokens(30, clock=lambda: _now[0])\n_t.issue('C00077')\n_now[0] += _td(minutes=29)\n_a = _t.is_valid('C00077')\n_now[0] += _td(minutes=2)\nresult = [_a, _t.is_valid('C00077')]", [true, false], { show: "is_valid after 29 and after 31 minutes (fake clock)" }),
          expr("exact", "Exactly at the expiry time", "from datetime import datetime as _dt, timedelta as _td\n_now = [_dt(2025, 3, 15, 9, 0)]\n_t = SessionTokens(10, clock=lambda: _now[0])\n_t.issue('A')\n_now[0] += _td(minutes=10)\nresult = _t.is_valid('A')", false, { hidden: true }),
          expr("unknown", "A user who was never issued a token", "from datetime import datetime as _dt\n_t = SessionTokens(clock=lambda: _dt(2025, 1, 1))\nresult = _t.is_valid('nobody')", false, { hidden: true }),
          expr("default", "The default clock", "_t = SessionTokens()\n_t.issue('C01338')\nresult = [_t.is_valid('C01338'), _t.is_valid('C00038')]", [true, false], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q29-12 integration, medium
  {
    id: "PY-Q29-12",
    version: 2,
    slug: "shutdown-by-capability",
    title: "Shut down whatever can be shut down",
    format: "integration",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "class-def", "conditional-expr", "exc-name", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "membership", "method-def", "none-value", "plain-class", "print-call", "protocol-base", "return-hint", "runtime-protocol", "self-name", "string-format", "string-index", "subclass", "top-level-indent", "truthiness", "try-except", "type-call"],
    prompt: "When a worker process stops, it must flush and close the resources it holds: files, caches, database sessions, written by different teams with no common base class. Write two runtime-checkable Protocols, `Flushable` (`flush()`) and `Closable` (`close()`), and `shutdown(resources)`. For each resource, in order: flush it if it can be flushed, then close it if it can be closed. A failure (`OSError`) in one step is reported and the shutdown carries on with the next resource. Return one line per resource.",
    spec: [
      ["Protocols", "`@runtime_checkable` `Flushable` with `flush(self) -> None`; `Closable` with `close(self) -> None`"],
      ["Line", "`\"<ClassName>: <steps>\"`, steps joined by `\", \"`: `flushed`, `closed`, `flush failed`, `close failed`; `\"<ClassName>: nothing to do\"` if neither applies"],
      ["Rules", "after a failed flush, still try to close; catch only OSError"],
    ],
    hiddenKinds: ["a flush that fails", "something with neither method", "a resource with a real bug (not an OSError)", "no resources"],
    hints: [
      "Two small protocols, each with one method and a docstring as its body.",
      "For each resource, build a list of step words: check Flushable, try flush; then check Closable, try close.",
      "Wrap each call in its own try/except OSError, so a failed flush doesn't skip the close.",
    ],
    explanation: "Capability checks with runtime protocols let one routine handle unrelated classes: it asks what each object can do rather than what it is. Each step gets its own `try`, because a resource whose flush fails must still be closed (that's how open files get released). Only `OSError` is expected from I/O; anything else is a bug and should stop the program rather than be reported as a failed step.",
    code: {
      starter: src`
import io
from typing import Protocol, runtime_checkable

def shutdown(resources):
    return []

class Cache:
    def flush(self):
        pass

print(shutdown([io.StringIO(), Cache(), "notes"]))
`,
      answer: src`
import io
from typing import Protocol, runtime_checkable

@runtime_checkable
class Flushable(Protocol):
    def flush(self) -> None:
        """Write out anything buffered."""

@runtime_checkable
class Closable(Protocol):
    def close(self) -> None:
        """Release the resource."""

def shutdown(resources):
    report = []
    for resource in resources:
        steps = []
        if isinstance(resource, Flushable):
            try:
                resource.flush()
                steps.append("flushed")
            except OSError:
                steps.append("flush failed")
        if isinstance(resource, Closable):
            try:
                resource.close()
                steps.append("closed")
            except OSError:
                steps.append("close failed")
        report.append(f"{type(resource).__name__}: {', '.join(steps) or 'nothing to do'}")
    return report

class Cache:
    def flush(self):
        pass

print(shutdown([io.StringIO(), Cache(), "notes"]))
`,
      alternatives: [
        src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class Flushable(Protocol):
    def flush(self) -> None:
        """Flush."""

@runtime_checkable
class Closable(Protocol):
    def close(self) -> None:
        """Close."""

def attempt(action, done, failed):
    try:
        action()
        return done
    except OSError:
        return failed

def shutdown(resources):
    lines = []
    for resource in resources:
        steps = []
        if isinstance(resource, Flushable):
            steps.append(attempt(resource.flush, "flushed", "flush failed"))
        if isinstance(resource, Closable):
            steps.append(attempt(resource.close, "closed", "close failed"))
        lines.append(type(resource).__name__ + ": " + (", ".join(steps) if steps else "nothing to do"))
    return lines
`,
      ],
      wrong: [
        {
          code: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class Flushable(Protocol):
    def flush(self) -> None:
        """Flush."""

@runtime_checkable
class Closable(Protocol):
    def close(self) -> None:
        """Close."""

def shutdown(resources):
    report = []
    for resource in resources:
        steps = []
        try:
            if isinstance(resource, Flushable):
                resource.flush()
                steps.append("flushed")
            if isinstance(resource, Closable):
                resource.close()
                steps.append("closed")
        except OSError:
            steps.append("failed")
        report.append(f"{type(resource).__name__}: {', '.join(steps) or 'nothing to do'}")
    return report
`,
          fails: ["close-fails", "flush-fails"],
          why: "one `try` around both steps means a failed flush skips the close, leaving the resource open",
        },
        {
          code: src`
from typing import Protocol, runtime_checkable

@runtime_checkable
class Flushable(Protocol):
    def flush(self) -> None:
        """Flush."""

@runtime_checkable
class Closable(Protocol):
    def close(self) -> None:
        """Close."""

def shutdown(resources):
    report = []
    for resource in resources:
        steps = []
        if isinstance(resource, Flushable):
            try:
                resource.flush()
                steps.append("flushed")
            except Exception:
                steps.append("flush failed")
        if isinstance(resource, Closable):
            try:
                resource.close()
                steps.append("closed")
            except Exception:
                steps.append("close failed")
        report.append(f"{type(resource).__name__}: {', '.join(steps) or 'nothing to do'}")
    return report
`,
          fails: ["bug-surfaces"],
          why: "catching every Exception reports a programming bug as an I/O failure and carries on as if nothing were wrong",
        },
      ],
      task: {
        checks: [
          expr("returns", "Three kinds of resource", "import io as _io\nclass _Cache:\n    def flush(self):\n        pass\nresult = shutdown([_io.StringIO(), _Cache(), 'notes'])", ["StringIO: flushed, closed", "_Cache: flushed", "str: nothing to do"], { show: "shutdown([io.StringIO(), Cache(), \"notes\"])" }),
          expr("flush-fails", "A flush that fails", "class _Disk:\n    def __init__(self):\n        self.closed = False\n    def flush(self):\n        raise OSError('disk full')\n    def close(self):\n        self.closed = True\n_d = _Disk()\nresult = [shutdown([_d]), _d.closed]", [["_Disk: flush failed, closed"], true], { hidden: true }),
          expr("close-fails", "A close that fails, then another resource", "class _Session:\n    def close(self):\n        raise OSError('connection reset')\nclass _Log:\n    def flush(self):\n        pass\n    def close(self):\n        pass\nresult = shutdown([_Session(), _Log()])", ["_Session: close failed", "_Log: flushed, closed"], { hidden: true }),
          raisesExpr("bug-surfaces", "A resource with a real bug", "class _Buggy:\n    def close(self):\n        return [][0]\nshutdown([_Buggy()])", "IndexError", { hidden: true }),
          expr("empty", "No resources", "result = shutdown([])", [], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q29-13 function implementation, medium
  {
    id: "PY-Q29-13",
    version: 2,
    slug: "compute-the-mro",
    title: "Compute a method resolution order",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 25,
    requires: ["all-call", "any-call", "arithmetic", "assignment", "break-statement", "comp-if", "comparison", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-format", "string-index", "string-slice", "top-level-indent", "truthiness", "while-loop"],
    prompt: "Python orders a class's ancestors with the **C3 linearization**. Write `mro(name, bases)` that computes it from a table, so you can check a class hierarchy before writing it. `bases` maps each class name to the list of its direct bases, in order (`\"object\"` maps to `[]`). The MRO of a class is the class itself followed by the **merge** of its bases' MROs and the list of its bases. To merge: repeatedly take the first head (first item) of the lists that doesn't appear in the *tail* (anything after the first item) of any list, append it, and remove it from the front of every list; if no head qualifies, the hierarchy is impossible.",
    spec: [
      ["Function", "`mro(name, bases)` → list of class names, starting with `name` and ending with `\"object\"`"],
      ["Raises", "`ValueError` when no consistent order exists, or for a name that isn't in `bases`"],
      ["Check", "for real classes your answer matches `[c.__name__ for c in C.__mro__]`"],
    ],
    hiddenKinds: ["a diamond", "Python's own documentation example", "single inheritance", "an impossible order", "an unknown class"],
    hints: [
      "Recursion fits: compute each base's MRO first, then merge them with the list of bases.",
      "Keep the lists to merge in a list. Loop: find a list whose head isn't in any other list's tail; if none, raise.",
      "After choosing a head, append it to the result and remove it from every list where it is the first item; stop when all lists are empty.",
    ],
    explanation: "C3 guarantees three things Python relies on: a class comes before its bases, bases keep the order they were listed in, and every class's own MRO is respected inside its subclasses' MROs. The merge enforces them by refusing any head that some list still says must come later. In a diamond (`FeaturedSale(Sale, Featured)`, both based on Listing), Listing waits until both Sale and Featured are placed; a depth-first walk would wrongly put Listing before Featured. An impossible order, such as listing a class before its own subclass, leaves no valid head.",
    code: {
      starter: src`
def mro(name, bases):
    return [name] + bases[name]

bases = {"object": [], "Repository": ["object"], "AuditMixin": ["object"], "TimestampMixin": ["object"], "OrderRepository": ["AuditMixin", "TimestampMixin", "Repository"]}
print(mro("OrderRepository", bases))
`,
      answer: src`
def mro(name, bases):
    if name not in bases:
        raise ValueError(f"unknown class {name}")
    parents = bases[name]
    sequences = [mro(parent, bases) for parent in parents] + [list(parents)]
    result = [name]
    while any(sequences):
        head = None
        for sequence in sequences:
            if sequence and not any(sequence[0] in other[1:] for other in sequences):
                head = sequence[0]
                break
        if head is None:
            raise ValueError(f"no consistent order for {name}")
        result.append(head)
        sequences = [[c for c in s if c != head] for s in sequences]
    return result

bases = {"object": [], "Repository": ["object"], "AuditMixin": ["object"], "TimestampMixin": ["object"], "OrderRepository": ["AuditMixin", "TimestampMixin", "Repository"]}
print(mro("OrderRepository", bases))
`,
      alternatives: [
        src`
def merge(sequences):
    sequences = [list(s) for s in sequences if s]
    merged = []
    while sequences:
        head = None
        for s in sequences:
            candidate = s[0]
            if all(candidate not in other[1:] for other in sequences):
                head = candidate
                break
        if head is None:
            raise ValueError("inconsistent hierarchy")
        merged.append(head)
        sequences = [[c for c in s if c != head] for s in sequences]
        sequences = [s for s in sequences if s]
    return merged

def mro(name, bases):
    if name not in bases:
        raise ValueError("unknown class")
    return [name] + merge([mro(b, bases) for b in bases[name]] + [bases[name]])
`,
      ],
      wrong: [
        {
          code: src`
def mro(name, bases):
    if name not in bases:
        raise ValueError("unknown class")
    order = [name]
    for parent in bases[name]:
        for ancestor in mro(parent, bases):
            if ancestor not in order:
                order.append(ancestor)
    return order
`,
          fails: ["returns", "impossible"],
          why: "a depth-first walk puts a shared ancestor before the second branch, and it never notices an impossible order",
        },
        {
          code: src`
def mro(name, bases):
    if name not in bases:
        raise ValueError("unknown class")
    order = [name]
    queue = list(bases[name])
    while queue:
        current = queue.pop(0)
        if current not in order:
            order.append(current)
            queue.extend(bases[current])
    return order
`,
          fails: ["returns", "impossible"],
          why: "a breadth-first walk gets simple diamonds right by luck but breaks the order of more complex hierarchies, and accepts impossible ones",
        },
      ],
      task: {
        checks: [
          fn("returns", "mro", [
            example(["OrderRepository", repoBases], ["OrderRepository", "AuditMixin", "TimestampMixin", "Repository", "object"]),
            example(["FeaturedSale", diamond], ["FeaturedSale", "Sale", "Featured", "Listing", "object"]),
            example(["object", { object: [] }], ["object"]),
            hiddenCase("Python's own documentation example", ["A", { O: [], object: [], F: ["object"], E: ["object"], D: ["object"], C: ["D", "F"], B: ["D", "E"], A: ["B", "C"] }], ["A", "B", "C", "D", "E", "F", "object"]),
            hiddenCase("single inheritance", ["Clearance", { object: [], Listing: ["object"], Sale: ["Listing"], Clearance: ["Sale"] }], ["Clearance", "Sale", "Listing", "object"]),
            hiddenCase("a mixin on top of a diamond", ["Report", { object: [], Base: ["object"], Left: ["Base"], Right: ["Base"], JsonMixin: ["object"], Report: ["JsonMixin", "Left", "Right"] }], ["Report", "JsonMixin", "Left", "Right", "Base", "object"]),
          ], { label: "mro() follows the C3 linearization" }),
          fn("impossible", "mro", [
            raisesCase(["Bad", { object: [], Repository: ["object"], AuditMixin: ["Repository"], Bad: ["Repository", "AuditMixin"] }], "ValueError"),
            raisesCase(["Ghost", { object: [] }], "ValueError", { label: "an unknown class" }),
            raisesCase(["Z", { object: [], X: ["object"], Y: ["object"], P: ["X", "Y"], Q: ["Y", "X"], Z: ["P", "Q"] }], "ValueError", { label: "two bases that disagree about order" }),
          ], { label: "mro() refuses impossible hierarchies" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q29-16 data transformation, medium
  {
    id: "PY-Q29-16",
    version: 2,
    slug: "line-parsers-template",
    title: "Line parsers that share a template",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 20,
    requires: ["abstract-method", "arithmetic", "assignment", "class-def", "comparison", "continue-statement", "conversion", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "enumerate-call", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "hash-in-text", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "newline-escape", "print-call", "raise-stmt", "reassignment", "self-name", "string-format", "string-index", "string-method", "string-split", "subclass", "top-level-indent", "try-except", "tuple-unpack"],
    prompt: "Partners send orders in two text formats: `O100282,2,17.92` and `order=O100282; qty=2; price=17.92`. Write an abstract `LineParser` whose concrete `parse(text)` does the shared work (skip blank lines and lines starting with `#`, number the lines from 1, collect records, and turn a ValueError from one line into an error message) and whose abstract `parse_line(line)` turns one line into a record. Then write `CsvLineParser` and `KeyValueParser`.",
    spec: [
      ["Record", "`{\"order_id\": str, \"qty\": int, \"price\": float}`"],
      ["`LineParser.parse(text)`", "→ `(records, errors)`; errors are `\"line <n>: <message>\"`"],
      ["`CsvLineParser.parse_line`", "`order_id,qty,price`; anything else → ValueError"],
      ["`KeyValueParser.parse_line`", "`key=value` pairs separated by `;` (spaces allowed), keys `order`, `qty`, `price` in any order; a missing key → ValueError"],
    ],
    hiddenKinds: ["comments and blank lines", "keys in a different order", "a missing key", "a quantity that isn't a number", "no lines"],
    hints: [
      "`parse` lives in the base class: enumerate the lines from 1, skip blanks and comments, and call `self.parse_line(line)` inside `try`.",
      "Each subclass only turns one line into a record and raises ValueError when it can't. A KeyError for a missing key should become a ValueError too.",
      "For key=value text: split on `;`, then each part on the first `=`, stripping spaces, into a dictionary.",
    ],
    explanation: "The template method keeps every rule that both formats share (comments, numbering, error collection) in one place, so the two parsers can't drift apart. Each subclass is reduced to the one thing that differs. Converting KeyError to ValueError inside `parse_line` matters: the template promises to collect *bad lines*, and a missing key is a bad line, not a crash.",
    code: {
      starter: src`
from abc import ABC, abstractmethod

text = """# orders from partner A
O100282,2,17.92

O100918,one,55.72
"""
`,
      answer: src`
from abc import ABC, abstractmethod

class LineParser(ABC):
    @abstractmethod
    def parse_line(self, line):
        """One line as an order record; ValueError if it can't be read."""

    def parse(self, text):
        records, errors = [], []
        for number, line in enumerate(text.splitlines(), start=1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                records.append(self.parse_line(line))
            except ValueError as err:
                errors.append(f"line {number}: {err}")
        return records, errors

class CsvLineParser(LineParser):
    def parse_line(self, line):
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 3:
            raise ValueError(f"expected 3 fields, got {len(parts)}")
        order_id, qty, price = parts
        return {"order_id": order_id, "qty": int(qty), "price": float(price)}

class KeyValueParser(LineParser):
    def parse_line(self, line):
        fields = {}
        for part in line.split(";"):
            key, _, value = part.partition("=")
            fields[key.strip()] = value.strip()
        try:
            return {"order_id": fields["order"], "qty": int(fields["qty"]), "price": float(fields["price"])}
        except KeyError as err:
            raise ValueError(f"missing {err}")

text = """# orders from partner A
O100282,2,17.92

O100918,one,55.72
"""
print(CsvLineParser().parse(text))
print(KeyValueParser().parse("order=O101219; qty=1; price=246.6"))
`,
      alternatives: [
        src`
from abc import ABC, abstractmethod

class LineParser(ABC):
    @abstractmethod
    def parse_line(self, line):
        """Parse one line."""

    def parse(self, text):
        records = []
        errors = []
        number = 0
        for raw in text.split("\n"):
            number += 1
            line = raw.strip()
            if line == "" or line[0] == "#":
                continue
            try:
                record = self.parse_line(line)
            except ValueError as err:
                errors.append("line " + str(number) + ": " + str(err))
            else:
                records.append(record)
        return records, errors

class CsvLineParser(LineParser):
    def parse_line(self, line):
        fields = line.split(",")
        if len(fields) != 3:
            raise ValueError("wrong number of fields")
        return {"order_id": fields[0].strip(), "qty": int(fields[1]), "price": float(fields[2])}

class KeyValueParser(LineParser):
    def parse_line(self, line):
        pairs = dict(part.strip().split("=", 1) for part in line.split(";") if "=" in part)
        pairs = {k.strip(): v.strip() for k, v in pairs.items()}
        for key in ["order", "qty", "price"]:
            if key not in pairs:
                raise ValueError("missing " + key)
        return {"order_id": pairs["order"], "qty": int(pairs["qty"]), "price": float(pairs["price"])}
`,
      ],
      wrong: [
        {
          code: src`
from abc import ABC, abstractmethod

class LineParser(ABC):
    @abstractmethod
    def parse_line(self, line):
        """Parse one line."""

    def parse(self, text):
        records, errors = [], []
        for number, line in enumerate(text.splitlines(), start=1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                records.append(self.parse_line(line))
            except ValueError as err:
                errors.append(f"line {number}: {err}")
        return records, errors

class CsvLineParser(LineParser):
    def parse_line(self, line):
        order_id, qty, price = [part.strip() for part in line.split(",")]
        return {"order_id": order_id, "qty": int(qty), "price": float(price)}

class KeyValueParser(LineParser):
    def parse_line(self, line):
        fields = {}
        for part in line.split(";"):
            key, _, value = part.partition("=")
            fields[key.strip()] = value.strip()
        return {"order_id": fields["order"], "qty": int(fields["qty"]), "price": float(fields["price"])}
`,
          fails: ["missing-key"],
          why: "a missing key raises KeyError, which the template doesn't collect, so one bad line stops the whole parse",
        },
        {
          code: src`
from abc import ABC, abstractmethod

class LineParser(ABC):
    @abstractmethod
    def parse_line(self, line):
        """Parse one line."""

    def parse(self, text):
        records, errors = [], []
        lines = [l.strip() for l in text.splitlines() if l.strip() and not l.strip().startswith("#")]
        for number, line in enumerate(lines, start=1):
            try:
                records.append(self.parse_line(line))
            except ValueError as err:
                errors.append(f"line {number}: {err}")
        return records, errors

class CsvLineParser(LineParser):
    def parse_line(self, line):
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 3:
            raise ValueError("expected 3 fields")
        return {"order_id": parts[0], "qty": int(parts[1]), "price": float(parts[2])}

class KeyValueParser(LineParser):
    def parse_line(self, line):
        fields = {}
        for part in line.split(";"):
            key, _, value = part.partition("=")
            fields[key.strip()] = value.strip()
        try:
            return {"order_id": fields["order"], "qty": int(fields["qty"]), "price": float(fields["price"])}
        except KeyError as err:
            raise ValueError(f"missing {err}")
`,
          fails: ["csv", "missing-key"],
          why: "lines are numbered after skipping comments and blanks, so the error messages point at the wrong lines of the file",
        },
      ],
      task: {
        checks: [
          expr("csv", "The CSV format with a comment, a blank line and a bad line", "_r, _e = CsvLineParser().parse('# orders from partner A\\nO100282,2,17.92\\n\\nO100918,one,55.72\\nO101219,1,246.6,extra\\n')\nresult = [_r, [_m.split(':')[0] for _m in _e]]", [[{ order_id: "O100282", qty: 2, price: 17.92 }], ["line 4", "line 5"]], { show: "CsvLineParser().parse(text): the records and the error line numbers" }),
          expr("kv", "The key=value format, keys in any order", "_r, _e = KeyValueParser().parse('order=O101219; qty=1; price=246.6\\n  price=4.99;order=O1;qty=3  ')\nresult = [_r, _e]", [[{ order_id: "O101219", qty: 1, price: 246.6 }, { order_id: "O1", qty: 3, price: 4.99 }], []], { show: "KeyValueParser().parse(two lines)" }),
          expr("missing-key", "A missing key", "_r, _e = KeyValueParser().parse('# kv\\norder=O1; qty=2\\norder=O2; qty=1; price=5')\nresult = [len(_r), [_m.split(':')[0] for _m in _e]]", [1, ["line 2"]], { hidden: true }),
          expr("abstract", "LineParser itself can't be created", "try:\n    LineParser()\n    result = 'created'\nexcept TypeError:\n    result = 'refused'", "refused", { hidden: true }),
          expr("empty", "No lines", "result = [CsvLineParser().parse(''), KeyValueParser().parse('# nothing\\n')]", [py.tuple(py.list(), py.list()), py.tuple(py.list(), py.list())], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q29-19 validation, medium
  {
    id: "PY-Q29-19",
    version: 2,
    slug: "pattern-descriptor",
    title: "A descriptor that checks codes",
    format: "validation",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "conditional-expr", "descriptor-method", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "list-mutate", "logical", "method-def", "none-value", "plain-class", "print-call", "raise-stmt", "self-name", "string-format", "string-index", "string-method", "top-level-indent"],
    prompt: "SKUs, customer ids and postcodes all follow patterns, and they are checked in many classes. Write a descriptor `Matches(pattern)` that strips the assigned text, upper-cases it, checks it against the regular expression with `re.fullmatch`, and stores it, raising `ValueError` (with the attribute's name in the message) when it doesn't match. Use it in `Product` for `sku` (`[A-Z]{3}-\\d{5}`) and in `Customer` for `customer_id` (`C\\d{5}`).",
    spec: [
      ["Descriptor", "`Matches(pattern)` with `__set_name__`, `__get__` (returns itself when read from the class), `__set__`"],
      ["Stores", "the stripped, upper-cased text"],
      ["Classes", "`Product(sku, name)` with `sku = Matches(r\"[A-Z]{3}-\\d{5}\")`; `Customer(customer_id, email)` with `customer_id = Matches(r\"C\\d{5}\")`"],
    ],
    hiddenKinds: ["two products keep separate SKUs", "a code with extra characters", "a refused change keeps the old value"],
    hints: [
      "`__init__` keeps the pattern; `__set_name__` keeps the attribute's name for messages and storage.",
      "In `__set__`: tidy the text, check it with `re.fullmatch(self.pattern, text)`, then store it in `obj.__dict__`.",
      "The descriptors are class attributes of Product and Customer; their `__init__` methods assign as usual.",
    ],
    explanation: "One descriptor class carries the whole rule (tidy, check, store, explain), and each class just declares which pattern applies to which attribute. Storing in `obj.__dict__` keeps each object's value separate. `fullmatch` matters: `re.match` would accept a valid code followed by extra characters.",
    code: {
      starter: src`
import re

class Matches:
    pass

class Product:
    def __init__(self, sku, name):
        self.sku = sku
        self.name = name

mat = Product(" spo-11681", "Yoga mat")
print(mat.sku)
`,
      answer: src`
import re

class Matches:
    def __init__(self, pattern):
        self.pattern = pattern

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        text = value.strip().upper()
        if not re.fullmatch(self.pattern, text):
            raise ValueError(f"{self.name}: {text!r} doesn't match {self.pattern}")
        obj.__dict__[self.name] = text

class Product:
    sku = Matches(r"[A-Z]{3}-\d{5}")

    def __init__(self, sku, name):
        self.sku = sku
        self.name = name

class Customer:
    customer_id = Matches(r"C\d{5}")

    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email

mat = Product(" spo-11681", "Yoga mat")
print(mat.sku)
`,
      alternatives: [
        src`
import re

class Matches:
    def __init__(self, pattern):
        self.regex = re.compile(pattern)

    def __set_name__(self, owner, name):
        self.name = name
        self.key = "_" + name

    def __get__(self, obj, objtype=None):
        return self if obj is None else getattr(obj, self.key)

    def __set__(self, obj, value):
        cleaned = value.upper().strip()
        if self.regex.fullmatch(cleaned) is None:
            raise ValueError(self.name + " has the wrong format")
        setattr(obj, self.key, cleaned)

class Product:
    sku = Matches(r"[A-Z]{3}-\d{5}")

    def __init__(self, sku, name):
        self.sku = sku
        self.name = name

class Customer:
    customer_id = Matches(r"C\d{5}")

    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email
`,
      ],
      wrong: [
        {
          code: src`
import re

class Matches:
    def __init__(self, pattern):
        self.pattern = pattern

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__[self.name]

    def __set__(self, obj, value):
        text = value.strip().upper()
        if not re.match(self.pattern, text):
            raise ValueError(f"{self.name}: bad format")
        obj.__dict__[self.name] = text

class Product:
    sku = Matches(r"[A-Z]{3}-\d{5}")

    def __init__(self, sku, name):
        self.sku = sku
        self.name = name

class Customer:
    customer_id = Matches(r"C\d{5}")

    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email
`,
          fails: ["extra"],
          why: "`re.match` only checks the start, so `SPO-116810` and `C000771` slip through",
        },
        {
          code: src`
import re

class Matches:
    def __init__(self, pattern):
        self.pattern = pattern

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return self.value

    def __set__(self, obj, value):
        text = value.strip().upper()
        if not re.fullmatch(self.pattern, text):
            raise ValueError(f"{self.name}: bad format")
        self.value = text

class Product:
    sku = Matches(r"[A-Z]{3}-\d{5}")

    def __init__(self, sku, name):
        self.sku = sku
        self.name = name

class Customer:
    customer_id = Matches(r"C\d{5}")

    def __init__(self, customer_id, email):
        self.customer_id = customer_id
        self.email = email
`,
          fails: ["separate"],
          why: "the value is kept on the shared descriptor, so the second product's SKU replaces the first's",
        },
      ],
      task: {
        checks: [
          expr("tidy", "Codes are tidied and stored", "result = [Product(' spo-11681', 'Yoga mat').sku, Customer('c00077 ', 'jamal@x.com').customer_id]", ["SPO-11681", "C00077"], { show: "Product(\" spo-11681\", ...).sku and Customer(\"c00077 \", ...).customer_id" }),
          expr("messages", "Bad codes are refused, naming the attribute", "_out = []\nfor _make in [lambda: Product('SPO-1168', 'x'), lambda: Customer('00077', 'x')]:\n    try:\n        _make()\n        _out.append('created')\n    except ValueError as _e:\n        _out.append('sku' in str(_e) or 'customer_id' in str(_e))\nresult = _out", [true, true], { show: "Product(\"SPO-1168\", ...) and Customer(\"00077\", ...)" }),
          expr("separate", "Two products keep separate SKUs", "_a = Product('SPO-11681', 'a')\n_b = Product('HOM-22847', 'b')\nresult = [_a.sku, _b.sku]", ["SPO-11681", "HOM-22847"], { hidden: true }),
          expr("extra", "Codes with extra characters", "_out = []\nfor _make in [lambda: Product('SPO-116810', 'x'), lambda: Customer('C000771', 'x')]:\n    try:\n        _make()\n        _out.append('created')\n    except ValueError:\n        _out.append('refused')\nresult = _out", ["refused", "refused"], { hidden: true }),
          expr("keeps-old", "A refused change keeps the old value", "_p = Product('SPO-11681', 'mat')\ntry:\n    _p.sku = 'nope'\nexcept ValueError:\n    pass\nresult = [_p.sku, type(Product.sku).__name__]", ["SPO-11681", "Matches"], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q29-20 integration, medium
  {
    id: "PY-Q29-20",
    version: 2,
    slug: "order-service-collaborators",
    title: "An order service with injected collaborators",
    format: "integration",
    difficulty: "medium",
    minutes: 20,
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "conversion", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "init-method", "membership", "method-def", "none-value", "plain-class", "precedence", "reassignment", "self-name", "string-format", "top-level-indent", "try-except"],
    prompt: "Write `OrderService(payments, orders, notifier)`. `place_order(order_id, customer_id, lines)` adds up the lines (`quantity × unit_price`, rounded to 2 places), charges the customer through `payments.charge(customer_id, total)` (which returns a payment reference or raises `ValueError` when the card is declined), saves the order with `orders.save(order_id, total, reference)`, and tells the customer through `notifier.send(customer_id, text)`. A declined payment saves nothing, sends `\"Order <id>: payment declined\"`, and returns None. If saving fails, the error reaches the caller and no message is sent. Checks use fakes for all three collaborators.",
    spec: [
      ["Class", "`OrderService(payments, orders, notifier)`"],
      ["Success", "returns the reference; sends `\"Order <id> confirmed: <total>\"`"],
      ["Declined", "nothing saved; sends `\"Order <id>: payment declined\"`; returns None"],
      ["Save fails", "the exception propagates; nothing is sent"],
    ],
    hiddenKinds: ["a declined card", "storage that fails", "an order with one line"],
    hints: [
      "Store the three collaborators in `__init__`; `place_order` only calls their methods.",
      "Put only the `charge` call inside `try`/`except ValueError`; on a decline, notify and return None.",
      "Save before you notify, so a failed save never sends a confirmation.",
    ],
    explanation: "With the collaborators injected, the checks can use a payment fake that declines, a store that fails and a notifier that records messages, and verify the *order* of effects, which is the hard part of such a service: charge first, save next, confirm last. Catching only ValueError around the charge keeps unexpected errors visible, and saving before notifying means a customer is never told about an order that wasn't stored.",
    code: {
      starter: src`
class OrderService:
    def __init__(self, payments, orders, notifier):
        self.payments = payments

    def place_order(self, order_id, customer_id, lines):
        return None
`,
      answer: src`
class OrderService:
    def __init__(self, payments, orders, notifier):
        self.payments = payments
        self.orders = orders
        self.notifier = notifier

    def place_order(self, order_id, customer_id, lines):
        total = round(sum(quantity * unit_price for quantity, unit_price in lines), 2)
        try:
            reference = self.payments.charge(customer_id, total)
        except ValueError:
            self.notifier.send(customer_id, f"Order {order_id}: payment declined")
            return None
        self.orders.save(order_id, total, reference)
        self.notifier.send(customer_id, f"Order {order_id} confirmed: {total}")
        return reference
`,
      alternatives: [
        src`
class OrderService:
    def __init__(self, payments, orders, notifier):
        self.payments = payments
        self.orders = orders
        self.notifier = notifier

    def total_of(self, lines):
        amount = 0
        for quantity, unit_price in lines:
            amount += quantity * unit_price
        return round(amount, 2)

    def place_order(self, order_id, customer_id, lines):
        total = self.total_of(lines)
        try:
            reference = self.payments.charge(customer_id, total)
        except ValueError:
            reference = None
        if reference is None:
            self.notifier.send(customer_id, "Order " + order_id + ": payment declined")
            return None
        self.orders.save(order_id, total, reference)
        self.notifier.send(customer_id, "Order " + order_id + " confirmed: " + str(total))
        return reference
`,
      ],
      wrong: [
        {
          code: src`
class OrderService:
    def __init__(self, payments, orders, notifier):
        self.payments = payments
        self.orders = orders
        self.notifier = notifier

    def place_order(self, order_id, customer_id, lines):
        total = round(sum(q * p for q, p in lines), 2)
        try:
            reference = self.payments.charge(customer_id, total)
        except ValueError:
            self.notifier.send(customer_id, f"Order {order_id}: payment declined")
            return None
        self.notifier.send(customer_id, f"Order {order_id} confirmed: {total}")
        self.orders.save(order_id, total, reference)
        return reference
`,
          fails: ["save-fails"],
          why: "the confirmation is sent before the order is saved, so a failed save leaves a customer with a confirmation for an order that doesn't exist",
        },
        {
          code: src`
class OrderService:
    def __init__(self, payments, orders, notifier):
        self.payments = payments
        self.orders = orders
        self.notifier = notifier

    def place_order(self, order_id, customer_id, lines):
        total = round(sum(q * p for q, p in lines), 2)
        try:
            reference = self.payments.charge(customer_id, total)
            self.orders.save(order_id, total, reference)
        except Exception:
            self.notifier.send(customer_id, f"Order {order_id}: payment declined")
            return None
        self.notifier.send(customer_id, f"Order {order_id} confirmed: {total}")
        return reference
`,
          fails: ["save-fails"],
          why: "a storage failure is caught and reported to the customer as a declined card, and the real error disappears",
        },
      ],
      task: {
        checks: [
          expr("success", "A successful order", "class _Pay:\n    def __init__(self):\n        self.charged = []\n    def charge(self, customer_id, amount):\n        self.charged.append((customer_id, amount))\n        return 'ch_' + str(len(self.charged))\nclass _Orders:\n    def __init__(self):\n        self.rows = []\n    def save(self, order_id, total, reference):\n        self.rows.append((order_id, total, reference))\nclass _Notes:\n    def __init__(self):\n        self.sent = []\n    def send(self, customer_id, text):\n        self.sent.append((customer_id, text))\n_p, _o, _n = _Pay(), _Orders(), _Notes()\n_ref = OrderService(_p, _o, _n).place_order('O100282', 'C00077', [(2, 17.92), (1, 4.99)])\nresult = [_ref, _p.charged, _o.rows, _n.sent]", ["ch_1", [py.tuple(py.str("C00077"), py.float(40.83))], [py.tuple(py.str("O100282"), py.float(40.83), py.str("ch_1"))], [py.tuple(py.str("C00077"), py.str("Order O100282 confirmed: 40.83"))]], { show: "place_order(\"O100282\", \"C00077\", [(2, 17.92), (1, 4.99)]) with fakes" }),
          expr("declined", "A declined card", "class _Pay:\n    def charge(self, customer_id, amount):\n        raise ValueError('card declined')\nclass _Orders:\n    def __init__(self):\n        self.rows = []\n    def save(self, order_id, total, reference):\n        self.rows.append(order_id)\nclass _Notes:\n    def __init__(self):\n        self.sent = []\n    def send(self, customer_id, text):\n        self.sent.append(text)\n_o, _n = _Orders(), _Notes()\n_ref = OrderService(_Pay(), _o, _n).place_order('O100918', 'C01338', [(1, 55.72)])\nresult = [_ref, _o.rows, _n.sent]", [null, [], ["Order O100918: payment declined"]], { hidden: true }),
          expr("save-fails", "Storage that fails", "class _Pay:\n    def charge(self, customer_id, amount):\n        return 'ch_9'\nclass _Orders:\n    def save(self, order_id, total, reference):\n        raise OSError('database is locked')\nclass _Notes:\n    def __init__(self):\n        self.sent = []\n    def send(self, customer_id, text):\n        self.sent.append(text)\n_n = _Notes()\ntry:\n    OrderService(_Pay(), _Orders(), _n).place_order('O1', 'C1', [(1, 5.0)])\n    _outcome = 'returned'\nexcept OSError:\n    _outcome = 'OSError'\nresult = [_outcome, _n.sent]", ["OSError", []], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q29-22 output prediction, hard
  {
    id: "PY-Q29-22",
    version: 2,
    slug: "abc-or-protocol",
    title: "ABC membership or protocol shape?",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 8,
    requires: ["abstract-method", "assignment", "class-def", "for-loop", "function-def", "function-doc", "function-param", "function-return", "import-module", "membership", "method-def", "plain-class", "print-call", "print-several", "protocol-base", "runtime-protocol", "self-name", "string-index", "subclass", "top-level-indent"],
    prompt: "`Exporter.register(Pdf)` declares Pdf a *virtual subclass* of the ABC without inheriting from it. Type exactly what this program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "isinstance with an ABC asks about class membership: inheriting from it, or being registered with it.",
      "isinstance with a runtime-checkable Protocol asks only whether the methods exist.",
      "Registering a class doesn't check or add any methods.",
    ],
    explanation: "Csv inherits from Exporter and has `render`: True for both. Html has `render` but no link to the ABC: False, True. Pdf was registered, so the ABC accepts it, even though it has no `render` at all; the Protocol, which looks at methods, rejects it. Nominal and structural checks answer different questions.",
    predict: {
      program: src`
from abc import ABC, abstractmethod
from typing import Protocol, runtime_checkable

class Exporter(ABC):
    @abstractmethod
    def render(self, rows):
        """Rows as text."""

@runtime_checkable
class Renders(Protocol):
    def render(self, rows):
        """Rows as text."""

class Csv(Exporter):
    def render(self, rows):
        return "csv"

class Html:
    def render(self, rows):
        return "html"

class Pdf:
    pass

Exporter.register(Pdf)
for cls in [Csv, Html, Pdf]:
    obj = cls()
    print(cls.__name__, isinstance(obj, Exporter), isinstance(obj, Renders))
`,
      output: "Csv True True\nHtml False True\nPdf True False\n",
      wrongPredictions: [
        "Csv True True\nHtml True True\nPdf False False",
        "Csv True True\nHtml False True\nPdf False False",
        "Csv True True\nHtml False False\nPdf True True",
      ],
    },
  },
];
