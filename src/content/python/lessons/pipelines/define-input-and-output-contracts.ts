import { py } from "@/engine/python/values";
import type { PyValue } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;
const rec = (entries: [string, PyValue][]) => py.dict(entries.map(([k, v]) => [s(k), v] as [PyValue, PyValue]));
const strs = (...xs: string[]) => py.list(...xs.map(s));

const SCHEMA = `INPUT_SCHEMA = {
    "order_id": {"type": str, "required": True},
    "customer_id": {"type": str, "required": True},
    "amount": {"type": float, "required": True},
    "coupon": {"type": str, "required": False},
}`;

export const defineInputAndOutputContracts: PyLesson = {
  slug: "define-input-and-output-contracts",
  ref: "python:define-input-and-output-contracts",
  module: "pipelines",
  number: 1,
  title: "Define input and output contracts",
  level: "advanced",
  summary:
    "Before writing a pipeline, write down what it accepts and what it produces: the fields, their types, which are required, and a version number. Then check incoming records against the input contract and shape every output record to the output contract, so problems surface at the boundary.",

  sections: [
    {
      label: "what a contract is",
      blocks: [
        {
          kind: "p",
          text: "A **data pipeline** takes raw data in, transforms it, and writes results out, often unattended, every hour or day. Its **contract** is the agreement at each end: the **input schema** (what it expects to receive) and the **output schema** (what it promises to produce). Writing them as data, not just comments, lets the code check them.",
        },
        { kind: "code", code: SCHEMA },
        {
          kind: "p",
          text: "Each field says its type and whether it's required. A required field must be present and not `None`; an optional field may be missing, but if present it must have the right type. Checking this **at the boundary**, before any calculation, means a bad record is rejected with a clear reason instead of causing a confusing error three steps later.",
        },
      ],
    },
    {
      label: "report every problem",
      blocks: [
        {
          kind: "p",
          text: "A validator that returns a **list of problems** (empty when the record is fine) is more useful than one that stops at the first: the team fixing the source sees everything wrong at once. Name the field in each message. Note that `isinstance(True, int)` is `True`; if booleans aren't valid numbers in your contract, exclude them explicitly.",
        },
      ],
    },
    {
      label: "versioned output",
      blocks: [
        {
          kind: "p",
          text: "The output schema has a **version**. Consumers depend on its exact fields, so adding a field is a small change, but renaming or removing one breaks them. Write every output record with exactly the schema's fields, in a fixed order, filling optional ones with a documented default, and include `schema_version` so readers know which contract the file follows.",
        },
      ],
    },
  ],

  example: {
    caption: "Checking records against an input schema. Press Run to execute it with real Python; running examples never affects your progress.",
    code: `${SCHEMA}


def problems(record, schema):
    found = []
    for field, rule in schema.items():
        value = record.get(field)
        if value is None:
            if rule["required"]:
                found.append(f"{field}: required")
            continue
        if not isinstance(value, rule["type"]) or isinstance(value, bool):
            found.append(f"{field}: expected {rule['type'].__name__}, got {type(value).__name__}")
    for field in record:
        if field not in schema:
            found.append(f"{field}: not in the schema")
    return found


good = {"order_id": "A1", "customer_id": "C01", "amount": 40.0}
bad = {"order_id": "A2", "amount": "40", "discount": 5}
print(problems(good, INPUT_SCHEMA))
print(problems(bad, INPUT_SCHEMA))`,
  },

  walkthrough: [
    {
      title: "A schema is data",
      text: "Because the schema is a dictionary, code can loop over it: here, listing the required fields.",
      code: `${SCHEMA}

print([field for field, rule in INPUT_SCHEMA.items() if rule["required"]])
print(INPUT_SCHEMA["amount"]["type"].__name__)`,
    },
    {
      title: "Missing, None and wrong type",
      text: "A missing key and an explicit `None` are both “absent”; a value of the wrong type is a separate problem.",
      code: 'record = {"order_id": "A1", "customer_id": None, "amount": "40.0"}\nfor field in ["order_id", "customer_id", "amount", "coupon"]:\n    value = record.get(field)\n    print(field, repr(value), "absent" if value is None else type(value).__name__)',
    },
    {
      title: "Booleans pass isinstance(…, int)",
      text: "`True` is an `int` to Python, so a contract that wants a number must exclude `bool` explicitly.",
      code: "for value in [3, 3.5, True]:\n    print(repr(value), isinstance(value, (int, float)), isinstance(value, (int, float)) and not isinstance(value, bool))",
    },
    {
      title: "Shaping output to the contract",
      text: "Every output record has exactly the schema's fields, in order, with defaults for optional ones and the schema version.",
      code: 'OUTPUT_FIELDS = ["order_id", "customer_id", "amount", "coupon"]\nDEFAULTS = {"coupon": ""}\n\ndef to_output(record):\n    row = {field: record.get(field, DEFAULTS.get(field)) for field in OUTPUT_FIELDS}\n    row["schema_version"] = "orders.v1"\n    return row\n\nprint(to_output({"amount": 40.0, "customer_id": "C01", "order_id": "A1", "internal_note": "x"}))',
    },
  ],

  mistakes: [
    {
      title: "Validating halfway through",
      text: "With no check at the boundary, the bad amount reaches the arithmetic, and the error says nothing about which record or field was wrong.",
      code: 'records = [{"order_id": "A1", "amount": 40.0}, {"order_id": "A2", "amount": "15.5"}]\ntotal = 0\nfor r in records:\n    total += r["amount"] * 1.2',
      raises: "TypeError",
      fix: "Validate every record against the input schema first, and reject or report bad ones before calculating.",
    },
    {
      title: "Output whose fields drift",
      text: "The output keeps whatever fields each input happened to have, so two rows of the same file have different columns.",
      code: 'inputs = [{"order_id": "A1", "amount": 40.0}, {"order_id": "A2", "amount": 9.0, "coupon": "SAVE5"}]\noutput = [dict(r) for r in inputs]\nprint([sorted(row) for row in output])',
      fix: "Build each output row from the output schema's field list, with defaults for optional fields.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "List every contract problem",
      prompt:
        "Write `contract_problems(record, schema)`, using a schema shaped like `INPUT_SCHEMA` in the editor. Return a list of problem messages, empty if the record is valid: `\"<field>: required\"` for a required field that's missing or `None`; `\"<field>: expected <type>\"` for a present value of the wrong type (booleans never count as numbers); and `\"<field>: unknown field\"` for keys not in the schema. Report schema fields in schema order, then unknown fields in the record's order.",
      looksFor: [
        "A valid record gives `[]`; optional fields may be absent.",
        "Missing or `None` required fields, wrong types (including `True` for a number) and unknown fields are all reported.",
        "Messages use the exact format, in the stated order.",
      ],
      starter: `${SCHEMA}


def contract_problems(record, schema):
    # Return a list of problems; [] when the record is valid.
    pass
`,
      task: {
        checks: [
          {
            kind: "expr",
            id: "valid",
            label: "Valid records have no problems",
            show: "contract_problems(valid records, INPUT_SCHEMA)",
            expr: 'result = [contract_problems({"order_id": "A1", "customer_id": "C01", "amount": 40.0}, INPUT_SCHEMA), contract_problems({"order_id": "A1", "customer_id": "C01", "amount": 40.0, "coupon": "SAVE5"}, INPUT_SCHEMA)]',
            expected: py.list(py.list(), py.list()),
          },
          {
            kind: "expr",
            id: "problems",
            label: "Every problem, in order",
            show: 'contract_problems({"order_id": "A2", "customer_id": None, "amount": "40", "coupon": 5, "extra": 1}, INPUT_SCHEMA)',
            expr: 'result = contract_problems({"order_id": "A2", "customer_id": None, "amount": "40", "coupon": 5, "extra": 1}, INPUT_SCHEMA)',
            expected: strs("customer_id: required", "amount: expected float", "coupon: expected str", "extra: unknown field"),
            tip: 'Loop over schema.items(): value = record.get(field); None means "required" (if required), otherwise check isinstance. Then loop over record for unknown keys.',
          },
          {
            kind: "expr",
            id: "bool",
            label: "True isn't a valid whole number",
            hidden: true,
            expr: 'result = contract_problems({"qty": True}, {"qty": {"type": int, "required": True}})',
            expected: strs("qty: expected int"),
          },
          {
            kind: "expr",
            id: "other-schema",
            label: "Works with another schema",
            hidden: true,
            expr: 'schema = {"id": {"type": int, "required": True}, "tags": {"type": list, "required": False}}\nresult = [contract_problems({}, schema), contract_problems({"id": 7, "tags": "x"}, schema)]',
            expected: py.list(strs("id: required"), strs("tags: expected list")),
          },
        ],
      },
      hints: [
        'for field, rule in schema.items(): value = record.get(field).',
        'If value is None: add f"{field}: required" when rule["required"]. Otherwise, if not isinstance(value, rule["type"]) or isinstance(value, bool): add the type message.',
        'Then for field in record: if field not in schema: add f"{field}: unknown field".',
      ],
      answer: `${SCHEMA}


def contract_problems(record, schema):
    """Return a list of contract problems for record (empty if it's valid)."""
    found = []
    for field, rule in schema.items():
        value = record.get(field)
        if value is None:
            if rule["required"]:
                found.append(f"{field}: required")
            continue
        if isinstance(value, bool) or not isinstance(value, rule["type"]):
            found.append(f"{field}: expected {rule['type'].__name__}")
    for field in record:
        if field not in schema:
            found.append(f"{field}: unknown field")
    return found`,
      wrong: [
        { code: `${SCHEMA}\n\ndef contract_problems(record, schema):\n    for field, rule in schema.items():\n        if rule["required"] and record.get(field) is None:\n            return [f"{field}: required"]\n    return []\n`, fails: ["problems", "bool", "other-schema"], why: "stops at the first problem, checks only required fields" },
        { code: `${SCHEMA}\n\ndef contract_problems(record, schema):\n    found = []\n    for field, rule in schema.items():\n        value = record.get(field)\n        if value is None:\n            if rule["required"]:\n                found.append(f"{field}: required")\n            continue\n        if not isinstance(value, rule["type"]):\n            found.append(f"{field}: expected {rule['type'].__name__}")\n    for field in record:\n        if field not in schema:\n            found.append(f"{field}: unknown field")\n    return found\n`, fails: ["bool"], why: "lets True count as a number" },
      ],
    },
    {
      id: "challenge-2",
      title: "Shape records to the output contract",
      prompt:
        "Write `to_output(record)`. Using `OUTPUT_SCHEMA` (in the editor: an ordered list of field names, defaults for optional fields, and a version), return a **new dictionary** with exactly the output fields in that order, then `schema_version`. Required fields (those without a default) that are missing raise `KeyError` naming the field. Extra input fields are dropped. Don't change the input.",
      looksFor: [
        "Exactly the output fields, in order, then `schema_version`.",
        "Optional fields get their defaults; missing required fields raise `KeyError`.",
        "Extra fields are dropped; the input isn't changed.",
      ],
      starter: 'OUTPUT_SCHEMA = {\n    "version": "orders.v2",\n    "fields": ["order_id", "customer_id", "amount", "currency", "coupon"],\n    "defaults": {"currency": "GBP", "coupon": ""},\n}\n\n\ndef to_output(record):\n    # Return a dict with exactly the output fields, then schema_version.\n    pass\n',
      task: {
        checks: [
          {
            kind: "expr",
            id: "shape",
            label: "Exactly the output fields, in order, with defaults",
            show: 'to_output({"amount": 40.0, "customer_id": "C01", "order_id": "A1", "note": "x"})',
            expr: 'out = to_output({"amount": 40.0, "customer_id": "C01", "order_id": "A1", "note": "x"})\nresult = (list(out.items()))',
            expected: py.list(...([["order_id", s("A1")], ["customer_id", s("C01")], ["amount", f(40)], ["currency", s("GBP")], ["coupon", s("")], ["schema_version", s("orders.v2")]] as [string, PyValue][]).map(([k, v]) => py.tuple(s(k), v))),
            tip: 'Build the dict by looping over OUTPUT_SCHEMA["fields"], so the order is the schema\'s.',
          },
          { kind: "expr", id: "keeps", label: "Given optional values are kept", show: 'to_output({..., "currency": "EUR", "coupon": "SAVE5"})', expr: 'out = to_output({"order_id": "A2", "customer_id": "C02", "amount": 9.5, "currency": "EUR", "coupon": "SAVE5"})\nresult = (out["currency"], out["coupon"])', expected: py.tuple(s("EUR"), s("SAVE5")) },
          { kind: "expr", id: "required", label: "A missing required field raises KeyError", show: 'to_output({"order_id": "A3", "amount": 1.0})', expr: 'to_output({"order_id": "A3", "amount": 1.0})', raises: "KeyError" },
          { kind: "expr", id: "input", label: "The input isn't changed", hidden: true, expr: 'r = {"order_id": "A1", "customer_id": "C01", "amount": 1.0, "note": "keep"}\nto_output(r)\nresult = r', expected: rec([["order_id", s("A1")], ["customer_id", s("C01")], ["amount", f(1)], ["note", s("keep")]]) },
        ],
      },
      hints: [
        'out = {}; for field in OUTPUT_SCHEMA["fields"]:',
        'If field in record: out[field] = record[field]; elif field in OUTPUT_SCHEMA["defaults"]: use the default; else raise KeyError(field).',
        'Finally out["schema_version"] = OUTPUT_SCHEMA["version"] and return out.',
      ],
      answer: 'OUTPUT_SCHEMA = {\n    "version": "orders.v2",\n    "fields": ["order_id", "customer_id", "amount", "currency", "coupon"],\n    "defaults": {"currency": "GBP", "coupon": ""},\n}\n\n\ndef to_output(record):\n    """Return record shaped to OUTPUT_SCHEMA: its fields in order, defaults filled, then schema_version."""\n    out = {}\n    for field in OUTPUT_SCHEMA["fields"]:\n        if field in record:\n            out[field] = record[field]\n        elif field in OUTPUT_SCHEMA["defaults"]:\n            out[field] = OUTPUT_SCHEMA["defaults"][field]\n        else:\n            raise KeyError(f"missing required field: {field}")\n    out["schema_version"] = OUTPUT_SCHEMA["version"]\n    return out',
      wrong: [
        { code: 'OUTPUT_SCHEMA = {"version": "orders.v2", "fields": ["order_id", "customer_id", "amount", "currency", "coupon"], "defaults": {"currency": "GBP", "coupon": ""}}\n\ndef to_output(record):\n    out = {**OUTPUT_SCHEMA["defaults"], **record}\n    out["schema_version"] = OUTPUT_SCHEMA["version"]\n    return out\n', fails: ["shape", "required"], why: "keeps extra fields, wrong order, no required check" },
        { code: 'OUTPUT_SCHEMA = {"version": "orders.v2", "fields": ["order_id", "customer_id", "amount", "currency", "coupon"], "defaults": {"currency": "GBP", "coupon": ""}}\n\ndef to_output(record):\n    for field, value in OUTPUT_SCHEMA["defaults"].items():\n        record.setdefault(field, value)\n    out = {field: record.get(field) for field in OUTPUT_SCHEMA["fields"]}\n    out["schema_version"] = OUTPUT_SCHEMA["version"]\n    return out\n', fails: ["required", "input"], why: "changes the input and lets required fields be None" },
      ],
    },
  ],

  quiz: [
    {
      id: "boundary",
      prompt: "Why validate records against the input contract before transforming them?",
      options: [
        { text: "A bad record is rejected with a clear reason, instead of failing confusingly later", correct: true, why: "Errors at the boundary name the field and record; errors deep inside a calculation usually don't." },
        { text: "Because Python can't transform invalid data", why: "It often can, which is exactly the danger: wrong results without an error." },
        { text: "To make the pipeline faster", why: "Validation adds a little work; its value is correctness and clear errors." },
        { text: "Contracts are only documentation", why: "Written as data, a contract can be checked automatically." },
      ],
    },
    {
      id: "version",
      prompt: "A consumer reads `amount` from your output. Which change needs a new schema version?",
      options: [
        { text: "Renaming `amount` to `total`", correct: true, why: "Renaming or removing a field breaks consumers that depend on it; bump the version and announce it." },
        { text: "Fixing a typo in a docstring", why: "Documentation changes don't affect the data contract." },
        { text: "Rejecting more invalid input rows", why: "The output's shape is unchanged; that's a data-quality change." },
        { text: "Speeding up the code", why: "Performance changes don't change the contract." },
      ],
    },
  ],

  outcomes: [
    "Write input and output schemas as data: fields, types, required flags and a version.",
    "Validate records at the boundary and report every problem, naming the field.",
    "Shape every output record to the output schema, with defaults and a schema version.",
    "Know which changes break consumers and need a new version.",
  ],
};
