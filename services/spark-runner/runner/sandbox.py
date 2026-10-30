"""Start one locked-down Spark container per job, enforce its wall clock, and always clean it up.

Trusted host-side code (standard library only). Learner code never runs here: it runs inside the container, which gets
  - no network (`--network none`: loopback only, which local Spark uses for driver ↔ JVM traffic),
  - a read-only root filesystem; the only writable place is a size-capped, noexec /tmp,
  - an unprivileged user, no Linux capabilities, no privilege escalation,
  - CPU, memory (no swap) and process-count limits,
  - read-only /job (the learner's file + job.json) and /data (only this job's input tables).
Expected results and reference solutions are never copied into any of those mounts.

The harness reports on stdout. The host keeps at most RESULT_LIMIT bytes of the result line and LOG_LIMIT bytes of
everything else, in memory; the rest is read and dropped, so a job can't fill host disk or memory with output. A job
that goes on producing (more than FLOOD_LIMIT dropped bytes) is killed with status `output-limit`.

Docker Desktop is a development sandbox, not a security boundary for public code (README.md "Security assumptions").
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
import uuid
from dataclasses import dataclass
from contextlib import contextmanager
from pathlib import Path
from typing import Callable

# PS_RUNNER_IMAGE overrides the image for this process (e.g. to test a new build); unset, the default below is used.
IMAGE = os.environ.get("PS_RUNNER_IMAGE") or "runtime-spark-runner:4.0.1-5"
RESULT_LIMIT = 8 * 1024 * 1024
LOG_LIMIT = 64 * 1024
# A job that keeps producing output past this many dropped bytes is killed, not just ignored.
FLOOD_LIMIT = 16 * 1024 * 1024
MARK = b"@@ps "
LABEL = "runtime-school.ps-job=1"
# Seconds a container may outlive its wall clock if the host process that should stop it has died.
SELF_KILL_GRACE_S = 15


class ContainerScheduler:
    """FIFO permits: an exclusive measurement waits for all active containers to finish."""
    def __init__(self, capacity=2):
        self.capacity, self.active = capacity, 0
        self.condition = threading.Condition()
        self.waiting = []

    @contextmanager
    def slot(self, exclusive=False, cancel=None):
        ticket = object()
        wanted = self.capacity if exclusive else 1
        acquired = False
        with self.condition:
            self.waiting.append(ticket)
            while not (self.waiting[0] is ticket and self.active + wanted <= self.capacity):
                if cancel is not None and cancel.is_set(): break
                self.condition.wait(.1)
            if cancel is None or not cancel.is_set():
                self.active += wanted
                acquired = True
            self.waiting.remove(ticket)
            self.condition.notify_all()
        try:
            yield acquired
        finally:
            if acquired:
                with self.condition:
                    self.active -= wanted
                    self.condition.notify_all()


SCHEDULER = ContainerScheduler(max(1, int(os.environ.get("PS_MAX_CONTAINERS", "2"))))
ACTIVE_CONTAINERS: set[str] = set()
ACTIVE_LOCK = threading.Lock()


@dataclass(frozen=True)
class Limits:
    cpus: str = "2"
    memory: str = "4g"
    # The JVM's threads count against this too; 256 was too tight for heavier jobs ("unable to create native thread").
    pids: int = 512
    tmp_size: str = "512m"
    timeout_s: float = 45.0


def docker_args(name: str, job: Path, data: Path, limits: Limits, image: str) -> list[str]:
    return [
        "docker", "run", "--name", name,
        "--network", "none",
        "--hostname", "localhost",
        "--read-only",
        "--tmpfs", f"/tmp:rw,noexec,nosuid,nodev,size={limits.tmp_size},mode=1777",
        "--user", "10001:10001",
        "--cap-drop", "ALL",
        "--security-opt", "no-new-privileges",
        "--pids-limit", str(limits.pids),
        "--memory", limits.memory, "--memory-swap", limits.memory,
        "--cpus", limits.cpus,
        "--log-driver", "none",
        "--label", LABEL,
        "-v", f"{job}:/job:ro",
        "-v", f"{data}:/data:ro",
        # The container stops itself too: if the host dies mid-job, nothing keeps running past its budget.
        "--entrypoint", "timeout",
        image,
        "-s", "KILL", str(int(limits.timeout_s) + SELF_KILL_GRACE_S), "python3", "/opt/runner/harness.py",
    ]


def _quiet(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(list(args), capture_output=True, text=True)


def sweep() -> int:
    """Remove every job container left behind (e.g. by a host process that died mid-job). Call when no job is running."""
    ids = _quiet("docker", "ps", "-aq", "--filter", f"label={LABEL}").stdout.split()
    if ids:
        _quiet("docker", "rm", "-f", *ids)
    return len(ids)


def stop_active() -> None:
    """Stop only containers owned by this process, leaving other local runner/test sessions alone."""
    with ACTIVE_LOCK:
        names = list(ACTIVE_CONTAINERS)
    if names:
        _quiet("docker", "rm", "-f", *names)


def container_exists(name: str) -> bool:
    return bool(_quiet("docker", "ps", "-aq", "--filter", f"name=^{name}$").stdout.strip())


class _Reader(threading.Thread):
    """Reads the container's stdout: state markers go to `on_event`, the result line is kept, the rest is capped."""

    def __init__(self, stream, on_event: Callable[[str, str], None] | None):
        super().__init__(daemon=True)
        self.stream, self.on_event = stream, on_event
        self.result: bytes | None = None
        self.result_too_large = False
        self.log = bytearray()
        self.dropped = 0
        self.flooded = threading.Event()

    def run(self) -> None:
        overflow = False
        while True:
            if self.dropped > FLOOD_LIMIT:
                self.flooded.set()
            line = self.stream.readline(RESULT_LIMIT + 64)
            if not line:
                return
            if overflow:
                # The rest of a line that was already too long.
                overflow = not line.endswith(b"\n")
                self.dropped += len(line)
                continue
            if not line.endswith(b"\n") and len(line) >= RESULT_LIMIT + 64:
                overflow = True
                if line.startswith(MARK + b"result "):
                    self.result_too_large = True
                self.dropped += len(line)
                continue
            if line.startswith(MARK):
                kind, _, value = line[len(MARK):].rstrip(b"\n").partition(b" ")
                if kind == b"result":
                    self.result = value
                elif self.on_event and len(value) < 200:
                    self.on_event(kind.decode(errors="replace"), value.decode(errors="replace"))
                continue
            room = LOG_LIMIT - len(self.log)
            if room > 0:
                self.log += line[:room]
            self.dropped += max(0, len(line) - max(room, 0))


