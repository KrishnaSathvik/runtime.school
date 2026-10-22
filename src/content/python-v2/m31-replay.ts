/**
 * The replay handler used by M31 (HTTP & API clients) exercises and practice, as the text of `replay.py`.
 *
 * A browser page has no sockets of its own, so M31 sends real urllib requests (Request, an opener, timeouts,
 * HTTPError, URLError) through a urllib handler that answers from saved copies of real API responses (USGS
 * earthquakes D08, OpenAlex works D10) instead of a server. Everything above the handler is the real client API.
 * Lessons show a short version of the same class inline, because lesson examples can't import files.
 */

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

export const REPLAY_PY = src`
"""Replays saved HTTP responses through urllib, in place of the network.

    opener = build_opener(Replay(saved))
    opener.open(Request(url), timeout=10)

works like urllib.request.urlopen: the same Request, response (status, headers,
read()), HTTPError for 4xx/5xx and URLError for timeouts, but the answer comes
from saved copies of real responses instead of a server. A saved entry is
(status, body) or a dictionary:

    {"status": 200, "body": {...}, "headers": {...}, "seconds": 0.4}

body may be a dict or list (sent as JSON), text or bytes. seconds is how long
the real server took: when that is longer than the request's timeout, the
replay raises the URLError a real timeout raises (without waiting).
{"fails": "refused"} is a refused connection. A list of entries is answered in
order, one per request, repeating the last. A URL with nothing saved answers
404, like a server that doesn't know the path.
"""
import io
import json
from email.message import Message
from http import HTTPStatus
from urllib.error import URLError
from urllib.request import BaseHandler
from urllib.response import addinfourl


class Replay(BaseHandler):
    handler_order = 100  # asked before urllib's own https handler

    def __init__(self, saved):
        self.saved = saved
        self.requests = []  # every Request opened through this handler, in order

    def https_open(self, request):
        self.requests.append(request)
        entry = self.saved.get(request.full_url, {"status": 404, "body": {"error": "Not Found"}})
        if isinstance(entry, list):
            entry = entry.pop(0) if len(entry) > 1 else entry[0]
        if isinstance(entry, tuple):
            entry = {"status": entry[0], "body": entry[1]}
        if entry.get("fails") == "refused":
            raise URLError(ConnectionRefusedError(111, "Connection refused"))
        timeout = request.timeout if isinstance(request.timeout, (int, float)) else None
        if timeout is not None and entry.get("seconds", 0) > timeout:
            raise URLError(TimeoutError("timed out"))
        body = entry.get("body", b"")
        headers = Message()
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(body, str):
            body = body.encode("utf-8")
            headers["Content-Type"] = "text/plain; charset=utf-8"
        for name, value in entry.get("headers", {}).items():
            del headers[name]
            headers[name] = value
        status = entry.get("status", 200)
        response = addinfourl(io.BytesIO(body), headers, request.full_url, status)
        response.msg = HTTPStatus(status).phrase
        return response

    http_open = https_open
`;

/** A Python string literal for any text (JSON string syntax is valid Python here). */
export const pyLit = (s: string) => JSON.stringify(s);

/**
 * Python lines that build `_op`, an opener answering from `saved` (URL → entry dict), and `_rp`, its Replay handler.
 * The saved data travels as JSON, so entries are dictionaries ({"status", "body", "headers", "seconds", "fails"}).
 */
export function replaySetup(saved: Record<string, unknown>): string {
  return [
    "import json as _js",
    "from urllib.request import build_opener as _bo",
    "from replay import Replay as _Replay",
    `_rp = _Replay(_js.loads(${pyLit(JSON.stringify(saved))}))`,
    "_op = _bo(_rp)",
  ].join("\n");
}

const USGS = "https://earthquake.usgs.gov/fdsnws/event/1";
export const usgsQuery = (params: string) => `${USGS}/query?${params}`;
export const usgsCount = (params: string) => `${USGS}/count?${params}`;

/** A USGS GeoJSON feature, trimmed to the fields the course uses. Values are from the real catalogue (D08). */
export function quake(id: string, mag: number, place: string, time: number, coords: number[], type = "earthquake") {
  return { type: "Feature", properties: { mag, place, time, type, title: `M ${mag} - ${place}` }, geometry: { type: "Point", coordinates: coords }, id };
}
export const collection = (features: unknown[]) => ({ type: "FeatureCollection", metadata: { status: 200, count: features.length }, features });

/** An OpenAlex work, trimmed to the fields the course uses. Values are from the real API pages (D10). */
export function work(id: string, title: string, year: number, cited: number, type = "article", isOa = true) {
  return { id: `https://openalex.org/${id}`, title, publication_year: year, cited_by_count: cited, type, open_access: { is_oa: isOa } };
}
