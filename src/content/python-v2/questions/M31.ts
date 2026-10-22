/**
 * M31 practice: ten independent problems on HTTP clients (PY-L31-01 … PY-L31-05).
 *
 * Mix: 4 function implementations (building API URLs, parsing Link headers, parsing Retry-After, flattening GeoJSON
 * is the data transformation), 1 validation (a GeoJSON feature), 1 data transformation, 2 debugging (a pagination walk
 * that loses and nests pages; a body read twice and an error swallowed), 1 testing (tests for backoff delays),
 * 1 integration (Link-header pagination with a loop guard) and 1 output prediction.
 * Easy: 02, 06, 10. Medium: 12, 13, 16, 19. Hard: 03, 20, 22.
 *
 * Pure parsing problems are graded as functions with hidden cases. Problems that make requests run the learner's
 * code against urllib openers whose replay handler (replay.py, src/content/python-v2/m31-replay.ts) answers from
 * saved copies of real USGS (D08) and OpenAlex (D10) responses, plus GitHub-style issue pages for repositories in
 * Runtime Repository Events (D11). No check compares printed text.
 * Version 2: every question was replaced; the old set printed values stored in an `except RuntimeError` branch.
 */
import type { PyQuestion } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, learnerTests, pv, raisesCase } from "../checks";
import { py } from "@/engine/python/values";
import { REPLAY_PY, collection, pyLit, quake, replaySetup, work } from "../m31-replay";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

function http(id: string, label: string, saved: Record<string, unknown>, call: string, expected: unknown, o: { hidden?: boolean; show?: string; raises?: string; before?: string } = {}): PyCheck {
  const setup = replaySetup(saved) + (o.before ? `\n${o.before}` : "");
  return {
    kind: "expr",
    id,
    label,
    ...(o.raises ? { expr: `${setup}\n${call}`, raises: o.raises } : { expr: `${setup}\nresult = ${call}`, expected: pv(expected) }),
    ...(o.show ? { show: o.show } : {}),
    ...(o.hidden ? { hidden: true } : {}),
  };
}
const hideDefects = (checks: PyCheck[]) => checks.map((c) => (c.id && /-\d+$/.test(c.id) ? { ...c, hidden: true } : c));
const files = { "replay.py": REPLAY_PY };

// ---------------------------------------------------------------- fixtures (real USGS events and OpenAlex works)

const vanuatu = quake("us6000pgsd", 5.5, "153 km S of Isangel, Vanuatu", 1735706358208, [169.3819, -20.9273, 22]);
const rabaul = quake("us6000pjqz", 4.7, "67 km WNW of Rabaul, Papua New Guinea", 1735696019538, [151.6536, -3.8682, 10]);
const sandwich = quake("us6000pgv4", 6.1, "South Sandwich Islands region", 1735739304752, [-26.7059, -56.4095, 70]);
const argentina = quake("us6000pgs2", 4.9, "97 km WNW of El Aguilar, Argentina", 1735703799832, [-66.6081, -23.0291, 208.974]);
const wright = quake("us6000pjs0", 3, "24 km SSE of Wright, Wyoming", 1735765620655, [-105.3661, 43.5491, 0], "mining explosion");
const mandalay = quake("us7000pn9s", 7.7, "2025 Mandalay, Burma (Myanmar) Earthquake", 1743142852715, [95.9363, 22.011, 10]);

const scipy = work("W3003257820", "SciPy 1.0: fundamental algorithms for scientific computing in Python", 2020, 38040);
const pytorch = work("W2970971581", "PyTorch: An Imperative Style, High-Performance Deep Learning Library", 2019, 31488, "preprint");
const numpy = work("W3035965352", "Array programming with NumPy", 2020, 23538);
const ddpm = work("W3036167779", "Denoising Diffusion Probabilistic Models", 2020, 8702, "preprint");
const psychopy = work("W2913606428", "PsychoPy2: Experiments in behavior made easy", 2019, 5179);

const GH = "https://api.github.com/repos/tidewater/smartqueue/issues?state=open&per_page=2";
const ghPage = (n: number) => `${GH}&page=${n}`;
const link = (rels: [string, number][]) => rels.map(([rel, n]) => `<${ghPage(n)}>; rel="${rel}"`).join(", ");
const issue = (n: number, title: string) => ({ number: n, title });

const BACKOFF_PY = src`
def backoff_delays(attempts, base, cap):
    """Seconds to wait before each retry: base, 2*base, 4*base, ..., never more than cap."""
    delays = []
    for retry in range(attempts - 1):
        delays.append(min(cap, base * 2 ** retry))
    return delays
`;