def _execute(
    job: dict,
    solution: str,
    inputs: dict[str, dict[str, Path]],
    limits: Limits = Limits(),
    cancel: threading.Event | None = None,
    image: str = IMAGE,
    on_event: Callable[[str, str], None] | None = None,
) -> dict:
    """
    Run `solution` against `inputs` ({case: {table: csv path}}) in a fresh container and return the harness result.
    `job["cases"]` is filled in here so table paths always point inside /data. Never raises for learner failures.
    `on_event(kind, value)` receives the harness's progress markers ("state spark-ready", "case <id>").
    """
    work = Path(tempfile.mkdtemp(prefix="ps-job-"))
    name = f"ps-job-{uuid.uuid4().hex[:12]}"
    started = time.perf_counter()
    outcome = None
    try:
        with ACTIVE_LOCK:
            ACTIVE_CONTAINERS.add(name)
        jobdir, data = work / "job", work / "data"
        for d in (jobdir, data):
            d.mkdir()
        cases = []
        for case_id, tables in inputs.items():
            (data / case_id).mkdir()
            spec = {}
            for table, src in tables.items():
                # The file type travels with the table: .csv, .jsonl (nested data) or .txt (raw lines).
                file_name = f"{table}{Path(src).suffix}"
                shutil.copyfile(src, data / case_id / file_name)
                spec[table] = {"path": f"/data/{case_id}/{file_name}", "schema": job["schemas"][table]}
            cases.append({"id": case_id, "tables": spec})
        (jobdir / "job.json").write_text(json.dumps({**{k: v for k, v in job.items() if k != "schemas"}, "cases": cases}))
        (jobdir / "solution.py").write_text(solution)

        proc = subprocess.Popen(docker_args(name, jobdir, data, limits, image), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        reader = _Reader(proc.stdout, on_event)
        reader.start()
        if on_event:
            on_event("state", "starting")
        deadline = started + limits.timeout_s
        while proc.poll() is None:
            if cancel is not None and cancel.is_set():
                outcome = "cancelled"
            elif time.perf_counter() > deadline:
                outcome = "timeout"
            elif reader.flooded.is_set():
                outcome = "output-limit"
            if outcome:
                # Killing the container ends every process in it: the Python driver, the JVM, Python workers.
                _quiet("docker", "kill", name)
                proc.wait()
                break
            time.sleep(0.05)
        reader.join(timeout=10)
        proc.stdout.close()

        state = _quiet("docker", "inspect", "-f", "{{.State.OOMKilled}} {{.State.ExitCode}}", name).stdout.split()
        oom = bool(state) and state[0] == "true"
        exit_code = int(state[1]) if len(state) > 1 else None
        logs = reader.log.decode(errors="replace")

        if outcome == "timeout":
            result = {"status": "timeout", "error": {"type": "Timeout", "message": f"Stopped after {limits.timeout_s:g} seconds."}}
        elif outcome == "cancelled":
            result = {"status": "cancelled", "error": {"type": "Cancelled", "message": "Stopped."}}
        elif outcome == "output-limit":
            result = {"status": "output-limit", "error": {"type": "OutputLimit", "message": "Stopped: the code kept printing far more output than can be shown."}}
        elif oom:
            result = {"status": "memory-limit", "error": {"type": "MemoryLimit", "message": f"Used more than the {limits.memory} memory limit."}}
        elif reader.result_too_large:
            result = {"status": "output-limit", "error": {"type": "OutputLimit", "message": "The result was too large to return."}}
        elif reader.result is not None:
            try:
                result = json.loads(reader.result)
            except json.JSONDecodeError:
                result = {"status": "crashed", "error": {"type": "Crashed", "message": "The run ended without a readable result."}}
        else:
            result = {"status": "crashed", "error": {"type": "Crashed", "message": f"The run ended (exit {exit_code}) without a result."}}
        result["container"] = {"exit_code": exit_code, "oom_killed": oom, "wall_ms": round((time.perf_counter() - started) * 1000), "log_tail": logs[-4000:], "output_dropped_bytes": reader.dropped}
        return result
    finally:
        _quiet("docker", "rm", "-f", name)
        with ACTIVE_LOCK:
            ACTIVE_CONTAINERS.discard(name)
        shutil.rmtree(work, ignore_errors=True)


def execute(job, solution, inputs, limits=Limits(), cancel=None, image=IMAGE, on_event=None, exclusive=False):
    if on_event:
        on_event("state", "queued")
    with SCHEDULER.slot(exclusive, cancel) as acquired:
        if not acquired:
            return {"status": "cancelled", "cases": [], "error": {"type": "Cancelled", "message": "Stopped while waiting for Spark."}}
        return _execute(job, solution, inputs, limits, cancel, image, on_event)
