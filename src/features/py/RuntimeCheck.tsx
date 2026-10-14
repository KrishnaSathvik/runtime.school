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
  PY_PACKAGES,
  type PyOutputChunk,
  type PyPackage,
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
  const [packages, setPackages] = useState<PyPackage[]>([]);

  useEffect(() => {
    preloadPython(packages);
  }, [packages]);

  useEffect(() => {
    // Browser tests drive the real runtime and grader from here. This page only exists where the runner gate is on.
    (window as unknown as { __runtimePython?: unknown }).__runtimePython = { runPython, checkPython, stopPython };
    return () => releasePython();
  }, []);

  const run = async () => {
    setLive([]);
    setResult(null);
    setRunning(true);
    const r = await runPython(code, { packages, onOutput: (c) => setLive((l) => [...l, c]) });
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
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 8px", display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
          <legend className="rx-small">Libraries (loaded before the run starts)</legend>
          {PY_PACKAGES.map((name) => (
            <label key={name} className="rx-small mono">
              <input
                type="checkbox"
                checked={packages.includes(name)}
                onChange={(e) => setPackages((list) => (e.target.checked ? [...list, name] : list.filter((n) => n !== name)))}
              />{" "}
              {name}
            </label>
          ))}
        </fieldset>
        <p>
          <button type="button" className="rx-btn primary" onClick={run}>Run code</button>{" "}
          <button type="button" className="rx-btn" onClick={stopPython} disabled={!running}>Stop</button>
        </p>
        <pre data-testid="py-console" aria-label="Console" aria-live="polite">
          {output.map((c, i) =>
            c.stream === "figure" ? (
              // eslint-disable-next-line @next/next/no-img-element -- PNG data URL drawn by the program
              <img key={i} data-stream="figure" src={c.text} alt={`Figure ${i + 1}`} style={{ display: "block", maxWidth: "100%", background: "#fff" }} />
            ) : (
              <span key={i} data-stream={c.stream}>{c.text}</span>
            ),
          )}
        </pre>
        <pre data-testid="py-result">{result ? JSON.stringify(result, (k, v) => (k === "output" || k === "stdout" || k === "stderr" ? undefined : v)) : ""}</pre>
      </div>
    </Shell>
  );
}