export const m31Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q31-02 function implementation, easy
  {
    id: "PY-Q31-02",
    version: 2,
    slug: "build-api-urls",
    title: "Build API URLs safely",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "boolean", "comp-if", "conditional-expr", "continue-statement", "conversion", "dict-comp", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "http-get", "identity", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "none-value", "package-import", "print-call", "print-several", "print-text", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "while-loop"],
    prompt: "Every endpoint in a report script builds its URL by hand, and some end up with `//` or an unencoded space. Write `build_url(base, path, params)`. Join `base` and `path` with exactly one `/`, leave out parameters whose value is `None`, and encode the rest in the order given; a list value repeats the parameter once per item (`type=article&type=preprint`). With no parameters left, the URL has no `?`.",
    spec: [
      ["Function", "`build_url(base, path, params)`"],
      ["base / path", "e.g. `\"https://api.openalex.org/\"` and `\"/works\"`; either may or may not have the slash"],
      ["params", "a dictionary of values (text, numbers, lists of text, or `None`)"],
      ["Returns", "the full URL as text"],
    ],
    hiddenKinds: ["slashes on both sides", "slashes on neither side", "every parameter is None", "values with spaces, & and @", "an empty list value"],
    hints: [
      "Strip the trailing `/` from the base and the leading `/` from the path, then put exactly one between them.",
      "Build a new dictionary without the `None` values before encoding anything.",
      "`urlencode(params, doseq=True)` repeats a parameter for each item of a list; add `?` and the result only when it isn't empty.",
    ],
    explanation: "`rstrip(\"/\")` and `lstrip(\"/\")` normalise the join, so all four combinations of slashes give one `/`. Dropping `None` values before encoding means optional filters can be passed through unconditionally. `urlencode(..., doseq=True)` encodes every value (`@` becomes `%40`, a space `+`) and turns a list into repeated parameters, which is how many APIs take several values. Without `doseq`, the list itself would be encoded as the text `['article', 'preprint']`.",
    code: {
      starter: src`
from urllib.parse import urlencode

def build_url(base, path, params):
    return base + path

print(build_url("https://api.openalex.org/", "/works", {"search": "numpy arrays", "mailto": "ana@example.com", "page": None}))
`,
      answer: src`
from urllib.parse import urlencode

def build_url(base, path, params):
    url = base.rstrip("/") + "/" + path.lstrip("/")
    kept = {key: value for key, value in params.items() if value is not None}
    query = urlencode(kept, doseq=True)
    if query:
        url += "?" + query
    return url

print(build_url("https://api.openalex.org/", "/works", {"search": "numpy arrays", "mailto": "ana@example.com", "page": None}))
`,
      alternatives: [
        src`
from urllib.parse import quote_plus

def build_url(base, path, params):
    while base.endswith("/"):
        base = base[:-1]
    while path.startswith("/"):
        path = path[1:]
    pairs = []
    for key, value in params.items():
        if value is None:
            continue
        values = value if isinstance(value, list) else [value]
        for item in values:
            pairs.append(quote_plus(str(key)) + "=" + quote_plus(str(item)))
    return f"{base}/{path}" + ("?" + "&".join(pairs) if pairs else "")
`,
      ],
      wrong: [
        {
          code: src`
from urllib.parse import urlencode

def build_url(base, path, params):
    kept = {key: value for key, value in params.items() if value is not None}
    return base + path + "?" + urlencode(kept, doseq=True)
`,
          fails: ["returns"],
          why: "the slashes are glued as given, and a URL without parameters still ends in `?`",
        },
        {
          code: src`
from urllib.parse import urlencode

def build_url(base, path, params):
    url = base.rstrip("/") + "/" + path.lstrip("/")
    query = urlencode({key: value for key, value in params.items() if value is not None})
    return url + "?" + query if query else url
`,
          fails: ["returns"],
          why: "without `doseq=True` a list is encoded as the text of the whole list",
        },
        {
          code: src`
def build_url(base, path, params):
    url = base.rstrip("/") + "/" + path.lstrip("/")
    pairs = [f"{key}={value}" for key, value in params.items() if value is not None]
    return url + "?" + "&".join(pairs) if pairs else url
`,
          fails: ["returns"],
          why: "nothing is encoded, so spaces, `&` and `@` go into the URL raw",
        },
      ],
      task: {
        checks: [
          fn("returns", "build_url", [
            example(["https://api.openalex.org/", "/works", { search: "numpy arrays", mailto: "ana@example.com", page: null }], "https://api.openalex.org/works?search=numpy+arrays&mailto=ana%40example.com"),
            example(["https://earthquake.usgs.gov/fdsnws/event/1", "count", { format: "geojson", minmagnitude: 7 }], "https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&minmagnitude=7"),
            example(["https://api.openalex.org", "works", { type: ["article", "preprint"], "per-page": 50 }], "https://api.openalex.org/works?type=article&type=preprint&per-page=50"),
            hiddenCase("slashes on both sides", ["https://api.github.com/", "/repos/tidewater/smartqueue", {}], "https://api.github.com/repos/tidewater/smartqueue"),
            hiddenCase("slashes on neither side", ["https://example.org/api", "v2/items", { q: "x" }], "https://example.org/api/v2/items?q=x"),
            hiddenCase("every parameter is None", ["https://api.openalex.org", "works", { page: null, cursor: null }], "https://api.openalex.org/works"),
            hiddenCase("values with spaces, & and @", ["https://api.openalex.org", "authors", { search: "Smith & Wesson", mailto: "lab+bot@example.org" }], "https://api.openalex.org/authors?search=Smith+%26+Wesson&mailto=lab%2Bbot%40example.org"),
            hiddenCase("an empty list value", ["https://api.openalex.org", "works", { type: [], page: 2 }], "https://api.openalex.org/works?page=2"),
          ], { label: "build_url() joins, filters and encodes" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-03 debugging, hard
  {
    id: "PY-Q31-03",
    version: 2,
    slug: "lost-and-nested-pages",
    title: "The pagination walk that loses a page",
    format: "debugging",
    difficulty: "hard",
    minutes: 18,
    requires: ["arithmetic", "assignment", "boolean", "break-statement", "dict-literal", "dict-lookup", "file-open", "function-def", "function-param", "function-return", "http-get", "identity", "if-statement", "import-module", "json-loads", "list-index", "list-literal", "list-mutate", "logical", "nested-dict", "none-value", "package-import", "print-call", "reassignment", "string-index", "top-level-indent", "truthiness", "while-loop", "with-statement"],
    prompt: "`all_works(opener, base_url)` should return every work from an OpenAlex cursor walk as one flat list. Two reports came in: the totals are always one page short of what OpenAlex says, and code that loops over the result crashes with `TypeError: list indices must be integers or slices, not str`. Find and fix both bugs.",
    spec: [
      ["Function", "`all_works(opener, base_url)`"],
      ["Walk", "`base_url + \"&\" + urlencode({\"cursor\": cursor})`, starting with `\"*\"`, until `meta.next_cursor` is `None`"],
      ["Returns", "one flat list of every work dictionary, in order"],
    ],
    hiddenKinds: ["a single page", "four pages", "an empty last page"],
    hints: [
      "Run the starter and look at the shape of the result: a list of what?",
      "`append` adds its argument as one item; another list method adds each item of its argument.",
      "Look at what happens on the page whose `next_cursor` is None: does its data make it into the result before the loop ends?",
    ],
    explanation: "`append(page[\"results\"])` adds the whole page as one nested list, so the result is a list of lists and `work[\"id\"]` fails; `extend` (or `+=`) adds the works themselves. The loop also checks `next_cursor` and breaks before keeping that page's results, so the last page, the one that says there is nothing more, is always lost. Keep the page first, then decide whether to stop.",
    code: {
      starter: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

def all_works(opener, base_url):
    works = []
    cursor = "*"
    while True:
        url = base_url + "&" + urlencode({"cursor": cursor})
        with opener.open(url, timeout=10) as response:
            page = json.loads(response.read())
        cursor = page["meta"]["next_cursor"]
        if cursor is None:
            break
        works.append(page["results"])
    return works

base = "https://api.openalex.org/works?search=python"
saved = {
    base + "&cursor=%2A": (200, {"meta": {"next_cursor": "c2"}, "results": [{"id": "W3003257820"}, {"id": "W2970971581"}]}),
    base + "&cursor=c2": (200, {"meta": {"next_cursor": None}, "results": [{"id": "W3035965352"}]}),
}
print(all_works(build_opener(Replay(saved)), base))
`,
      answer: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

def all_works(opener, base_url):
    works = []
    cursor = "*"
    while True:
        url = base_url + "&" + urlencode({"cursor": cursor})
        with opener.open(url, timeout=10) as response:
            page = json.loads(response.read())
        works.extend(page["results"])
        cursor = page["meta"]["next_cursor"]
        if cursor is None:
            break
    return works

base = "https://api.openalex.org/works?search=python"
saved = {
    base + "&cursor=%2A": (200, {"meta": {"next_cursor": "c2"}, "results": [{"id": "W3003257820"}, {"id": "W2970971581"}]}),
    base + "&cursor=c2": (200, {"meta": {"next_cursor": None}, "results": [{"id": "W3035965352"}]}),
}
print(all_works(build_opener(Replay(saved)), base))
`,
      alternatives: [
        src`
import json
from urllib.parse import urlencode

def all_works(opener, base_url):
    works = []
    cursor = "*"
    while cursor is not None:
        with opener.open(base_url + "&" + urlencode({"cursor": cursor}), timeout=10) as response:
            page = json.loads(response.read())
        works += page["results"]
        cursor = page["meta"]["next_cursor"]
    return works
`,
      ],
      wrong: [
        {
          code: src`
import json
from urllib.parse import urlencode

def all_works(opener, base_url):
    works = []
    cursor = "*"
    while True:
        with opener.open(base_url + "&" + urlencode({"cursor": cursor}), timeout=10) as response:
            page = json.loads(response.read())
        cursor = page["meta"]["next_cursor"]
        if cursor is None:
            break
        works.extend(page["results"])
    return works
`,
          fails: ["returns", "single", "four"],
          why: "the list is flat now, but the last page is still dropped",
        },
        {
          code: src`
import json
from urllib.parse import urlencode

def all_works(opener, base_url):
    works = []
    cursor = "*"
    while True:
        with opener.open(base_url + "&" + urlencode({"cursor": cursor}), timeout=10) as response:
            page = json.loads(response.read())
        works.append(page["results"])
        cursor = page["meta"]["next_cursor"]
        if cursor is None:
            break
    return works
`,
          fails: ["returns", "single", "four", "empty-last"],
          why: "every page is kept now, but each one is still nested as a list inside the list",
        },
      ],
      task: {
        files,
        checks: [
          http("returns", "all_works() returns the works of both pages, flat", {
            "https://o.test/works?search=python&cursor=%2A": { body: { meta: { next_cursor: "c2" }, results: [scipy, pytorch] } },
            "https://o.test/works?search=python&cursor=c2": { body: { meta: { next_cursor: null }, results: [numpy] } },
          }, "[w['id'] for w in all_works(_op, 'https://o.test/works?search=python')]", [scipy.id, pytorch.id, numpy.id], { show: "[w['id'] for w in all_works(opener, base)]" }),
          http("single", "a single page", { "https://o.test/w?s=1&cursor=%2A": { body: { meta: { next_cursor: null }, results: [ddpm, psychopy] } } }, "[w['id'] for w in all_works(_op, 'https://o.test/w?s=1')]", [ddpm.id, psychopy.id], { hidden: true }),
          http("four", "four pages", {
            "https://o.test/w?s=4&cursor=%2A": { body: { meta: { next_cursor: "b" }, results: [scipy] } },
            "https://o.test/w?s=4&cursor=b": { body: { meta: { next_cursor: "c" }, results: [pytorch] } },
            "https://o.test/w?s=4&cursor=c": { body: { meta: { next_cursor: "d" }, results: [numpy, ddpm] } },
            "https://o.test/w?s=4&cursor=d": { body: { meta: { next_cursor: null }, results: [psychopy] } },
          }, "[w['id'] for w in all_works(_op, 'https://o.test/w?s=4')]", [scipy.id, pytorch.id, numpy.id, ddpm.id, psychopy.id], { hidden: true }),
          http("empty-last", "an empty last page", {
            "https://o.test/w?s=e&cursor=%2A": { body: { meta: { next_cursor: "z" }, results: [numpy] } },
            "https://o.test/w?s=e&cursor=z": { body: { meta: { next_cursor: null }, results: [] } },
          }, "[w['id'] for w in all_works(_op, 'https://o.test/w?s=e')]", [numpy.id], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-06 function implementation, easy
  {
    id: "PY-Q31-06",
    version: 2,
    slug: "parse-link-header",
    title: "Read a Link header",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "dict-literal", "end", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-mutate", "membership", "nested-loop", "print-call", "reassignment", "regex-call", "string-find", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "while-loop"],
    prompt: "GitHub's API puts its pagination in a `Link` response header instead of the body: `<https://api.github.com/…&page=2>; rel=\"next\", <https://api.github.com/…&page=5>; rel=\"last\"`. Write `parse_link_header(value)`: return a dictionary from each `rel` name to its URL.",
    spec: [
      ["Function", "`parse_link_header(value)`"],
      ["value", "the header text: entries separated by commas, each `<URL>` followed by `; key=\"value\"` parameters, one of them `rel`"],
      ["Returns", "`{rel: url}`; `{}` for an empty header; entries without a `rel` are ignored"],
    ],
    hiddenKinds: ["an empty header", "all four relations", "a URL that contains a comma", "extra parameters and spacing", "an entry without rel"],
    hints: [
      "Each entry starts with `<`. Splitting on every comma is risky: a URL may contain one.",
      "The URL is the text between `<` and `>`; the parameters follow, separated by `;`.",
      "A regular expression such as `<([^>]*)>([^<]*)` finds each URL with its parameter text; then look for `rel=\"…\"` in that text.",
    ],
    explanation: "Each entry is a URL in angle brackets followed by parameters. Matching `<…>` and the text up to the next `<` keeps commas inside a URL from splitting it, which a plain `split(\",\")` would do. Within the parameter text, `rel=\"next\"` names the relation. Real clients loop on `links.get(\"next\")` until it disappears, which is exactly what the integration question in this module does.",
    code: {
      starter: src`
import re

def parse_link_header(value):
    return {}

header = '<https://api.github.com/repos/tidewater/smartqueue/issues?page=2>; rel="next", <https://api.github.com/repos/tidewater/smartqueue/issues?page=5>; rel="last"'
print(parse_link_header(header))
`,
      answer: src`
import re

def parse_link_header(value):
    links = {}
    for url, params in re.findall(r"<([^>]*)>([^<]*)", value):
        rel = re.search(r'rel="([^"]*)"', params)
        if rel:
            links[rel.group(1)] = url
    return links

header = '<https://api.github.com/repos/tidewater/smartqueue/issues?page=2>; rel="next", <https://api.github.com/repos/tidewater/smartqueue/issues?page=5>; rel="last"'
print(parse_link_header(header))
`,
      alternatives: [
        src`
def parse_link_header(value):
    links = {}
    rest = value
    while "<" in rest:
        start = rest.index("<")
        end = rest.index(">", start)
        url = rest[start + 1:end]
        after = rest[end + 1:]
        nxt = after.find("<")
        params = after if nxt == -1 else after[:nxt]
        for part in params.split(";"):
            part = part.strip().rstrip(",").strip()
            if part.startswith("rel="):
                links[part[4:].strip('"')] = url
        rest = after if nxt == -1 else after[nxt:]
    return links
`,
      ],
      wrong: [
        {
          code: src`
def parse_link_header(value):
    links = {}
    for entry in value.split(","):
        if not entry.strip():
            continue
        url_part, rel_part = entry.split(";")[:2]
        links[rel_part.strip()[5:-1]] = url_part.strip()[1:-1]
    return links
`,
          fails: ["returns"],
          why: "splitting on commas breaks a URL that contains one, and extra parameters move `rel` out of second place",
        },
        {
          code: src`
import re

def parse_link_header(value):
    links = {}
    for url, params in re.findall(r"<([^>]*)>([^<]*)", value):
        links[params.strip(' ;,')] = url
    return links
`,
          fails: ["returns"],
          why: "the key is the whole parameter text, `rel=\"next\"`, not the relation name",
        },
      ],
      task: {
        checks: [
          fn("returns", "parse_link_header", [
            example([link([["next", 2], ["last", 5]])], { next: ghPage(2), last: ghPage(5) }),
            example([link([["prev", 4], ["first", 1]])], { prev: ghPage(4), first: ghPage(1) }),
            example([`<${ghPage(3)}>; rel="next"`], { next: ghPage(3) }),
            hiddenCase("an empty header", [""], {}),
            hiddenCase("all four relations", [link([["prev", 2], ["next", 4], ["last", 9], ["first", 1]])], { prev: ghPage(2), next: ghPage(4), last: ghPage(9), first: ghPage(1) }),
            hiddenCase("a URL that contains a comma", ['<https://api.example.org/items?fields=id,title&page=2>; rel="next"'], { next: "https://api.example.org/items?fields=id,title&page=2" }),
            hiddenCase("extra parameters and spacing", ['<https://api.example.org/p?page=7> ;  title="Page 7";rel="next" ,<https://api.example.org/p?page=1>; rel="first"'], { next: "https://api.example.org/p?page=7", first: "https://api.example.org/p?page=1" }),
            hiddenCase("an entry without rel", ['<https://api.example.org/schema.json>; type="application/json", <https://api.example.org/p?page=2>; rel="next"'], { next: "https://api.example.org/p?page=2" }),
          ], { label: "parse_link_header() maps each rel to its URL" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-10 validation, easy
  {
    id: "PY-Q31-10",
    version: 2,
    slug: "validate-geojson-feature",
    title: "Validate an earthquake feature",
    format: "validation",
    difficulty: "easy",
    minutes: 12,
    requires: ["all-call", "assignment", "comparison", "dict-get", "dict-literal", "else-clause", "function-def", "function-param", "function-return", "identity", "if-statement", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "none-value", "print-call", "string-index", "top-level-indent", "tuple-unpack", "type-call"],
    prompt: "Before storing earthquakes from the USGS feed, an importer checks each GeoJSON feature, because a mirror once sent damaged data. Write `feature_problems(feature)`: return a list of problems, in the order of the rules below, or `[]` for a good feature.",
    spec: [
      ["Function", "`feature_problems(feature)`"],
      ["Rule 1", "`id` missing or empty → `\"missing id\"`"],
      ["Rule 2", "`properties.mag` isn't an int or float → `\"mag is not a number\"` (`True`/`False` don't count as numbers)"],
      ["Rule 3", "`geometry.coordinates` isn't a list of exactly 3 numbers → `\"bad coordinates\"`; otherwise longitude outside −180…180 → `\"longitude out of range\"`, latitude outside −90…90 → `\"latitude out of range\"`"],
      ["Missing parts", "a missing `properties` or `geometry` counts as empty, so its rules fail"],
    ],
    hiddenKinds: ["a magnitude sent as text", "a boolean magnitude", "two coordinates instead of three", "latitude out of range", "no geometry at all", "boundary coordinates"],
    hints: [
      "Read nested values with `get` and an empty dictionary as the default, so a missing part doesn't crash.",
      "A bool is an int in Python, so test for it before accepting a number.",
      "Only check the ranges once you know there are three numbers.",
    ],
    explanation: "Each rule reads its value with `get`, so a missing `properties` or `geometry` turns into a reported problem instead of a KeyError. `isinstance(x, (int, float))` accepts both kinds of number, but `isinstance(True, int)` is true, so booleans need their own test. Range checks come only after the coordinates are known to be three numbers, otherwise comparing text or None would crash. Common bugs: treating `\"5.5\"` as a number, and comparing coordinates before checking their shape.",
    code: {
      starter: src`
def feature_problems(feature):
    return []

feature = {"id": "us6000pgsd", "properties": {"mag": "5.5"}, "geometry": {"coordinates": [169.3819, -20.9273]}}
print(feature_problems(feature))
`,
      answer: src`
def is_number(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool)

def feature_problems(feature):
    problems = []
    if not feature.get("id"):
        problems.append("missing id")
    if not is_number(feature.get("properties", {}).get("mag")):
        problems.append("mag is not a number")
    coords = feature.get("geometry", {}).get("coordinates")
    if not isinstance(coords, list) or len(coords) != 3 or not all([is_number(c) for c in coords]):
        problems.append("bad coordinates")
    else:
        longitude, latitude, depth = coords
        if not -180 <= longitude <= 180:
            problems.append("longitude out of range")
        if not -90 <= latitude <= 90:
            problems.append("latitude out of range")
    return problems

feature = {"id": "us6000pgsd", "properties": {"mag": "5.5"}, "geometry": {"coordinates": [169.3819, -20.9273]}}
print(feature_problems(feature))
`,
      alternatives: [
        src`
def feature_problems(feature):
    def number(x):
        return type(x) in (int, float)
    found = []
    if feature.get("id") in (None, ""):
        found.append("missing id")
    props = feature.get("properties") or {}
    if not number(props.get("mag")):
        found.append("mag is not a number")
    geometry = feature.get("geometry") or {}
    c = geometry.get("coordinates")
    if type(c) is not list or len(c) != 3 or not number(c[0]) or not number(c[1]) or not number(c[2]):
        found.append("bad coordinates")
        return found
    if c[0] < -180 or c[0] > 180:
        found.append("longitude out of range")
    if c[1] < -90 or c[1] > 90:
        found.append("latitude out of range")
    return found
`,
      ],
      wrong: [
        {
          code: src`
def feature_problems(feature):
    problems = []
    if not feature.get("id"):
        problems.append("missing id")
    if not isinstance(feature.get("properties", {}).get("mag"), (int, float)):
        problems.append("mag is not a number")
    coords = feature.get("geometry", {}).get("coordinates")
    if not isinstance(coords, list) or len(coords) != 3:
        problems.append("bad coordinates")
    else:
        if not -180 <= coords[0] <= 180:
            problems.append("longitude out of range")
        if not -90 <= coords[1] <= 90:
            problems.append("latitude out of range")
    return problems
`,
          fails: ["returns"],
          why: "`True` passes as a magnitude, because a bool is an int",
        },
        {
          code: src`
def feature_problems(feature):
    problems = []
    if not feature.get("id"):
        problems.append("missing id")
    mag = feature["properties"]["mag"]
    if not isinstance(mag, (int, float)) or isinstance(mag, bool):
        problems.append("mag is not a number")
    coords = feature["geometry"]["coordinates"]
    if len(coords) != 3:
        problems.append("bad coordinates")
    else:
        if not -180 <= coords[0] <= 180:
            problems.append("longitude out of range")
        if not -90 <= coords[1] <= 90:
            problems.append("latitude out of range")
    return problems
`,
          fails: ["returns"],
          why: "a feature without `geometry` crashes with KeyError instead of being reported",
        },
        {
          code: src`
def feature_problems(feature):
    problems = []
    if not feature.get("id"):
        problems.append("missing id")
    if type(feature.get("properties", {}).get("mag")) not in (int, float):
        problems.append("mag is not a number")
    coords = feature.get("geometry", {}).get("coordinates")
    if not isinstance(coords, list) or len(coords) != 3:
        problems.append("bad coordinates")
    else:
        if not -90 <= coords[0] <= 90:
            problems.append("longitude out of range")
        if not -180 <= coords[1] <= 180:
            problems.append("latitude out of range")
    return problems
`,
          fails: ["returns"],
          why: "the ranges are swapped: GeoJSON puts longitude first",
        },
      ],
      task: {
        checks: [
          fn("returns", "feature_problems", [
            example([vanuatu], []),
            example([{ id: "us6000pgsd", properties: { mag: "5.5" }, geometry: { coordinates: [169.3819, -20.9273] } }], ["mag is not a number", "bad coordinates"]),
            example([{ id: "", properties: { mag: 4.7 }, geometry: { coordinates: [151.6536, -3.8682, 10] } }], ["missing id"]),
            hiddenCase("a magnitude sent as text", [{ ...rabaul, properties: { ...rabaul.properties, mag: "4.7" } }], ["mag is not a number"]),
            hiddenCase("a boolean magnitude", [{ ...rabaul, properties: { ...rabaul.properties, mag: true } }], ["mag is not a number"]),
            hiddenCase("two coordinates instead of three", [{ ...sandwich, geometry: { type: "Point", coordinates: [-26.7059, -56.4095] } }], ["bad coordinates"]),
            hiddenCase("latitude out of range", [{ ...sandwich, geometry: { type: "Point", coordinates: [-26.7059, -156.4095, 70] } }], ["latitude out of range"]),
            hiddenCase("no geometry at all", [{ id: "us6000pjs0", properties: { mag: 3 } }], ["bad coordinates"]),
            hiddenCase("boundary coordinates", [{ id: "x1", properties: { mag: 2 }, geometry: { coordinates: [180, -90, 0] } }], []),
          ], { label: "feature_problems() reports each broken rule, in order" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-12 data transformation, medium
  {
    id: "PY-Q31-12",
    version: 2,
    slug: "flatten-geojson-quakes",
    title: "Flatten earthquakes for a spreadsheet",
    format: "data_transformation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comparison", "continue-statement", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "nested-dict", "print-call", "reassignment", "sort-key", "string-index", "string-method", "timedelta-call", "top-level-indent", "tuple-unpack"],
    prompt: "A dashboard wants the USGS GeoJSON as flat rows. Write `quake_rows(geojson)`: one dictionary per **earthquake** (skip other event types), sorted by time, with the time as UTC text and the coordinates split into named fields.",
    spec: [
      ["Function", "`quake_rows(geojson)`"],
      ["geojson", "a parsed USGS response: `{\"features\": [...]}`; `properties.time` is milliseconds since 1970-01-01 UTC"],
      ["Row", "`{\"id\", \"time\", \"mag\", \"place\", \"longitude\", \"latitude\", \"depth_km\"}`, with time like `\"2025-01-01T04:39:18Z\"` (whole seconds, UTC)"],
      ["Returns", "a new list of rows, oldest first; `[]` when there are no earthquakes"],
    ],
    hiddenKinds: ["features out of time order", "a mining explosion among the earthquakes", "a time with a fraction of a second", "no features"],
    hints: [
      "Turn milliseconds into a datetime with `datetime.fromtimestamp(ms / 1000, tz=timezone.utc)` (see Dates Numbers & Regex), then format it with `strftime`.",
      "The coordinates come as `[longitude, latitude, depth]`: unpack them into the three fields.",
      "Filter on `properties.type`, build the rows, then sort them by the original time number, not by the text.",
    ],
    explanation: "Each earthquake becomes one row. The time is milliseconds, so dividing by 1000 gives seconds for `fromtimestamp`, and `tz=timezone.utc` makes the result UTC instead of the computer's own zone. `%Y-%m-%dT%H:%M:%SZ` drops the fraction of a second. Sorting by the numeric time keeps the order right. Common bugs: forgetting `/ 1000` (a year far in the future), formatting local time instead of UTC, and swapping longitude and latitude.",
    code: {
      starter: src`
from datetime import datetime, timezone

def quake_rows(geojson):
    return []

geojson = {"features": [
    {"id": "us6000pgsd", "properties": {"mag": 5.5, "place": "153 km S of Isangel, Vanuatu", "time": 1735706358208, "type": "earthquake"},
     "geometry": {"coordinates": [169.3819, -20.9273, 22]}},
]}
print(quake_rows(geojson))
`,
      answer: src`
from datetime import datetime, timezone

def quake_rows(geojson):
    quakes = [f for f in geojson["features"] if f["properties"]["type"] == "earthquake"]
    quakes = sorted(quakes, key=lambda f: f["properties"]["time"])
    rows = []
    for feature in quakes:
        props = feature["properties"]
        longitude, latitude, depth = feature["geometry"]["coordinates"]
        moment = datetime.fromtimestamp(props["time"] / 1000, tz=timezone.utc)
        rows.append({
            "id": feature["id"],
            "time": moment.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "mag": props["mag"],
            "place": props["place"],
            "longitude": longitude,
            "latitude": latitude,
            "depth_km": depth,
        })
    return rows

geojson = {"features": [
    {"id": "us6000pgsd", "properties": {"mag": 5.5, "place": "153 km S of Isangel, Vanuatu", "time": 1735706358208, "type": "earthquake"},
     "geometry": {"coordinates": [169.3819, -20.9273, 22]}},
]}
print(quake_rows(geojson))
`,
      alternatives: [
        src`
from datetime import datetime, timedelta, timezone

EPOCH = datetime(1970, 1, 1, tzinfo=timezone.utc)

def quake_rows(geojson):
    rows = []
    for f in geojson["features"]:
        p = f["properties"]
        if p["type"] != "earthquake":
            continue
        c = f["geometry"]["coordinates"]
        when = EPOCH + timedelta(milliseconds=p["time"])
        rows.append((p["time"], {"id": f["id"], "time": when.isoformat(timespec="seconds").replace("+00:00", "Z"), "mag": p["mag"], "place": p["place"], "longitude": c[0], "latitude": c[1], "depth_km": c[2]}))
    rows.sort(key=lambda pair: pair[0])
    return [row for _, row in rows]
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime, timezone

def quake_rows(geojson):
    rows = []
    for feature in geojson["features"]:
        props = feature["properties"]
        if props["type"] != "earthquake":
            continue
        lon, lat, depth = feature["geometry"]["coordinates"]
        moment = datetime.fromtimestamp(props["time"], tz=timezone.utc)
        rows.append({"id": feature["id"], "time": moment.strftime("%Y-%m-%dT%H:%M:%SZ"), "mag": props["mag"], "place": props["place"], "longitude": lon, "latitude": lat, "depth_km": depth})
    return sorted(rows, key=lambda r: r["time"])
`,
          fails: ["returns"],
          why: "the time is in milliseconds; read as seconds it lands tens of thousands of years ahead, beyond what datetime can hold",
        },
        {
          code: src`
from datetime import datetime, timezone

def quake_rows(geojson):
    rows = []
    for feature in geojson["features"]:
        props = feature["properties"]
        lon, lat, depth = feature["geometry"]["coordinates"]
        moment = datetime.fromtimestamp(props["time"] / 1000, tz=timezone.utc)
        rows.append({"id": feature["id"], "time": moment.strftime("%Y-%m-%dT%H:%M:%SZ"), "mag": props["mag"], "place": props["place"], "longitude": lon, "latitude": lat, "depth_km": depth})
    return rows
`,
          fails: ["returns"],
          why: "blasts are kept, and the rows stay in the feed's order",
        },
        {
          code: src`
from datetime import datetime, timezone

def quake_rows(geojson):
    rows = []
    for feature in geojson["features"]:
        props = feature["properties"]
        if props["type"] != "earthquake":
            continue
        lat, lon, depth = feature["geometry"]["coordinates"]
        moment = datetime.fromtimestamp(props["time"] / 1000, tz=timezone.utc)
        rows.append({"id": feature["id"], "time": moment.strftime("%Y-%m-%dT%H:%M:%SZ"), "mag": props["mag"], "place": props["place"], "longitude": lon, "latitude": lat, "depth_km": depth})
    return sorted(rows, key=lambda r: r["time"])
`,
          fails: ["returns"],
          why: "latitude and longitude are swapped: GeoJSON lists longitude first",
        },
      ],
      task: {
        checks: [
          fn("returns", "quake_rows", [
            example([collection([vanuatu])], [{ id: "us6000pgsd", time: "2025-01-01T04:39:18Z", mag: 5.5, place: "153 km S of Isangel, Vanuatu", longitude: 169.3819, latitude: -20.9273, depth_km: 22 }]),
            example([collection([sandwich, rabaul])], [
              { id: "us6000pjqz", time: "2025-01-01T01:46:59Z", mag: 4.7, place: "67 km WNW of Rabaul, Papua New Guinea", longitude: 151.6536, latitude: -3.8682, depth_km: 10 },
              { id: "us6000pgv4", time: "2025-01-01T13:48:24Z", mag: 6.1, place: "South Sandwich Islands region", longitude: -26.7059, latitude: -56.4095, depth_km: 70 },
            ]),
            example([collection([])], []),
            hiddenCase("features out of time order", [collection([mandalay, argentina])], [
              { id: "us6000pgs2", time: "2025-01-01T03:56:39Z", mag: 4.9, place: "97 km WNW of El Aguilar, Argentina", longitude: -66.6081, latitude: -23.0291, depth_km: 208.974 },
              { id: "us7000pn9s", time: "2025-03-28T06:20:52Z", mag: 7.7, place: "2025 Mandalay, Burma (Myanmar) Earthquake", longitude: 95.9363, latitude: 22.011, depth_km: 10 },
            ]),
            hiddenCase("a mining explosion among the earthquakes", [collection([wright, vanuatu])], [{ id: "us6000pgsd", time: "2025-01-01T04:39:18Z", mag: 5.5, place: "153 km S of Isangel, Vanuatu", longitude: 169.3819, latitude: -20.9273, depth_km: 22 }]),
            hiddenCase("a time with a fraction of a second", [collection([quake("x9", 2.5, "test", 999, [0, 0, 1])])], [{ id: "x9", time: "1970-01-01T00:00:00Z", mag: 2.5, place: "test", longitude: 0, latitude: 0, depth_km: 1 }]),
          ], { label: "quake_rows() flattens, filters and sorts the earthquakes" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-13 debugging, medium
  {
    id: "PY-Q31-13",
    version: 2,
    slug: "body-read-twice",
    title: "The count that is always zero",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "dict-literal", "dict-lookup", "except-type", "file-open", "function-def", "function-param", "function-return", "http-get", "import-module", "json-loads", "len-call", "nested-dict", "package-import", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "try-except", "with-statement"],
    prompt: "`event_count(opener, url)` asks the USGS `count` endpoint how many events match. After someone added a line that logs the size of the response, the function returns 0 for every query, and nobody noticed because it never raises. Fix it so it returns the real count, and so a body that isn't JSON raises an error instead of quietly becoming 0.",
    spec: [
      ["Function", "`event_count(opener, url)`"],
      ["Returns", "the `count` from the JSON body"],
      ["Raises", "`json.JSONDecodeError` when the body isn't JSON (for example an HTML error page sent with status 200)"],
    ],
    hiddenKinds: ["a body that is an HTML page", "a count of zero"],
    hints: [
      "Print what the second `read()` returns. A response body is a stream: what happens when you read it again?",
      "Read the body once into a variable and use that variable for both the log line and the JSON.",
      "The `except` that returns 0 hid the first bug. Remove it so a body that isn't JSON raises.",
    ],
    explanation: "A response body can be read only once: the first `read()` returns all the bytes and the second returns `b\"\"`. `json.loads(b\"\")` raises `JSONDecodeError`, and the `except` turned that into 0 for every query. Reading once into a variable fixes the count; deleting the `except` makes a genuinely bad body (an HTML error page, a truncated response) fail loudly instead of becoming a plausible-looking zero.",
    code: {
      starter: src`
import json
from urllib.request import build_opener
from replay import Replay

def event_count(opener, url):
    try:
        with opener.open(url, timeout=10) as response:
            print("received", len(response.read()), "bytes")
            return json.loads(response.read())["count"]
    except json.JSONDecodeError:
        return 0

url = "https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&starttime=2025-01-01&endtime=2025-07-01&minmagnitude=6"
print(event_count(build_opener(Replay({url: (200, {"count": 87, "maxAllowed": 20000})})), url))
`,
      answer: src`
import json
from urllib.request import build_opener
from replay import Replay

def event_count(opener, url):
    with opener.open(url, timeout=10) as response:
        body = response.read()
    print("received", len(body), "bytes")
    return json.loads(body)["count"]

url = "https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&starttime=2025-01-01&endtime=2025-07-01&minmagnitude=6"
print(event_count(build_opener(Replay({url: (200, {"count": 87, "maxAllowed": 20000})})), url))
`,
      alternatives: [
        src`
import json

def event_count(opener, url):
    response = opener.open(url, timeout=10)
    data = json.load(response)
    response.close()
    return data["count"]
`,
      ],
      wrong: [
        {
          code: src`
import json

def event_count(opener, url):
    with opener.open(url, timeout=10) as response:
        print("received", len(response.read()), "bytes")
        return json.loads(response.read())["count"]
`,
          fails: ["returns", "seven", "zero"],
          why: "the error is no longer hidden, but the body is still read twice, so every call fails",
        },
        {
          code: src`
import json

def event_count(opener, url):
    try:
        with opener.open(url, timeout=10) as response:
            body = response.read()
        return json.loads(body)["count"]
    except json.JSONDecodeError:
        return 0
`,
          fails: ["html"],
          why: "the count is right now, but a broken body still turns into 0 without anyone knowing",
        },
      ],
      task: {
        files,
        checks: [
          http("returns", "event_count() returns the real count", { "https://e.test/count?minmagnitude=6": { body: { count: 87, maxAllowed: 20000 } } }, "event_count(_op, 'https://e.test/count?minmagnitude=6')", 87, { show: "event_count(opener, url)  # count 87" }),
          http("seven", "another query", { "https://e.test/count?minmagnitude=7": { body: { count: 7, maxAllowed: 20000 } } }, "event_count(_op, 'https://e.test/count?minmagnitude=7')", 7, { show: "event_count(opener, url)  # count 7" }),
          http("html", "a body that is an HTML page", { "https://e.test/count?x=1": { body: "<html><body>Service temporarily unavailable</body></html>", headers: { "Content-Type": "text/html" } } }, "event_count(_op, 'https://e.test/count?x=1')", null, { hidden: true, raises: "JSONDecodeError" }),
          http("zero", "a count of zero", { "https://e.test/count?minmagnitude=9.5": { body: { count: 0, maxAllowed: 20000 } } }, "event_count(_op, 'https://e.test/count?minmagnitude=9.5')", 0, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-16 function implementation, medium
  {
    id: "PY-Q31-16",
    version: 2,
    slug: "parse-retry-after",
    title: "How long does Retry-After say to wait?",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conditional-expr", "conversion", "except-type", "function-def", "function-param", "function-return", "if-statement", "import-module", "logical", "none-value", "package-import", "print-call", "print-several", "print-text", "string-check", "string-method", "top-level-indent", "truthiness", "try-except"],
    prompt: "HTTP allows two forms of the `Retry-After` header: a number of seconds (`\"120\"`) or a date (`\"Wed, 21 Oct 2026 07:28:00 GMT\"`). Write `retry_after_seconds(value, now)`: return how many seconds to wait from `now`, as a float, never less than 0. Return `None` for a value that is neither form.",
    spec: [
      ["Function", "`retry_after_seconds(value, now)`"],
      ["value", "the header text, possibly with spaces around it"],
      ["now", "the current time as ISO text with a zone, e.g. `\"2026-10-21T07:26:30+00:00\"`"],
      ["Returns", "seconds as a float (`120.0`, `90.0`), `0.0` for a date in the past, `None` for anything else (including negative numbers)"],
    ],
    hiddenKinds: ["a date in the past", "spaces around the value", "a negative number", "a decimal number", "a date in another day", "an empty value"],
    hints: [
      "Try the simple form first: is the stripped text made only of digits?",
      "`email.utils.parsedate_to_datetime` reads the HTTP date form and raises ValueError (or TypeError) for text it can't read; `datetime.fromisoformat` reads `now`.",
      "Subtract the two datetimes, take `total_seconds()`, and don't go below zero.",
    ],
    explanation: "The seconds form is only digits (HTTP doesn't allow a sign or a decimal point), so `isdigit` separates it cleanly. The date form is the same format as email dates, which `email.utils.parsedate_to_datetime` parses into an aware datetime; subtracting `now` gives a timedelta. A date that has already passed means \"retry now\", so the result is clamped at 0. Anything else returns None, so the caller can fall back to its own backoff.",
    code: {
      starter: src`
from datetime import datetime
from email.utils import parsedate_to_datetime

def retry_after_seconds(value, now):
    return None

now = "2026-10-21T07:26:30+00:00"
print(retry_after_seconds("120", now))
print(retry_after_seconds("Wed, 21 Oct 2026 07:28:00 GMT", now))
`,
      answer: src`
from datetime import datetime
from email.utils import parsedate_to_datetime

def retry_after_seconds(value, now):
    text = value.strip()
    if text.isdigit():
        return float(text)
    try:
        when = parsedate_to_datetime(text)
    except (TypeError, ValueError):
        return None
    wait = (when - datetime.fromisoformat(now)).total_seconds()
    return max(wait, 0.0)

now = "2026-10-21T07:26:30+00:00"
print(retry_after_seconds("120", now))
print(retry_after_seconds("Wed, 21 Oct 2026 07:28:00 GMT", now))
`,
      alternatives: [
        src`
import re
from datetime import datetime
from email.utils import parsedate_to_datetime

def retry_after_seconds(value, now):
    value = value.strip()
    if re.fullmatch(r"\d+", value):
        return int(value) * 1.0
    if not value:
        return None
    try:
        delta = parsedate_to_datetime(value) - datetime.fromisoformat(now)
    except Exception:
        return None
    seconds = delta.total_seconds()
    return seconds if seconds > 0 else 0.0
`,
      ],
      wrong: [
        {
          code: src`
from datetime import datetime
from email.utils import parsedate_to_datetime

def retry_after_seconds(value, now):
    try:
        return float(value)
    except ValueError:
        pass
    try:
        when = parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    return max((when - datetime.fromisoformat(now)).total_seconds(), 0.0)
`,
          fails: ["returns"],
          why: "`float` accepts `-5` and `1.5`, which aren't valid Retry-After values",
        },
        {
          code: src`
from datetime import datetime
from email.utils import parsedate_to_datetime

def retry_after_seconds(value, now):
    text = value.strip()
    if text.isdigit():
        return float(text)
    try:
        when = parsedate_to_datetime(text)
    except (TypeError, ValueError):
        return None
    return (when - datetime.fromisoformat(now)).total_seconds()
`,
          fails: ["returns"],
          why: "a date in the past gives a negative wait instead of 0",
        },
        {
          code: src`
def retry_after_seconds(value, now):
    text = value.strip()
    if text.isdigit():
        return float(text)
    return None
`,
          fails: ["returns"],
          why: "the date form is never read",
        },
      ],
      task: {
        checks: [
          fn("returns", "retry_after_seconds", [
            example(["120", "2026-10-21T07:26:30+00:00"], py.float(120)),
            example(["Wed, 21 Oct 2026 07:28:00 GMT", "2026-10-21T07:26:30+00:00"], py.float(90)),
            example(["soon", "2026-10-21T07:26:30+00:00"], null),
            hiddenCase("a date in the past", ["Wed, 21 Oct 2026 07:00:00 GMT", "2026-10-21T07:26:30+00:00"], py.float(0)),
            hiddenCase("spaces around the value", ["  30 ", "2026-10-21T07:26:30+00:00"], py.float(30)),
            hiddenCase("a negative number", ["-5", "2026-10-21T07:26:30+00:00"], null),
            hiddenCase("a decimal number", ["1.5", "2026-10-21T07:26:30+00:00"], null),
            hiddenCase("a date in another day", ["Thu, 22 Oct 2026 00:00:00 GMT", "2026-10-21T23:59:00+00:00"], py.float(60)),
            hiddenCase("an empty value", ["", "2026-10-21T07:26:30+00:00"], null),
          ], { label: "retry_after_seconds() reads both forms of Retry-After" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-19 testing, medium
  {
    id: "PY-Q31-19",
    version: 2,
    slug: "tests-for-backoff-delays",
    title: "Tests for backoff delays",
    format: "testing",
    difficulty: "medium",
    minutes: 14,
    requires: ["assert-stmt", "class-def", "comment", "comment-out", "comparison", "function-def", "import-module", "len-call", "list-literal", "test-func", "top-level-indent", "unittest-case"],
    prompt: "`backoff.py` has `backoff_delays(attempts, base, cap)`, which a retry loop uses: the waits before each retry are `base`, `2·base`, `4·base`, …, one fewer than the number of attempts, and none longer than `cap`. Write unittest tests that pass on the real function and catch the usual mistakes in it.",
    spec: [
      ["Write", "a `unittest.TestCase` class (or top-level `test_` functions with `assert`) that calls `backoff_delays`"],
      ["Rules", "`backoff_delays(4, 1, 30)` → `[1, 2, 4]`; `backoff_delays(6, 5, 30)` → `[5, 10, 20, 30, 30]`; one attempt → `[]`"],
      ["Graded", "your tests run against the real function and against several broken versions; don't call them yourself"],
    ],
    hiddenKinds: ["a version without the cap", "a version with one wait too many", "a version that starts at twice the base", "a version that uses the cap as a minimum"],
    hints: [
      "For each rule, picture a version that breaks only that rule, and find an input where it gives a different answer.",
      "The cap only shows with enough attempts for the waits to grow past it.",
      "Check the length of the result and its first item as well as the large values.",
    ],
    explanation: "Each defect only shows on certain inputs. A missing cap needs enough attempts to grow past it. An off-by-one in the count needs a check of the length (or of a one-attempt call). Starting at `2·base` shows in the first item. Using `max` instead of `min` makes even the first wait equal to the cap. A table of a few well-chosen calls with exact expected lists catches all of them.",
    code: {
      starter: src`
import unittest
from backoff import backoff_delays

class BackoffTests(unittest.TestCase):
    def test_returns_a_list(self):
        self.assertIsInstance(backoff_delays(3, 1, 30), list)

# Add tests that would fail on a broken backoff_delays(). Check runs them for you.
`,
      answer: src`
import unittest
from backoff import backoff_delays

class BackoffTests(unittest.TestCase):
    def test_doubles_from_base(self):
        self.assertEqual(backoff_delays(4, 1, 30), [1, 2, 4])

    def test_cap(self):
        self.assertEqual(backoff_delays(6, 5, 30), [5, 10, 20, 30, 30])

    def test_one_attempt_never_waits(self):
        self.assertEqual(backoff_delays(1, 2, 30), [])
`,
      alternatives: [
        src`
from backoff import backoff_delays

def test_table():
    assert backoff_delays(3, 2, 100) == [2, 4]
    assert backoff_delays(5, 10, 25) == [10, 20, 25, 25]
    assert len(backoff_delays(7, 1, 60)) == 6
`,
      ],
      wrong: [
        {
          code: src`
import unittest
from backoff import backoff_delays

class BackoffTests(unittest.TestCase):
    def test_small(self):
        self.assertEqual(backoff_delays(3, 1, 30), [1, 2])
`,
          fails: ["tests-1"],
          why: "the waits never get near the cap, so a version without the cap passes",
        },
        {
          code: src`
import unittest
from backoff import backoff_delays

class BackoffTests(unittest.TestCase):
    def test_cap(self):
        self.assertEqual(backoff_delays(6, 5, 30), [5, 10, 20, 40, 30])
`,
          fails: ["tests-correct"],
          why: "the expected list is wrong (40 is over the cap), so the test fails on the real function",
        },
      ],
      task: {
        files: { "backoff.py": BACKOFF_PY },
        checks: hideDefects(learnerTests("tests", {
          target: "backoff_delays",
          correct: BACKOFF_PY,
          defects: [
            { label: "a version without the cap", code: BACKOFF_PY.replace("min(cap, base * 2 ** retry)", "base * 2 ** retry") },
            { label: "a version with one wait too many", code: BACKOFF_PY.replace("range(attempts - 1)", "range(attempts)") },
            { label: "a version that starts at twice the base", code: BACKOFF_PY.replace("base * 2 ** retry", "base * 2 ** (retry + 1)") },
            { label: "a version that uses the cap as a minimum", code: BACKOFF_PY.replace("min(cap,", "max(cap,") },
          ],
        })),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-20 integration, hard
  {
    id: "PY-Q31-20",
    version: 2,
    slug: "follow-link-pagination",
    title: "Every open issue, following Link headers",
    format: "integration",
    difficulty: "hard",
    minutes: 22,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "dict-get", "dict-literal", "dict-lookup", "file-open", "for-loop", "function-def", "function-default", "function-param", "function-return", "http-get", "identity", "if-statement", "import-module", "json-loads", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "nested-loop", "none-value", "package-import", "print-call", "raise-stmt", "regex-call", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "tuple-unpack", "while-loop", "with-statement"],
    prompt: "A maintainers' dashboard lists every open issue of a repository from GitHub's API, which pages with `Link` headers. Write `all_issue_titles(opener, url, max_pages=20)`: request `url`, keep the titles from the JSON list in the body, and follow the header's `rel=\"next\"` URL until there is none. Protect the dashboard: raise `RuntimeError` if a `next` link points back to a page already fetched, or if more than `max_pages` pages would be needed.",
    spec: [
      ["Function", "`all_issue_titles(opener, url, max_pages=20)`"],
      ["Each page", "a JSON list of issues (`{\"number\", \"title\"}`); the `Link` header (if any) may have `rel=\"next\"`"],
      ["Returns", "every title in order"],
      ["Raises", "`RuntimeError` for a `next` URL that was already fetched, or when page `max_pages + 1` would be requested"],
    ],
    hiddenKinds: ["two pages", "a next link that loops back", "more pages than allowed", "a page with no Link header", "a Link header with only prev and first"],
    hints: [
      "Loop: fetch, keep the titles, then read `response.headers.get(\"Link\")` and find the `next` URL (the Link-header parsing from this module's practice is one way).",
      "Keep a list of the URLs already fetched; a `next` URL in that list means the API is going round in circles.",
      "Count pages as you fetch them and stop with an error before the request that would exceed the limit.",
    ],
    explanation: "Link-header pagination puts the next URL in a response header, so the loop has to read headers as well as the body. Two guards make the loop safe against a misbehaving API or proxy: a record of URLs already fetched catches a cycle immediately, and a page limit catches a walk that never ends. Without them a dashboard can hang or hammer the API.",
    code: {
      starter: src`
import json
import re
from urllib.request import build_opener
from replay import Replay

def all_issue_titles(opener, url, max_pages=20):
    return []

first = "https://api.github.com/repos/tidewater/smartqueue/issues?state=open&per_page=2"
second = first + "&page=2"
saved = {
    first: {"body": [{"number": 412, "title": "Parser drops trailing zeros"}, {"number": 409, "title": "Add --dry-run"}],
            "headers": {"Link": f'<{second}>; rel="next", <{second}>; rel="last"'}},
    second: {"body": [{"number": 377, "title": "Docs: config example is wrong"}],
             "headers": {"Link": f'<{first}>; rel="prev", <{first}>; rel="first"'}},
}
print(all_issue_titles(build_opener(Replay(saved)), first))
`,
      answer: src`
import json
import re
from urllib.request import build_opener
from replay import Replay

def next_link(header):
    for target, params in re.findall(r"<([^>]*)>([^<]*)", header or ""):
        if re.search(r'rel="next"', params):
            return target
    return None

def all_issue_titles(opener, url, max_pages=20):
    titles = []
    fetched = []
    while url is not None:
        if url in fetched:
            raise RuntimeError(f"pagination loops back to {url}")
        if len(fetched) == max_pages:
            raise RuntimeError(f"more than {max_pages} pages")
        fetched.append(url)
        with opener.open(url, timeout=10) as response:
            issues = json.loads(response.read())
            link = response.headers.get("Link")
        titles.extend([issue["title"] for issue in issues])
        url = next_link(link)
    return titles

first = "https://api.github.com/repos/tidewater/smartqueue/issues?state=open&per_page=2"
second = first + "&page=2"
saved = {
    first: {"body": [{"number": 412, "title": "Parser drops trailing zeros"}, {"number": 409, "title": "Add --dry-run"}],
            "headers": {"Link": f'<{second}>; rel="next", <{second}>; rel="last"'}},
    second: {"body": [{"number": 377, "title": "Docs: config example is wrong"}],
             "headers": {"Link": f'<{first}>; rel="prev", <{first}>; rel="first"'}},
}
print(all_issue_titles(build_opener(Replay(saved)), first))
`,
      alternatives: [
        src`
import json

def links_in(header):
    found = {}
    if not header:
        return found
    for part in header.split(", <"):
        url_part, _, params = part.partition(">")
        for p in params.split(";"):
            p = p.strip()
            if p.startswith("rel="):
                found[p[4:].strip('"')] = url_part.lstrip("<")
    return found

def all_issue_titles(opener, url, max_pages=20):
    seen = {}
    titles = []
    pages = 0
    while url:
        if url in seen:
            raise RuntimeError("loop")
        pages += 1
        if pages > max_pages:
            raise RuntimeError("too many pages")
        seen[url] = True
        response = opener.open(url, timeout=10)
        titles += [i["title"] for i in json.loads(response.read())]
        url = links_in(response.headers.get("Link")).get("next")
    return titles
`,
      ],
      wrong: [
        {
          code: src`
import json
import re

def all_issue_titles(opener, url, max_pages=20):
    titles = []
    fetched = []
    while url is not None:
        if url in fetched:
            raise RuntimeError("loop")
        fetched.append(url)
        with opener.open(url, timeout=10) as response:
            titles.extend([issue["title"] for issue in json.loads(response.read())])
            link = response.headers.get("Link") or ""
        match = re.search(r'<([^>]*)>; rel="next"', link)
        url = match.group(1) if match else None
    return titles
`,
          fails: ["limit"],
          why: "it catches a loop, but nothing stops a walk through too many pages",
        },
        {
          code: src`
import json
import re

def all_issue_titles(opener, url, max_pages=20):
    titles = []
    fetched = []
    while url is not None and len(fetched) < max_pages:
        if url in fetched:
            raise RuntimeError("loop")
        fetched.append(url)
        with opener.open(url, timeout=10) as response:
            titles.extend([issue["title"] for issue in json.loads(response.read())])
            link = response.headers.get("Link") or ""
        match = re.search(r'<([^>]*)>; rel="next"', link)
        url = match.group(1) if match else None
    return titles
`,
          fails: ["limit"],
          why: "at the page limit it returns a partial list silently instead of raising",
        },
        {
          code: src`
import json
import re

def all_issue_titles(opener, url, max_pages=20):
    titles = []
    fetched = []
    while url is not None:
        if url in fetched:
            raise RuntimeError("loop")
        if len(fetched) == max_pages:
            raise RuntimeError("too many pages")
        fetched.append(url)
        with opener.open(url, timeout=10) as response:
            titles.extend([issue["title"] for issue in json.loads(response.read())])
            link = response.headers.get("Link") or ""
        match = re.search(r'<([^>]*)>; rel="last"', link)
        url = match.group(1) if match else None
    return titles
`,
          fails: ["returns", "loop", "limit"],
          why: "it follows `last` instead of `next`, skipping every page in between",
        },
      ],
      task: {
        files,
        checks: [
          http("two", "two pages of issues", {
            [ghPage(1)]: { body: [issue(412, "Parser drops trailing zeros"), issue(409, "Add --dry-run")], headers: { Link: link([["next", 2], ["last", 2]]) } },
            [ghPage(2)]: { body: [issue(377, "Docs: config example is wrong")], headers: { Link: link([["prev", 1], ["first", 1]]) } },
          }, `all_issue_titles(_op, ${pyLit(ghPage(1))})`, ["Parser drops trailing zeros", "Add --dry-run", "Docs: config example is wrong"], { hidden: true }),
          http("returns", "three pages of issues", {
            [ghPage(1)]: { body: [issue(9, "a"), issue(8, "b")], headers: { Link: link([["next", 2], ["last", 3]]) } },
            [ghPage(2)]: { body: [issue(7, "c"), issue(6, "d")], headers: { Link: link([["prev", 1], ["next", 3], ["last", 3], ["first", 1]]) } },
            [ghPage(3)]: { body: [issue(5, "e")], headers: { Link: link([["prev", 2], ["first", 1]]) } },
          }, `all_issue_titles(_op, ${pyLit(ghPage(1))})`, ["a", "b", "c", "d", "e"], { show: "all_issue_titles(opener, first_page_url)  # three pages" }),
          http("loop", "a next link that loops back", {
            [ghPage(1)]: { body: [issue(1, "x")], headers: { Link: link([["next", 2]]) } },
            [ghPage(2)]: { body: [issue(2, "y")], headers: { Link: link([["next", 1]]) } },
          }, `all_issue_titles(_op, ${pyLit(ghPage(1))})`, null, { hidden: true, raises: "RuntimeError" }),
          {
            kind: "expr",
            id: "limit",
            label: "more pages than allowed",
            hidden: true,
            expr: `${replaySetup({})}\nfor _n in range(1, 40):\n    _rp.saved[${pyLit(GH)} + '&page=' + str(_n)] = {'body': [{'number': _n, 'title': 't' + str(_n)}], 'headers': {'Link': '<' + ${pyLit(GH)} + '&page=' + str(_n + 1) + '>; rel="next"'}}\nall_issue_titles(_op, ${pyLit(ghPage(1))}, max_pages=5)`,
            raises: "RuntimeError",
          },
          http("no-next", "a page with no Link header", { [ghPage(1)]: { body: [issue(3, "Only issue")] } }, `all_issue_titles(_op, ${pyLit(ghPage(1))})`, ["Only issue"], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q31-22 output prediction, hard
  {
    id: "PY-Q31-22",
    version: 2,
    slug: "predict-http-errors",
    title: "Predict: statuses, errors and encodings",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 10,
    requires: ["assignment", "boolean", "dict-literal", "exc-name", "except-type", "for-loop", "http-get", "import-module", "list-literal", "membership", "none-value", "package-import", "print-call", "print-several", "print-text", "raise-stmt", "response-body", "top-level-indent", "try-except", "type-call"],
    prompt: "This program builds a request and handles two failures. Predict exactly what it prints.",
    spec: [
      ["Watch", "how `urlencode` treats a list, which `except` clause catches each error, and what `err.reason` is"],
    ],
    hiddenKinds: [],
    hints: [
      "Without `doseq`, `urlencode` encodes the list as the text of the whole list; the brackets, quotes, comma and space are all encoded.",
      "An HTTPError is a URLError, and Python uses the first matching `except` clause in order.",
      "For an HTTPError, `reason` is the status text; for a URLError wrapping a timeout, it is the TimeoutError itself.",
    ],
    explanation: "`urlencode({\"type\": [\"article\", \"preprint\"]})` without `doseq=True` encodes `str([...])`, so the brackets and quotes appear percent-encoded. In the loop, the 404 is an `HTTPError`, caught by the first clause, which prints its code and reason. The timeout is a plain `URLError`: the first clause doesn't match it, the second does, and its `reason` is the `TimeoutError` object whose text is `timed out`.",
    predict: {
      program: src`
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode

print(urlencode({"type": ["article", "preprint"], "page": 1}))
print(urlencode({"type": ["article", "preprint"], "page": 1}, doseq=True))

errors = [
    HTTPError("https://api.openalex.org/works/W0", 404, "Not Found", None, None),
    URLError(TimeoutError("timed out")),
]
for err in errors:
    try:
        raise err
    except HTTPError as e:
        print("HTTP", e.code, e.reason)
    except URLError as e:
        print("network:", type(e.reason).__name__, e.reason)
`,
      output: "type=%5B%27article%27%2C+%27preprint%27%5D&page=1\ntype=article&type=preprint&page=1\nHTTP 404 Not Found\nnetwork: TimeoutError timed out\n",
      wrongPredictions: [
        "type=article&type=preprint&page=1\ntype=article&type=preprint&page=1\nHTTP 404 Not Found\nnetwork: TimeoutError timed out\n",
        "type=%5B%27article%27%2C+%27preprint%27%5D&page=1\ntype=article&type=preprint&page=1\nnetwork: str Not Found\nnetwork: TimeoutError timed out\n",
        "type=%5B%27article%27%2C+%27preprint%27%5D&page=1\ntype=article%2Cpreprint&page=1\nHTTP 404 Not Found\nnetwork: TimeoutError timed out\n",
      ],
    },
  },
];
