/**
 * M31 HTTP & API clients: five lessons (PY-L31-01 … PY-L31-05).
 *
 * Every request goes through Python's real HTTP client API, urllib.request: Request objects with an encoded query
 * string and headers, an opener, `timeout=`, responses with a status, headers and a body of bytes, HTTPError for
 * 4xx/5xx and URLError for timeouts and refused connections. A web page's Python can't open network connections, so
 * the opener is built with a replay handler (a urllib BaseHandler) that answers from saved copies of real responses:
 * USGS earthquake GeoJSON (D08) and OpenAlex works (D10), trimmed to the fields used. Lessons say so in the first
 * lesson and show the handler; on a computer the same code runs with `build_opener()` or `urlopen` and no replay.
 * Exercises import the same handler from replay.py (src/content/python-v2/m31-replay.ts) and are graded by calling
 * the learner's functions with openers over other saved responses: errors, timeouts, extra pages, odd encodings.
 * Version 2: rewritten; the old lessons printed a hardcoded result in an `except RuntimeError` branch.
 */
import type { PyLesson } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, pv } from "../checks";
import { py } from "@/engine/python/values";
import { REPLAY_PY, collection, pyLit, quake, replaySetup, usgsQuery, work } from "../m31-replay";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** An expr check that calls the learner's code with an opener over `saved` (and anything set up before `call`). */
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
const files = { "replay.py": REPLAY_PY };

// The short replay handler the examples define inline (the exercises import the fuller one from replay.py).
const REPLAY_HEAD = src`
import io
import json
from email.message import Message
from http import HTTPStatus
from urllib.request import BaseHandler, Request, build_opener
from urllib.response import addinfourl

class Replay(BaseHandler):
    """Answers https requests from saved copies of real API responses."""
    handler_order = 100

    def __init__(self, saved):
        self.saved = saved

    def https_open(self, request):
        status, body = self.saved.get(request.full_url, (404, {"error": "Not Found"}))
        headers = Message()
        headers["Content-Type"] = "application/json"
        response = addinfourl(io.BytesIO(json.dumps(body).encode()), headers, request.full_url, status)
        response.msg = HTTPStatus(status).phrase
        return response
`;

// ---------------------------------------------------------------- fixtures (real USGS events and OpenAlex works)

const vanuatu = quake("us6000pgsd", 5.5, "153 km S of Isangel, Vanuatu", 1735706358208, [169.3819, -20.9273, 22]);
const argentina = quake("us6000pgs2", 4.9, "97 km WNW of El Aguilar, Argentina", 1735703799832, [-66.6081, -23.0291, 208.974]);
const rabaul = quake("us6000pjqz", 4.7, "67 km WNW of Rabaul, Papua New Guinea", 1735696019538, [151.6536, -3.8682, 10]);
const sandwich = quake("us6000pgv4", 6.1, "South Sandwich Islands region", 1735739304752, [-26.7059, -56.4095, 70]);
const easter = quake("us6000pgx1", 5.3, "southeast of Easter Island", 1735756071182, [-100.6636, -36.1244, 10]);
const wright = quake("us6000pjs0", 3, "24 km SSE of Wright, Wyoming", 1735765620655, [-105.3661, 43.5491, 0], "mining explosion");
const mandalay = quake("us7000pn9s", 7.7, "2025 Mandalay, Burma (Myanmar) Earthquake", 1743142852715, [95.9363, 22.011, 10]);
const tibet = quake("us6000pi9w", 7.1, "2025 Southern Tibetan Plateau Earthquake", 1736211916734, [87.3781, 28.6036, 10]);
const cayman = quake("us7000pcdl", 7.6, "210 km SSW of George Town, Cayman Islands", 1739056994697, [-82.395, 17.6506, 14.326]);

const scipy = work("W3003257820", "SciPy 1.0: fundamental algorithms for scientific computing in Python", 2020, 38040);
const pytorch = work("W2970971581", "PyTorch: An Imperative Style, High-Performance Deep Learning Library", 2019, 31488, "preprint");
const numpy = work("W3035965352", "Array programming with NumPy", 2020, 23538);
const numpy2 = work("W3099878876", "Array programming with NumPy", 2020, 17093);
const ddpm = work("W3036167779", "Denoising Diffusion Probabilistic Models", 2020, 8702, "preprint");
const psychopy = work("W2913606428", "PsychoPy2: Experiments in behavior made easy", 2019, 5179);
const pymoo = work("W3021613070", "Pymoo: Multi-Objective Optimization in Python", 2020, 2362);
const deepxde = work("W2957969499", "DeepXDE: A Deep Learning Library for Solving Differential Equations", 2021, 2527);

const DAY1 = "format=geojson&starttime=2025-01-01&endtime=2025-01-02&minmagnitude=4.5";
const OA = "https://api.openalex.org/works";

