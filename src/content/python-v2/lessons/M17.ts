/**
 * M17 Nested Data Structures: five lessons (PY-L17-01 … PY-L17-05).
 *
 * Real data rarely arrives flat. An API response is a dictionary holding lists of dictionaries holding more
 * dictionaries. This module reads values deep inside such data (a chain of keys and indexes), survives keys that
 * are missing (`get` with a default), walks lists stored inside records (an inner loop), flattens nested records
 * into rows (and nests flat rows back), and changes nested values without changing someone else's data
 * (copy each level you change).
 *
 * Fixtures are small slices of course datasets: D08 (USGS earthquake GeoJSON, as the API returns it), D11 (Runtime
 * repository events, GitHub-style push payloads), D12 (Runtime Q&A questions and tags), and R01 (Runtime Market
 * orders, customers and products). Challenges are graded by calling the learner's function with the public example
 * and hidden inputs (missing keys, None values, empty lists, ties), and by checking that inputs are not mutated.
 * Version 2: rewritten from a print-one-cell module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

// ---------------------------------------------------------------- shared fixtures (inputs for function checks)

const feature = (id: string, mag: number | null, place: string, coords: number[]) => ({
  type: "Feature",
  id,
  properties: { mag, place },
  geometry: { type: "Point", coordinates: coords },
});

const arctic = feature("us6000pw77", 4.7, "Arctic Ocean", [-107.5679, 80.7069, 10]);
const fiji = feature("us6000pxyr", 4.1, "233 km E of Levuka, Fiji", [-178.4779, -18.0069, 585.411]);
const chile = feature("us6000pw8e", 4.4, "69 km SSW of Ollagüe, Chile", [-68.546, -21.7883, 123.298]);
const alaska = feature("ak0252r9gt13", 2.7, "Southern Alaska", [-147.2371, 61.4029, 9.6]);
const page = (...features: unknown[]) => ({ type: "FeatureCollection", metadata: { count: features.length }, features });

const customers = [
  { customer_id: "C00164", email: "isaac.sato62@gmail.com", contact: { email: "isaac@sato-design.com", phone: "212-555-0164" } },
  { customer_id: "C00800", email: "samuel_mensah@yahoo.com", contact: { phone: "305-555-0800" } },
  { customer_id: "C01338", email: "grace_walker29@yahoo.com" },
];

const shipOrders = [
  { order_id: "O100043", shipping: { address: { city: "  new york ", state: "NY" } } },
  { order_id: "O101217", shipping: { address: { state: "FL" } } },
  { order_id: "O101341" },
];

const push = (login: string, repo: string, authors: string[]) => ({
  type: "PushEvent",
  actor: { login },
  repo: { name: repo },
  payload: { commits: authors.map((name, i) => ({ sha: `${login.slice(0, 3)}${i}`, author: { name } })) },
});
const watch = (login: string, repo: string) => ({ type: "WatchEvent", actor: { login }, repo: { name: repo }, payload: { action: "started" } });

const events = [
  push("ml-koi418", "tidewater/smartqueue", ["ml-koi418", "ana-dev"]),
  watch("j-ochoa", "tidewater/smartqueue"),
  push("ana-dev", "tidewater/smartqueue", ["ana-dev"]),
  push("ml-koi418", "harbor/tinyhttp", ["ml-koi418"]),
];

const questions = [
  { question_id: 70015316, title: "TypeError when I inherit from a base class", tags: ["python", "dataclasses"] },
  { question_id: 70015402, title: "Why does my CSV have blank lines?", tags: ["python", "csv", "windows"] },
  { question_id: 70015577, title: "How do I read a gzip file?", tags: [] },
];

const config = {
  app: "runtime-reports",
  db: { host: "db.internal", port: 5432, pool: { min: 1, max: 8 } },
  debug: false,
};

const product = { sku: "SPO-11681", name: "Ultra Bike Light", prices: { US: 7.49, EU: 6.99 } };

const discountOrders = [
  { order_id: "O100282", items: [{ sku: "P0164", unit_price: 31, quantity: 1 }, { sku: "P0594", unit_price: 48, quantity: 2 }] },
  { order_id: "O100918", items: [{ sku: "P0209", unit_price: 16, quantity: 3 }] },
];

export const m17Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L17-01 reach inside nested data
  {
    id: "PY-L17-01",
    version: 2,
    slug: "read-nested-data",
    title: "Read a value deep inside a response",
    lede: "An API response is a dictionary holding lists holding more dictionaries. A chain of keys and indexes, read left to right, reaches any value inside it.",
    focus: "Reach a value inside nested dictionaries and lists with a chain of keys and indexes.",
    minutes: 16,
    objectives: [
      "Read a chain like `page[\"features\"][0][\"properties\"][\"mag\"]` one step at a time",
      "Use a key on a dictionary and a position on a list, and recognise the error when you mix them up",
      "Write a function that pulls several values out of one nested record",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "dict-literal", "dict-lookup", "nested-dict", "string-index", "string-format", "comparison", "if-statement", "for-loop", "len-call", "none-value", "identity", "logical", "tuple-literal", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "reassignment", "membership", "tuple-unpack"],
    teaches: ["nested-index", "nested-lookup"],
    blocks: [
      {
        kind: "text",
        md: "The US Geological Survey publishes every earthquake as a **GeoJSON** record. One record is a dictionary; its `properties` key holds another dictionary (magnitude, place), and its `geometry` key holds a dictionary whose `coordinates` is a list: longitude, latitude, depth in km.\n\nNothing new is needed to read inside it. `quake[\"properties\"]` gives back a dictionary, and you can put another pair of brackets straight after it: `quake[\"properties\"][\"place\"]`. Each pair of brackets works on the value the previous pair produced, left to right.",
      },
      {
        kind: "example",
        title: "One earthquake from the USGS feed",
        code: src`
quake = {
    "id": "us6000pw77",
    "properties": {"mag": 4.7, "place": "Arctic Ocean"},
    "geometry": {"type": "Point", "coordinates": [-107.5679, 80.7069, 10]},
}
print(quake["properties"]["place"])
print(quake["properties"]["mag"])
coordinates = quake["geometry"]["coordinates"]
print(coordinates)
print("depth:", quake["geometry"]["coordinates"][2], "km")
`,
        output: "Arctic Ocean\n4.7\n[-107.5679, 80.7069, 10]\ndepth: 10 km\n",
        note: "`quake[\"geometry\"]` is a dictionary, `[\"coordinates\"]` on it is a list, and `[2]` on that list is the third number. Storing a middle step in a name (`coordinates`) is fine when you need it more than once.",
      },
      {
        kind: "text",
        md: "Each step must match the kind of value it lands on: a **key** for a dictionary, a **position** for a list. A page of results keeps its events in a list under `features`, so you need a position before you can ask for `properties`.",
      },
      {
        kind: "error-example",
        title: "A key where a position belongs",
        code: src`
page = {"metadata": {"count": 1}, "features": [{"id": "us6000pw77", "properties": {"mag": 4.7}}]}
print(page["metadata"]["count"])
print(page["features"]["properties"]["mag"])
`,
        error: "TypeError",
        output: "1\n",
        note: "`page[\"features\"]` is a list, and a list can't be read with the text `\"properties\"`: `TypeError: list indices must be integers or slices, not str`. The fix is a position first: `page[\"features\"][0][\"properties\"][\"mag\"]`.",
      },
      {
        kind: "text",
        md: "In a program, the chain lives in a function that takes the whole response and returns just what the caller needs. Check for an empty list before you reach for position 0, because an API can return a page with no events.",
      },
      {
        kind: "example",
        title: "Summarise a page of results",
        code: src`
def first_event(page):
    if len(page["features"]) == 0:
        return "no events"
    first = page["features"][0]
    place = first["properties"]["place"]
    depth = first["geometry"]["coordinates"][2]
    return f"{page['metadata']['count']} events; first: {place}, {depth} km deep"

page = {
    "metadata": {"count": 2},
    "features": [
        {"properties": {"place": "233 km E of Levuka, Fiji"}, "geometry": {"coordinates": [-178.4779, -18.0069, 585.411]}},
        {"properties": {"place": "Southern Alaska"}, "geometry": {"coordinates": [-147.2371, 61.4029, 9.6]}},
    ],
}
print(first_event(page))
print(first_event({"metadata": {"count": 0}, "features": []}))
`,
        output: "2 events; first: 233 km E of Levuka, Fiji, 585.411 km deep\nno events\n",
        note: "Inside an f-string written with double quotes, the keys use single quotes: `page['metadata']['count']`.",
      },
      {
        kind: "text",
        md: "**When to use it:** any time data comes as JSON from an API or a file: orders with their lines, a user with their address, a page of search results. **Mistakes to avoid:** a key where a list needs a position (the TypeError above), position 0 of an empty list (`IndexError`), and, with GeoJSON, reading position 0 as the latitude: the format stores **longitude first**.",
      },
    ],
    tryIt: {
      id: "try",
      title: "How deep was it?",
      prompt: "`depth_km` returns the wrong number from the coordinates list. GeoJSON stores longitude, latitude, depth. Change the position so it returns the depth, then run it: Fiji's event should be about 585 km deep.",
      spec: [
        ["Function", "`depth_km(feature)`"],
        ["Returns", "the third number in `feature[\"geometry\"][\"coordinates\"]`"],
      ],
      starter: src`
def depth_km(feature):
    return feature["geometry"]["coordinates"][0]

fiji = {"id": "us6000pxyr", "geometry": {"type": "Point", "coordinates": [-178.4779, -18.0069, 585.411]}}
print(depth_km(fiji))
`,
      answer: src`
def depth_km(feature):
    return feature["geometry"]["coordinates"][2]

fiji = {"id": "us6000pxyr", "geometry": {"type": "Point", "coordinates": [-178.4779, -18.0069, 585.411]}}
print(depth_km(fiji))
`,
      wrong: [
        {
          code: src`
def depth_km(feature):
    return feature["geometry"]["coordinates"][1]
`,
          fails: ["returns"],
          why: "position 1 is the latitude",
        },
      ],
      hints: ["The chain already reaches the coordinates list. Only the last position is wrong.", "Positions start at 0: longitude is 0, latitude is 1.", "The depth is the third value in the list."],
      task: {
        checks: [
          fn("returns", "depth_km", [
            example([fiji], 585.411),
            hiddenCase("a shallow event", [alaska], 9.6),
            hiddenCase("a whole-number depth", [arctic], 10),
          ], { label: "depth_km() returns the depth from the coordinates" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Latitude first, for the map",
        prompt: "A map widget wants each event as `(latitude, longitude)`, the order people usually say them in. GeoJSON stores them the other way round. Write `lat_lon(feature)`: return a tuple with the latitude first and the longitude second.",
        spec: [
          ["Function", "`lat_lon(feature)`"],
          ["feature", "a GeoJSON feature: `feature[\"geometry\"][\"coordinates\"]` is `[longitude, latitude, depth]`"],
          ["Returns", "a tuple `(latitude, longitude)`, two numbers, no depth"],
          ["Example", "the Arctic Ocean event in the starter → `(80.7069, -107.5679)`"],
        ],
        starter: src`
def lat_lon(feature):
    return None

arctic = {
    "id": "us6000pw77",
    "properties": {"mag": 4.7, "place": "Arctic Ocean"},
    "geometry": {"type": "Point", "coordinates": [-107.5679, 80.7069, 10]},
}
print(lat_lon(arctic))
`,
        answer: src`
def lat_lon(feature):
    longitude = feature["geometry"]["coordinates"][0]
    latitude = feature["geometry"]["coordinates"][1]
    return (latitude, longitude)

arctic = {
    "id": "us6000pw77",
    "properties": {"mag": 4.7, "place": "Arctic Ocean"},
    "geometry": {"type": "Point", "coordinates": [-107.5679, 80.7069, 10]},
}
print(lat_lon(arctic))
`,
        alternatives: [
          src`
def lat_lon(feature):
    longitude, latitude, depth = feature["geometry"]["coordinates"]
    return latitude, longitude
`,
        ],
        wrong: [
          {
            code: src`
def lat_lon(feature):
    coordinates = feature["geometry"]["coordinates"]
    return (coordinates[0], coordinates[1])
`,
            fails: ["returns"],
            why: "that is GeoJSON's own order, longitude first",
          },
          {
            code: src`
def lat_lon(feature):
    coordinates = feature["geometry"]["coordinates"]
    return [coordinates[1], coordinates[0]]
`,
            fails: ["returns"],
            why: "the values are right but it returns a list, and the map expects a tuple",
          },
          {
            code: src`
def lat_lon(feature):
    coordinates = feature["geometry"]["coordinates"]
    return (coordinates[1], coordinates[2])
`,
            fails: ["returns"],
            why: "position 2 is the depth, not the longitude",
          },
        ],
        hints: [
          "Reach the coordinates list first: two keys, `geometry` then `coordinates`.",
          "Longitude is at position 0 and latitude at position 1, and you want them swapped.",
          "Parentheses with a comma make a tuple; put the latitude in front.",
        ],
        task: {
          checks: [
            fn("returns", "lat_lon", [
              example([arctic], py.tuple(py.float(80.7069), py.float(-107.5679))),
              example([fiji], py.tuple(py.float(-18.0069), py.float(-178.4779))),
              hiddenCase("an event in the southern hemisphere", [chile], py.tuple(py.float(-21.7883), py.float(-68.546))),
              hiddenCase("coordinates that are whole numbers", [feature("x1", 3, "test", [12, -5, 1])], py.tuple(py.int(-5), py.int(12))),
              hiddenCase("an event far north", [alaska], py.tuple(py.float(61.4029), py.float(-147.2371))),
            ], { label: "lat_lon() returns (latitude, longitude)" }),
          ],
        },
      },
      {
        id: "c2",
        title: "The strongest event on a page",
        prompt: "Write `strongest(page)`: return the `id` of the feature with the highest magnitude (`properties` → `mag`). If two events share the top magnitude, return the one that comes first. If the page has no features, return `None`.",
        spec: [
          ["Function", "`strongest(page)`"],
          ["page", "a dictionary with `\"features\"`: a list of GeoJSON features, each with an `id` and `properties` → `mag`"],
          ["Returns", "one feature `id`, or `None` for an empty page"],
          ["Ties", "the earlier feature wins"],
          ["Example", "the starter's page → `'us6000pw77'` (magnitude 4.7)"],
        ],
        starter: src`
def strongest(page):
    return None

page = {
    "type": "FeatureCollection",
    "features": [
        {"id": "us6000pxyr", "properties": {"mag": 4.1, "place": "233 km E of Levuka, Fiji"}},
        {"id": "us6000pw77", "properties": {"mag": 4.7, "place": "Arctic Ocean"}},
        {"id": "ak0252r9gt13", "properties": {"mag": 2.7, "place": "Southern Alaska"}},
    ],
}
print(strongest(page))
`,
        answer: src`
def strongest(page):
    best_id = None
    best_mag = None
    for feature in page["features"]:
        mag = feature["properties"]["mag"]
        if best_mag is None or mag > best_mag:
            best_id = feature["id"]
            best_mag = mag
    return best_id

page = {
    "type": "FeatureCollection",
    "features": [
        {"id": "us6000pxyr", "properties": {"mag": 4.1, "place": "233 km E of Levuka, Fiji"}},
        {"id": "us6000pw77", "properties": {"mag": 4.7, "place": "Arctic Ocean"}},
        {"id": "ak0252r9gt13", "properties": {"mag": 2.7, "place": "Southern Alaska"}},
    ],
}
print(strongest(page))
`,
        alternatives: [
          src`
def strongest(page):
    features = page["features"]
    if len(features) == 0:
        return None
    best = features[0]
    for feature in features:
        if feature["properties"]["mag"] > best["properties"]["mag"]:
            best = feature
    return best["id"]
`,
        ],
        wrong: [
          {
            code: src`
def strongest(page):
    best_id = None
    best_mag = None
    for feature in page["features"]:
        mag = feature["properties"]["mag"]
        if best_mag is None or mag >= best_mag:
            best_id = feature["id"]
            best_mag = mag
    return best_id
`,
            fails: ["returns"],
            why: "`>=` lets a later event with the same magnitude take over",
          },
          {
            code: src`
def strongest(page):
    best = page["features"][0]
    for feature in page["features"]:
        if feature["properties"]["mag"] > best["properties"]["mag"]:
            best = feature
    return best["id"]
`,
            fails: ["returns"],
            why: "an empty page has no position 0, so it crashes with IndexError instead of returning None",
          },
          {
            code: src`
def strongest(page):
    best_mag = 0
    for feature in page["features"]:
        if feature["properties"]["mag"] > best_mag:
            best_mag = feature["properties"]["mag"]
    return best_mag
`,
            fails: ["returns"],
            why: "it returns the magnitude, not which event it was",
          },
        ],
        hints: [
          "Walk `page[\"features\"]` and keep the best event seen so far: its id and its magnitude.",
          "Each feature's magnitude is two keys deep: `properties`, then `mag`.",
          "Start with nothing as the best and replace it only when a magnitude is strictly larger, so a tie keeps the earlier event.",
        ],
        task: {
          checks: [
            fn("returns", "strongest", [
              example([page(fiji, arctic, alaska)], "us6000pw77"),
              example([page(alaska)], "ak0252r9gt13"),
              example([page()], null),
              hiddenCase("two events tied for the top magnitude", [page(alaska, feature("a1", 4.4, "x", [0, 0, 1]), chile)], "a1"),
              hiddenCase("the strongest event is last", [page(alaska, fiji, chile)], "us6000pw8e"),
              hiddenCase("magnitudes below 1", [page(feature("m1", 0.8, "x", [0, 0, 1]), feature("m2", 0.9, "y", [0, 0, 1]))], "m2"),
            ], { label: "strongest() returns the id of the largest magnitude" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
order = {"id": "O100282", "items": [{"sku": "P0164", "qty": 2}, {"sku": "P0594", "qty": 1}]}
print(order["items"][1]["sku"], order["items"][0]["qty"])
`,
        choices: ["P0594 2", "P0164 2", "P0594 1", "P0164 1"],
        answer: 0,
        why: "`order[\"items\"][1]` is the second line item, whose sku is P0594. `order[\"items\"][0]` is the first line, with quantity 2.",
      },
      {
        id: "q2",
        prompt: "A common mistake: GeoJSON coordinates are `[longitude, latitude, depth]`. What does this program print as the \"latitude\"?",
        program: src`
quake = {"geometry": {"coordinates": [25.7319, 36.5643, 10]}}
latitude = quake["geometry"]["coordinates"][0]
print(latitude)
`,
        choices: ["25.7319", "36.5643", "10", "[25.7319, 36.5643, 10]"],
        answer: 0,
        why: "Position 0 is the longitude, 25.7319. The name `latitude` doesn't change what the position means; the latitude is at position 1.",
      },
      {
        id: "q3",
        prompt: "`page[\"features\"]` is a list of features, each with a `properties` dictionary. Which expression reads the `title` of the second feature?",
        choices: ["page[\"features\"][1][\"properties\"][\"title\"]", "page[\"features\"][\"properties\"][1][\"title\"]", "page[1][\"features\"][\"properties\"][\"title\"]", "page[\"features\"][2][\"properties\"][\"title\"]"],
        answer: 0,
        why: "Read left to right: the features list, position 1 (the second), that feature's properties, then the title. The others use a key on a list or count from 1.",
      },
    ],
    review: [
      "Each pair of brackets works on the value the previous one produced: keys for dictionaries, positions for lists.",
      "A key on a list gives `TypeError: list indices must be integers…`; position 0 of an empty list gives `IndexError`.",
      "GeoJSON coordinates are longitude, latitude, depth.",
      "Next: real records often leave keys out. `get` reads a key that might be missing.",
    ],
  },

  // ------------------------------------------------------------------ PY-L17-02 get and defaults
  {
    id: "PY-L17-02",
    version: 2,
    slug: "a-value-inside",
    title: "Missing keys: get and safe defaults",
    lede: "APIs leave keys out when there is nothing to say. `get` reads a key that may be missing and gives back a default instead of stopping the program.",
    focus: "Read keys that may be missing with get and a default, and tell a missing key from a key that holds None.",
    minutes: 16,
    objectives: [
      "Use `record.get(key)` and `record.get(key, default)` and say what each returns for a missing key",
      "Explain why a key that holds `None` does not use the default",
      "Chain `get` with a `{}` default to reach safely into a dictionary that may be missing",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "dict-literal", "dict-lookup", "nested-dict", "nested-lookup", "string-index", "string-method", "none-value", "identity", "if-statement", "else-clause", "for-loop", "list-literal", "list-index", "logical", "truthiness", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "comparison", "membership", "nested-condition", "spaces-in-text"],
    teaches: ["dict-get"],
    blocks: [
      {
        kind: "text",
        md: "In the USGS feed, an earthquake nobody reported feeling has `\"felt\": null` (`None` in Python), and some sources leave keys such as `tsunami` out entirely. Customer records are the same: a phone number that was never entered isn't stored as an empty value, the key just isn't there.\n\nBrackets demand the key: `props[\"tsunami\"]` stops the program with `KeyError` when it is missing. The dictionary method **`get`** asks instead: `props.get(\"tsunami\")` returns `None` when the key is missing, and `props.get(\"tsunami\", 0)` returns the **default** you chose.",
      },
      {
        kind: "example",
        title: "get on a USGS properties record",
        code: src`
props = {"mag": 4.6, "place": "44 km WSW of Cabangahan, Philippines", "felt": 1, "alert": None}
print(props.get("felt"))
print(props.get("tsunami"))
print(props.get("tsunami", 0))
print(props.get("alert", "none issued"))
`,
        output: "1\nNone\n0\nNone\n",
        note: "The last line is the surprise. `alert` **is** a key; it just holds `None`. A default is used only when the key is missing, so `get` returns the stored `None`.",
      },
      {
        kind: "error-example",
        title: "Brackets on a missing key",
        code: src`
props = {"mag": 4.6, "felt": 1}
print(props["felt"])
print(props["tsunami"])
`,
        error: "KeyError",
        output: "1\n",
        note: "`KeyError: 'tsunami'`. Brackets are still right when a key **must** be there: a missing `mag` means the record is broken, and an error tells you so straight away.",
      },
      {
        kind: "text",
        md: "When a whole inner dictionary can be missing, give `get` an empty dictionary as the default. `feature.get(\"properties\", {})` always returns a dictionary, so the next `get` is safe either way. When `None` and \"missing\" should mean the same thing, test the result with `is None` and choose the value yourself.",
      },
      {
        kind: "example",
        title: "Felt reports, whatever the record looks like",
        code: src`
def felt_reports(feature):
    props = feature.get("properties", {})
    felt = props.get("felt")
    if felt is None:
        return 0
    return felt

features = [
    {"id": "us6000pw8f", "properties": {"mag": 4.6, "felt": 1}},
    {"id": "us6000pw77", "properties": {"mag": 4.7, "felt": None}},
    {"id": "nc75123456"},
]
for f in features:
    print(f["id"], felt_reports(f))
`,
        output: "us6000pw8f 1\nus6000pw77 0\nnc75123456 0\n",
        note: "The third record has no `properties` at all. `get(\"properties\", {})` gives an empty dictionary, whose `get(\"felt\")` is `None`, so the function returns 0 instead of crashing.",
      },
      {
        kind: "text",
        md: "**When to use it:** for keys the data is allowed to leave out: optional profile fields, flags that only appear when set, nested sections that some records don't have. **Mistakes to avoid:** expecting the default when the key holds `None`; using `get` for a key that must exist, which hides a broken record behind a `None` that fails somewhere later; and writing `props.get[\"felt\"]` with brackets instead of parentheses (`get` is a method you call).",
      },
    ],
    tryIt: {
      id: "try",
      title: "An unknown magnitude type",
      prompt: "Some records have no `magType`, and `mag_type` crashes on them. Change it to use `get` so a missing key gives `\"unknown\"`.",
      spec: [
        ["Function", "`mag_type(props)`"],
        ["Returns", "`props[\"magType\"]` when the key is there, otherwise `\"unknown\"`"],
      ],
      starter: src`
def mag_type(props):
    return props["magType"]

print(mag_type({"mag": 4.7, "magType": "mb"}))
print(mag_type({"mag": 2.5}))
`,
      answer: src`
def mag_type(props):
    return props.get("magType", "unknown")

print(mag_type({"mag": 4.7, "magType": "mb"}))
print(mag_type({"mag": 2.5}))
`,
      wrong: [
        {
          code: src`
def mag_type(props):
    return props.get("magType")
`,
          fails: ["returns"],
          why: "without a default, a missing key gives None instead of \"unknown\"",
        },
      ],
      hints: ["Brackets stop with KeyError when the key is missing.", "`get` takes the key and, after a comma, the value to use instead.", "Call `get` on `props` with the key and the default text."],
      task: {
        checks: [
          fn("returns", "mag_type", [
            example([{ mag: 4.7, magType: "mb" }], "mb"),
            hiddenCase("a missing magType", [{ mag: 2.5 }], "unknown"),
            hiddenCase("an empty record", [{}], "unknown"),
          ], { label: "mag_type() falls back to \"unknown\"" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Which email to write to",
        prompt: "Runtime Market customers have an account `email`, and some also have a `contact` section with a preferred `email`. Write `contact_email(customer)`: return the preferred contact email when there is one; otherwise the account email; and `None` if the customer has neither. A contact email of `None` counts as not given.",
        spec: [
          ["Function", "`contact_email(customer)`"],
          ["customer", "a dictionary that may have `\"email\"` and may have `\"contact\"`, a dictionary that may have `\"email\"`"],
          ["Returns", "the contact email, else the account email, else `None`"],
          ["Example", "the starter's three customers → `'isaac@sato-design.com'`, `'samuel_mensah@yahoo.com'`, `'grace_walker29@yahoo.com'`"],
        ],
        starter: src`
def contact_email(customer):
    return None

customers = [
    {"customer_id": "C00164", "email": "isaac.sato62@gmail.com", "contact": {"email": "isaac@sato-design.com", "phone": "212-555-0164"}},
    {"customer_id": "C00800", "email": "samuel_mensah@yahoo.com", "contact": {"phone": "305-555-0800"}},
    {"customer_id": "C01338", "email": "grace_walker29@yahoo.com"},
]
for customer in customers:
    print(contact_email(customer))
`,
        answer: src`
def contact_email(customer):
    preferred = customer.get("contact", {}).get("email")
    if preferred is not None:
        return preferred
    return customer.get("email")

customers = [
    {"customer_id": "C00164", "email": "isaac.sato62@gmail.com", "contact": {"email": "isaac@sato-design.com", "phone": "212-555-0164"}},
    {"customer_id": "C00800", "email": "samuel_mensah@yahoo.com", "contact": {"phone": "305-555-0800"}},
    {"customer_id": "C01338", "email": "grace_walker29@yahoo.com"},
]
for customer in customers:
    print(contact_email(customer))
`,
        alternatives: [
          src`
def contact_email(customer):
    if "contact" in customer:
        if customer["contact"].get("email") is not None:
            return customer["contact"]["email"]
    if "email" in customer:
        return customer["email"]
    return None
`,
        ],
        wrong: [
          {
            code: src`
def contact_email(customer):
    return customer.get("contact", {}).get("email", customer.get("email"))
`,
            fails: ["returns"],
            why: "a contact email stored as None is returned as None; the default only covers a missing key",
          },
          {
            code: src`
def contact_email(customer):
    preferred = customer["contact"].get("email")
    if preferred is not None:
        return preferred
    return customer.get("email")
`,
            fails: ["returns"],
            why: "a customer with no contact section raises KeyError",
          },
          {
            code: src`
def contact_email(customer):
    preferred = customer.get("contact", {}).get("email")
    if preferred is not None:
        return preferred
    return customer["email"]
`,
            fails: ["returns"],
            why: "a customer with no email at all raises KeyError instead of returning None",
          },
        ],
        hints: [
          "Two places to look, in order: the contact section's email, then the account email.",
          "A missing `contact` can be replaced by an empty dictionary, so the second `get` always has something to work on.",
          "Test the preferred email with `is not None` before returning it; the default of `get` doesn't cover a stored None.",
        ],
        task: {
          checks: [
            fn("returns", "contact_email", [
              example([customers[0]], "isaac@sato-design.com"),
              example([customers[1]], "samuel_mensah@yahoo.com"),
              example([customers[2]], "grace_walker29@yahoo.com"),
              hiddenCase("a contact email stored as None", [{ customer_id: "C1", email: "a@b.com", contact: { email: null } }], "a@b.com"),
              hiddenCase("no email anywhere", [{ customer_id: "C2", contact: { phone: "555" } }], null),
              hiddenCase("a contact email but no account email", [{ customer_id: "C3", contact: { email: "ops@shop.com" } }], "ops@shop.com"),
              hiddenCase("an empty record", [{}], null),
            ], { label: "contact_email() prefers the contact email, then the account email" }),
          ],
        },
      },
      {
        id: "c2",
        title: "A city for the shipping label",
        prompt: "Write `label_city(order)` for printing shipping labels. The city lives at `order[\"shipping\"][\"address\"][\"city\"]`, but any of those three levels can be missing, and the city was typed by hand. Return the city with spaces at the ends removed and each word capitalised (`title`). If it is missing, `None`, or blank, return `\"Unknown\"`.",
        spec: [
          ["Function", "`label_city(order)`"],
          ["order", "a dictionary that may have `shipping` → `address` → `city`"],
          ["Returns", "the tidied city, e.g. `\"  new york \"` → `\"New York\"`; `\"Unknown\"` when there is no usable city"],
          ["Example", "the starter's orders → `New York`, `Unknown`, `Unknown`"],
        ],
        starter: src`
def label_city(order):
    return "Unknown"

orders = [
    {"order_id": "O100043", "shipping": {"address": {"city": "  new york ", "state": "NY"}}},
    {"order_id": "O101217", "shipping": {"address": {"state": "FL"}}},
    {"order_id": "O101341"},
]
for order in orders:
    print(order["order_id"], label_city(order))
`,
        answer: src`
def label_city(order):
    address = order.get("shipping", {}).get("address", {})
    city = address.get("city")
    if city is None:
        return "Unknown"
    city = city.strip()
    if city == "":
        return "Unknown"
    return city.title()

orders = [
    {"order_id": "O100043", "shipping": {"address": {"city": "  new york ", "state": "NY"}}},
    {"order_id": "O101217", "shipping": {"address": {"state": "FL"}}},
    {"order_id": "O101341"},
]
for order in orders:
    print(order["order_id"], label_city(order))
`,
        alternatives: [
          src`
def label_city(order):
    city = order.get("shipping", {}).get("address", {}).get("city") or ""
    city = city.strip().title()
    if not city:
        return "Unknown"
    return city
`,
        ],
        wrong: [
          {
            code: src`
def label_city(order):
    city = order.get("shipping", {}).get("address", {}).get("city", "Unknown")
    return city.strip().title()
`,
            fails: ["returns"],
            why: "a city stored as None crashes on `strip`, and a blank city becomes an empty label",
          },
          {
            code: src`
def label_city(order):
    city = order["shipping"]["address"].get("city")
    if city is None or city.strip() == "":
        return "Unknown"
    return city.strip().title()
`,
            fails: ["returns"],
            why: "an order with no shipping section raises KeyError",
          },
          {
            code: src`
def label_city(order):
    city = order.get("shipping", {}).get("address", {}).get("city")
    if city is None or city.strip() == "":
        return "Unknown"
    return city.title()
`,
            fails: ["returns"],
            why: "the spaces around the city are printed on the label",
          },
        ],
        hints: [
          "Reach down level by level with `get`, giving each missing dictionary an empty one instead.",
          "Three cases end in \"Unknown\": no city key, a city of None, and a city that is only spaces.",
          "Check for None before calling `strip`, because None has no string methods. Strip first, then test for empty, then capitalise.",
        ],
        task: {
          checks: [
            fn("returns", "label_city", [
              example([shipOrders[0]], "New York"),
              example([shipOrders[1]], "Unknown"),
              example([shipOrders[2]], "Unknown"),
              hiddenCase("a city stored as None", [{ order_id: "O1", shipping: { address: { city: null } } }], "Unknown"),
              hiddenCase("a city that is only spaces", [{ order_id: "O2", shipping: { address: { city: "   " } } }], "Unknown"),
              hiddenCase("a shipping section with no address", [{ order_id: "O3", shipping: { method: "standard" } }], "Unknown"),
              hiddenCase("an already tidy city", [{ order_id: "O4", shipping: { address: { city: "Houston" } } }], "Houston"),
              hiddenCase("a city in capitals", [{ order_id: "O5", shipping: { address: { city: "SAN JOSE " } } }], "San Jose"),
            ], { label: "label_city() reaches the city safely and tidies it" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
settings = {"theme": "dark", "timeout": None}
print(settings.get("timeout", 30), settings.get("retries", 3))
`,
        choices: ["None 3", "30 3", "None None", "30 None"],
        answer: 0,
        why: "`timeout` is a key, so `get` returns its value, None, and ignores the default. `retries` is missing, so its default 3 is used.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `props.get(\"felt\", 0)` returned `None`, not 0. What does that tell you?",
        choices: ["The key `felt` exists and holds None", "The key `felt` is missing", "`get` ignores defaults that are numbers", "`props` is a list, not a dictionary"],
        answer: 0,
        why: "A default is only used for a missing key. A stored None comes back as None; test it with `is None` when it should count as missing.",
      },
      {
        id: "q3",
        prompt: "When are brackets (`record[\"mag\"]`) a better choice than `get`?",
        choices: ["When the key must be there, so a missing key means the record is broken", "When the key is often missing", "When the value might be None", "Never: `get` is always safer"],
        answer: 0,
        why: "A KeyError straight away points at the broken record. `get` would hand back None and the program would fail later, somewhere harder to trace.",
      },
    ],
    review: [
      "`d.get(k)` returns None for a missing key; `d.get(k, default)` returns your default.",
      "A key that holds None is not missing: `get` returns None, not the default.",
      "`d.get(\"inner\", {})` lets you keep chaining when a whole section may be absent.",
      "Next: records often hold lists, such as an order's line items. An inner loop walks them.",
    ],
  },

  // ------------------------------------------------------------------ PY-L17-03 walk nested lists
  {
    id: "PY-L17-03",
    version: 2,
    slug: "walk-every-tag",
    title: "Walk lists inside records",
    lede: "An order holds a list of line items; a push event holds a list of commits. A loop inside a loop visits every inner item, with the outer record still at hand.",
    focus: "Walk a list stored inside each record with an inner loop, keeping the outer record's fields available.",
    minutes: 18,
    objectives: [
      "Write an outer loop over records and an inner loop over the list each record holds",
      "Use fields of the outer record while visiting the inner items",
      "Put an accumulator before the outer loop so it collects across every record",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "dict-iterate", "nested-dict", "nested-lookup", "string-index", "string-format", "arithmetic", "comparison", "if-statement", "for-loop", "nested-loop", "continue-statement", "membership", "logical", "len-call", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "tuple-unpack", "dict-get", "nested-condition", "spaces-in-text"],
    teaches: ["walk-nested"],
    blocks: [
      {
        kind: "text",
        md: "An order isn't one product: it's a record with its own fields and a **list** of line items. To answer *how many units of each product did we sell?* you must visit every line of every order.\n\nThat is a loop inside a loop. The outer loop takes one record at a time; the inner loop walks the list stored **in that record**. Inside the inner loop, both the line item and its order are available.",
      },
      {
        kind: "example",
        title: "Every line of every order",
        code: src`
orders = [
    {"order_id": "O100282", "items": [{"sku": "P0164", "qty": 2}, {"sku": "P0594", "qty": 1}]},
    {"order_id": "O100918", "items": [{"sku": "P0209", "qty": 3}]},
]
for order in orders:
    print(order["order_id"])
    for item in order["items"]:
        print(f"  {item['sku']} x {item['qty']} (order {order['order_id']})")
`,
        output: "O100282\n  P0164 x 2 (order O100282)\n  P0594 x 1 (order O100282)\nO100918\n  P0209 x 3 (order O100918)\n",
        note: "The inner `for` uses `order[\"items\"]`, the list belonging to the order of this pass. `order` is still the current order inside the inner loop.",
      },
      {
        kind: "text",
        md: "A classic slip is looping over the record instead of its list. A `for` over a dictionary visits its **keys**, which are text, so the next lookup fails.",
      },
      {
        kind: "error-example",
        title: "Looping over the record, not its list",
        code: src`
order = {"order_id": "O100282", "items": [{"sku": "P0164", "qty": 2}]}
for item in order:
    print(item)
    print(item["sku"])
`,
        error: "TypeError",
        output: "order_id\n",
        note: "The first `item` is the key `\"order_id\"`, a string, and a string can't be read with `[\"sku\"]`: `TypeError: string indices must be integers, not 'str'`. Loop over `order[\"items\"]`.",
      },
      {
        kind: "text",
        md: "To collect across **all** records, the accumulator goes before the outer loop. Then each inner pass adds to the same dictionary, and the result covers every order.",
      },
      {
        kind: "example",
        title: "Units sold per product",
        code: src`
def units_per_sku(orders):
    units = {}
    for order in orders:
        for item in order["items"]:
            sku = item["sku"]
            if sku not in units:
                units[sku] = 0
            units[sku] += item["qty"]
    return units

orders = [
    {"order_id": "O100282", "items": [{"sku": "P0164", "qty": 2}, {"sku": "P0594", "qty": 1}]},
    {"order_id": "O100918", "items": [{"sku": "P0164", "qty": 3}]},
    {"order_id": "O101219", "items": []},
]
print(units_per_sku(orders))
`,
        output: "{'P0164': 5, 'P0594': 1}\n",
        note: "The empty `items` list of the third order makes the inner loop run zero times; nothing special is needed for it.",
      },
      {
        kind: "text",
        md: "**When to use it:** orders and their lines, invoices and their charges, events and their payload lists, students and their scores. **Mistakes to avoid:** looping over the record instead of its list; creating the accumulator inside the outer loop, so each record wipes out the last; and `return` inside the outer loop, which stops after the first record.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count line items, not orders",
      prompt: "`count_lines` counts orders. Make it count every line item across all orders: add an inner loop over each order's `items` and count there.",
      spec: [
        ["Function", "`count_lines(orders)`"],
        ["Returns", "the total number of line items in all the orders"],
      ],
      starter: src`
def count_lines(orders):
    count = 0
    for order in orders:
        count += 1
    return count

orders = [
    {"order_id": "O100282", "items": [{"sku": "P0164"}, {"sku": "P0594"}]},
    {"order_id": "O100918", "items": [{"sku": "P0209"}]},
]
print(count_lines(orders))
`,
      answer: src`
def count_lines(orders):
    count = 0
    for order in orders:
        for item in order["items"]:
            count += 1
    return count

orders = [
    {"order_id": "O100282", "items": [{"sku": "P0164"}, {"sku": "P0594"}]},
    {"order_id": "O100918", "items": [{"sku": "P0209"}]},
]
print(count_lines(orders))
`,
      alternatives: [
        src`
def count_lines(orders):
    count = 0
    for order in orders:
        count += len(order["items"])
    return count
`,
      ],
      wrong: [
        {
          code: src`
def count_lines(orders):
    for order in orders:
        count = 0
        for item in order["items"]:
            count += 1
    return count
`,
          fails: ["returns"],
          why: "the count restarts for every order, so only the last order's lines are counted",
        },
      ],
      hints: ["The line items are in each order's `items` list.", "Put a second `for` inside the first, over that list.", "Move the `count += 1` into the inner loop."],
      task: {
        checks: [
          fn("returns", "count_lines", [
            example([[{ order_id: "O100282", items: [{ sku: "P0164" }, { sku: "P0594" }] }, { order_id: "O100918", items: [{ sku: "P0209" }] }]], 3),
            hiddenCase("an order with no items", [[{ order_id: "O1", items: [] }, { order_id: "O2", items: [{ sku: "A" }] }]], 1),
            hiddenCase("no orders", [[]], 0),
          ], { label: "count_lines() counts every line item" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Commits per developer",
        prompt: "The repository event stream mixes push events (which carry a list of commits under `payload` → `commits`) with other events such as stars, which carry no commits. Write `commits_by_actor(events)`: for push events only, return a dictionary from the pusher's login (`actor` → `login`) to the total number of commits they pushed.",
        spec: [
          ["Function", "`commits_by_actor(events)`"],
          ["events", "dictionaries with `type`, `actor` (with `login`), `repo` and `payload`; only `\"PushEvent\"` payloads have `commits`"],
          ["Returns", "`{login: number of commits}` for everyone who pushed, in first-push order; a push with no commits still counts its pusher with 0"],
          ["Example", "the starter's events → `{'ml-koi418': 3, 'ana-dev': 1}`"],
        ],
        starter: src`
def commits_by_actor(events):
    counts = {}
    return counts

events = [
    {"type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "tidewater/smartqueue"},
     "payload": {"commits": [{"sha": "ml-0", "author": {"name": "ml-koi418"}}, {"sha": "ml-1", "author": {"name": "ana-dev"}}]}},
    {"type": "WatchEvent", "actor": {"login": "j-ochoa"}, "repo": {"name": "tidewater/smartqueue"}, "payload": {"action": "started"}},
    {"type": "PushEvent", "actor": {"login": "ana-dev"}, "repo": {"name": "tidewater/smartqueue"},
     "payload": {"commits": [{"sha": "ana0", "author": {"name": "ana-dev"}}]}},
    {"type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "harbor/tinyhttp"},
     "payload": {"commits": [{"sha": "ml-0", "author": {"name": "ml-koi418"}}]}},
]
print(commits_by_actor(events))
`,
        answer: src`
def commits_by_actor(events):
    counts = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        login = event["actor"]["login"]
        if login not in counts:
            counts[login] = 0
        for commit in event["payload"]["commits"]:
            counts[login] += 1
    return counts

events = [
    {"type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "tidewater/smartqueue"},
     "payload": {"commits": [{"sha": "ml-0", "author": {"name": "ml-koi418"}}, {"sha": "ml-1", "author": {"name": "ana-dev"}}]}},
    {"type": "WatchEvent", "actor": {"login": "j-ochoa"}, "repo": {"name": "tidewater/smartqueue"}, "payload": {"action": "started"}},
    {"type": "PushEvent", "actor": {"login": "ana-dev"}, "repo": {"name": "tidewater/smartqueue"},
     "payload": {"commits": [{"sha": "ana0", "author": {"name": "ana-dev"}}]}},
    {"type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "harbor/tinyhttp"},
     "payload": {"commits": [{"sha": "ml-0", "author": {"name": "ml-koi418"}}]}},
]
print(commits_by_actor(events))
`,
        alternatives: [
          src`
def commits_by_actor(events):
    counts = {}
    for event in events:
        if event["type"] == "PushEvent":
            login = event["actor"]["login"]
            counts[login] = counts.get(login, 0) + len(event["payload"]["commits"])
    return counts
`,
        ],
        wrong: [
          {
            code: src`
def commits_by_actor(events):
    counts = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        login = event["actor"]["login"]
        if login not in counts:
            counts[login] = 0
        counts[login] += 1
    return counts
`,
            fails: ["returns"],
            why: "it counts pushes, not the commits inside each push",
          },
          {
            code: src`
def commits_by_actor(events):
    counts = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        for commit in event["payload"]["commits"]:
            name = commit["author"]["name"]
            if name not in counts:
                counts[name] = 0
            counts[name] += 1
    return counts
`,
            fails: ["returns"],
            why: "it counts by commit author, not by who pushed",
          },
          {
            code: src`
def commits_by_actor(events):
    counts = {}
    for event in events:
        login = event["actor"]["login"]
        if login not in counts:
            counts[login] = 0
        for commit in event["payload"]["commits"]:
            counts[login] += 1
    return counts
`,
            fails: ["returns"],
            why: "a star event has no commits list, so it raises KeyError",
          },
        ],
        hints: [
          "Skip every event whose type isn't `\"PushEvent\"` before reaching into its payload.",
          "The login is two keys deep on the event; the commits are a list two keys deep in the payload.",
          "Create the login's count when it first appears, then let an inner loop over the commits add to it.",
        ],
        task: {
          checks: [
            fn("returns", "commits_by_actor", [
              example([events], { "ml-koi418": 3, "ana-dev": 1 }),
              example([[watch("j-ochoa", "r/x")]], {}),
              example([[]], {}),
              hiddenCase("a push with no commits", [[push("bot", "r/x", [])]], { bot: 0 }),
              hiddenCase("commits written by someone other than the pusher", [[push("lead", "r/x", ["intern", "intern", "lead"])]], { lead: 3 }),
              hiddenCase("pushers in first-push order", [[push("b", "r", ["b"]), push("a", "r", ["a", "a"]), push("b", "r", ["b"])]], { b: 2, a: 2 }),
            ], { label: "commits_by_actor() totals commits per pusher" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Who wrote code in each repository",
        prompt: "Write `authors_by_repo(events)`: for push events, return a dictionary from repository name (`repo` → `name`) to the list of **distinct** commit author names (`commit` → `author` → `name`), in the order each author first appears in that repository. Non-push events are ignored.",
        spec: [
          ["Function", "`authors_by_repo(events)`"],
          ["Returns", "`{repo name: [author names]}`; each name once per repository; repositories in first-push order"],
          ["Example", "the starter's events → `{'tidewater/smartqueue': ['ml-koi418', 'ana-dev'], 'harbor/tinyhttp': ['ml-koi418']}`"],
        ],
        starter: src`
def authors_by_repo(events):
    authors = {}
    return authors

events = [
    {"type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "tidewater/smartqueue"},
     "payload": {"commits": [{"sha": "ml-0", "author": {"name": "ml-koi418"}}, {"sha": "ml-1", "author": {"name": "ana-dev"}}]}},
    {"type": "WatchEvent", "actor": {"login": "j-ochoa"}, "repo": {"name": "tidewater/smartqueue"}, "payload": {"action": "started"}},
    {"type": "PushEvent", "actor": {"login": "ana-dev"}, "repo": {"name": "tidewater/smartqueue"},
     "payload": {"commits": [{"sha": "ana0", "author": {"name": "ana-dev"}}]}},
    {"type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "harbor/tinyhttp"},
     "payload": {"commits": [{"sha": "ml-0", "author": {"name": "ml-koi418"}}]}},
]
print(authors_by_repo(events))
`,
        answer: src`
def authors_by_repo(events):
    authors = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        repo = event["repo"]["name"]
        if repo not in authors:
            authors[repo] = []
        for commit in event["payload"]["commits"]:
            name = commit["author"]["name"]
            if name not in authors[repo]:
                authors[repo].append(name)
    return authors

events = [
    {"type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "tidewater/smartqueue"},
     "payload": {"commits": [{"sha": "ml-0", "author": {"name": "ml-koi418"}}, {"sha": "ml-1", "author": {"name": "ana-dev"}}]}},
    {"type": "WatchEvent", "actor": {"login": "j-ochoa"}, "repo": {"name": "tidewater/smartqueue"}, "payload": {"action": "started"}},
    {"type": "PushEvent", "actor": {"login": "ana-dev"}, "repo": {"name": "tidewater/smartqueue"},
     "payload": {"commits": [{"sha": "ana0", "author": {"name": "ana-dev"}}]}},
    {"type": "PushEvent", "actor": {"login": "ml-koi418"}, "repo": {"name": "harbor/tinyhttp"},
     "payload": {"commits": [{"sha": "ml-0", "author": {"name": "ml-koi418"}}]}},
]
print(authors_by_repo(events))
`,
        alternatives: [
          src`
def authors_by_repo(events):
    authors = {}
    for event in events:
        if event["type"] == "PushEvent":
            names = authors.get(event["repo"]["name"], [])
            for commit in event["payload"]["commits"]:
                if commit["author"]["name"] not in names:
                    names.append(commit["author"]["name"])
            authors[event["repo"]["name"]] = names
    return authors
`,
        ],
        wrong: [
          {
            code: src`
def authors_by_repo(events):
    authors = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        repo = event["repo"]["name"]
        if repo not in authors:
            authors[repo] = []
        for commit in event["payload"]["commits"]:
            authors[repo].append(commit["author"]["name"])
    return authors
`,
            fails: ["returns"],
            why: "an author with several commits is listed several times",
          },
          {
            code: src`
def authors_by_repo(events):
    authors = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        repo = event["repo"]["name"]
        authors[repo] = []
        for commit in event["payload"]["commits"]:
            name = commit["author"]["name"]
            if name not in authors[repo]:
                authors[repo].append(name)
    return authors
`,
            fails: ["returns"],
            why: "each push replaces the repository's list, so earlier authors are lost",
          },
          {
            code: src`
def authors_by_repo(events):
    authors = {}
    for event in events:
        if event["type"] != "PushEvent":
            continue
        repo = event["repo"]["name"]
        if repo not in authors:
            authors[repo] = []
        if event["actor"]["login"] not in authors[repo]:
            authors[repo].append(event["actor"]["login"])
    return authors
`,
            fails: ["returns"],
            why: "it lists who pushed, but a push can contain commits written by other people",
          },
        ],
        hints: [
          "Group by repository: a dictionary of lists, created when a repository first appears.",
          "The author names are three levels down: payload, commits list, then each commit's author name.",
          "Append a name only if that repository's list doesn't already hold it, and create the list only once per repository.",
        ],
        task: {
          checks: [
            fn("returns", "authors_by_repo", [
              example([events], { "tidewater/smartqueue": ["ml-koi418", "ana-dev"], "harbor/tinyhttp": ["ml-koi418"] }),
              example([[watch("j-ochoa", "r/x")]], {}),
              example([[]], {}),
              hiddenCase("one author with many commits", [[push("a", "r/one", ["a", "a", "a"])]], { "r/one": ["a"] }),
              hiddenCase("the same author in two repositories", [[push("a", "r/one", ["a"]), push("a", "r/two", ["b", "a"])]], { "r/one": ["a"], "r/two": ["b", "a"] }),
              hiddenCase("a push with no commits", [[push("bot", "r/empty", [])]], { "r/empty": [] }),
              hiddenCase("authors spread across several pushes", [[push("x", "r", ["x"]), push("y", "r", ["z", "x"]), push("x", "r", ["y"])]], { r: ["x", "z", "y"] }),
            ], { label: "authors_by_repo() lists each author once per repository" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
teams = [{"name": "web", "members": ["ana", "ben"]}, {"name": "data", "members": ["chen"]}, {"name": "ops", "members": []}]
count = 0
for team in teams:
    for member in team["members"]:
        count += 1
print(count, len(teams))
`,
        choices: ["3 3", "3 2", "4 3", "1 3"],
        answer: 0,
        why: "The inner loop runs 2 + 1 + 0 times, so `count` is 3. There are three team records.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the total starts inside the outer loop. What does this print?",
        program: src`
orders = [{"items": [{"qty": 2}, {"qty": 1}]}, {"items": [{"qty": 4}]}]
for order in orders:
    units = 0
    for item in order["items"]:
        units += item["qty"]
print(units)
`,
        choices: ["4", "7", "3", "0"],
        answer: 0,
        why: "`units = 0` runs again for the second order, wiping out the 3 from the first. Only the last order's 4 is left. Start the total before the outer loop.",
      },
      {
        id: "q3",
        prompt: "Which job needs an inner loop over a list stored in each record?",
        choices: ["Totalling the quantity of every line item in a list of orders", "Reading the first order's ID", "Counting how many orders there are", "Finding a customer by ID in a dictionary"],
        answer: 0,
        why: "Each order holds its own list of items, so every item in every order has to be visited. The others need at most one loop over the orders, or none.",
      },
    ],
    review: [
      "Outer loop over records, inner loop over the list each record holds; the outer record is still available inside.",
      "A `for` over a dictionary visits its keys. Loop over the list stored under a key instead.",
      "Accumulators that cover every record start before the outer loop.",
      "Next: flatten nested records into plain rows, the shape spreadsheets and CSV files need.",
    ],
  },

  // ------------------------------------------------------------------ PY-L17-04 flatten and reshape
  {
    id: "PY-L17-04",
    version: 2,
    slug: "one-list-from-many",
    title: "Flatten nested records into rows",
    lede: "Spreadsheets, CSV files and most charts want flat rows. Flattening lifts nested values up into one row per record, or one row per inner item.",
    focus: "Turn nested records into flat rows, carrying outer fields down to each inner item.",
    minutes: 18,
    objectives: [
      "Flatten a list of lists into one list with an inner loop",
      "Build one flat dictionary per record by lifting values out of its nested parts",
      "Produce one row per inner item, copying the outer record's fields onto each row",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "dict-iterate", "nested-dict", "nested-lookup", "nested-index", "walk-nested", "string-index", "string-format", "for-loop", "nested-loop", "if-statement", "else-clause", "len-call", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "tuple-unpack", "recursion", "arithmetic", "membership", "function-default", "dict-update", "boolean", "string-slice", "truthiness"],
    teaches: ["flatten-loop"],
    blocks: [
      {
        kind: "text",
        md: "A GeoJSON feature is great for an API and awkward for a spreadsheet: the magnitude is two keys deep and the latitude is a position inside a list. Tables, CSV files and charts want **flat rows**: one dictionary per row, every value directly under a plain key.\n\n**Flattening** builds those rows. The simplest form turns a list of lists into one list: an inner loop appends every inner value to a single result.",
      },
      {
        kind: "example",
        title: "Sessions per week into one list",
        code: src`
weekly = [[3, 5, 2], [4], [], [6, 1]]
sessions = []
for week in weekly:
    for count in week:
        sessions.append(count)
print(sessions)
print(len(weekly), "weeks,", len(sessions), "sessions")
`,
        output: "[3, 5, 2, 4, 6, 1]\n4 weeks, 6 sessions\n",
        note: "Appending `week` itself would give a list of lists again. Appending each `count` from the inner loop gives one flat list; the empty week adds nothing.",
      },
      {
        kind: "text",
        md: "For records, flattening means building a **new** dictionary per record and lifting each nested value up to a plain key. Choose clear names for the new keys: a reader of the CSV won't know that `latitude` came from position 1 of `coordinates`.",
      },
      {
        kind: "example",
        title: "Earthquakes as table rows",
        code: src`
def to_rows(features):
    rows = []
    for feature in features:
        longitude, latitude, depth = feature["geometry"]["coordinates"]
        rows.append({
            "id": feature["id"],
            "mag": feature["properties"]["mag"],
            "place": feature["properties"]["place"],
            "latitude": latitude,
            "longitude": longitude,
            "depth_km": depth,
        })
    return rows

features = [
    {"id": "us6000pw77", "properties": {"mag": 4.7, "place": "Arctic Ocean"},
     "geometry": {"coordinates": [-107.5679, 80.7069, 10]}},
    {"id": "ak0252r9gt13", "properties": {"mag": 2.7, "place": "Southern Alaska"},
     "geometry": {"coordinates": [-147.2371, 61.4029, 9.6]}},
]
for row in to_rows(features):
    print(row)
`,
        output: "{'id': 'us6000pw77', 'mag': 4.7, 'place': 'Arctic Ocean', 'latitude': 80.7069, 'longitude': -107.5679, 'depth_km': 10}\n{'id': 'ak0252r9gt13', 'mag': 2.7, 'place': 'Southern Alaska', 'latitude': 61.4029, 'longitude': -147.2371, 'depth_km': 9.6}\n",
        note: "Unpacking the coordinates list into three names documents what each position means. The features themselves aren't changed: every row is a new dictionary.",
      },
      {
        kind: "text",
        md: "When a record holds a **list** (an order's items, a question's tags), one row per record isn't enough. The usual flat shape is one row **per inner item**, with the outer record's fields copied onto every row so each row stands on its own. A record whose list is empty then produces no rows: decide whether that's what the report needs.\n\n**Mistakes to avoid:** appending the inner list instead of its items (still nested), and losing the outer fields, so a row of `{\"tag\": \"csv\"}` no longer says which question it belongs to.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Every tag in one list",
      prompt: "`all_tags` appends each question's whole tag list, so the result is still nested. Change it so the result is one flat list of tags, in order.",
      spec: [
        ["Function", "`all_tags(questions)`"],
        ["Returns", "one list with every tag of every question, in order (repeats included)"],
      ],
      starter: src`
def all_tags(questions):
    tags = []
    for question in questions:
        tags.append(question["tags"])
    return tags

questions = [
    {"question_id": 70015316, "tags": ["python", "dataclasses"]},
    {"question_id": 70015402, "tags": ["python", "csv"]},
]
print(all_tags(questions))
`,
      answer: src`
def all_tags(questions):
    tags = []
    for question in questions:
        for tag in question["tags"]:
            tags.append(tag)
    return tags

questions = [
    {"question_id": 70015316, "tags": ["python", "dataclasses"]},
    {"question_id": 70015402, "tags": ["python", "csv"]},
]
print(all_tags(questions))
`,
      wrong: [
        {
          code: src`
def all_tags(questions):
    tags = []
    for question in questions:
        tags.append(question["tags"][0])
    return tags
`,
          fails: ["returns"],
          why: "only the first tag of each question is kept",
        },
      ],
      hints: ["The result has a list inside it because each `append` adds a whole list.", "Visit each tag in the question's list with an inner loop.", "Append one tag at a time."],
      task: {
        checks: [
          fn("returns", "all_tags", [
            example([[{ question_id: 70015316, tags: ["python", "dataclasses"] }, { question_id: 70015402, tags: ["python", "csv"] }]], ["python", "dataclasses", "python", "csv"]),
            hiddenCase("a question with no tags", [[{ question_id: 1, tags: [] }, { question_id: 2, tags: ["gzip"] }]], ["gzip"]),
            hiddenCase("no questions", [[]], []),
          ], { label: "all_tags() returns one flat list" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "One row per question tag",
        prompt: "The Q&A site's tag report needs one row per (question, tag) pair. Write `tag_rows(questions)`: return a list of new dictionaries `{\"question_id\": …, \"tag\": …}`, one for every tag of every question, in order. Questions with no tags produce no rows.",
        spec: [
          ["Function", "`tag_rows(questions)`"],
          ["questions", "dictionaries with `question_id`, `title` and `tags` (a list of text)"],
          ["Returns", "a list of `{\"question_id\": id, \"tag\": tag}` rows"],
          ["Example", "the starter's questions → 5 rows, starting `{'question_id': 70015316, 'tag': 'python'}`"],
        ],
        starter: src`
def tag_rows(questions):
    rows = []
    return rows

questions = [
    {"question_id": 70015316, "title": "TypeError when I inherit from a base class", "tags": ["python", "dataclasses"]},
    {"question_id": 70015402, "title": "Why does my CSV have blank lines?", "tags": ["python", "csv", "windows"]},
    {"question_id": 70015577, "title": "How do I read a gzip file?", "tags": []},
]
for row in tag_rows(questions):
    print(row)
`,
        answer: src`
def tag_rows(questions):
    rows = []
    for question in questions:
        for tag in question["tags"]:
            rows.append({"question_id": question["question_id"], "tag": tag})
    return rows

questions = [
    {"question_id": 70015316, "title": "TypeError when I inherit from a base class", "tags": ["python", "dataclasses"]},
    {"question_id": 70015402, "title": "Why does my CSV have blank lines?", "tags": ["python", "csv", "windows"]},
    {"question_id": 70015577, "title": "How do I read a gzip file?", "tags": []},
]
for row in tag_rows(questions):
    print(row)
`,
        alternatives: [
          src`
def tag_rows(questions):
    return [{"question_id": q["question_id"], "tag": t} for q in questions for t in q["tags"]]
`,
        ],
        wrong: [
          {
            code: src`
def tag_rows(questions):
    rows = []
    for question in questions:
        rows.append({"question_id": question["question_id"], "tag": question["tags"]})
    return rows
`,
            fails: ["returns"],
            why: "one row per question holding the whole list is still nested",
          },
          {
            code: src`
def tag_rows(questions):
    rows = []
    for question in questions:
        for tag in question["tags"]:
            rows.append({"tag": tag})
    return rows
`,
            fails: ["returns"],
            why: "the rows no longer say which question each tag belongs to",
          },
          {
            code: src`
def tag_rows(questions):
    rows = []
    for question in questions:
        if len(question["tags"]) == 0:
            rows.append({"question_id": question["question_id"], "tag": None})
        for tag in question["tags"]:
            rows.append({"question_id": question["question_id"], "tag": tag})
    return rows
`,
            fails: ["returns"],
            why: "a question without tags should produce no row, not a row with None",
          },
        ],
        hints: [
          "One row per tag, so the `append` belongs inside a loop over each question's tags.",
          "The question ID comes from the outer record; copy it onto every row.",
          "Build a new two-key dictionary for each row. An empty tag list simply makes the inner loop do nothing.",
        ],
        task: {
          checks: [
            fn("returns", "tag_rows", [
              example([questions], [
                { question_id: 70015316, tag: "python" },
                { question_id: 70015316, tag: "dataclasses" },
                { question_id: 70015402, tag: "python" },
                { question_id: 70015402, tag: "csv" },
                { question_id: 70015402, tag: "windows" },
              ]),
              example([[questions[2]]], []),
              example([[]], []),
              hiddenCase("a single question with one tag", [[{ question_id: 5, title: "t", tags: ["pandas"] }]], [{ question_id: 5, tag: "pandas" }]),
              hiddenCase("the same tag on two questions", [[{ question_id: 1, title: "a", tags: ["sql"] }, { question_id: 2, title: "b", tags: ["sql", "joins"] }]], [{ question_id: 1, tag: "sql" }, { question_id: 2, tag: "sql" }, { question_id: 2, tag: "joins" }]),
              hiddenCase("an untagged question between tagged ones", [[{ question_id: 1, title: "a", tags: ["x"] }, { question_id: 2, title: "b", tags: [] }, { question_id: 3, title: "c", tags: ["y"] }]], [{ question_id: 1, tag: "x" }, { question_id: 3, tag: "y" }]),
            ], { label: "tag_rows() returns one row per question and tag" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Flatten an app's settings",
        prompt: "A deployment tool wants an app's nested settings as flat `\"section.key\"` names. Write `flatten_settings(settings)`: return a new dictionary where every value that is not a dictionary appears under its full dotted path. Sections can be nested to any depth, so a dictionary inside a dictionary inside a dictionary is flattened too. `isinstance(value, dict)` is `True` when `value` is a dictionary.",
        spec: [
          ["Function", "`flatten_settings(settings)`"],
          ["settings", "a dictionary whose values are plain values (text, numbers, True/False, lists) or more dictionaries"],
          ["Returns", "a new flat dictionary: `{\"db\": {\"port\": 5432}}` → `{\"db.port\": 5432}`; top-level plain values keep their own key; keys in the order they are met"],
          ["Example", "the starter's settings → `{'app': 'runtime-reports', 'db.host': 'db.internal', 'db.port': 5432, 'db.pool.min': 1, 'db.pool.max': 8, 'debug': False}`"],
        ],
        starter: src`
def flatten_settings(settings):
    flat = {}
    return flat

settings = {
    "app": "runtime-reports",
    "db": {"host": "db.internal", "port": 5432, "pool": {"min": 1, "max": 8}},
    "debug": False,
}
print(flatten_settings(settings))
`,
        answer: src`
def flatten_settings(settings, prefix=""):
    flat = {}
    for key, value in settings.items():
        name = prefix + key
        if isinstance(value, dict):
            flat.update(flatten_settings(value, name + "."))
        else:
            flat[name] = value
    return flat

settings = {
    "app": "runtime-reports",
    "db": {"host": "db.internal", "port": 5432, "pool": {"min": 1, "max": 8}},
    "debug": False,
}
print(flatten_settings(settings))
`,
        alternatives: [
          src`
def add_flat(flat, section, prefix):
    for key, value in section.items():
        if isinstance(value, dict):
            add_flat(flat, value, prefix + key + ".")
        else:
            flat[prefix + key] = value

def flatten_settings(settings):
    flat = {}
    add_flat(flat, settings, "")
    return flat
`,
        ],
        wrong: [
          {
            code: src`
def flatten_settings(settings):
    flat = {}
    for key, value in settings.items():
        if isinstance(value, dict):
            for inner_key, inner_value in value.items():
                flat[key + "." + inner_key] = inner_value
        else:
            flat[key] = value
    return flat
`,
            fails: ["returns"],
            why: "only one level is flattened, so `db.pool` is still a dictionary",
          },
          {
            code: src`
def flatten_settings(settings, prefix=""):
    flat = {}
    for key, value in settings.items():
        if isinstance(value, dict):
            flat.update(flatten_settings(value, key + "."))
        else:
            flat[prefix + key] = value
    return flat
`,
            fails: ["returns"],
            why: "the deeper sections lose their outer name: `pool.min` instead of `db.pool.min`",
          },
          {
            code: src`
def flatten_settings(settings, prefix=""):
    flat = {}
    for key, value in settings.items():
        if isinstance(value, dict):
            flat.update(flatten_settings(value, prefix + key + "."))
    return flat
`,
            fails: ["returns"],
            why: "plain values are never stored, so nothing comes out",
          },
        ],
        hints: [
          "Walk the pairs with `items()`. A plain value goes straight into the result; a dictionary needs the same treatment again.",
          "The same job on a smaller dictionary is a recursive call (see Advanced Functions & Recursion). Pass it the dotted name built so far so deeper keys know where they live.",
          "A default parameter for the prefix lets the first call start with nothing; `update` can copy what a recursive call returns into your result.",
        ],
        task: {
          checks: [
            fn("returns", "flatten_settings", [
              example([config], { app: "runtime-reports", "db.host": "db.internal", "db.port": 5432, "db.pool.min": 1, "db.pool.max": 8, debug: false }),
              example([{ timeout: 30 }], { timeout: 30 }),
              example([{}], {}),
              hiddenCase("a section four levels deep", [{ a: { b: { c: { d: 1 } } } }], { "a.b.c.d": 1 }),
              hiddenCase("a list value is kept as it is", [{ cors: { origins: ["https://runtime.school", "http://localhost"] } }], { "cors.origins": ["https://runtime.school", "http://localhost"] }),
              hiddenCase("two sections with the same inner key", [{ db: { host: "a" }, cache: { host: "b" } }], { "db.host": "a", "cache.host": "b" }),
              hiddenCase("an empty section", [{ db: {}, debug: true }], { debug: true }),
            ], { label: "flatten_settings() names every value by its dotted path" }),
            fn("keeps-input", "flatten_settings", [
              keepsInput([config]),
              keepsInput([{ a: { b: 1 } }], { label: "a small nested section" }),
            ], { label: "flatten_settings() leaves the settings it is given unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
baskets = [["tea", "milk"], [], ["bread"]]
flat = []
for basket in baskets:
    for item in basket:
        flat.append(item)
print(flat, len(flat))
`,
        choices: ["['tea', 'milk', 'bread'] 3", "[['tea', 'milk'], [], ['bread']] 3", "['tea', 'milk', 'bread'] 4", "['tea', 'milk', [], 'bread'] 4"],
        answer: 0,
        why: "Each item is appended on its own, and the empty basket adds nothing, so the list is flat with 3 items.",
      },
      {
        id: "q2",
        prompt: "A common mistake: appending the inner list. What does this print?",
        program: src`
baskets = [["tea", "milk"], ["bread"]]
flat = []
for basket in baskets:
    flat.append(basket)
print(len(flat), flat[0])
`,
        choices: ["2 ['tea', 'milk']", "3 tea", "2 tea", "3 ['tea', 'milk']"],
        answer: 0,
        why: "Each pass appends a whole basket, so `flat` holds 2 lists and its first item is a list. Flattening needs the inner loop.",
      },
      {
        id: "q3",
        prompt: "You flatten orders into one row per line item for a CSV. Why copy the order ID onto every row?",
        choices: ["So each row still says which order it came from", "Because CSV files need at least two columns", "So the rows are sorted by order", "Because dictionaries can't be empty"],
        answer: 0,
        why: "Once rows are separate, the nesting that tied an item to its order is gone. The copied ID is the only link left.",
      },
    ],
    review: [
      "Flattening builds new rows: an inner loop appends each inner value, not the inner list.",
      "Lift nested values to clearly named keys; one row per inner item carries the outer fields down.",
      "Nesting of unknown depth is a job for a recursive function.",
      "Next: changing a value inside nested data, without changing someone else's copy.",
    ],
  },

  // ------------------------------------------------------------------ PY-L17-05 update nested values safely
  {
    id: "PY-L17-05",
    version: 2,
    slug: "update-nested-data",
    title: "Change nested data without surprises",
    lede: "`copy()` copies only the outer level. The inner lists and dictionaries are still shared, so changing them changes the original too. Copy every level you change.",
    focus: "Update a value inside nested data by copying each level on the way down, so the original stays as it was.",
    minutes: 18,
    objectives: [
      "Explain why a copy of a dictionary still shares its inner dictionaries and lists",
      "Return an updated record by copying the outer dictionary and each inner one you change",
      "Spot the `[[0] * 3] * 2` sharing trap in a grid",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "list-copy", "dict-literal", "dict-lookup", "dict-iterate", "nested-dict", "nested-lookup", "nested-index", "walk-nested", "string-index", "arithmetic", "precedence", "identity", "for-loop", "nested-loop", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "boolean", "tuple-unpack", "dict-get", "membership", "range-call"],
    teaches: ["nested-copy"],
    blocks: [
      {
        kind: "text",
        md: "A function that \"updates\" a record usually shouldn't change the record it was given: the caller may still need the original, or may share it with other code. The Collection Algorithms module handled flat records with `copy()`. Nested records hide a trap: `copy()` makes a new **outer** dictionary, but the values inside it are the **same** inner dictionaries and lists, not copies of them.",
      },
      {
        kind: "example",
        title: "A copy that still shares its inside",
        code: src`
defaults = {"theme": "light", "alerts": {"email": True, "sms": False}}
mine = defaults.copy()
mine["theme"] = "dark"
mine["alerts"]["sms"] = True
print(defaults["theme"], defaults["alerts"]["sms"])
print(mine["alerts"] is defaults["alerts"])
`,
        output: "light True\nTrue\n",
        note: "Replacing `mine[\"theme\"]` touched only the new outer dictionary. But `mine[\"alerts\"]` **is** `defaults[\"alerts\"]` (`is` says True), so turning SMS on in one turned it on in both.",
      },
      {
        kind: "text",
        md: "The rule: **copy every level you are about to change, from the top down to the value.** Untouched inner parts can stay shared, because nobody changes them. Here the inner `alerts` dictionary is copied and changed, then a copy of the outer dictionary gets the new inner one.",
      },
      {
        kind: "example",
        title: "Turn SMS on for one user only",
        code: src`
def with_sms(settings, enabled):
    alerts = settings["alerts"].copy()
    alerts["sms"] = enabled
    updated = settings.copy()
    updated["alerts"] = alerts
    return updated

defaults = {"theme": "light", "alerts": {"email": True, "sms": False}}
user = with_sms(defaults, True)
print(user)
print(defaults)
`,
        output: "{'theme': 'light', 'alerts': {'email': True, 'sms': True}}\n{'theme': 'light', 'alerts': {'email': True, 'sms': False}}\n",
        note: "Two copies, one per level on the way down to `sms`. The defaults every other user starts from are unchanged.",
      },
      {
        kind: "text",
        md: "Lists of lists have the same trap in its sneakiest form. `[[0] * 3] * 2` doesn't build two rows: it builds **one** row and a list that mentions it twice. Build each row separately instead, for example with a comprehension: `[[0] * 3 for _ in range(2)]`.",
      },
      {
        kind: "example",
        title: "Two names for one row",
        code: src`
grid = [[0] * 3] * 2
grid[0][0] = 9
print(grid)
safe = [[0] * 3 for _ in range(2)]
safe[0][0] = 9
print(safe)
`,
        output: "[[9, 0, 0], [9, 0, 0]]\n[[9, 0, 0], [0, 0, 0]]\n",
        note: "In `grid` both positions hold the same list, so one change shows up twice. The comprehension runs `[0] * 3` once per row, making two separate lists.",
      },
      {
        kind: "text",
        md: "**When to use it:** any function that returns a changed version of nested data (settings, orders with items, products with price tables) while the caller keeps the original. **Mistakes to avoid:** copying only the outer level and then changing something inside; appending to a list you got from the original record; and multiplying a list of lists.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Tag one question, not two",
      prompt: "`add_tag` copies the question but then appends to the **original's** tag list. Run it: the original question gains the tag too. Fix it so only the returned question has the new tag.",
      spec: [
        ["Function", "`add_tag(question, tag)`"],
        ["Returns", "a new question with `tag` added at the end of its tags; the question passed in must not change"],
      ],
      starter: src`
def add_tag(question, tag):
    tagged = question.copy()
    tagged["tags"].append(tag)
    return tagged

question = {"question_id": 70015402, "tags": ["python", "csv"]}
print(add_tag(question, "windows"))
print(question)
`,
      answer: src`
def add_tag(question, tag):
    tagged = question.copy()
    tagged["tags"] = question["tags"].copy()
    tagged["tags"].append(tag)
    return tagged

question = {"question_id": 70015402, "tags": ["python", "csv"]}
print(add_tag(question, "windows"))
print(question)
`,
      wrong: [
        {
          code: src`
def add_tag(question, tag):
    question["tags"].append(tag)
    return question
`,
          fails: ["keeps-input"],
          why: "the result is right but the caller's question changed",
        },
      ],
      hints: ["`tagged[\"tags\"]` and `question[\"tags\"]` are the same list after `question.copy()`.", "Give the new question its own tag list before appending.", "Store a copy of the original tag list under `tagged[\"tags\"]`, then append."],
      task: {
        checks: [
          fn("returns", "add_tag", [
            example([{ question_id: 70015402, tags: ["python", "csv"] }, "windows"], { question_id: 70015402, tags: ["python", "csv", "windows"] }),
            hiddenCase("a question with no tags", [{ question_id: 1, tags: [] }, "gzip"], { question_id: 1, tags: ["gzip"] }),
          ], { label: "add_tag() returns the question with the new tag" }),
          fn("keeps-input", "add_tag", [
            keepsInput([{ question_id: 70015402, tags: ["python", "csv"] }, "windows"]),
            keepsInput([{ question_id: 1, tags: [] }, "gzip"], { label: "a question with no tags" }),
          ], { label: "add_tag() leaves the original question unchanged" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A new price for one region",
        prompt: "Products keep a price per region in a nested `prices` dictionary. Write `set_price(product, region, price)`: return a new product whose `prices[region]` is `price` (added if the region is new). The product passed in, and its `prices`, must not change.",
        spec: [
          ["Function", "`set_price(product, region, price)`"],
          ["product", "a dictionary with `sku`, `name` and `prices` (region → price)"],
          ["Returns", "a new product dictionary with the updated price table"],
          ["Must not", "change `product` or `product[\"prices\"]`"],
          ["Example", "the starter's product with `\"EU\"`, `6.49` → `prices` becomes `{'US': 7.49, 'EU': 6.49}`"],
        ],
        starter: src`
def set_price(product, region, price):
    return product

product = {"sku": "SPO-11681", "name": "Ultra Bike Light", "prices": {"US": 7.49, "EU": 6.99}}
print(set_price(product, "EU", 6.49))
print(product)
`,
        answer: src`
def set_price(product, region, price):
    prices = product["prices"].copy()
    prices[region] = price
    updated = product.copy()
    updated["prices"] = prices
    return updated

product = {"sku": "SPO-11681", "name": "Ultra Bike Light", "prices": {"US": 7.49, "EU": 6.99}}
print(set_price(product, "EU", 6.49))
print(product)
`,
        alternatives: [
          src`
def set_price(product, region, price):
    updated = {}
    for key, value in product.items():
        updated[key] = value
    updated["prices"] = {}
    for name, amount in product["prices"].items():
        updated["prices"][name] = amount
    updated["prices"][region] = price
    return updated
`,
        ],
        wrong: [
          {
            code: src`
def set_price(product, region, price):
    updated = product.copy()
    updated["prices"][region] = price
    return updated
`,
            fails: ["keeps-input"],
            why: "the outer copy still shares `prices`, so the original product's price changes too",
          },
          {
            code: src`
def set_price(product, region, price):
    updated = product.copy()
    updated["prices"] = {region: price}
    return updated
`,
            fails: ["returns"],
            why: "the other regions' prices are thrown away",
          },
          {
            code: src`
def set_price(product, region, price):
    prices = product["prices"].copy()
    prices[region] = price
    return prices
`,
            fails: ["returns"],
            why: "it returns only the price table, not the product",
          },
        ],
        hints: [
          "Two levels lie on the way to the price: the product and its `prices` dictionary.",
          "Copy the price table and change the copy; then copy the product and give it the new table.",
          "Use the original `product[\"prices\"]` only to read from, never to store into.",
        ],
        task: {
          checks: [
            fn("returns", "set_price", [
              example([product, "EU", 6.49], { sku: "SPO-11681", name: "Ultra Bike Light", prices: { US: 7.49, EU: 6.49 } }),
              example([product, "UK", 5.99], { sku: "SPO-11681", name: "Ultra Bike Light", prices: { US: 7.49, EU: 6.99, UK: 5.99 } }),
              example([{ sku: "HOM-22847", name: "Deluxe Vase", prices: {} }, "US", 31], { sku: "HOM-22847", name: "Deluxe Vase", prices: { US: 31 } }),
              hiddenCase("the same price again", [product, "US", 7.49], { sku: "SPO-11681", name: "Ultra Bike Light", prices: { US: 7.49, EU: 6.99 } }),
              hiddenCase("a product with extra fields", [{ sku: "ELE-24781", name: "Organic Speaker", prices: { US: 171.99 }, active: true }, "US", 149.99], { sku: "ELE-24781", name: "Organic Speaker", prices: { US: 149.99 }, active: true }),
            ], { label: "set_price() returns the product with the new price" }),
            fn("keeps-input", "set_price", [
              keepsInput([product, "EU", 6.49]),
              keepsInput([product, "UK", 5.99], { label: "a region that wasn't there before" }),
            ], { label: "set_price() leaves the original product and its prices unchanged" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Discount a batch of orders",
        prompt: "A sale applies a discount to every line of every order in a batch. Write `discount_orders(orders, rate)`: return a new list of new orders, where each line item's `unit_price` is multiplied by `1 - rate`. Everything else is kept. The orders you were given, their item lists and their items must not change: the originals go to the audit log.",
        spec: [
          ["Function", "`discount_orders(orders, rate)`"],
          ["orders", "a list of `{\"order_id\": …, \"items\": [{\"sku\": …, \"unit_price\": …, \"quantity\": …}, …]}`"],
          ["Returns", "a new list of orders, each with a new `items` list of new item dictionaries"],
          ["Example", "the starter's orders with `0.25` → unit prices `23.25`, `36.0` and `12.0`"],
        ],
        starter: src`
def discount_orders(orders, rate):
    return orders

orders = [
    {"order_id": "O100282", "items": [{"sku": "P0164", "unit_price": 31, "quantity": 1}, {"sku": "P0594", "unit_price": 48, "quantity": 2}]},
    {"order_id": "O100918", "items": [{"sku": "P0209", "unit_price": 16, "quantity": 3}]},
]
print(discount_orders(orders, 0.25))
print(orders[0]["items"][0])
`,
        answer: src`
def discount_orders(orders, rate):
    result = []
    for order in orders:
        items = []
        for item in order["items"]:
            new_item = item.copy()
            new_item["unit_price"] = item["unit_price"] * (1 - rate)
            items.append(new_item)
        new_order = order.copy()
        new_order["items"] = items
        result.append(new_order)
    return result

orders = [
    {"order_id": "O100282", "items": [{"sku": "P0164", "unit_price": 31, "quantity": 1}, {"sku": "P0594", "unit_price": 48, "quantity": 2}]},
    {"order_id": "O100918", "items": [{"sku": "P0209", "unit_price": 16, "quantity": 3}]},
]
print(discount_orders(orders, 0.25))
print(orders[0]["items"][0])
`,
        alternatives: [
          src`
def discount_item(item, rate):
    new_item = item.copy()
    new_item["unit_price"] = item["unit_price"] * (1 - rate)
    return new_item

def discount_orders(orders, rate):
    result = []
    for order in orders:
        new_order = order.copy()
        new_order["items"] = [discount_item(item, rate) for item in order["items"]]
        result.append(new_order)
    return result
`,
        ],
        wrong: [
          {
            code: src`
def discount_orders(orders, rate):
    result = []
    for order in orders:
        new_order = order.copy()
        for item in new_order["items"]:
            item["unit_price"] = item["unit_price"] * (1 - rate)
        result.append(new_order)
    return result
`,
            fails: ["keeps-input"],
            why: "the order is copied, but its items are the originals, so the audit copy is discounted too",
          },
          {
            code: src`
def discount_orders(orders, rate):
    result = []
    for order in orders:
        items = []
        for item in order["items"]:
            new_item = item.copy()
            new_item["unit_price"] = item["unit_price"] * rate
            items.append(new_item)
        new_order = order.copy()
        new_order["items"] = items
        result.append(new_order)
    return result
`,
            fails: ["returns"],
            why: "multiplying by the rate keeps only the discount, not the discounted price",
          },
          {
            code: src`
def discount_orders(orders, rate):
    result = []
    for order in orders:
        for item in order["items"]:
            new_item = item.copy()
            new_item["unit_price"] = item["unit_price"] * (1 - rate)
            result.append(new_item)
    return result
`,
            fails: ["returns"],
            why: "the items come back as one flat list, without their orders",
          },
        ],
        hints: [
          "Three levels lie on the way to a price: the list of orders, each order's items list, and each item.",
          "Build new versions bottom up: a copied item with the new price, appended to a new items list, stored on a copied order.",
          "Read prices from the original items, but store only into the copies you made in this pass.",
        ],
        task: {
          checks: [
            fn("returns", "discount_orders", [
              example([discountOrders, 0.25], [
                { order_id: "O100282", items: [{ sku: "P0164", unit_price: 23.25, quantity: 1 }, { sku: "P0594", unit_price: py.float(36), quantity: 2 }] },
                { order_id: "O100918", items: [{ sku: "P0209", unit_price: py.float(12), quantity: 3 }] },
              ]),
              example([[], 0.5], []),
              example([[{ order_id: "O1", items: [] }], 0.1], [{ order_id: "O1", items: [] }]),
              hiddenCase("a rate of zero", [[{ order_id: "O2", items: [{ sku: "A", unit_price: 10, quantity: 1 }] }], 0], [{ order_id: "O2", items: [{ sku: "A", unit_price: 10, quantity: 1 }] }]),
              hiddenCase("orders with extra fields", [[{ order_id: "O3", channel: "web", items: [{ sku: "B", unit_price: 20, quantity: 2, note: "gift" }] }], 0.5], [{ order_id: "O3", channel: "web", items: [{ sku: "B", unit_price: py.float(10), quantity: 2, note: "gift" }] }]),
            ], { label: "discount_orders() discounts every line", compare: { numbers: "int-float-equal" } }),
            fn("keeps-input", "discount_orders", [
              keepsInput([discountOrders, 0.25]),
              keepsInput([[{ order_id: "O3", items: [{ sku: "B", unit_price: 20, quantity: 2 }] }], 0.5], { label: "a single order" }),
            ], { label: "discount_orders() leaves the original orders and items unchanged" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
order = {"order_id": "O1", "items": ["P0164"]}
copy_of_order = order.copy()
copy_of_order["order_id"] = "O2"
copy_of_order["items"].append("P0594")
print(order["order_id"], order["items"])
`,
        choices: ["O1 ['P0164', 'P0594']", "O2 ['P0164', 'P0594']", "O1 ['P0164']", "O2 ['P0164']"],
        answer: 0,
        why: "Replacing `order_id` on the copy doesn't touch the original, but `items` is one list shared by both, so the append shows up in `order` too.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a seating chart built by multiplying a list of lists. What does this print?",
        program: src`
seats = [["free"] * 2] * 3
seats[1][0] = "taken"
print(seats[0][0], seats[2][0])
`,
        choices: ["taken taken", "free free", "free taken", "taken free"],
        answer: 0,
        why: "`* 3` repeats the same row object three times, so changing row 1 changes \"all three\" rows. Build each row separately.",
      },
      {
        id: "q3",
        prompt: "`settings = {\"db\": {\"pool\": {\"max\": 8}}, \"debug\": False}`. To return a version with `pool.max` set to 16 without changing `settings`, which dictionaries must be copied?",
        choices: ["The outer dictionary, `db` and `pool`", "Only the outer dictionary", "Only `pool`", "Only `db`"],
        answer: 0,
        why: "Every level on the path to the changed value must be new; otherwise the original still shares (and sees) the changed inner dictionary. `debug` is untouched and can stay shared.",
      },
    ],
    review: [
      "`copy()` copies one level; inner lists and dictionaries stay shared.",
      "To change a nested value safely, copy each level on the path to it, top to bottom.",
      "`[[0] * n] * m` repeats one row; build each row on its own.",
      "Next module: when values can't be trusted, Python raises errors. The Exceptions & Validation module catches and raises them on purpose.",
    ],
  },
];
