"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  getPythonFailure,
  getPythonStatus,
  getPythonVersion,
  preloadPython,
  releasePython,
  runPython,
  stopPython,
  subscribePythonStatus,
  type PyOutputChunk,
  type PyRunResult,
} from "@/engine/python/client";
import { checkPython } from "@/engine/python/grading";
import { Shell } from "@/features/rt/Shell";

const SAMPLE = `price = 12
quantity = 4
total = price * quantity
print(total)
`;

/** Developer harness: run, stop, watch status; tests also call the grader through window.__runtimePython. */
export function RuntimeCheck() {
  const status = useSyncExternalStore(subscribePythonStatus, getPythonStatus, () => "idle" as const);
  const failure = useSyncExternalStore(subscribePythonStatus, getPythonFailure, () => null);
  const version = useSyncExternalStore(subscribePythonStatus, getPythonVersion, () => null);
  const [code, setCode] = useState(SAMPLE);
  const [live, setLive] = useState<PyOutputChunk[]>([]);
  const [result, setResult] = useState<PyRunResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    preloadPython();
    // Browser tests drive the real runtime and grader from here. This page only exists where the runner gate is on.
    (window as unknown as { __runtimePython?: unknown }).__runtimePython = { runPython, checkPython, stopPython };
    return () => releasePython();
  }, []);

  const run = async () => {
    setLive([]);
    setResult(null);
    setRunning(true);
    const r = await runPython(code, { onOutput: (c) => setLive((l) => [...l, c]) });
    if (r.status === "superseded") return;
    setRunning(false);
    setResult(r);
  };

  const output = result && "output" in result ? result.output : live;

  return (
    <Shell subject="python" path={[{ label: "python" }, { label: "runtime" }]} bare>
      <div className="rx-page">
        <h1 className="rx-title">Python runtime check</h1>
        <p className="rx-small mono" data-testid="py-status">
          status: {status}{version ? ` · pyodide ${version}` : ""}{failure ? ` · ${failure}` : ""}
        </p>
        <textarea
          aria-label="main.py"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          rows={12}
          style={{ width: "100%", fontFamily: "var(--font-mono, monospace)" }}
        />
        <p>
          <button type="button" className="rx-btn primary" onClick={run}>Run code</button>{" "}
          <button type="button" className="rx-btn" onClick={stopPython} disabled={!running}>Stop</button>
        </p>
        <pre data-testid="py-console" aria-label="Console" aria-live="polite">
          {output.map((c, i) => <span key={i} data-stream={c.stream}>{c.text}</span>)}
        </pre>
        <pre data-testid="py-result">{result ? JSON.stringify(result, (k, v) => (k === "output" || k === "stdout" || k === "stderr" ? undefined : v)) : ""}</pre>
      </div>
    </Shell>
  );
}