export const m31Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L31-01 HTTP requests
  {
    id: "PY-L31-01",
    version: 2,
    slug: "http-requests",
    title: "HTTP requests: build a request, read the response",
    lede: "A program asks a web API for data by sending an HTTP request: a method, a URL with a query string, and headers. The answer has a status code, headers and a body of bytes. urllib.request, part of Python, does both halves.",
    focus: "Build a request with an encoded query string and headers, send it through an opener with a timeout, and read the status, headers and body.",
    minutes: 20,
    objectives: [
      "Name the parts of a request (method, URL, query string, headers) and of a response (status, headers, body)",
      "Build a query string with `urlencode` and a `Request` with headers",
      "Open a request with a timeout and read `status`, `headers` and the body as bytes",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "dict-get", "dict-literal", "dict-lookup", "encoding-arg", "exc-name", "file-open", "finally-clause", "function-def", "function-doc", "function-param", "function-return", "import-module", "init-method", "json-dumps", "len-call", "list-index", "list-literal", "list-mutate", "logical", "method-def", "nested-dict", "newline-escape", "package-import", "print-call", "print-several", "print-text", "reassignment", "self-name", "string-format", "string-index", "string-slice", "subclass", "top-level-indent", "try-except", "tuple-unpack", "type-call", "with-statement"],
    teaches: ["http-get"],
    blocks: [
      {
        kind: "text",
        md: "Web APIs answer questions over HTTP. The USGS publishes every earthquake it records; to ask for yesterday's large ones, a program sends a **request**: the **method** `GET` (\"give me\"), a **URL** whose **query string** after `?` carries the parameters (`starttime=2025-01-01&minmagnitude=4.5`), and **headers** such as `Accept: application/json` (the format it wants) and `User-Agent` (who is asking).\n\nThe server sends back a **response**: a **status code** (200 OK; 4xx means the request was wrong, for example 404 Not Found or 400 Bad Request; 5xx means the server failed), headers such as `Content-Type`, and a **body** of bytes.\n\nPython's `urllib.request` module builds and sends requests. (Many projects install `requests` or `httpx`, which wrap the same ideas in a shorter API.) Parameters must be **encoded**: a space, a comma or an `&` inside a value would otherwise break the URL. `urlencode` does that.",
      },
      {
        kind: "example",
        title: "Build a request",
        code: src`
from urllib.parse import urlencode
from urllib.request import Request

params = {"format": "geojson", "starttime": "2025-01-01", "endtime": "2025-01-02", "minmagnitude": 4.5}
url = "https://earthquake.usgs.gov/fdsnws/event/1/query?" + urlencode(params)
request = Request(url, headers={"Accept": "application/json", "User-Agent": "quake-report/1.0 (ana@example.com)"})

print(request.get_method(), request.host)
print(request.selector)
print(request.get_header("User-agent"))
print(urlencode({"search": "Rabaul, Papua New Guinea", "page": 2}))
`,
        output: "GET earthquake.usgs.gov\n/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02&minmagnitude=4.5\nquake-report/1.0 (ana@example.com)\nsearch=Rabaul%2C+Papua+New+Guinea&page=2\n",
        note: "Nothing has been sent yet: a `Request` is just a description. `selector` is the path plus query string the server sees. urllib stores header names with only the first letter capitalised, so it is `get_header(\"User-agent\")`. In the last line the comma became `%2C` and each space `+`.",
      },
      {
        kind: "text",
        md: "Sending it is one call: `urllib.request.urlopen(request, timeout=10)`, or `opener.open(request, timeout=10)` on an **opener** made by `build_opener()`. Always pass `timeout=` (seconds): without it, a server that never answers makes your program wait forever.\n\n**About this page:** Python running in a browser tab has no network connections of its own. So in the HTTP & API Clients module the opener is built with one extra piece, a small urllib **handler** called `Replay`, which answers each request from **saved copies of real responses** (from the USGS and OpenAlex APIs, trimmed to a few fields) instead of from the server. urllib lets you plug in handlers exactly like this; testing tools use the same trick. Everything else is the real urllib: the `Request`, `open`, the status, the headers and the bytes. On your computer, delete the handler and call `build_opener()` (or `urlopen`), and the same code talks to the live API.",
      },
      {
        kind: "example",
        title: "Send it and read the response",
        code: REPLAY_HEAD + src`

url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02&minmagnitude=4.5"
saved = {url: (200, {"type": "FeatureCollection", "metadata": {"count": 1}, "features": [
    {"id": "us6000pgsd", "properties": {"mag": 5.5, "place": "153 km S of Isangel, Vanuatu"}},
]})}
opener = build_opener(Replay(saved))

request = Request(url, headers={"Accept": "application/json"})
with opener.open(request, timeout=10) as response:
    print(response.status, response.headers["Content-Type"])
    body = response.read()
print(type(body).__name__, len(body))
print(body[:30])
`,
        output: "200 application/json\nbytes 160\nb'{\"type\": \"FeatureCollection\", '\n",
        note: "`with` closes the response when the block ends, as with files. The body arrives as **bytes**, not text: the next lesson turns it into Python data. On a computer the only change is `opener = build_opener()`.",
      },
      {
        kind: "text",
        md: "**When to use it:** any time a program needs data another service owns: weather, prices, publications. **Mistakes to avoid:** gluing values into the URL with `+` or f-strings (a space or `&` in a value corrupts the query: use `urlencode`); leaving out `timeout=`; and forgetting that the body is bytes. Many APIs also ask you to identify yourself in `User-Agent` (OpenAlex asks for an email in a `mailto` parameter), so they can contact you instead of blocking you.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Only the strong ones",
      prompt: "`quake_url` asks for every earthquake in a date range. Add the `minmagnitude` parameter so the URL asks only for earthquakes of at least `min_magnitude`. Keep using `urlencode`.",
      spec: [
        ["Function", "`quake_url(start, end, min_magnitude)`"],
        ["Returns", "the USGS query URL with `format`, `starttime`, `endtime` and `minmagnitude`, in that order"],
      ],
      starter: src`
from urllib.parse import urlencode

def quake_url(start, end, min_magnitude):
    params = {"format": "geojson", "starttime": start, "endtime": end}
    return "https://earthquake.usgs.gov/fdsnws/event/1/query?" + urlencode(params)

print(quake_url("2025-01-01", "2025-01-02", 4.5))
`,
      answer: src`
from urllib.parse import urlencode

def quake_url(start, end, min_magnitude):
    params = {"format": "geojson", "starttime": start, "endtime": end, "minmagnitude": min_magnitude}
    return "https://earthquake.usgs.gov/fdsnws/event/1/query?" + urlencode(params)

print(quake_url("2025-01-01", "2025-01-02", 4.5))
`,
      wrong: [
        {
          code: src`
from urllib.parse import urlencode

def quake_url(start, end, min_magnitude):
    params = {"format": "geojson", "starttime": start, "endtime": end, "minmag": min_magnitude}
    return "https://earthquake.usgs.gov/fdsnws/event/1/query?" + urlencode(params)
`,
          fails: ["returns"],
          why: "the API's parameter is called `minmagnitude`; a misspelt name is rejected by the server",
        },
      ],
      hints: ["The parameters are a dictionary: one more key is all it takes.", "The USGS name for the parameter is `minmagnitude`.", "Add `\"minmagnitude\": min_magnitude` as the last entry; `urlencode` turns the number into text."],
      task: {
        checks: [
          fn("returns", "quake_url", [
            example(["2025-01-01", "2025-01-02", 4.5], usgsQuery(DAY1)),
            hiddenCase("a whole-number magnitude", ["2025-03-28", "2025-03-29", 7], usgsQuery("format=geojson&starttime=2025-03-28&endtime=2025-03-29&minmagnitude=7")),
            hiddenCase("times as well as dates", ["2025-01-07T00:00:00", "2025-01-08T00:00:00", 6.5], usgsQuery("format=geojson&starttime=2025-01-07T00%3A00%3A00&endtime=2025-01-08T00%3A00%3A00&minmagnitude=6.5")),
          ], { label: "quake_url() asks for the strong earthquakes in the range" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A search request for OpenAlex",
        prompt: "OpenAlex indexes scholarly works. Its search is `GET https://api.openalex.org/works?search=…&page=…&per-page=…&mailto=…` and it asks every client to send an email in `mailto` so it can contact you. Write `search_request(query, page, mailto)`: return a `Request` for 25 results per page that also sends `Accept: application/json`.",
        spec: [
          ["Function", "`search_request(query, page, mailto)`"],
          ["Returns", "a `Request` for `https://api.openalex.org/works?` plus `search`, `page`, `per-page` (25) and `mailto`, in that order, encoded"],
          ["Header", "`Accept: application/json`"],
          ["Example", "`search_request(\"python packaging\", 1, \"ana@example.com\").full_url` → `'https://api.openalex.org/works?search=python+packaging&page=1&per-page=25&mailto=ana%40example.com'`"],
        ],
        starter: src`
from urllib.parse import urlencode
from urllib.request import Request

def search_request(query, page, mailto):
    return Request("https://api.openalex.org/works")

request = search_request("python packaging", 1, "ana@example.com")
print(request.full_url)
print(request.get_header("Accept"))
`,
        answer: src`
from urllib.parse import urlencode
from urllib.request import Request

def search_request(query, page, mailto):
    params = {"search": query, "page": page, "per-page": 25, "mailto": mailto}
    url = "https://api.openalex.org/works?" + urlencode(params)
    return Request(url, headers={"Accept": "application/json"})

request = search_request("python packaging", 1, "ana@example.com")
print(request.full_url)
print(request.get_header("Accept"))
`,
        alternatives: [
          src`
from urllib.parse import urlencode
from urllib.request import Request

def search_request(query, page, mailto):
    query_string = urlencode([("search", query), ("page", page), ("per-page", 25), ("mailto", mailto)])
    request = Request(f"https://api.openalex.org/works?{query_string}")
    request.add_header("Accept", "application/json")
    return request
`,
        ],
        wrong: [
          {
            code: src`
from urllib.request import Request

def search_request(query, page, mailto):
    url = f"https://api.openalex.org/works?search={query}&page={page}&per-page=25&mailto={mailto}"
    return Request(url, headers={"Accept": "application/json"})
`,
            fails: ["url", "ampersand", "plus"],
            why: "the values aren't encoded: a space, `&` or `+` in them corrupts the query string",
          },
          {
            code: src`
from urllib.parse import urlencode
from urllib.request import Request

def search_request(query, page, mailto):
    params = {"search": query, "page": page, "per-page": 25, "mailto": mailto}
    return Request("https://api.openalex.org/works?" + urlencode(params))
`,
            fails: ["accept"],
            why: "the URL is right, but the Accept header is missing",
          },
        ],
        hints: [
          "Put the four parameters in a dictionary in the order given and let `urlencode` encode them.",
          "`Request(url, headers={...})` takes the headers as a dictionary.",
          "Encoding is what turns `@` into `%40` and a space into `+`; building the URL with an f-string skips it.",
        ],
        task: {
          checks: [
            { kind: "expr", id: "url", label: "the URL has the four encoded parameters", show: "search_request('python packaging', 1, 'ana@example.com').full_url", expr: "result = search_request('python packaging', 1, 'ana@example.com').full_url", expected: py.str(`${OA}?search=python+packaging&page=1&per-page=25&mailto=ana%40example.com`) },
            { kind: "expr", id: "accept", label: "the request asks for JSON", show: "search_request(...).get_header('Accept')", expr: "result = search_request('numpy', 2, 'ana@example.com').get_header('Accept')", expected: py.str("application/json") },
            { kind: "expr", id: "method", label: "it is a GET request", show: "search_request(...).get_method()", expr: "result = search_request('numpy', 2, 'ana@example.com').get_method()", expected: py.str("GET") },
            { kind: "expr", id: "ampersand", label: "a search with & and a comma in it", hidden: true, expr: "result = search_request('pandas & numpy, benchmarks', 3, 'ana@example.com').full_url", expected: py.str(`${OA}?search=pandas+%26+numpy%2C+benchmarks&page=3&per-page=25&mailto=ana%40example.com`) },
            { kind: "expr", id: "plus", label: "an email address with a + in it", hidden: true, expr: "result = search_request('diffusion models', 1, 'ana+alerts@example.com').full_url", expected: py.str(`${OA}?search=diffusion+models&page=1&per-page=25&mailto=ana%2Balerts%40example.com`) },
          ],
        },
      },
      {
        id: "c2",
        title: "Decode the body with the server's charset",
        prompt: "Bytes only become text once you know their encoding, and a server says which one it used in `Content-Type`, e.g. `text/csv; charset=latin-1`. Write `download_text(opener, url)`: open the URL (timeout 10 seconds) and return `(status, text)`, decoding the body with the charset from the response's headers, or UTF-8 when the header names none.",
        spec: [
          ["Function", "`download_text(opener, url)`"],
          ["opener", "an opener from `build_opener(Replay(saved))`; the starter builds one from `replay.py`"],
          ["Returns", "a tuple `(status, text)`"],
          ["Tip", "`response.headers.get_content_charset(\"utf-8\")` returns the declared charset, or `\"utf-8\"` when there is none"],
        ],
        starter: src`
from urllib.request import build_opener
from replay import Replay

def download_text(opener, url):
    return (0, "")

url = "https://example.org/stations.csv"
saved = {url: {"body": "station,name\nUSW00094846,Chicago O'Hare\n".encode("utf-8"), "headers": {"Content-Type": "text/csv; charset=utf-8"}}}
print(download_text(build_opener(Replay(saved)), url))
`,
        answer: src`
from urllib.request import build_opener
from replay import Replay

def download_text(opener, url):
    with opener.open(url, timeout=10) as response:
        charset = response.headers.get_content_charset("utf-8")
        return (response.status, response.read().decode(charset))

url = "https://example.org/stations.csv"
saved = {url: {"body": "station,name\nUSW00094846,Chicago O'Hare\n".encode("utf-8"), "headers": {"Content-Type": "text/csv; charset=utf-8"}}}
print(download_text(build_opener(Replay(saved)), url))
`,
        alternatives: [
          src`
from urllib.request import Request

def download_text(opener, url):
    response = opener.open(Request(url), timeout=10)
    try:
        raw = response.read()
        encoding = response.headers.get_content_charset() or "utf-8"
        return response.status, raw.decode(encoding)
    finally:
        response.close()
`,
        ],
        wrong: [
          {
            code: src`
def download_text(opener, url):
    with opener.open(url, timeout=10) as response:
        return (response.status, response.read().decode("utf-8"))
`,
            fails: ["latin"],
            why: "always decoding as UTF-8 crashes on a Latin-1 body",
          },
          {
            code: src`
def download_text(opener, url):
    with opener.open(url, timeout=10) as response:
        return (response.status, str(response.read()))
`,
            fails: ["returns", "latin", "no-charset"],
            why: "`str(bytes)` gives the text `b'...'`, with escapes, not the decoded text",
          },
        ],
        hints: [
          "Open the URL with `timeout=10` and keep the response in a `with` block.",
          "The response's headers know the declared charset; ask them for it with UTF-8 as the fallback.",
          "Decode the bytes from `read()` with that charset, and return it together with `response.status`.",
        ],
        task: {
          files,
          checks: [
            http("returns", "download_text() returns the status and the decoded text", { "https://example.org/stations.csv": { body: "station,name\nUSW00094846,Chicago O'Hare\n", headers: { "Content-Type": "text/csv; charset=utf-8" } } }, "download_text(_op, 'https://example.org/stations.csv')", py.tuple(py.int(200), py.str("station,name\nUSW00094846,Chicago O'Hare\n")), { show: "download_text(opener, 'https://example.org/stations.csv')" }),
            {
              kind: "expr",
              id: "latin",
              label: "a body the server says is Latin-1",
              hidden: true,
              expr: `${replaySetup({})}\n_rp.saved['https://example.org/menu.txt'] = {'body': 'Café crème 3,50 €'.encode('cp1252'), 'headers': {'Content-Type': 'text/plain; charset=windows-1252'}}\nresult = download_text(_op, 'https://example.org/menu.txt')`,
              expected: py.tuple(py.int(200), py.str("Café crème 3,50 €")),
            },
            http("no-charset", "a body with no charset in its Content-Type", { "https://example.org/notes.txt": { body: "Zürich ✓", headers: { "Content-Type": "text/plain" } } }, "download_text(_op, 'https://example.org/notes.txt')", py.tuple(py.int(200), py.str("Zürich ✓")), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from urllib.parse import urlencode
from urllib.request import Request

request = Request("https://api.openalex.org/works?" + urlencode({"search": "R&D tax", "page": 1}))
print(request.get_method())
print(request.selector)
`,
        choices: ["GET\n/works?search=R%26D+tax&page=1", "GET\n/works?search=R&D tax&page=1", "POST\n/works?search=R%26D+tax&page=1", "GET\nhttps://api.openalex.org/works?search=R%26D+tax&page=1"],
        answer: 0,
        why: "A Request with no data is a GET. `urlencode` writes `&` inside a value as `%26`, so it isn't read as the start of another parameter, and a space as `+`. `selector` is the part after the host.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the query string is built with an f-string. What does the server receive as the `search` parameter?",
        program: src`
from urllib.parse import parse_qs, urlsplit

query = "R&D tax"
url = f"https://api.openalex.org/works?search={query}&page=1"
print(parse_qs(urlsplit(url).query, keep_blank_values=True))
`,
        choices: ["{'search': ['R'], 'D tax': [''], 'page': ['1']}", "{'search': ['R&D tax'], 'page': ['1']}", "{'search': ['R D tax'], 'page': ['1']}", "ValueError"],
        answer: 0,
        why: "`parse_qs` reads the query the way a server does. The unencoded `&` ends the search value after `R`, and `D tax` becomes a parameter of its own. (`keep_blank_values=True` keeps the stray `D tax`, which has no value, so you can see it.)",
      },
      {
        id: "q3",
        prompt: "A request returns status 404. What does that tell you?",
        choices: [
          "The server answered, but it has nothing at that URL: check the path and identifiers in your request",
          "The network is down",
          "The server crashed; trying again later will work",
          "The request succeeded with an empty result",
        ],
        answer: 0,
        why: "4xx statuses mean the request itself was wrong (404 Not Found, 400 Bad Request, 401 Unauthorized). 5xx means the server failed. A network failure gives no status at all.",
      },
    ],
    review: [
      "A request is a method, a URL with an encoded query string, and headers; a response is a status, headers and a body of bytes.",
      "Build query strings with `urlencode`, and always pass `timeout=` when you open a request.",
      "In this course the opener answers from saved copies of real responses; on a computer `build_opener()` talks to the server.",
      "Next: turning a JSON body into Python data, and handling the requests that fail.",
    ],
  },

  // ------------------------------------------------------------------ PY-L31-02 JSON responses
  {
    id: "PY-L31-02",
    version: 2,
    slug: "json-responses",
    title: "JSON responses and HTTP errors",
    lede: "Most APIs answer in JSON. Read the bytes, check what you got, and json.loads them into dictionaries and lists. When the status is 4xx or 5xx, urllib raises HTTPError instead, and its body usually says what went wrong.",
    focus: "Turn a JSON response into Python data, and handle HTTPError by reading its status and the error body.",
    minutes: 20,
    objectives: [
      "Parse a JSON body with `json.loads(response.read())` and walk the nested result",
      "Catch `urllib.error.HTTPError`, read its `code` and its JSON error body",
      "Decide which failures a function should handle (a 404 for one record) and which it should let through",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "continue-statement", "dict-get", "dict-literal", "dict-lookup", "except-type", "file-open", "for-loop", "function-def", "function-doc", "function-param", "function-return", "http-get", "identity", "if-statement", "import-module", "init-method", "json-dumps", "json-loads", "lambda", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-dict", "nested-index", "none-value", "package-import", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "self-name", "string-format", "string-index", "subclass", "top-level-indent", "try-except", "tuple-literal", "tuple-unpack", "unquoted-name", "with-statement"],
    teaches: ["response-body"],
    blocks: [
      {
        kind: "text",
        md: "JSON is the usual body format: `json.loads` accepts the bytes directly and gives back dictionaries, lists, strings, numbers, booleans and `None` (see CSV JSON & JSONL). What's inside follows the API's documentation. The USGS answers in **GeoJSON**: a dictionary with a `features` list, one dictionary per event, its details under `properties` and its position under `geometry`.",
      },
      {
        kind: "example",
        title: "Earthquakes from a GeoJSON response",
        code: REPLAY_HEAD + src`

url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02&minmagnitude=5"
saved = {url: (200, {"type": "FeatureCollection", "metadata": {"count": 3}, "features": [
    {"id": "us6000pgsd", "properties": {"mag": 5.5, "place": "153 km S of Isangel, Vanuatu"}, "geometry": {"coordinates": [169.3819, -20.9273, 22]}},
    {"id": "us6000pgv4", "properties": {"mag": 6.1, "place": "South Sandwich Islands region"}, "geometry": {"coordinates": [-26.7059, -56.4095, 70]}},
    {"id": "us6000pgx1", "properties": {"mag": 5.3, "place": "southeast of Easter Island"}, "geometry": {"coordinates": [-100.6636, -36.1244, 10]}},
]})}
opener = build_opener(Replay(saved))

with opener.open(url, timeout=10) as response:
    data = json.loads(response.read())
print(data["metadata"]["count"], "events")
for feature in data["features"]:
    longitude, latitude, depth_km = feature["geometry"]["coordinates"]
    print(feature["properties"]["mag"], feature["properties"]["place"], f"({depth_km} km deep)")
`,
        output: "3 events\n5.5 153 km S of Isangel, Vanuatu (22 km deep)\n6.1 South Sandwich Islands region (70 km deep)\n5.3 southeast of Easter Island (10 km deep)\n",
        note: "GeoJSON lists coordinates as longitude, latitude, depth: the reverse of how people usually say a position. Reading the documentation of the fields is part of using any API.",
      },
      {
        kind: "text",
        md: "Not every request succeeds. When the status is 4xx or 5xx, `open` doesn't return a response at all: it raises **`urllib.error.HTTPError`**. Asking OpenAlex for a work ID that doesn't exist:",
      },
      {
        kind: "error-example",
        title: "A 404 is an exception",
        code: REPLAY_HEAD + src`

opener = build_opener(Replay({}))
response = opener.open("https://api.openalex.org/works/W0000000000", timeout=10)
print(response.status)
`,
        error: "HTTPError",
        output: "",
        note: "`urllib.error.HTTPError: HTTP Error 404: Not Found`. The print never runs. The error object is also a response: `err.code` is the status, `err.headers` the headers, and `err.read()` the body the server sent with it.",
      },
      {
        kind: "text",
        md: "Which errors to handle depends on the function's job. When the question is *does this record exist?*, a 404 is an answer, so return `None`. A 400 means your request is wrong and a 5xx means the server failed: those should reach the caller, ideally with the API's own explanation from the error body.",
      },
      {
        kind: "example",
        title: "Handle the 404, report the rest",
        code: REPLAY_HEAD + src`
from urllib.error import HTTPError

def get_json(opener, url):
    try:
        with opener.open(url, timeout=10) as response:
            return json.loads(response.read())
    except HTTPError as err:
        if err.code == 404:
            return None
        details = json.loads(err.read())
        raise RuntimeError(f"{err.code} from the API: {details['message']}") from err

saved = {
    "https://api.openalex.org/works/W3003257820": (200, {"id": "https://openalex.org/W3003257820", "publication_year": 2020, "cited_by_count": 38040}),
    "https://api.openalex.org/works?filter=publication_yr:2020": (400, {"error": "Invalid query parameters error.", "message": "publication_yr is not a valid field."}),
}
opener = build_opener(Replay(saved))

print(get_json(opener, "https://api.openalex.org/works/W3003257820")["cited_by_count"])
print(get_json(opener, "https://api.openalex.org/works/W0000000000"))
try:
    get_json(opener, "https://api.openalex.org/works?filter=publication_yr:2020")
except RuntimeError as err:
    print(err)
`,
        output: "38040\nNone\n400 from the API: publication_yr is not a valid field.\n",
        note: "`raise … from err` keeps the original HTTPError attached, so a traceback shows both. The error body here follows OpenAlex's documented `error`/`message` shape.",
      },
      {
        kind: "text",
        md: "**When to use it:** every JSON API. **Mistakes to avoid:** expecting `open` to return a response for a 404 (it raises); catching `HTTPError` and returning `None` for every status, which hides a broken request or a failing server behind \"no data\"; and assuming every field is present: real records leave optional fields out.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Earthquakes only",
      prompt: "The USGS catalogue also lists quarry and mining blasts, with `type` set to `\"mining explosion\"` or `\"explosion\"`. `magnitudes` returns every event's magnitude. Change it to keep only events whose `type` is `\"earthquake\"`.",
      spec: [
        ["Function", "`magnitudes(opener, url)`"],
        ["Returns", "the `mag` of each feature whose `properties.type` is `\"earthquake\"`, in order"],
      ],
      starter: src`
import json
from urllib.request import build_opener
from replay import Replay

def magnitudes(opener, url):
    with opener.open(url, timeout=10) as response:
        data = json.loads(response.read())
    found = []
    for feature in data["features"]:
        found.append(feature["properties"]["mag"])
    return found

url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02"
saved = {url: (200, {"features": [
    {"properties": {"mag": 4.7, "type": "earthquake"}},
    {"properties": {"mag": 3.0, "type": "mining explosion"}},
]})}
print(magnitudes(build_opener(Replay(saved)), url))
`,
      answer: src`
import json
from urllib.request import build_opener
from replay import Replay

def magnitudes(opener, url):
    with opener.open(url, timeout=10) as response:
        data = json.loads(response.read())
    found = []
    for feature in data["features"]:
        if feature["properties"]["type"] == "earthquake":
            found.append(feature["properties"]["mag"])
    return found

url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02"
saved = {url: (200, {"features": [
    {"properties": {"mag": 4.7, "type": "earthquake"}},
    {"properties": {"mag": 3.0, "type": "mining explosion"}},
]})}
print(magnitudes(build_opener(Replay(saved)), url))
`,
      wrong: [
        {
          code: src`
import json

def magnitudes(opener, url):
    with opener.open(url, timeout=10) as response:
        data = json.loads(response.read())
    found = []
    for feature in data["features"]:
        if "explosion" not in feature["properties"]["type"]:
            found.append(feature["properties"]["mag"])
    return found
`,
          fails: ["other"],
          why: "it keeps any type that isn't an explosion, such as `other event`",
        },
      ],
      hints: ["The loop already visits every feature; only some should be appended.", "The type is inside `properties`, next to `mag`.", "Append only when the type equals `\"earthquake\"`."],
      task: {
        files,
        checks: [
          http("returns", "magnitudes() keeps the earthquakes", { [usgsQuery("format=geojson&starttime=2025-01-01&endtime=2025-01-02")]: { body: collection([rabaul, wright, vanuatu]) } }, `magnitudes(_op, ${pyLit(usgsQuery("format=geojson&starttime=2025-01-01&endtime=2025-01-02"))})`, [4.7, 5.5], { show: "magnitudes(opener, url)  # an earthquake, a mining explosion, an earthquake" }),
          http("other", "another kind of event that isn't an earthquake", { "https://earthquake.usgs.gov/x": { body: collection([quake("us6000x1", 2.6, "near Ely, Nevada", 1736000000000, [-115, 39, 0], "other event"), sandwich]) } }, "magnitudes(_op, 'https://earthquake.usgs.gov/x')", [6.1], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The strongest earthquake",
        prompt: "Write `strongest(opener, url)`: fetch a USGS GeoJSON response and return `(place, magnitude)` for the strongest event whose type is `earthquake`. Return `None` when there is none. If two have the same magnitude, keep the first one listed.",
        spec: [
          ["Function", "`strongest(opener, url)`"],
          ["Returns", "a tuple `(place, mag)`, or `None` for no earthquakes"],
          ["Example", "Vanuatu 5.5, South Sandwich Islands 6.1, Easter Island 5.3 → `('South Sandwich Islands region', 6.1)`"],
        ],
        starter: src`
import json
from urllib.request import build_opener
from replay import Replay

def strongest(opener, url):
    return None

url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02&minmagnitude=5"
saved = {url: (200, {"features": [
    {"properties": {"mag": 5.5, "place": "153 km S of Isangel, Vanuatu", "type": "earthquake"}},
    {"properties": {"mag": 6.1, "place": "South Sandwich Islands region", "type": "earthquake"}},
    {"properties": {"mag": 5.3, "place": "southeast of Easter Island", "type": "earthquake"}},
]})}
print(strongest(build_opener(Replay(saved)), url))
`,
        answer: src`
import json
from urllib.request import build_opener
from replay import Replay

def strongest(opener, url):
    with opener.open(url, timeout=10) as response:
        data = json.loads(response.read())
    best = None
    for feature in data["features"]:
        props = feature["properties"]
        if props["type"] != "earthquake":
            continue
        if best is None or props["mag"] > best[1]:
            best = (props["place"], props["mag"])
    return best

url = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02&minmagnitude=5"
saved = {url: (200, {"features": [
    {"properties": {"mag": 5.5, "place": "153 km S of Isangel, Vanuatu", "type": "earthquake"}},
    {"properties": {"mag": 6.1, "place": "South Sandwich Islands region", "type": "earthquake"}},
    {"properties": {"mag": 5.3, "place": "southeast of Easter Island", "type": "earthquake"}},
]})}
print(strongest(build_opener(Replay(saved)), url))
`,
        alternatives: [
          src`
import json

def strongest(opener, url):
    response = opener.open(url, timeout=10)
    features = json.loads(response.read())["features"]
    quakes = [f["properties"] for f in features if f["properties"]["type"] == "earthquake"]
    if not quakes:
        return None
    top = max(quakes, key=lambda p: p["mag"])
    return (top["place"], top["mag"])
`,
        ],
        wrong: [
          {
            code: src`
import json

def strongest(opener, url):
    with opener.open(url, timeout=10) as response:
        data = json.loads(response.read())
    best = None
    for feature in data["features"]:
        props = feature["properties"]
        if best is None or props["mag"] > best[1]:
            best = (props["place"], props["mag"])
    return best
`,
            fails: ["blast"],
            why: "a blast can be the strongest event in the response; it isn't an earthquake",
          },
          {
            code: src`
import json

def strongest(opener, url):
    with opener.open(url, timeout=10) as response:
        data = json.loads(response.read())
    best = None
    for feature in data["features"]:
        props = feature["properties"]
        if props["type"] == "earthquake" and (best is None or props["mag"] >= best[1]):
            best = (props["place"], props["mag"])
    return best
`,
            fails: ["tie"],
            why: "`>=` replaces the first of two equal magnitudes with the second",
          },
          {
            code: src`
import json

def strongest(opener, url):
    with opener.open(url, timeout=10) as response:
        data = json.loads(response.read())
    quakes = [f["properties"] for f in data["features"] if f["properties"]["type"] == "earthquake"]
    top = max(quakes, key=lambda p: p["mag"])
    return (top["place"], top["mag"])
`,
            fails: ["empty"],
            why: "`max` of an empty list raises ValueError instead of returning None",
          },
        ],
        hints: [
          "Fetch and parse the body first; the events are in `data[\"features\"]`, each with its `properties`.",
          "Keep a running best (see Fundamentals Integration): start with None and replace it only with a stronger earthquake.",
          "Skip events whose type isn't `earthquake`, and use a strict comparison so an equal magnitude doesn't replace the first.",
        ],
        task: {
          files,
          checks: [
            http("returns", "strongest() finds the strongest earthquake", { [usgsQuery(DAY1)]: { body: collection([vanuatu, sandwich, easter]) } }, `strongest(_op, ${pyLit(usgsQuery(DAY1))})`, py.tuple(py.str("South Sandwich Islands region"), py.float(6.1)), { show: "strongest(opener, url)" }),
            http("blast", "a mining blast bigger than every earthquake", { "https://earthquake.usgs.gov/b": { body: collection([quake("nn00891080", 2.6, "11 km ESE of Smith, Nevada", 1735696300783, [-119.215, 38.7512, 10.4]), quake("us6000phwb", 3.5, "18 km ENE of Wright, Wyoming", 1736024451118, [-105.2885, 43.8286, 0], "mining explosion")]) } }, "strongest(_op, 'https://earthquake.usgs.gov/b')", py.tuple(py.str("11 km ESE of Smith, Nevada"), py.float(2.6)), { hidden: true }),
            http("tie", "two earthquakes with the same magnitude", { "https://earthquake.usgs.gov/t": { body: collection([argentina, quake("us6000pgt4", 4.9, "74 km NW of Rabaul, Papua New Guinea", 1735715153402, [151.6794, -3.7324, 10])]) } }, "strongest(_op, 'https://earthquake.usgs.gov/t')", py.tuple(py.str("97 km WNW of El Aguilar, Argentina"), py.float(4.9)), { hidden: true }),
            http("empty", "a response with no events", { "https://earthquake.usgs.gov/e": { body: collection([]) } }, "strongest(_op, 'https://earthquake.usgs.gov/e')", null, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Summarise a work, if it exists",
        prompt: "Write `work_summary(opener, work_id)`: fetch `https://api.openalex.org/works/<work_id>` and return `{\"title\": …, \"year\": …, \"citations\": …, \"open_access\": …}` from the work's `title`, `publication_year`, `cited_by_count` and `open_access.is_oa`. When the work doesn't exist (404), return `None`. Any other HTTP error must still reach the caller.",
        spec: [
          ["Function", "`work_summary(opener, work_id)`"],
          ["Returns", "a new dictionary with the four keys, or `None` for a 404"],
          ["Raises", "the `HTTPError` for any other error status, unchanged"],
          ["Example", "`work_summary(opener, \"W3003257820\")` → `{'title': 'SciPy 1.0: …', 'year': 2020, 'citations': 38040, 'open_access': True}`"],
        ],
        starter: src`
import json
from urllib.error import HTTPError
from urllib.request import build_opener
from replay import Replay

def work_summary(opener, work_id):
    return None

saved = {"https://api.openalex.org/works/W3003257820": (200, {
    "id": "https://openalex.org/W3003257820",
    "title": "SciPy 1.0: fundamental algorithms for scientific computing in Python",
    "publication_year": 2020, "cited_by_count": 38040, "open_access": {"is_oa": True},
})}
opener = build_opener(Replay(saved))
print(work_summary(opener, "W3003257820"))
print(work_summary(opener, "W0000000000"))
`,
        answer: src`
import json
from urllib.error import HTTPError
from urllib.request import build_opener
from replay import Replay

def work_summary(opener, work_id):
    url = "https://api.openalex.org/works/" + work_id
    try:
        with opener.open(url, timeout=10) as response:
            work = json.loads(response.read())
    except HTTPError as err:
        if err.code == 404:
            return None
        raise
    return {
        "title": work["title"],
        "year": work["publication_year"],
        "citations": work["cited_by_count"],
        "open_access": work["open_access"]["is_oa"],
    }

saved = {"https://api.openalex.org/works/W3003257820": (200, {
    "id": "https://openalex.org/W3003257820",
    "title": "SciPy 1.0: fundamental algorithms for scientific computing in Python",
    "publication_year": 2020, "cited_by_count": 38040, "open_access": {"is_oa": True},
})}
opener = build_opener(Replay(saved))
print(work_summary(opener, "W3003257820"))
print(work_summary(opener, "W0000000000"))
`,
        alternatives: [
          src`
import json
from urllib.error import HTTPError

def work_summary(opener, work_id):
    try:
        response = opener.open(f"https://api.openalex.org/works/{work_id}", timeout=10)
    except HTTPError as err:
        if err.code != 404:
            raise
        return None
    w = json.loads(response.read())
    return dict(title=w["title"], year=w["publication_year"], citations=w["cited_by_count"], open_access=w["open_access"]["is_oa"])
`,
        ],
        wrong: [
          {
            code: src`
import json
from urllib.error import HTTPError

def work_summary(opener, work_id):
    try:
        with opener.open("https://api.openalex.org/works/" + work_id, timeout=10) as response:
            work = json.loads(response.read())
    except HTTPError:
        return None
    return {"title": work["title"], "year": work["publication_year"], "citations": work["cited_by_count"], "open_access": work["open_access"]["is_oa"]}
`,
            fails: ["server-error"],
            why: "every error becomes None, so a failing server looks like a missing work",
          },
          {
            code: src`
import json

def work_summary(opener, work_id):
    with opener.open("https://api.openalex.org/works/" + work_id, timeout=10) as response:
        work = json.loads(response.read())
    return {"title": work["title"], "year": work["publication_year"], "citations": work["cited_by_count"], "open_access": work["open_access"]["is_oa"]}
`,
            fails: ["missing"],
            why: "a 404 escapes as HTTPError instead of becoming None",
          },
        ],
        hints: [
          "Build the URL from the ID, then open it inside `try`.",
          "Catch `HTTPError`; its `code` tells you whether it was a 404.",
          "For any other code, a bare `raise` inside the `except` block sends the same error on to the caller.",
        ],
        task: {
          files,
          checks: [
            http("returns", "work_summary() summarises an existing work", { [`${OA}/W3003257820`]: { body: scipy } }, "work_summary(_op, 'W3003257820')", { title: scipy.title, year: 2020, citations: 38040, open_access: true }, { show: "work_summary(opener, 'W3003257820')" }),
            http("missing", "a work that doesn't exist gives None", {}, "work_summary(_op, 'W0000000000')", null, { show: "work_summary(opener, 'W0000000000')" }),
            http("preprint", "a preprint that isn't open access", { [`${OA}/W2970971581`]: { body: { ...pytorch, open_access: { is_oa: false } } } }, "work_summary(_op, 'W2970971581')", { title: pytorch.title, year: 2019, citations: 31488, open_access: false }, { hidden: true }),
            http("server-error", "a server error reaches the caller", { [`${OA}/W3035965352`]: { status: 503, body: { error: "Service Unavailable" } } }, "work_summary(_op, 'W3035965352')", null, { hidden: true, raises: "HTTPError" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import json

body = b'{"metadata": {"count": 2}, "features": [{"properties": {"mag": 4.7, "tsunami": 0}}, {"properties": {"mag": 7.6, "tsunami": 1}}]}'
data = json.loads(body)
print(len(data["features"]), data["features"][1]["properties"]["tsunami"] == 1)
`,
        choices: ["2 True", "2 1", "1 True", "TypeError"],
        answer: 0,
        why: "`json.loads` accepts bytes. `features` holds two dictionaries; the second one's `tsunami` flag is the int 1, so the comparison is True.",
      },
      {
        id: "q2",
        prompt: "A common mistake: catching every HTTPError as \"not found\". What does this print?",
        program: src`
from urllib.error import HTTPError

def find(code):
    try:
        raise HTTPError("https://api.openalex.org/works/W1", code, "error", None, None)
    except HTTPError:
        return None

print(find(404), find(503))
`,
        choices: ["None None", "None 503", "404 503", "HTTPError"],
        answer: 0,
        why: "Both errors become None, so the caller can't tell a missing work from a server that's down. Check `err.code` and re-raise what you don't handle.",
      },
      {
        id: "q3",
        prompt: "`get_city(id)` calls a weather API. Which response should it turn into `None` rather than an exception?",
        choices: [
          "404 Not Found for that city ID",
          "400 Bad Request because a parameter is misspelt",
          "500 Internal Server Error",
          "401 Unauthorized because the API key expired",
        ],
        answer: 0,
        why: "Only the 404 answers the function's question (that city doesn't exist). The others are problems someone has to fix or retry, so they should stay exceptions.",
      },
    ],
    review: [
      "`json.loads(response.read())` turns a JSON body into Python data; read the API's documentation for its shape.",
      "4xx and 5xx statuses raise `HTTPError`; `err.code` and `err.read()` say what went wrong.",
      "Handle only the errors that answer the function's question; re-raise the rest.",
      "Next: APIs that send large results one page at a time.",
    ],
  },

  // ------------------------------------------------------------------ PY-L31-03 pagination
  {
    id: "PY-L31-03",
    version: 2,
    slug: "pagination",
    title: "Pagination: follow the pages to the end",
    lede: "APIs return big results a page at a time. The client asks for the first page, reads how to ask for the next one (a page number, an offset or a cursor), and stops when the API says there is nothing more.",
    focus: "Collect every result from a paginated API by asking for the next page until the API signals the end.",
    minutes: 22,
    objectives: [
      "Recognise page-number, offset and cursor pagination",
      "Loop until the end signal: an empty or short page, or no next cursor",
      "Guard the loop with a page limit so a bug or a changing result can't run forever",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "break-statement", "class-def", "comparison", "continue-statement", "defaultdict-call", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "file-open", "for-loop", "function-def", "function-default", "function-doc", "function-param", "function-return", "http-get", "identity", "if-statement", "import-module", "init-method", "json-dumps", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-dict", "nested-loop", "none-value", "package-import", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "self-name", "star-args", "string-format", "string-index", "subclass", "top-level-indent", "truthiness", "tuple-unpack", "unquoted-name", "while-loop", "with-statement"],
    teaches: ["page-walk"],
    blocks: [
      {
        kind: "text",
        md: "OpenAlex has 53,612 works mentioning Python from 2019–2024. No API sends that in one response; it sends **pages**. Three styles are common:\n\n- **page numbers**: `page=1`, `page=2`, … with `per-page` results each, until a page comes back short or empty;\n- **offset and limit**: `offset=1&limit=100`, then `offset=101`, … (the USGS counts offsets from 1);\n- **cursors**: the first request sends `cursor=*`, and each response's `meta.next_cursor` is the token for the next page, `None` at the end. A cursor stays correct even when new records arrive between requests, which is why big APIs prefer it.\n\nAll three have the same loop: request a page, keep its results, work out the next request, stop on the end signal.",
      },
      {
        kind: "example",
        title: "Page numbers until a short page",
        code: REPLAY_HEAD + src`
from urllib.parse import urlencode

base = "https://api.openalex.org/works?"
def page_url(page):
    return base + urlencode({"search": "python", "per-page": 2, "page": page})

saved = {
    page_url(1): (200, {"meta": {"count": 5, "page": 1}, "results": [{"title": "SciPy 1.0"}, {"title": "PyTorch"}]}),
    page_url(2): (200, {"meta": {"count": 5, "page": 2}, "results": [{"title": "Array programming with NumPy"}, {"title": "Denoising Diffusion Probabilistic Models"}]}),
    page_url(3): (200, {"meta": {"count": 5, "page": 3}, "results": [{"title": "PsychoPy2"}]}),
}
opener = build_opener(Replay(saved))

titles = []
page = 1
while True:
    with opener.open(page_url(page), timeout=10) as response:
        results = json.loads(response.read())["results"]
    titles.extend([work["title"] for work in results])
    if len(results) < 2:
        break
    page += 1
print(page, "pages,", len(titles), "works")
print(titles[-1])
`,
        output: "3 pages, 5 works\nPsychoPy2\n",
        note: "Page 3 had fewer results than `per-page`, so it was the last. If the total were exactly 4, page 3 would come back empty, which the same test also handles. The titles are shortened here; the real responses carry the full ones.",
      },
      {
        kind: "text",
        md: "With a cursor, the response itself says what to ask for next. The loop keeps the cursor in a variable, and a `max_pages` limit protects against a bug that never updates it, or an API that keeps returning a next cursor.",
      },
      {
        kind: "example",
        title: "Cursor pagination with a safety limit",
        code: REPLAY_HEAD + src`
from urllib.parse import urlencode

def all_results(opener, base_url, max_pages=100):
    results = []
    cursor = "*"
    for _ in range(max_pages):
        url = base_url + "&" + urlencode({"cursor": cursor})
        with opener.open(url, timeout=10) as response:
            page = json.loads(response.read())
        results.extend(page["results"])
        cursor = page["meta"]["next_cursor"]
        if cursor is None:
            return results
    raise RuntimeError(f"still more pages after {max_pages}")

base = "https://api.openalex.org/works?filter=publication_year:2021"
saved = {
    base + "&cursor=%2A": (200, {"meta": {"next_cursor": "IlsxNjk"}, "results": [{"id": "W3201073812"}, {"id": "W3038025793"}]}),
    base + "&cursor=IlsxNjk": (200, {"meta": {"next_cursor": "Ils3NTc"}, "results": [{"id": "W3168436232"}]}),
    base + "&cursor=Ils3NTc": (200, {"meta": {"next_cursor": None}, "results": []}),
}
works = all_results(build_opener(Replay(saved)), base)
print([w["id"] for w in works])
`,
        output: "['W3201073812', 'W3038025793', 'W3168436232']\n",
        note: "`urlencode` turns the starting `*` into `%2A`. The last page is empty and its `next_cursor` is None, which ends the loop. If the API never said None, the function would stop after 100 pages with an error instead of looping forever.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a response has `next`, `cursor`, `page` or `offset` in it, or its count is larger than the results you got. **Mistakes to avoid:** forgetting to advance the page or cursor (the same page forever); stopping one page early by testing the count before keeping the page's results; and assuming page numbers start at 0 or offsets at 0 without reading the documentation.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Stop after a few pages",
      prompt: "`titles_from_pages` follows page numbers until a page is short. A report only needs the first few pages: add a `max_pages` parameter and stop after that many pages even when more are available.",
      spec: [
        ["Function", "`titles_from_pages(opener, max_pages)`"],
        ["Returns", "the titles from at most `max_pages` pages (each URL from `page_url(page)`), stopping earlier at a short page"],
      ],
      starter: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

def page_url(page):
    return "https://api.openalex.org/works?" + urlencode({"search": "python", "per-page": 2, "page": page})

def titles_from_pages(opener, max_pages):
    titles = []
    page = 1
    while True:
        with opener.open(page_url(page), timeout=10) as response:
            results = json.loads(response.read())["results"]
        titles.extend([work["title"] for work in results])
        if len(results) < 2:
            break
        page += 1
    return titles

saved = {page_url(n): (200, {"results": [{"title": f"work {2 * n - 1}"}, {"title": f"work {2 * n}"}]}) for n in range(1, 6)}
print(titles_from_pages(build_opener(Replay(saved)), 2))
`,
      answer: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

def page_url(page):
    return "https://api.openalex.org/works?" + urlencode({"search": "python", "per-page": 2, "page": page})

def titles_from_pages(opener, max_pages):
    titles = []
    page = 1
    while page <= max_pages:
        with opener.open(page_url(page), timeout=10) as response:
            results = json.loads(response.read())["results"]
        titles.extend([work["title"] for work in results])
        if len(results) < 2:
            break
        page += 1
    return titles

saved = {page_url(n): (200, {"results": [{"title": f"work {2 * n - 1}"}, {"title": f"work {2 * n}"}]}) for n in range(1, 6)}
print(titles_from_pages(build_opener(Replay(saved)), 2))
`,
      wrong: [
        {
          code: src`
import json
from urllib.parse import urlencode

def page_url(page):
    return "https://api.openalex.org/works?" + urlencode({"search": "python", "per-page": 2, "page": page})

def titles_from_pages(opener, max_pages):
    titles = []
    page = 1
    while page < max_pages:
        with opener.open(page_url(page), timeout=10) as response:
            results = json.loads(response.read())["results"]
        titles.extend([work["title"] for work in results])
        if len(results) < 2:
            break
        page += 1
    return titles
`,
          fails: ["returns", "one"],
          why: "`<` stops one page early",
        },
      ],
      hints: ["The loop runs `while True`; it needs a second reason to stop.", "Count pages with the `page` number you already have.", "Loop while `page` is at most `max_pages`."],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "returns",
            label: "titles_from_pages() stops after 2 of 5 full pages",
            show: "titles_from_pages(opener, 2)",
            expr: `${replaySetup({})}\nfor _n in range(1, 6):\n    _rp.saved[page_url(_n)] = {'body': {'results': [{'title': f'work {2 * _n - 1}'}, {'title': f'work {2 * _n}'}]}}\nresult = titles_from_pages(_op, 2)`,
            expected: pv(["work 1", "work 2", "work 3", "work 4"]),
          },
          {
            kind: "expr",
            id: "short",
            label: "a short page before the limit still ends the walk",
            hidden: true,
            expr: `${replaySetup({})}\n_rp.saved[page_url(1)] = {'body': {'results': [{'title': 'SciPy 1.0'}, {'title': 'PyTorch'}]}}\n_rp.saved[page_url(2)] = {'body': {'results': [{'title': 'PsychoPy2'}]}}\nresult = titles_from_pages(_op, 10)`,
            expected: pv(["SciPy 1.0", "PyTorch", "PsychoPy2"]),
          },
          {
            kind: "expr",
            id: "one",
            label: "a limit of one page",
            hidden: true,
            expr: `${replaySetup({})}\nfor _n in range(1, 4):\n    _rp.saved[page_url(_n)] = {'body': {'results': [{'title': 'a'}, {'title': 'b'}]}}\nresult = titles_from_pages(_op, 1)`,
            expected: pv(["a", "b"]),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Every event, 100 at a time",
        prompt: "The USGS returns at most `limit` events per request and pages with `offset`, which **starts at 1**. Write `all_event_ids(opener, base_url, limit)`: request `base_url + \"&offset=…&limit=…\"` with offsets 1, 1 + limit, 1 + 2·limit, … and return every event's `id` in order. A page with fewer than `limit` features is the last.",
        spec: [
          ["Function", "`all_event_ids(opener, base_url, limit)`"],
          ["URLs", "`base_url + \"&\" + urlencode({\"offset\": offset, \"limit\": limit})`, offset starting at 1"],
          ["Returns", "the ids of all features from all pages, in order"],
          ["Example", "5 events with limit 2 → three requests (offsets 1, 3, 5) and five ids"],
        ],
        starter: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

def all_event_ids(opener, base_url, limit):
    return []

base = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02&minmagnitude=5"
def page(*ids):
    return (200, {"features": [{"id": i} for i in ids]})
saved = {
    base + "&offset=1&limit=2": page("us6000pgsd", "us6000pgtj"),
    base + "&offset=3&limit=2": page("us6000pgu0", "us6000pgup"),
    base + "&offset=5&limit=2": page("us6000pgv4"),
}
print(all_event_ids(build_opener(Replay(saved)), base, 2))
`,
        answer: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

def all_event_ids(opener, base_url, limit):
    ids = []
    offset = 1
    while True:
        url = base_url + "&" + urlencode({"offset": offset, "limit": limit})
        with opener.open(url, timeout=10) as response:
            features = json.loads(response.read())["features"]
        ids.extend([feature["id"] for feature in features])
        if len(features) < limit:
            return ids
        offset += limit

base = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-02&minmagnitude=5"
def page(*ids):
    return (200, {"features": [{"id": i} for i in ids]})
saved = {
    base + "&offset=1&limit=2": page("us6000pgsd", "us6000pgtj"),
    base + "&offset=3&limit=2": page("us6000pgu0", "us6000pgup"),
    base + "&offset=5&limit=2": page("us6000pgv4"),
}
print(all_event_ids(build_opener(Replay(saved)), base, 2))
`,
        alternatives: [
          src`
import json

def all_event_ids(opener, base_url, limit):
    ids = []
    offset = 1
    features = None
    while features is None or len(features) == limit:
        response = opener.open(f"{base_url}&offset={offset}&limit={limit}", timeout=10)
        features = json.loads(response.read())["features"]
        for feature in features:
            ids.append(feature["id"])
        offset = offset + limit
    return ids
`,
        ],
        wrong: [
          {
            code: src`
import json
from urllib.parse import urlencode

def all_event_ids(opener, base_url, limit):
    ids = []
    offset = 0
    while True:
        url = base_url + "&" + urlencode({"offset": offset, "limit": limit})
        with opener.open(url, timeout=10) as response:
            features = json.loads(response.read())["features"]
        ids.extend([feature["id"] for feature in features])
        if len(features) < limit:
            return ids
        offset += limit
`,
            fails: ["returns", "exact", "single", "none"],
            why: "offsets start at 0, but the USGS counts from 1, so the request asks for pages that aren't there",
          },
          {
            code: src`
import json
from urllib.parse import urlencode

def all_event_ids(opener, base_url, limit):
    ids = []
    offset = 1
    while True:
        url = base_url + "&" + urlencode({"offset": offset, "limit": limit})
        with opener.open(url, timeout=10) as response:
            features = json.loads(response.read())["features"]
        if len(features) < limit:
            return ids
        ids.extend([feature["id"] for feature in features])
        offset += limit
`,
            fails: ["returns", "single"],
            why: "it tests for the last page before keeping its features, so the last page's events are lost",
          },
        ],
        hints: [
          "Start at offset 1 and add `limit` after each full page.",
          "Keep the page's ids before deciding whether it was the last page.",
          "A page with fewer than `limit` features (including an empty one) ends the loop.",
        ],
        task: {
          files,
          checks: [
            http("returns", "all_event_ids() collects 5 events over 3 pages", {
              "https://e.test/q?minmagnitude=5&offset=1&limit=2": { body: collection([vanuatu, quake("us6000pgtj", 5, "13 km NW of Āwash, Ethiopia", 1735718987701, [40.0976, 9.0855, 10])]) },
              "https://e.test/q?minmagnitude=5&offset=3&limit=2": { body: collection([quake("us6000pgu0", 5, "64 km NW of Rabaul, Papua New Guinea", 1735724382334, [151.7147, -3.8338, 10]), quake("us6000pgup", 5.1, "74 km NW of Rabaul, Papua New Guinea", 1735734382490, [151.6971, -3.7219, 10])]) },
              "https://e.test/q?minmagnitude=5&offset=5&limit=2": { body: collection([sandwich]) },
            }, "all_event_ids(_op, 'https://e.test/q?minmagnitude=5', 2)", ["us6000pgsd", "us6000pgtj", "us6000pgu0", "us6000pgup", "us6000pgv4"], { show: "all_event_ids(opener, base, 2)" }),
            http("exact", "a total that is an exact multiple of the limit", {
              "https://e.test/q?minmagnitude=7&offset=1&limit=2": { body: collection([mandalay, cayman]) },
              "https://e.test/q?minmagnitude=7&offset=3&limit=2": { body: collection([tibet, sandwich]) },
              "https://e.test/q?minmagnitude=7&offset=5&limit=2": { body: collection([]) },
            }, "all_event_ids(_op, 'https://e.test/q?minmagnitude=7', 2)", ["us7000pn9s", "us7000pcdl", "us6000pi9w", "us6000pgv4"], { hidden: true }),
            http("single", "everything fits on the first page", { "https://e.test/q?x=1&offset=1&limit=100": { body: collection([easter, rabaul]) } }, "all_event_ids(_op, 'https://e.test/q?x=1', 100)", ["us6000pgx1", "us6000pjqz"], { hidden: true }),
            http("none", "no events at all", { "https://e.test/q?x=2&offset=1&limit=50": { body: collection([]) } }, "all_event_ids(_op, 'https://e.test/q?x=2', 50)", [], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Citations per year, across every page",
        prompt: "Write `citations_by_year(opener, base_url)`: walk OpenAlex's cursor pages (start with `cursor=*`, follow `meta.next_cursor` until it is `None`) and return a dictionary from `publication_year` to the total `cited_by_count` of that year's works. When results shift between requests, the same work can appear on two pages: count each work `id` only once.",
        spec: [
          ["Function", "`citations_by_year(opener, base_url)`"],
          ["URLs", "`base_url + \"&\" + urlencode({\"cursor\": cursor})`, starting with `\"*\"`"],
          ["Returns", "`{year: total_citations}`, each work counted once; `{}` when there are no works"],
          ["Example", "SciPy (2020, 38040), PyTorch (2019, 31488), NumPy (2020, 23538) → `{2020: 61578, 2019: 31488}`"],
        ],
        starter: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

def citations_by_year(opener, base_url):
    return {}

base = "https://api.openalex.org/works?search=python"
saved = {
    base + "&cursor=%2A": (200, {"meta": {"next_cursor": "c2"}, "results": [
        {"id": "https://openalex.org/W3003257820", "publication_year": 2020, "cited_by_count": 38040},
        {"id": "https://openalex.org/W2970971581", "publication_year": 2019, "cited_by_count": 31488},
    ]}),
    base + "&cursor=c2": (200, {"meta": {"next_cursor": None}, "results": [
        {"id": "https://openalex.org/W3035965352", "publication_year": 2020, "cited_by_count": 23538},
    ]}),
}
print(citations_by_year(build_opener(Replay(saved)), base))
`,
        answer: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

def citations_by_year(opener, base_url):
    totals = {}
    seen = {}
    cursor = "*"
    while cursor is not None:
        url = base_url + "&" + urlencode({"cursor": cursor})
        with opener.open(url, timeout=10) as response:
            page = json.loads(response.read())
        for work in page["results"]:
            if work["id"] in seen:
                continue
            seen[work["id"]] = True
            year = work["publication_year"]
            totals[year] = totals.get(year, 0) + work["cited_by_count"]
        cursor = page["meta"]["next_cursor"]
    return totals

base = "https://api.openalex.org/works?search=python"
saved = {
    base + "&cursor=%2A": (200, {"meta": {"next_cursor": "c2"}, "results": [
        {"id": "https://openalex.org/W3003257820", "publication_year": 2020, "cited_by_count": 38040},
        {"id": "https://openalex.org/W2970971581", "publication_year": 2019, "cited_by_count": 31488},
    ]}),
    base + "&cursor=c2": (200, {"meta": {"next_cursor": None}, "results": [
        {"id": "https://openalex.org/W3035965352", "publication_year": 2020, "cited_by_count": 23538},
    ]}),
}
print(citations_by_year(build_opener(Replay(saved)), base))
`,
        alternatives: [
          src`
import json
from collections import defaultdict
from urllib.parse import urlencode

def citations_by_year(opener, base_url):
    works = {}
    cursor = "*"
    while True:
        page = json.loads(opener.open(base_url + "&" + urlencode({"cursor": cursor}), timeout=10).read())
        for work in page["results"]:
            works[work["id"]] = work
        cursor = page["meta"]["next_cursor"]
        if not cursor:
            break
    totals = defaultdict(int)
    for work in works.values():
        totals[work["publication_year"]] += work["cited_by_count"]
    return dict(totals)
`,
        ],
        wrong: [
          {
            code: src`
import json
from urllib.parse import urlencode

def citations_by_year(opener, base_url):
    totals = {}
    cursor = "*"
    while cursor is not None:
        with opener.open(base_url + "&" + urlencode({"cursor": cursor}), timeout=10) as response:
            page = json.loads(response.read())
        for work in page["results"]:
            year = work["publication_year"]
            totals[year] = totals.get(year, 0) + work["cited_by_count"]
        cursor = page["meta"]["next_cursor"]
    return totals
`,
            fails: ["repeat"],
            why: "a work that appears on two pages is counted twice",
          },
          {
            code: src`
import json
from urllib.parse import urlencode

def citations_by_year(opener, base_url):
    totals = {}
    with opener.open(base_url + "&" + urlencode({"cursor": "*"}), timeout=10) as response:
        page = json.loads(response.read())
    for work in page["results"]:
        year = work["publication_year"]
        totals[year] = totals.get(year, 0) + work["cited_by_count"]
    return totals
`,
            fails: ["returns", "repeat", "three"],
            why: "only the first page is read",
          },
        ],
        hints: [
          "Start with the cursor `\"*\"` and loop while it isn't None, updating it from each page's `meta`.",
          "Remember which work ids you've already counted: a dictionary used as a seen-set (see Collection Algorithms) works.",
          "Add each new work's citations to its year's running total, starting the total at 0 the first time.",
        ],
        task: {
          files,
          checks: [
            http("returns", "citations_by_year() totals each year across two pages", {
              "https://o.test/works?search=python&cursor=%2A": { body: { meta: { next_cursor: "c2" }, results: [scipy, pytorch] } },
              "https://o.test/works?search=python&cursor=c2": { body: { meta: { next_cursor: null }, results: [numpy] } },
            }, "citations_by_year(_op, 'https://o.test/works?search=python')", py.dict([[py.int(2020), py.int(61578)], [py.int(2019), py.int(31488)]]), { show: "citations_by_year(opener, base)" }),
            http("repeat", "a work that appears on two pages", {
              "https://o.test/w?f=1&cursor=%2A": { body: { meta: { next_cursor: "a" }, results: [numpy, ddpm] } },
              "https://o.test/w?f=1&cursor=a": { body: { meta: { next_cursor: "b" }, results: [ddpm, numpy2] } },
              "https://o.test/w?f=1&cursor=b": { body: { meta: { next_cursor: null }, results: [] } },
            }, "citations_by_year(_op, 'https://o.test/w?f=1')", py.dict([[py.int(2020), py.int(23538 + 8702 + 17093)]]), { hidden: true }),
            http("three", "three pages and three years", {
              "https://o.test/w?f=2&cursor=%2A": { body: { meta: { next_cursor: "x" }, results: [psychopy] } },
              "https://o.test/w?f=2&cursor=x": { body: { meta: { next_cursor: "y" }, results: [pymoo] } },
              "https://o.test/w?f=2&cursor=y": { body: { meta: { next_cursor: null }, results: [deepxde] } },
            }, "citations_by_year(_op, 'https://o.test/w?f=2')", py.dict([[py.int(2019), py.int(5179)], [py.int(2020), py.int(2362)], [py.int(2021), py.int(2527)]]), { hidden: true }),
            http("empty", "no works at all", { "https://o.test/w?f=3&cursor=%2A": { body: { meta: { next_cursor: null }, results: [] } } }, "citations_by_year(_op, 'https://o.test/w?f=3')", {}, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "An API returns 7 results with `per-page=3`, and the loop stops at the first page with fewer than 3 results. How many requests does it make?",
        program: src`
pages = [3, 3, 1]
requests = 0
for size in pages:
    requests += 1
    if size < 3:
        break
print(requests)
`,
        choices: ["3", "2", "4", "7"],
        answer: 0,
        why: "Pages hold 3, 3 and 1 results. The third page is short, so it is the last request. With exactly 6 results there'd be a fourth, empty page.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the cursor is never updated. What does this print?",
        program: src`
pages = {"*": ("c2", ["W1", "W2"]), "c2": (None, ["W3"])}
cursor = "*"
seen = []
for _ in range(4):
    next_cursor, results = pages[cursor]
    seen.extend(results)
    if next_cursor is None:
        break
print(len(seen), seen[-1])
`,
        choices: ["8 W2", "3 W3", "2 W2", "4 W2"],
        answer: 0,
        why: "`cursor` stays `\"*\"`, so every pass gets the first page again. Only the `range(4)` limit stops it, after 4 copies of 2 results. Without that limit the loop would never end.",
      },
      {
        id: "q3",
        prompt: "Why do large APIs such as OpenAlex offer cursor pagination as well as page numbers?",
        choices: [
          "A cursor continues from where the last page ended even if records are added or reordered between requests, and it can go past the page-number limit",
          "Cursors make each response smaller",
          "Cursors let you jump straight to page 500",
          "Page numbers don't work with JSON",
        ],
        answer: 0,
        why: "With page numbers, a record inserted while you read moves everything along, so one item can appear twice and another be skipped. OpenAlex also only serves the first 10,000 results by page number; a cursor walks the whole result.",
      },
    ],
    review: [
      "Paginated APIs send results a page at a time: page numbers, offsets (USGS starts at 1) or cursors.",
      "Keep each page's results, then stop on the end signal: a short or empty page, or no next cursor.",
      "Limit the number of pages, and deduplicate by id when results can shift between requests.",
      "Next: requests that are slow or fail for a moment, and how to retry them safely.",
    ],
  },

  // ------------------------------------------------------------------ PY-L31-04 retries and timeouts
  {
    id: "PY-L31-04",
    version: 2,
    slug: "retries-and-timeouts",
    title: "Timeouts and retries",
    lede: "Networks fail in passing: a server is busy, a response is slow, a connection drops. A timeout stops a request from waiting forever; a retry with growing waits gets past a short failure without hammering the server.",
    focus: "Give every request a timeout, and retry only temporary failures a limited number of times with growing waits.",
    minutes: 22,
    objectives: [
      "Explain what `timeout=` does and recognise the `URLError` whose reason is `TimeoutError`",
      "Tell temporary failures (timeouts, 429, 502, 503, 504) from permanent ones (400, 401, 404)",
      "Write a retry loop with a limit and exponential backoff, honouring `Retry-After`",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "break-statement", "class-def", "comparison", "conversion", "dict-get", "dict-literal", "dict-lookup", "else-clause", "exc-name", "except-type", "file-open", "for-loop", "function-def", "function-default", "function-doc", "function-param", "function-return", "http-get", "identity", "if-statement", "import-module", "init-method", "json-dumps", "json-loads", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-dict", "none-value", "package-import", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "response-body", "self-name", "string-index", "subclass", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call", "with-statement"],
    teaches: ["retry-stop"],
    blocks: [
      {
        kind: "text",
        md: "Some failures last a moment. A server under load answers **503 Service Unavailable**, an API that thinks you're too fast answers **429 Too Many Requests** (often with a `Retry-After` header saying how many seconds to wait), and sometimes no answer comes at all.\n\n`timeout=` sets how many seconds urllib waits for the connection and for each read. When it runs out, `open` raises **`URLError`** whose `reason` is a `TimeoutError` (a read that stalls later raises `TimeoutError` itself). The replay in this course compares each saved response's real duration with your timeout and raises the same error, without actually waiting.",
      },
      {
        kind: "example",
        title: "A slow answer and a timeout",
        code: REPLAY_HEAD.replace("status, body = self.saved.get(request.full_url, (404, {\"error\": \"Not Found\"}))", "status, body, seconds = self.saved[request.full_url]\n        if seconds > request.timeout:\n            raise URLError(TimeoutError(\"timed out\"))").replace("from urllib.request import", "from urllib.error import URLError\nfrom urllib.request import") + src`

url = "https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&starttime=2025-01-01&endtime=2025-07-01"
opener = build_opener(Replay({url: (200, {"count": 12855, "maxAllowed": 20000}, 3.2)}))

for timeout in [2, 5]:
    try:
        with opener.open(url, timeout=timeout) as response:
            print(timeout, "s: count =", json.loads(response.read())["count"])
    except URLError as err:
        print(timeout, "s:", type(err.reason).__name__, err.reason)
`,
        output: "2 s: TimeoutError timed out\n5 s: count = 12855\n",
        note: "This saved response took 3.2 seconds on the real server. With a 2-second timeout the request is abandoned; with 5 seconds it succeeds. Choose a timeout longer than the API normally needs, but short enough that your program notices when something is wrong.",
      },
      {
        kind: "text",
        md: "Should you try again? Only when the failure might go away: a timeout, a refused or dropped connection, 429, 500, 502, 503, 504. A 400, 401, 403 or 404 will fail the same way every time, so retrying only adds load.\n\nWait between attempts, longer each time: 1 s, 2 s, 4 s (**exponential backoff**), so a struggling server gets room to recover. Limit the attempts, and when they are used up, raise the last error so the caller knows. A function that sleeps is slow to test, so take the sleep function as a parameter (dependency injection, the Advanced OOP & Design module): `time.sleep` in production, something that just records the waits in a test.",
      },
      {
        kind: "example",
        title: "Retry a busy server with backoff",
        code: REPLAY_HEAD.replace("status, body = self.saved.get(request.full_url, (404, {\"error\": \"Not Found\"}))", "status, body = self.saved[request.full_url].pop(0)") + src`
import time
from urllib.error import HTTPError

RETRY_STATUSES = [429, 500, 502, 503, 504]

def get_json_with_retries(opener, url, attempts=4, sleep=time.sleep):
    wait = 1
    for attempt in range(1, attempts + 1):
        try:
            with opener.open(url, timeout=10) as response:
                return json.loads(response.read())
        except HTTPError as err:
            if err.code not in RETRY_STATUSES or attempt == attempts:
                raise
        sleep(wait)
        wait *= 2

url = "https://api.openalex.org/works/W3036167779"
saved = {url: [(503, {"error": "busy"}), (503, {"error": "busy"}), (200, {"cited_by_count": 8702})]}
waits = []
work = get_json_with_retries(build_opener(Replay(saved)), url, sleep=waits.append)
print(work["cited_by_count"], "after waiting", waits)
`,
        output: "8702 after waiting [1, 2]\n",
        note: "Two 503s, then success: the function waited 1 s and 2 s. Passing `waits.append` as `sleep` records the waits instead of sleeping, so the example runs instantly; real code keeps the default `time.sleep`. A 404 would be raised at once, and a fourth 503 would be raised after the last attempt.",
      },
      {
        kind: "text",
        md: "**When to use it:** every program that talks to a network service. **Mistakes to avoid:** no timeout; retrying 4xx errors; retrying forever or without waiting; sleeping with no limit on the total time; and catching `URLError` before `HTTPError` (an `HTTPError` *is* a `URLError`, so the first `except` would swallow every status). Retry only requests that are safe to repeat: a GET is; a POST that charges a card may not be.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Back off exponentially",
      prompt: "`backoff_waits` returns the waits a retry loop uses between attempts, but every wait is the same `first` seconds. Make each wait twice the one before: `first`, `2 × first`, `4 × first`, …",
      spec: [
        ["Function", "`backoff_waits(attempts, first)`"],
        ["Returns", "the `attempts − 1` waits between attempts, e.g. `backoff_waits(4, 1)` → `[1, 2, 4]`"],
      ],
      starter: src`
def backoff_waits(attempts, first):
    waits = []
    wait = first
    for _ in range(attempts - 1):
        waits.append(wait)
    return waits

print(backoff_waits(4, 1))
`,
      answer: src`
def backoff_waits(attempts, first):
    waits = []
    wait = first
    for _ in range(attempts - 1):
        waits.append(wait)
        wait *= 2
    return waits

print(backoff_waits(4, 1))
`,
      wrong: [
        {
          code: src`
def backoff_waits(attempts, first):
    waits = []
    wait = first
    for _ in range(attempts - 1):
        wait *= 2
        waits.append(wait)
    return waits
`,
          fails: ["returns"],
          why: "doubling before appending skips the first wait",
        },
      ],
      hints: ["The loop appends the same `wait` every time.", "After appending, the next wait should be twice as long.", "Multiply `wait` by 2 after the `append`."],
      task: {
        checks: [
          fn("returns", "backoff_waits", [
            example([4, 1], [1, 2, 4]),
            hiddenCase("a half-second first wait", [5, 0.5], [0.5, py.float(1), py.float(2), py.float(4)]),
            hiddenCase("a single attempt", [1, 3], []),
          ], { label: "backoff_waits() doubles each wait" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Worth retrying?",
        prompt: "Write `is_retryable(error)`: given the exception a request raised, return `True` when trying again might work and `False` otherwise. Careful: `HTTPError` is a subclass of `URLError`, so test for it first.",
        spec: [
          ["Function", "`is_retryable(error)`"],
          ["True for", "an `HTTPError` with code 429, 500, 502, 503 or 504; a `URLError` whose `reason` is a `TimeoutError` or a `ConnectionError` (refused, reset); a bare `TimeoutError`"],
          ["False for", "any other `HTTPError` (400, 401, 403, 404, …), any other `URLError` (for example an unknown host), and any other exception"],
          ["Example", "`is_retryable(HTTPError(url, 503, \"Service Unavailable\", None, None))` → `True`"],
        ],
        starter: src`
from urllib.error import HTTPError, URLError

def is_retryable(error):
    return False

url = "https://api.openalex.org/works/W1"
print(is_retryable(HTTPError(url, 503, "Service Unavailable", None, None)))
print(is_retryable(HTTPError(url, 404, "Not Found", None, None)))
print(is_retryable(URLError(TimeoutError("timed out"))))
`,
        answer: src`
from urllib.error import HTTPError, URLError

RETRY_STATUSES = [429, 500, 502, 503, 504]

def is_retryable(error):
    if isinstance(error, HTTPError):
        return error.code in RETRY_STATUSES
    if isinstance(error, URLError):
        return isinstance(error.reason, (TimeoutError, ConnectionError))
    return isinstance(error, TimeoutError)

url = "https://api.openalex.org/works/W1"
print(is_retryable(HTTPError(url, 503, "Service Unavailable", None, None)))
print(is_retryable(HTTPError(url, 404, "Not Found", None, None)))
print(is_retryable(URLError(TimeoutError("timed out"))))
`,
        alternatives: [
          src`
from urllib.error import HTTPError, URLError

def is_retryable(error):
    try:
        raise error
    except HTTPError as err:
        return err.code == 429 or err.code in (500, 502, 503, 504)
    except URLError as err:
        return isinstance(err.reason, TimeoutError) or isinstance(err.reason, ConnectionError)
    except TimeoutError:
        return True
    except Exception:
        return False
`,
        ],
        wrong: [
          {
            code: src`
from urllib.error import HTTPError, URLError

def is_retryable(error):
    if isinstance(error, URLError):
        return isinstance(error.reason, (TimeoutError, ConnectionError))
    if isinstance(error, HTTPError):
        return error.code in [429, 500, 502, 503, 504]
    return isinstance(error, TimeoutError)
`,
            fails: ["returns", "too-many"],
            why: "every HTTPError is caught by the URLError test first, and its reason is just the status text",
          },
          {
            code: src`
from urllib.error import HTTPError, URLError

def is_retryable(error):
    if isinstance(error, HTTPError):
        return error.code >= 400
    if isinstance(error, URLError):
        return isinstance(error.reason, (TimeoutError, ConnectionError))
    return isinstance(error, TimeoutError)
`,
            fails: ["not-found", "bad-request"],
            why: "4xx errors are retried too, although they fail the same way every time",
          },
          {
            code: src`
from urllib.error import HTTPError, URLError

def is_retryable(error):
    if isinstance(error, HTTPError):
        return error.code in [429, 500, 502, 503, 504]
    return isinstance(error, URLError)
`,
            fails: ["unknown-host", "bare-timeout"],
            why: "every URLError counts as temporary, including a misspelt host, and a bare TimeoutError doesn't",
          },
        ],
        hints: [
          "Use `isinstance`, and order matters: an HTTPError is also a URLError.",
          "An HTTPError's `code` decides; keep the retryable codes in a list.",
          "For a URLError, look at `error.reason`: is it a TimeoutError or a ConnectionError? Anything else, and any other exception, isn't retryable.",
        ],
        task: {
          checks: [
            { kind: "expr", id: "returns", label: "a 503 is worth retrying", show: "is_retryable(HTTPError(url, 503, ...))", expr: "from urllib.error import HTTPError as _H\nresult = is_retryable(_H('https://a.test/w', 503, 'Service Unavailable', None, None))", expected: py.bool(true) },
            { kind: "expr", id: "not-found", label: "a 404 isn't", show: "is_retryable(HTTPError(url, 404, ...))", expr: "from urllib.error import HTTPError as _H\nresult = is_retryable(_H('https://a.test/w', 404, 'Not Found', None, None))", expected: py.bool(false) },
            { kind: "expr", id: "timeout", label: "a URLError caused by a timeout is", show: "is_retryable(URLError(TimeoutError('timed out')))", expr: "from urllib.error import URLError as _U\nresult = is_retryable(_U(TimeoutError('timed out')))", expected: py.bool(true) },
            { kind: "expr", id: "too-many", label: "429 Too Many Requests", hidden: true, expr: "from urllib.error import HTTPError as _H\nresult = is_retryable(_H('https://a.test/w', 429, 'Too Many Requests', None, None))", expected: py.bool(true) },
            { kind: "expr", id: "bad-request", label: "400 Bad Request", hidden: true, expr: "from urllib.error import HTTPError as _H\nresult = is_retryable(_H('https://a.test/w', 400, 'Bad Request', None, None))", expected: py.bool(false) },
            { kind: "expr", id: "refused", label: "a refused connection", hidden: true, expr: "from urllib.error import URLError as _U\nresult = is_retryable(_U(ConnectionRefusedError(111, 'Connection refused')))", expected: py.bool(true) },
            { kind: "expr", id: "unknown-host", label: "a host name that doesn't exist", hidden: true, expr: "import socket as _so\nfrom urllib.error import URLError as _U\nresult = is_retryable(_U(_so.gaierror(-2, 'Name or service not known')))", expected: py.bool(false) },
            { kind: "expr", id: "bare-timeout", label: "a read that timed out", hidden: true, expr: "result = is_retryable(TimeoutError('The read operation timed out'))", expected: py.bool(true) },
            { kind: "expr", id: "other", label: "an error that isn't about the network", hidden: true, expr: "result = is_retryable(ValueError('bad JSON'))", expected: py.bool(false) },
          ],
        },
      },
      {
        id: "c2",
        title: "Retry, and honour Retry-After",
        prompt: "Write `fetch_json(opener, url, attempts, sleep)`: open `url` with a 5-second timeout and return the parsed JSON. Retry a 429 or 503 and a timed-out request (a `URLError` whose reason is a `TimeoutError`), up to `attempts` tries in total. Before retrying a response that has a `Retry-After` header, wait that many seconds; otherwise wait 1, 2, 4, … seconds. Any other error is raised at once; after the last attempt, raise the last error.",
        spec: [
          ["Function", "`fetch_json(opener, url, attempts, sleep)`"],
          ["sleep", "call `sleep(seconds)` for every wait (the checks pass a function that records the waits)"],
          ["Returns", "the parsed JSON body of the first successful response"],
          ["Waits", "`Retry-After` (whole seconds) when the failed response has it; otherwise 1, 2, 4, … counting only waits without the header"],
          ["Example", "503 with `Retry-After: 3`, then a timeout, then 200 → waits `[3, 1]`"],
        ],
        starter: src`
import json
from urllib.error import HTTPError, URLError
from urllib.request import build_opener
from replay import Replay

def fetch_json(opener, url, attempts, sleep):
    return None

url = "https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&minmagnitude=7"
saved = {url: [
    {"status": 503, "body": {"error": "busy"}, "headers": {"Retry-After": "3"}},
    {"body": {"count": 7}, "seconds": 9},
    {"body": {"count": 7}},
]}
waits = []
print(fetch_json(build_opener(Replay(saved)), url, 4, waits.append), waits)
`,
        answer: src`
import json
from urllib.error import HTTPError, URLError
from urllib.request import build_opener
from replay import Replay

def fetch_json(opener, url, attempts, sleep):
    backoff = 1
    for attempt in range(1, attempts + 1):
        retry_after = None
        try:
            with opener.open(url, timeout=5) as response:
                return json.loads(response.read())
        except HTTPError as err:
            if err.code not in [429, 503] or attempt == attempts:
                raise
            retry_after = err.headers.get("Retry-After")
        except URLError as err:
            if not isinstance(err.reason, TimeoutError) or attempt == attempts:
                raise
        if retry_after is not None:
            sleep(int(retry_after))
        else:
            sleep(backoff)
            backoff *= 2

url = "https://earthquake.usgs.gov/fdsnws/event/1/count?format=geojson&minmagnitude=7"
saved = {url: [
    {"status": 503, "body": {"error": "busy"}, "headers": {"Retry-After": "3"}},
    {"body": {"count": 7}, "seconds": 9},
    {"body": {"count": 7}},
]}
waits = []
print(fetch_json(build_opener(Replay(saved)), url, 4, waits.append), waits)
`,
        alternatives: [
          src`
import json
from urllib.error import HTTPError, URLError

def fetch_json(opener, url, attempts, sleep):
    delays = [2 ** n for n in range(attempts)]
    last = None
    for attempt in range(attempts):
        try:
            return json.loads(opener.open(url, timeout=5).read())
        except HTTPError as err:
            if err.code not in (429, 503):
                raise
            last = err
            header = err.headers.get("Retry-After")
        except URLError as err:
            if not isinstance(err.reason, TimeoutError):
                raise
            last = err
            header = None
        if attempt == attempts - 1:
            raise last
        if header:
            sleep(int(header))
        else:
            sleep(delays.pop(0))
`,
        ],
        wrong: [
          {
            code: src`
import json
from urllib.error import HTTPError, URLError

def fetch_json(opener, url, attempts, sleep):
    backoff = 1
    for attempt in range(1, attempts + 1):
        try:
            with opener.open(url, timeout=5) as response:
                return json.loads(response.read())
        except HTTPError as err:
            if err.code not in [429, 503] or attempt == attempts:
                raise
        except URLError as err:
            if not isinstance(err.reason, TimeoutError) or attempt == attempts:
                raise
        sleep(backoff)
        backoff *= 2
`,
            fails: ["returns", "rate-limited"],
            why: "`Retry-After` is ignored, so it retries sooner than the server asked",
          },
          {
            code: src`
import json
from urllib.error import HTTPError, URLError

def fetch_json(opener, url, attempts, sleep):
    backoff = 1
    for attempt in range(1, attempts + 1):
        retry_after = None
        try:
            with opener.open(url, timeout=5) as response:
                return json.loads(response.read())
        except URLError as err:
            if attempt == attempts:
                raise
            if isinstance(err, HTTPError):
                retry_after = err.headers.get("Retry-After")
        if retry_after is not None:
            sleep(int(retry_after))
        else:
            sleep(backoff)
            backoff *= 2
`,
            fails: ["not-found"],
            why: "every error is retried, so a 404 costs three pointless requests and waits before it is raised",
          },
          {
            code: src`
import json
from urllib.error import HTTPError, URLError

def fetch_json(opener, url, attempts, sleep):
    backoff = 1
    for attempt in range(attempts):
        retry_after = None
        try:
            with opener.open(url, timeout=5) as response:
                return json.loads(response.read())
        except HTTPError as err:
            if err.code not in [429, 503]:
                raise
            retry_after = err.headers.get("Retry-After")
        except URLError as err:
            if not isinstance(err.reason, TimeoutError):
                raise
        if retry_after is not None:
            sleep(int(retry_after))
        else:
            sleep(backoff)
            backoff *= 2
    return None
`,
            fails: ["gives-up"],
            why: "after the last attempt it waits once more and returns None instead of raising, so the caller can't tell the request failed",
          },
        ],
        hints: [
          "Loop over the attempt numbers; inside, `try` the request and return as soon as one succeeds.",
          "Two `except` clauses, `HTTPError` first: each re-raises when the error isn't retryable or this was the last attempt. Keep the `Retry-After` header from a retryable HTTPError (`err.headers.get(...)`).",
          "After an `except` that didn't raise, wait: the header's seconds when there was one, otherwise the backoff, which doubles only after it is used.",
        ],
        task: {
          files,
          checks: [
            http("returns", "a 503 with Retry-After, a timeout, then success", { "https://e.test/count": [{ status: 503, body: { error: "busy" }, headers: { "Retry-After": "3" } }, { body: { count: 7 }, seconds: 9 }, { body: { count: 7 } }] }, "(fetch_json(_op, 'https://e.test/count', 4, _waits.append), _waits)", py.tuple(pv({ count: 7 }), pv([3, 1])), { show: "fetch_json(opener, url, 4, waits.append), waits", before: "_waits = []" }),
            http("not-found", "a 404 is raised at once, without waiting", { "https://o.test/w": [{ status: 404, body: { error: "Not Found" } }, { body: { ok: true } }] }, "_attempt()", py.tuple(py.str("HTTPError"), py.list(), py.int(1)), { show: "fetch_json(opener, url, 4, waits.append) for a missing work", before: "_waits = []\ndef _attempt():\n    try:\n        fetch_json(_op, 'https://o.test/w', 4, _waits.append)\n    except Exception as _e:\n        return (type(_e).__name__, _waits, len(_rp.requests))\n    return ('no error', _waits, len(_rp.requests))" }),
            http("gives-up", "a server that stays down: the last error after the last attempt", { "https://o.test/down": { status: 503, body: { error: "busy" } } }, "_attempt()", py.tuple(py.str("HTTPError"), pv([1, 2]), py.int(3)), { hidden: true, before: "_waits = []\ndef _attempt():\n    try:\n        fetch_json(_op, 'https://o.test/down', 3, _waits.append)\n    except Exception as _e:\n        return (type(_e).__name__, _waits, len(_rp.requests))\n    return ('no error', _waits, len(_rp.requests))" }),
            http("rate-limited", "two 429s with different Retry-After values", { "https://o.test/rl": [{ status: 429, body: {}, headers: { "Retry-After": "10" } }, { status: 429, body: {}, headers: { "Retry-After": "4" } }, { body: [1, 2, 3] }] }, "(fetch_json(_op, 'https://o.test/rl', 5, _waits.append), _waits)", py.tuple(pv([1, 2, 3]), pv([10, 4])), { hidden: true, before: "_waits = []" }),
            http("timeouts", "two timeouts, then success", { "https://o.test/slow": [{ body: {}, seconds: 30 }, { body: {}, seconds: 30 }, { body: { done: true }, seconds: 1 }] }, "(fetch_json(_op, 'https://o.test/slow', 3, _waits.append), _waits)", py.tuple(pv({ done: true }), pv([1, 2])), { hidden: true, before: "_waits = []" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from urllib.error import HTTPError, URLError

err = HTTPError("https://api.openalex.org/works", 503, "Service Unavailable", None, None)
print(isinstance(err, URLError), err.code)
try:
    raise err
except URLError:
    print("caught as URLError")
except HTTPError:
    print("caught as HTTPError")
`,
        choices: ["True 503\ncaught as URLError", "False 503\ncaught as HTTPError", "True 503\ncaught as HTTPError", "True 503\ncaught as URLError\ncaught as HTTPError"],
        answer: 0,
        why: "`HTTPError` is a subclass of `URLError`. Python uses the first `except` that matches, so the `HTTPError` clause is never reached. Put the more specific class first.",
      },
      {
        id: "q2",
        prompt: "A common mistake in a retry loop. How many times is the server asked, and what happens at the end?",
        program: src`
attempts = 0
def get():
    global attempts
    attempts += 1
    raise TimeoutError("timed out")

for attempt in range(3):
    try:
        get()
        break
    except TimeoutError:
        pass
print(attempts, "attempts; the caller sees no error")
`,
        choices: ["3 attempts; the caller sees no error", "1 attempts; the caller sees no error", "3 attempts and then TimeoutError", "an endless loop"],
        answer: 0,
        why: "Every failure is swallowed, including the last one, so the program carries on as if the request had worked. After the final attempt the error must be raised (and the loop should wait between attempts).",
      },
      {
        id: "q3",
        prompt: "Which request is unsafe to retry automatically after a timeout?",
        choices: [
          "A POST that charges a customer's card",
          "A GET for the list of yesterday's earthquakes",
          "A GET for one OpenAlex work",
          "A GET for page 3 of search results",
        ],
        answer: 0,
        why: "After a timeout you don't know whether the server acted. Repeating a GET only reads again; repeating the POST might charge twice. APIs that need safe retries offer idempotency keys for that.",
      },
    ],
    review: [
      "Pass `timeout=` on every request; a timeout raises `URLError` with a `TimeoutError` reason (or `TimeoutError` while reading).",
      "Retry timeouts, connection errors, 429 and 5xx; raise 4xx at once. Test `HTTPError` before `URLError`.",
      "Limit the attempts, wait longer each time (or as long as `Retry-After` says), and raise the last error.",
      "Next: wrapping requests, pagination and errors in a small client class.",
    ],
  },

  // ------------------------------------------------------------------ PY-L31-05 client architecture
  {
    id: "PY-L31-05",
    version: 2,
    slug: "api-client-class",
    title: "An API client class",
    lede: "When a program calls an API from many places, URL building, headers, timeouts and error handling get repeated and drift apart. A client class keeps them in one place, offers methods that say what you want, and takes its opener as a parameter so tests can replace the network.",
    focus: "Wrap an API in a class that owns the base URL, headers, timeout and opener, translates errors, and exposes one method per question.",
    minutes: 24,
    objectives: [
      "Move the base URL, default parameters, headers and timeout into one `_get` method",
      "Give callers methods named after their questions, returning plain Python data",
      "Translate HTTP errors into the client's own exceptions, and test the client with an injected replay opener",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "break-statement", "class-def", "comparison", "conditional-expr", "dict-get", "dict-literal", "dict-lookup", "exc-name", "except-type", "file-open", "for-loop", "function-def", "function-default", "function-doc", "function-param", "function-return", "http-get", "identity", "if-statement", "import-module", "init-method", "json-dumps", "json-loads", "len-call", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-dict", "nested-loop", "none-value", "package-import", "plain-class", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "response-body", "self-name", "star-kwargs", "string-format", "string-index", "string-slice", "subclass", "super-call", "test-func", "top-level-indent", "try-except", "tuple-unpack", "type-call", "unittest-case", "value-count", "while-loop", "with-statement"],
    teaches: ["client-fn"],
    blocks: [
      {
        kind: "text",
        md: "After four lessons the pieces are clear: build a URL, add headers, open with a timeout, parse JSON, handle errors, follow pages. Copying them into every function that needs data means a change (a new header, a different timeout) has to be made everywhere.\n\nAn **API client** is a class that owns those decisions. Its constructor receives the base URL, the settings, and the **opener** (dependency injection, the Advanced OOP & Design module): `build_opener()` in production, a replay opener in a test. One private method, `_get(path, params)`, does the request; public methods such as `count(...)` or `work(...)` say what the caller wants and return dictionaries and numbers. Errors become the client's own exception classes, so callers don't need to know urllib.",
      },
      {
        kind: "example",
        title: "A small USGS client",
        code: REPLAY_HEAD + src`
from urllib.error import HTTPError
from urllib.parse import urlencode

class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(f"{status}: {message}")
        self.status = status

class UsgsClient:
    base = "https://earthquake.usgs.gov/fdsnws/event/1/"

    def __init__(self, opener, timeout=10):
        self.opener = opener
        self.timeout = timeout

    def _get(self, path, params):
        url = self.base + path + "?" + urlencode({"format": "geojson", **params})
        request = Request(url, headers={"Accept": "application/json", "User-Agent": "quake-report/1.0"})
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                return json.loads(response.read())
        except HTTPError as err:
            raise ApiError(err.code, err.reason) from err

    def count(self, start, end, min_magnitude):
        return self._get("count", {"starttime": start, "endtime": end, "minmagnitude": min_magnitude})["count"]

    def places(self, start, end, min_magnitude):
        data = self._get("query", {"starttime": start, "endtime": end, "minmagnitude": min_magnitude})
        return [feature["properties"]["place"] for feature in data["features"]]

base = UsgsClient.base
saved = {
    base + "count?format=geojson&starttime=2025-03-01&endtime=2025-04-01&minmagnitude=7": (200, {"count": 2, "maxAllowed": 20000}),
    base + "query?format=geojson&starttime=2025-03-01&endtime=2025-04-01&minmagnitude=7": (200, {"features": [
        {"properties": {"place": "2025 Mandalay, Burma (Myanmar) Earthquake"}},
        {"properties": {"place": "170 km WSW of Riverton, New Zealand"}},
    ]}),
}
client = UsgsClient(build_opener(Replay(saved)))
print(client.count("2025-03-01", "2025-04-01", 7))
print(client.places("2025-03-01", "2025-04-01", 7))
try:
    client.count("2025-03-01", "2025-04-01", 9)
except ApiError as err:
    print("ApiError", err.status, err)
`,
        output: "2\n['2025 Mandalay, Burma (Myanmar) Earthquake', '170 km WSW of Riverton, New Zealand']\nApiError 404 404: Not Found\n",
        note: "Callers ask `client.count(...)` and never see a URL, a header or urllib's error classes. The last call asks for a URL with no saved response, so the replay answers 404 and the client turns it into its own `ApiError`. Switching to the live API is one line: `UsgsClient(build_opener())`.",
      },
      {
        kind: "text",
        md: "Because the opener comes in from outside, the client can be tested with no network at all, and the replay's list of requests shows exactly what the client sent. That makes tests like *does `count` ask for the right URL?* and *does a 503 become an ApiError?* fast and deterministic.",
      },
      {
        kind: "example",
        title: "Testing the client's requests",
        code: src`
import io
import json
import unittest
from email.message import Message
from http import HTTPStatus
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import BaseHandler, Request, build_opener
from urllib.response import addinfourl

class Spy(BaseHandler):
    """Answers every request with one saved response and remembers what was asked."""
    handler_order = 100

    def __init__(self, status, body):
        self.status, self.body, self.requests = status, body, []

    def https_open(self, request):
        self.requests.append(request)
        headers = Message()
        headers["Content-Type"] = "application/json"
        response = addinfourl(io.BytesIO(json.dumps(self.body).encode()), headers, request.full_url, self.status)
        response.msg = HTTPStatus(self.status).phrase
        return response

class OpenAlexClient:
    def __init__(self, opener, mailto):
        self.opener, self.mailto = opener, mailto

    def cited_by_count(self, work_id):
        url = f"https://api.openalex.org/works/{work_id}?" + urlencode({"mailto": self.mailto})
        with self.opener.open(Request(url), timeout=10) as response:
            return json.loads(response.read())["cited_by_count"]

class ClientTests(unittest.TestCase):
    def test_sends_mailto_and_reads_count(self):
        spy = Spy(200, {"cited_by_count": 8702})
        client = OpenAlexClient(build_opener(spy), "ana@example.com")
        self.assertEqual(client.cited_by_count("W3036167779"), 8702)
        self.assertEqual(spy.requests[0].full_url, "https://api.openalex.org/works/W3036167779?mailto=ana%40example.com")

    def test_server_error_is_raised(self):
        client = OpenAlexClient(build_opener(Spy(503, {"error": "busy"})), "ana@example.com")
        with self.assertRaises(HTTPError):
            client.cited_by_count("W3036167779")

result = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(ClientTests))
print(result.testsRun, "tests,", len(result.failures), "failures,", len(result.errors), "errors")
`,
        output: "2 tests, 0 failures, 0 errors\n",
        note: "The spy handler is a test double (see Testing & Code Quality): it answers instantly and records each `Request`. The first test checks the URL the client built, including the encoded `mailto`; the second shows that the client doesn't hide server errors.",
      },
      {
        kind: "text",
        md: "**When to use it:** as soon as a program calls an API from more than one place, or needs tests that don't touch the network. **Mistakes to avoid:** creating the opener inside the class (then nothing can replace it in a test); returning raw response objects instead of data; letting each method build its own URL and headers; and swallowing errors inside the client so callers get `None` without knowing why.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Identify the client",
      prompt: "OpenAlex asks clients to identify themselves. Change `_get` so every request also sends the header `User-Agent: works-report/1.0 (<mailto>)`, using the client's `mailto`.",
      spec: [
        ["Class", "`OpenAlexClient(opener, mailto)` with `_get(path)` returning the parsed JSON"],
        ["Header", "`User-Agent: works-report/1.0 (ana@example.com)` for mailto `ana@example.com`"],
      ],
      starter: src`
import json
from urllib.request import Request, build_opener
from replay import Replay

class OpenAlexClient:
    base = "https://api.openalex.org/"

    def __init__(self, opener, mailto):
        self.opener = opener
        self.mailto = mailto

    def _get(self, path):
        request = Request(self.base + path, headers={"Accept": "application/json"})
        with self.opener.open(request, timeout=10) as response:
            return json.loads(response.read())

replay = Replay({"https://api.openalex.org/works/W3036167779": (200, {"cited_by_count": 8702})})
client = OpenAlexClient(build_opener(replay), "ana@example.com")
print(client._get("works/W3036167779"))
print(replay.requests[0].get_header("User-agent"))
`,
      answer: src`
import json
from urllib.request import Request, build_opener
from replay import Replay

class OpenAlexClient:
    base = "https://api.openalex.org/"

    def __init__(self, opener, mailto):
        self.opener = opener
        self.mailto = mailto

    def _get(self, path):
        headers = {"Accept": "application/json", "User-Agent": f"works-report/1.0 ({self.mailto})"}
        request = Request(self.base + path, headers=headers)
        with self.opener.open(request, timeout=10) as response:
            return json.loads(response.read())

replay = Replay({"https://api.openalex.org/works/W3036167779": (200, {"cited_by_count": 8702})})
client = OpenAlexClient(build_opener(replay), "ana@example.com")
print(client._get("works/W3036167779"))
print(replay.requests[0].get_header("User-agent"))
`,
      wrong: [
        {
          code: src`
import json
from urllib.request import Request

class OpenAlexClient:
    base = "https://api.openalex.org/"

    def __init__(self, opener, mailto):
        self.opener = opener
        self.mailto = mailto

    def _get(self, path):
        request = Request(self.base + path, headers={"Accept": "application/json", "User-Agent": "works-report/1.0 (ana@example.com)"})
        with self.opener.open(request, timeout=10) as response:
            return json.loads(response.read())
`,
          fails: ["other-mailto"],
          why: "the address is typed in, so a client made with another mailto still sends Ana's",
        },
      ],
      hints: ["Headers are the dictionary passed to `Request`.", "The value includes the client's own `mailto`, so build it with an f-string from `self.mailto`.", "Add a `\"User-Agent\"` entry next to `\"Accept\"`."],
      task: {
        files,
        checks: [
          http("returns", "the request carries the User-Agent", { "https://api.openalex.org/works/W3036167779": { body: { cited_by_count: 8702 } } }, "(OpenAlexClient(_op, 'ana@example.com')._get('works/W3036167779'), _rp.requests[0].get_header('User-agent'))", py.tuple(pv({ cited_by_count: 8702 }), py.str("works-report/1.0 (ana@example.com)")), { show: "client._get('works/W3036167779') and the User-Agent it sent" }),
          http("other-mailto", "a client with a different mailto", { "https://api.openalex.org/works": { body: { results: [] } } }, "(OpenAlexClient(_op, 'data-team@example.org')._get('works'), _rp.requests[0].get_header('User-agent'))[1]", "works-report/1.0 (data-team@example.org)", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A client with its own errors",
        prompt: "Write the class `OpenAlexClient(opener, mailto)` with a method `work(work_id)` that returns `{\"title\": …, \"year\": …, \"citations\": …}` for `https://api.openalex.org/works/<work_id>?mailto=<mailto>` (mailto encoded with `urlencode`, timeout 10). Translate errors: a 404 raises `NotFound`, any other HTTP error raises `ApiError` with the status in its `status` attribute. Both classes are in the starter; `NotFound` is a kind of `ApiError`.",
        spec: [
          ["Class", "`OpenAlexClient(opener, mailto)`"],
          ["Method", "`work(work_id)` → `{\"title\", \"year\", \"citations\"}` from `title`, `publication_year`, `cited_by_count`"],
          ["Raises", "`NotFound(404)` for a 404; `ApiError(status)` for other 4xx/5xx statuses; never urllib's HTTPError"],
        ],
        starter: src`
import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, build_opener
from replay import Replay

class ApiError(Exception):
    def __init__(self, status):
        super().__init__(f"OpenAlex answered {status}")
        self.status = status

class NotFound(ApiError):
    pass

class OpenAlexClient:
    pass

saved = {"https://api.openalex.org/works/W3003257820?mailto=ana%40example.com": (200, {
    "title": "SciPy 1.0: fundamental algorithms for scientific computing in Python",
    "publication_year": 2020, "cited_by_count": 38040,
})}
client = OpenAlexClient(build_opener(Replay(saved)), "ana@example.com")
print(client.work("W3003257820"))
`,
        answer: src`
import json
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, build_opener
from replay import Replay

class ApiError(Exception):
    def __init__(self, status):
        super().__init__(f"OpenAlex answered {status}")
        self.status = status

class NotFound(ApiError):
    pass

class OpenAlexClient:
    base = "https://api.openalex.org/"

    def __init__(self, opener, mailto):
        self.opener = opener
        self.mailto = mailto

    def _get(self, path):
        url = self.base + path + "?" + urlencode({"mailto": self.mailto})
        try:
            with self.opener.open(Request(url), timeout=10) as response:
                return json.loads(response.read())
        except HTTPError as err:
            if err.code == 404:
                raise NotFound(404) from err
            raise ApiError(err.code) from err

    def work(self, work_id):
        data = self._get("works/" + work_id)
        return {"title": data["title"], "year": data["publication_year"], "citations": data["cited_by_count"]}

saved = {"https://api.openalex.org/works/W3003257820?mailto=ana%40example.com": (200, {
    "title": "SciPy 1.0: fundamental algorithms for scientific computing in Python",
    "publication_year": 2020, "cited_by_count": 38040,
})}
client = OpenAlexClient(build_opener(Replay(saved)), "ana@example.com")
print(client.work("W3003257820"))
`,
        alternatives: [
          src`
import json
from urllib.error import HTTPError
from urllib.parse import urlencode

class ApiError(Exception):
    def __init__(self, status):
        super().__init__(f"OpenAlex answered {status}")
        self.status = status

class NotFound(ApiError):
    pass

class OpenAlexClient:
    def __init__(self, opener, mailto):
        self.opener = opener
        self.query = urlencode({"mailto": mailto})

    def work(self, work_id):
        try:
            response = self.opener.open(f"https://api.openalex.org/works/{work_id}?{self.query}", timeout=10)
        except HTTPError as err:
            error_class = NotFound if err.code == 404 else ApiError
            raise error_class(err.code)
        w = json.loads(response.read())
        return {"title": w["title"], "year": w["publication_year"], "citations": w["cited_by_count"]}
`,
        ],
        wrong: [
          {
            code: src`
import json
from urllib.error import HTTPError
from urllib.parse import urlencode

class ApiError(Exception):
    def __init__(self, status):
        super().__init__(f"OpenAlex answered {status}")
        self.status = status

class NotFound(ApiError):
    pass

class OpenAlexClient:
    def __init__(self, opener, mailto):
        self.opener = opener
        self.mailto = mailto

    def work(self, work_id):
        url = "https://api.openalex.org/works/" + work_id + "?" + urlencode({"mailto": self.mailto})
        with self.opener.open(url, timeout=10) as response:
            data = json.loads(response.read())
        return {"title": data["title"], "year": data["publication_year"], "citations": data["cited_by_count"]}
`,
            fails: ["not-found", "server"],
            why: "urllib's HTTPError reaches the caller instead of the client's own exceptions",
          },
          {
            code: src`
import json
from urllib.error import HTTPError
from urllib.parse import urlencode

class ApiError(Exception):
    def __init__(self, status):
        super().__init__(f"OpenAlex answered {status}")
        self.status = status

class NotFound(ApiError):
    pass

class OpenAlexClient:
    def __init__(self, opener, mailto):
        self.opener = opener
        self.mailto = mailto

    def work(self, work_id):
        url = "https://api.openalex.org/works/" + work_id + "?" + urlencode({"mailto": self.mailto})
        try:
            with self.opener.open(url, timeout=10) as response:
                data = json.loads(response.read())
        except HTTPError as err:
            raise NotFound(err.code) from err
        return {"title": data["title"], "year": data["publication_year"], "citations": data["cited_by_count"]}
`,
            fails: ["server"],
            why: "every error becomes NotFound, so a 503 looks like a missing work",
          },
          {
            code: src`
import json
from urllib.error import HTTPError

class ApiError(Exception):
    def __init__(self, status):
        super().__init__(f"OpenAlex answered {status}")
        self.status = status

class NotFound(ApiError):
    pass

class OpenAlexClient:
    def __init__(self, opener, mailto):
        self.opener = opener
        self.mailto = mailto

    def work(self, work_id):
        url = f"https://api.openalex.org/works/{work_id}?mailto={self.mailto}"
        try:
            with self.opener.open(url, timeout=10) as response:
                data = json.loads(response.read())
        except HTTPError as err:
            if err.code == 404:
                raise NotFound(404) from err
            raise ApiError(err.code) from err
        return {"title": data["title"], "year": data["publication_year"], "citations": data["cited_by_count"]}
`,
            fails: ["returns", "server", "plus-mailto"],
            why: "the mailto isn't encoded, so the URL doesn't match what the API is asked for",
          },
        ],
        hints: [
          "The constructor stores the opener and the mailto; a helper method can build the URL and do the request.",
          "`urlencode({\"mailto\": …})` encodes the address; join it to the path with `?`.",
          "Catch `HTTPError` around the request and raise `NotFound` or `ApiError` depending on `err.code`; `raise … from err` keeps the original attached.",
        ],
        task: {
          files,
          checks: [
            http("returns", "work() summarises an existing work", { [`${OA}/W3003257820?mailto=ana%40example.com`]: { body: scipy } }, "OpenAlexClient(_op, 'ana@example.com').work('W3003257820')", { title: scipy.title, year: 2020, citations: 38040 }, { show: "OpenAlexClient(opener, 'ana@example.com').work('W3003257820')" }),
            http("not-found", "a missing work raises NotFound", {}, "_try(lambda: OpenAlexClient(_op, 'ana@example.com').work('W0000000000'))", py.tuple(py.str("NotFound"), py.int(404)), { show: "client.work('W0000000000')", before: "def _try(call):\n    try:\n        call()\n    except Exception as _e:\n        return (type(_e).__name__, getattr(_e, 'status', None))\n    return ('no error', None)" }),
            http("server", "a server error raises ApiError with its status", { [`${OA}/W3035965352?mailto=ana%40example.com`]: { status: 503, body: { error: "busy" } } }, "_try(lambda: OpenAlexClient(_op, 'ana@example.com').work('W3035965352'))", py.tuple(py.str("ApiError"), py.int(503)), { hidden: true, before: "def _try(call):\n    try:\n        call()\n    except Exception as _e:\n        return (type(_e).__name__, getattr(_e, 'status', None))\n    return ('no error', None)" }),
            http("plus-mailto", "a mailto with + in it", { [`${OA}/W2913606428?mailto=lab%2Bbot%40example.org`]: { body: psychopy } }, "OpenAlexClient(_op, 'lab+bot@example.org').work('W2913606428')", { title: psychopy.title, year: 2019, citations: 5179 }, { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "The most cited works for a search",
        prompt: "Add pagination to a client. `SearchClient(opener)` already has `_get(params)`, which returns the parsed JSON of `https://api.openalex.org/works?<params>`. Write its method `top_cited(query, n)`: request `search=<query>&sort=cited_by_count:desc&per-page=25&cursor=…` (cursor `*` first, then each `meta.next_cursor`) and return the `id`s of the first `n` works, stopping as soon as you have `n` or the cursor is `None`. Don't request pages you don't need.",
        spec: [
          ["Method", "`top_cited(query, n)` on `SearchClient`"],
          ["Params", "`{\"search\": query, \"sort\": \"cited_by_count:desc\", \"per-page\": 25, \"cursor\": cursor}`, passed to `self._get`"],
          ["Returns", "a list of at most `n` work ids, in the order received"],
          ["Rule", "no request after the one that brought the n-th work"],
        ],
        starter: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

class SearchClient:
    def __init__(self, opener):
        self.opener = opener

    def _get(self, params):
        url = "https://api.openalex.org/works?" + urlencode(params)
        with self.opener.open(url, timeout=10) as response:
            return json.loads(response.read())

    def top_cited(self, query, n):
        return []

def page_url(cursor):
    return "https://api.openalex.org/works?" + urlencode({"search": "python", "sort": "cited_by_count:desc", "per-page": 25, "cursor": cursor})
saved = {
    page_url("*"): (200, {"meta": {"next_cursor": "c2"}, "results": [{"id": "W3003257820"}, {"id": "W2970971581"}]}),
    page_url("c2"): (200, {"meta": {"next_cursor": None}, "results": [{"id": "W3035965352"}]}),
}
print(SearchClient(build_opener(Replay(saved))).top_cited("python", 3))
`,
        answer: src`
import json
from urllib.parse import urlencode
from urllib.request import build_opener
from replay import Replay

class SearchClient:
    def __init__(self, opener):
        self.opener = opener

    def _get(self, params):
        url = "https://api.openalex.org/works?" + urlencode(params)
        with self.opener.open(url, timeout=10) as response:
            return json.loads(response.read())

    def top_cited(self, query, n):
        ids = []
        cursor = "*"
        while cursor is not None and len(ids) < n:
            page = self._get({"search": query, "sort": "cited_by_count:desc", "per-page": 25, "cursor": cursor})
            for work in page["results"]:
                if len(ids) < n:
                    ids.append(work["id"])
            cursor = page["meta"]["next_cursor"]
        return ids

def page_url(cursor):
    return "https://api.openalex.org/works?" + urlencode({"search": "python", "sort": "cited_by_count:desc", "per-page": 25, "cursor": cursor})
saved = {
    page_url("*"): (200, {"meta": {"next_cursor": "c2"}, "results": [{"id": "W3003257820"}, {"id": "W2970971581"}]}),
    page_url("c2"): (200, {"meta": {"next_cursor": None}, "results": [{"id": "W3035965352"}]}),
}
print(SearchClient(build_opener(Replay(saved))).top_cited("python", 3))
`,
        alternatives: [
          src`
import json
from urllib.parse import urlencode

class SearchClient:
    def __init__(self, opener):
        self.opener = opener

    def _get(self, params):
        url = "https://api.openalex.org/works?" + urlencode(params)
        with self.opener.open(url, timeout=10) as response:
            return json.loads(response.read())

    def top_cited(self, query, n):
        found = []
        cursor = "*"
        while len(found) < n:
            page = self._get({"search": query, "sort": "cited_by_count:desc", "per-page": 25, "cursor": cursor})
            found += [work["id"] for work in page["results"]]
            cursor = page["meta"]["next_cursor"]
            if cursor is None:
                break
        return found[:n]
`,
        ],
        wrong: [
          {
            code: src`
import json
from urllib.parse import urlencode

class SearchClient:
    def __init__(self, opener):
        self.opener = opener

    def _get(self, params):
        url = "https://api.openalex.org/works?" + urlencode(params)
        with self.opener.open(url, timeout=10) as response:
            return json.loads(response.read())

    def top_cited(self, query, n):
        ids = []
        cursor = "*"
        while cursor is not None:
            page = self._get({"search": query, "sort": "cited_by_count:desc", "per-page": 25, "cursor": cursor})
            ids += [work["id"] for work in page["results"]]
            cursor = page["meta"]["next_cursor"]
        return ids[:n]
`,
            fails: ["requests", "first-page"],
            why: "the answer is right, but it walks every page even after it has n works",
          },
          {
            code: src`
import json
from urllib.parse import urlencode

class SearchClient:
    def __init__(self, opener):
        self.opener = opener

    def _get(self, params):
        url = "https://api.openalex.org/works?" + urlencode(params)
        with self.opener.open(url, timeout=10) as response:
            return json.loads(response.read())

    def top_cited(self, query, n):
        page = self._get({"search": query, "sort": "cited_by_count:desc", "per-page": 25, "cursor": "*"})
        return [work["id"] for work in page["results"]][:n]
`,
            fails: ["returns", "requests", "few"],
            why: "only the first page is read, so a request for more works than one page holds comes up short",
          },
        ],
        hints: [
          "Loop while there is a cursor and you still have fewer than `n` ids.",
          "Ask `self._get` for each page; it already builds the URL and parses the JSON.",
          "Append a page's ids only while you need more, and update the cursor from the page's `meta`.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "returns",
              label: "top_cited() collects 3 works across two pages",
              show: "SearchClient(opener).top_cited('python', 3)",
              expr: `${replaySetup({})}\nfrom urllib.parse import urlencode as _ue\ndef _url(c, q='python'):\n    return 'https://api.openalex.org/works?' + _ue({'search': q, 'sort': 'cited_by_count:desc', 'per-page': 25, 'cursor': c})\n_rp.saved[_url('*')] = {'body': {'meta': {'next_cursor': 'c2'}, 'results': [{'id': 'W3003257820'}, {'id': 'W2970971581'}]}}\n_rp.saved[_url('c2')] = {'body': {'meta': {'next_cursor': None}, 'results': [{'id': 'W3035965352'}]}}\nresult = SearchClient(_op).top_cited('python', 3)`,
              expected: pv(["W3003257820", "W2970971581", "W3035965352"]),
            },
            {
              kind: "expr",
              id: "requests",
              label: "no page is requested after the n-th work arrives",
              hidden: true,
              expr: `${replaySetup({})}\nfrom urllib.parse import urlencode as _ue\ndef _url(c, q='diffusion'):\n    return 'https://api.openalex.org/works?' + _ue({'search': q, 'sort': 'cited_by_count:desc', 'per-page': 25, 'cursor': c})\n_rp.saved[_url('*')] = {'body': {'meta': {'next_cursor': 'p2'}, 'results': [{'id': 'W1'}, {'id': 'W2'}]}}\n_rp.saved[_url('p2')] = {'body': {'meta': {'next_cursor': 'p3'}, 'results': [{'id': 'W3'}, {'id': 'W4'}]}}\n_rp.saved[_url('p3')] = {'body': {'meta': {'next_cursor': None}, 'results': [{'id': 'W5'}]}}\nresult = (SearchClient(_op).top_cited('diffusion', 3), len(_rp.requests))`,
              expected: py.tuple(pv(["W1", "W2", "W3"]), py.int(2)),
            },
            {
              kind: "expr",
              id: "few",
              label: "asking for more works than exist",
              hidden: true,
              expr: `${replaySetup({})}\nfrom urllib.parse import urlencode as _ue\ndef _url(c, q='psychopy'):\n    return 'https://api.openalex.org/works?' + _ue({'search': q, 'sort': 'cited_by_count:desc', 'per-page': 25, 'cursor': c})\n_rp.saved[_url('*')] = {'body': {'meta': {'next_cursor': 'k'}, 'results': [{'id': 'W2913606428'}]}}\n_rp.saved[_url('k')] = {'body': {'meta': {'next_cursor': None}, 'results': [{'id': 'W3021613070'}]}}\nresult = SearchClient(_op).top_cited('psychopy', 10)`,
              expected: pv(["W2913606428", "W3021613070"]),
            },
            {
              kind: "expr",
              id: "first-page",
              label: "n smaller than the first page",
              hidden: true,
              expr: `${replaySetup({})}\nfrom urllib.parse import urlencode as _ue\ndef _url(c, q='numpy'):\n    return 'https://api.openalex.org/works?' + _ue({'search': q, 'sort': 'cited_by_count:desc', 'per-page': 25, 'cursor': c})\n_rp.saved[_url('*')] = {'body': {'meta': {'next_cursor': 'z'}, 'results': [{'id': 'W3035965352'}, {'id': 'W3099878876'}, {'id': 'W3003257820'}]}}\nresult = SearchClient(_op).top_cited('numpy', 1)`,
              expected: pv(["W3035965352"]),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class ApiError(Exception):
    def __init__(self, status):
        super().__init__(f"answered {status}")
        self.status = status

class NotFound(ApiError):
    pass

for error in [NotFound(404), ApiError(503)]:
    try:
        raise error
    except NotFound:
        print("missing")
    except ApiError as err:
        print("failed with", err.status)
`,
        choices: ["missing\nfailed with 503", "failed with 404\nfailed with 503", "missing\nmissing", "missing\nanswered 503"],
        answer: 0,
        why: "`NotFound` is a kind of `ApiError`, and the more specific clause comes first, so the 404 prints `missing`. The 503 is only an `ApiError`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the client builds its own opener. Why is this hard to test?",
        program: src`
class WeatherClient:
    def __init__(self):
        from urllib.request import build_opener
        self.opener = build_opener()

client = WeatherClient()
print(type(client.opener).__name__)
`,
        choices: ["OpenerDirector", "Replay", "None", "WeatherClient"],
        answer: 0,
        why: "The client always gets urllib's real `OpenerDirector`, so every test of it would need the live network. Taking the opener as a constructor parameter lets a test pass a replay or spy instead.",
      },
      {
        id: "q3",
        prompt: "Which method signature makes the best public API for a weather client?",
        choices: [
          "`daily_maximums(station_id, start, end)` returning a list of numbers",
          "`get(url)` returning the urllib response object",
          "`build_url(path, params)` returning text the caller must open",
          "`open_and_parse(request, timeout)` returning the JSON",
        ],
        answer: 0,
        why: "Callers should say what they want and get plain data back. URLs, responses, requests and timeouts are the client's business, kept inside its private `_get`.",
      },
    ],
    review: [
      "A client class keeps the base URL, headers, timeout and error handling in one `_get` method.",
      "Public methods are named after questions and return plain data; errors become the client's own exceptions.",
      "Take the opener as a parameter: `build_opener()` in production, a replay or spy in tests.",
      "Next (see Iterators & Generators): iterators and generators, which can hand out results like these one at a time.",
    ],
  },
];
