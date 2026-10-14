"use client";

import { useState } from "react";
import { Play, RotateCcw, X } from "lucide-react";
import { runPython, type PyOutputChunk, type PyPackage, type PyRunResult } from "@/engine/python/client";
import { appendChunk, RunEnd, Stream } from "./Output";

/**
 * Read-only Python you can run. Output comes from a real, fresh interpreter every time;
 * running an example never touches progress.
 */
export function PyRunCell({ code, name, packages }: { code: string; name: string; packages?: readonly PyPackage[] }) {
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<PyOutputChunk[]>([]);
  const [result, setResult] = useState<PyRunResult | null>(null);
  const [interrupted, setInterrupted] = useState(false);

  const run = async () => {
    setBusy(true);
    setResult(null);
    setLive([]);
    setInterrupted(false);
    const r = await runPython(code, { packages, onOutput: (c) => setLive((l) => appendChunk(l, c)) });
    setBusy(false);
    if (r.status === "superseded") return setInterrupted(true);
    setResult(r);
  };

  const chunks = result && "output" in result ? result.output : live;
  const shown = busy || result || interrupted;
  return (
    <div className="rx-cell py-run-cell">
      <div className="rx-cell-head">
        <span className="name">{name}</span>
        <span className="acts">
          {result && !busy && (
            <button type="button" className="rx-btn ghost" onClick={() => setResult(null)} aria-label={`Close output of ${name}`}>
              <X size={13} /> Close
            </button>
          )}
          <button type="button" className="rx-btn" onClick={() => void run()} disabled={busy} aria-label={`${result ? "Run again" : "Run"}: ${name}`}>
            {result ? <RotateCcw size={13} /> : <Play size={13} />} {busy ? "Running…" : result ? "Run again" : "Run"}
          </button>
        </span>
      </div>
      <div className="rx-cell-in">
        <span className="p" aria-hidden="true">py›</span>
        <pre tabIndex={0} aria-label={`Code: ${name}`}>{code}</pre>
      </div>
      {shown && (
        <div className="py-cell-out" aria-live="polite">
          {chunks.length > 0 && <Stream chunks={chunks} />}
          {busy && <p className="py-meta">running…</p>}
          {interrupted && <p className="py-meta">Another program on this page started, so this run was stopped. Run it again.</p>}
          {result && <RunEnd r={result} empty={chunks.length === 0} />}
        </div>
      )}
    </div>
  );
}
