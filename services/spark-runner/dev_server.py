"""Local development bridge between the app and the Spark runner. Never deployed; binds to 127.0.0.1 only.

    python3 services/spark-runner/dev_server.py            # http://127.0.0.1:8787
    NEXT_PUBLIC_PYSPARK=1 NEXT_PUBLIC_PYSPARK_RUNNER_URL=http://127.0.0.1:8787 npm run dev

  GET    /health            {ok, image}
  POST   /jobs              {mode: run|check|playground|project-run|project-check, item?, dataset?, project?, code}
                            → 202 {id, state}
  GET    /jobs/<id>         {id, state, case?, result?}
  DELETE /jobs/<id>         cancel: the container and every process in it are killed

States: queued → starting (container launched) → running | checking (Spark is up) → done | error | cancelled.

Because any web page open in the browser could try to reach localhost, requests must come from an allowed Origin, to
a localhost Host (DNS rebinding), with a JSON body (which forces a CORS preflight). Two jobs run at a time, eight wait.
This is a development convenience, not the public execution service (docs/pyspark/plan.md).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
import uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from runner import api, sandbox, tools  # noqa: E402

PORT = int(os.environ.get("PYSPARK_RUNNER_PORT", "8787"))
ORIGINS = set(os.environ.get("PYSPARK_RUNNER_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","))
HOSTS = {f"127.0.0.1:{PORT}", f"localhost:{PORT}"}
MAX_CODE = 64 * 1024
RUNNING, WAITING = 2, 8
KEEP_S = 600

slots = threading.Semaphore(RUNNING)
lock = threading.Lock()
jobs: dict[str, dict] = {}


def public(job: dict) -> dict:
    return {k: job[k] for k in ("id", "mode", "state", "case", "result", "error") if job.get(k) is not None}


def work(job: dict) -> None:
    with slots:
        if job["cancel"].is_set():
            job["state"] = "cancelled"
            return
        job["state"] = "starting"

        def on_event(kind: str, value: str) -> None:
            if kind == "state" and value == "queued":
                job["state"] = "queued"
            if kind == "state" and value == "spark-ready":
                job["state"] = "checking" if job["mode"] in ("check", "project-check") else "running"
            elif kind == "case":
                job["case"] = value

        try:
            if job["mode"] == "tool":
                result = tools.execute(job["body"], job["cancel"], on_event)
            elif job["mode"] == "run":
                result = api.run(job["item"], job["code"], job["cancel"], on_event)
            elif job["mode"] == "check":
                result = api.check(job["item"], job["code"], job["cancel"], on_event)
            elif job["mode"] == "project-run":
                result = api.run_project(job["project"], job["code"], job["cancel"], on_event)
            elif job["mode"] == "project-check":
                result = api.check_project(job["project"], job["code"], job["cancel"], on_event)
            else:
                result = api.playground(job["dataset"], job["code"], job["cancel"], on_event, job.get("edition"))
            job["result"] = result
            job["state"] = "cancelled" if result.get("status") == "cancelled" else "done"
        except api.ItemError as e:
            job["error"] = str(e)
            job["state"] = "error"
        except Exception as e:  # noqa: BLE001 - a bridge failure is reported, not raised into the server
            job["error"] = f"{type(e).__name__}: {e}"
            job["state"] = "error"
        job["finished"] = time.time()


def prune() -> None:
    now = time.time()
    with lock:
        for k in [k for k, j in jobs.items() if j.get("finished") and now - j["finished"] > KEEP_S]:
            del jobs[k]


class Handler(BaseHTTPRequestHandler):
    server_version = "runtime-spark-dev"

    def log_message(self, fmt, *args):  # quieter: one line per job, not per poll
        if self.command != "GET":
            sys.stderr.write(f"{self.command} {self.path} {args[1] if len(args) > 1 else ''}\n")

    def allowed(self) -> bool:
        origin = self.headers.get("Origin")
        return self.headers.get("Host") in HOSTS and (origin is None or origin in ORIGINS)

    def reply(self, code: int, body: dict | None = None) -> None:
        data = json.dumps(body or {}).encode()
        self.send_response(code)
        origin = self.headers.get("Origin")
        if origin in ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self):
        if not self.allowed() or self.headers.get("Origin") not in ORIGINS:
            return self.reply(403, {"error": "origin not allowed"})
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", self.headers["Origin"])
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Max-Age", "600")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_GET(self):
        if not self.allowed():
            return self.reply(403, {"error": "origin not allowed"})
        if self.path == "/health":
            image = subprocess.run(["docker", "image", "inspect", sandbox.IMAGE], capture_output=True).returncode == 0
            return self.reply(200, {"ok": image, "image": sandbox.IMAGE})
        if self.path.startswith("/jobs/"):
            job = jobs.get(self.path[len("/jobs/"):])
            return self.reply(200, public(job)) if job else self.reply(404, {"error": "no such job"})
        self.reply(404, {"error": "not found"})

    def do_DELETE(self):
        if not self.allowed():
            return self.reply(403, {"error": "origin not allowed"})
        job = jobs.get(self.path[len("/jobs/"):]) if self.path.startswith("/jobs/") else None
        if not job:
            return self.reply(404, {"error": "no such job"})
        job["cancel"].set()
        if job["state"] == "queued":
            job["state"] = "cancelled"
            job["finished"] = time.time()
        self.reply(202, public(job))

    def do_POST(self):
        if not self.allowed() or self.headers.get("Origin") not in ORIGINS:
            return self.reply(403, {"error": "origin not allowed"})
        if self.path != "/jobs":
            return self.reply(404, {"error": "not found"})
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
            return self.reply(415, {"error": "send JSON"})
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            return self.reply(400, {"error": "invalid content length"})
        if length < 0:
            return self.reply(400, {"error": "invalid content length"})
        if length > MAX_CODE * 2 + 8192:
            return self.reply(413, {"error": "code too large"})
        try:
            body = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return self.reply(400, {"error": "bad JSON"})
        if not isinstance(body, dict):
            return self.reply(400, {"error": "send a JSON object"})
        mode, code = body.get("mode"), body.get("code")
        if mode not in ("run", "check", "playground", "project-run", "project-check", "tool") or not isinstance(code, str) or len(code) > MAX_CODE:
            return self.reply(400, {"error": "mode must be run, check, playground, project-run or project-check, with code"})
        if mode == "tool":
            if not isinstance(body.get("code_b", ""), str) or len(body.get("code_b", "")) > MAX_CODE:
                return self.reply(400, {"error": "Approach B is too large."})
            try:
                tools.context(body)
            except (api.ItemError, TypeError):
                return self.reply(400, {"error": "Unknown dataset version or edition."})
        if mode == "playground" and body.get("dataset") not in api.PLAYGROUND:
            return self.reply(400, {"error": "unknown dataset"})
        if mode in ("run", "check") and not isinstance(body.get("item"), str):
            return self.reply(400, {"error": "item required"})
        if mode.startswith("project-") and not isinstance(body.get("project"), str):
            return self.reply(400, {"error": "project required"})
        prune()
        with lock:
            if sum(1 for j in jobs.values() if j["state"] in ("queued", "starting", "running", "checking")) >= RUNNING + WAITING:
                return self.reply(429, {"error": "busy: try again shortly"})
            edition = body.get("edition") if isinstance(body.get("edition"), str) else None
            job = {"id": uuid.uuid4().hex, "mode": mode, "state": "queued", "item": body.get("item"), "project": body.get("project"), "dataset": body.get("dataset"), "edition": edition, "code": code, "body": body, "cancel": threading.Event()}
            jobs[job["id"]] = job
            accepted = public(job)
        threading.Thread(target=work, args=(job,), daemon=True).start()
        self.reply(202, accepted)


def shutdown(*_) -> None:
    """Stop every job and remove its container before exiting."""
    for j in jobs.values():
        j["cancel"].set()
    sandbox.stop_active()
    raise SystemExit(0)


if __name__ == "__main__":
    import signal

    stale = sandbox.sweep() if os.environ.get("PS_RUNNER_SKIP_SWEEP") != "1" else 0
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    signal.signal(signal.SIGTERM, shutdown)
    print(f"Spark runner dev bridge on http://127.0.0.1:{PORT} (origins: {', '.join(sorted(ORIGINS))}; removed {stale} stale job containers)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        shutdown()
