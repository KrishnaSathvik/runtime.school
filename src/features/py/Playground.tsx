"use client";
import { useState } from 'react';
import { Shell } from '@/features/rt/Shell';
import { usePyProgress, usePyProgressReady } from '@/lib/python-progress';
import type { PyPackage } from '@/engine/python/client';
import { CodePane } from './CodePane';
import { Download } from './Downloads';
const REF = 'python:tool:playground';
const STARTER = 'print("Hello, Python!")\n';
export function Playground() {
  const ready = usePyProgressReady();
  const value = usePyProgress(s => s.items[REF]?.drafts.main ?? STARTER);
  const [library, setLibrary] = useState('stdlib');
  const packages: PyPackage[] = library === 'data' ? ['numpy','pandas','matplotlib'] : library === 'duckdb' ? ['duckdb'] : [];
  return <Shell subject="python" section="tools" path={[{label:'python',href:'/python'},{label:'playground'}]}>
    <div className="py-study"><section className="py-brief"><h1>Python playground</h1><p>Experiment freely. Your draft stays in this browser. Run writes no learning credit.</p><label>Libraries<select value={library} onChange={e => setLibrary(e.target.value)}><option value="stdlib">Standard library</option><option value="data">NumPy, pandas, matplotlib</option><option value="duckdb">DuckDB</option></select></label><p>Use display(df) for a table. Write text, CSV, or JSON files to download them from the console.</p><Download name="main.py" text={value} /></section><section className="py-study-code" aria-label="Your program">{ready ? <CodePane key={library} task={{checks:[],packages}} starter={STARTER} value={value} onChange={v => usePyProgress.getState().setDraft(REF,'main',v)} ungraded /> : <p role="status">Loading draft…</p>}</section></div>
  </Shell>;
}
