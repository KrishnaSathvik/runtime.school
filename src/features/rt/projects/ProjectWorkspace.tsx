"use client";
import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { MetricDefinitions, DataNotes } from "./ProjectGuidance";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/content/projects";
import { SQL_PROJECTS_LIBRARY_HREF } from "@/content/projects/paths";
import { getProjectReference } from "@/content/projects/references";
import { datasetName, toolDataset } from "@/content/tools/datasets";
import { cancelSql, executeSql, preloadDatabase, type ExecuteResponse } from "@/engine/sql-client";
import { useDraftSaveFailed, useHydrated, useLearning } from "@/lib/learning-state";
import { Shell } from "../Shell";
import { Editor } from "../Editor";
import { Output } from "../Output";
import { SqlCode } from "../SqlCode";
import { allFindings, currentEvidence, draftPrefix, fingerprint, projectIsComplete, reportSectionKey, savedFindings, stageIsComplete, type SavedFinding, type StoredEvidence } from "./evidence";
import { projectReportDocument } from "./report-document";
import { ProjectReport } from "./ProjectReport";
import { buildRules, buildSetup, buildValidation, priorBuildSql } from "./build";
import { ProjectTables } from "./ProjectTables";
import { ProjectPicker } from "./ProjectPicker";
import { ProjectDialog } from "./ProjectDialog";

export function ProjectWorkspace({ project }: { project: Project }) {
  const state = useLearning();
  const hydrated = useHydrated();
  const saveFailed = useDraftSaveFailed();
  const [stageIndex, setStageIndex] = useState(0);
  const restored = useRef(false);
  const [referenceView, setReferenceView] = useState<"task" | "tables" | "metrics">("task");
  const [panel, setPanel] = useState<"findings" | "preview" | null>(null);
  const [busy, setBusy] = useState<"run" | "check" | null>(null);
  const running = useRef(false);
  const generation = useRef(0);
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [completeScreen, setCompleteScreen] = useState(false);
  const stage = project.stages[stageIndex]!;
  const prefix = draftPrefix(project, stage.id);
  const positionKey = draftPrefix(project, "current-stage");
  const dataset = toolDataset(project.datasetId);
  const tables = stage.relevantTables.length ? stage.relevantTables : project.relevantTables;
  const isBuild = stage.type === "build";
  const isExploration = stage.type === "exploration";
  const needsSql = isBuild || isExploration || stage.type === "checkpoint";
  const isBrief = stage.type === "orientation" && stage.id === "brief";
  const sql = state.drafts[`${prefix}-sql`] ?? (isBuild ? "-- Write your build script here.\n" : `SELECT * FROM ${tables[0]} LIMIT 20;`);
  const finding = state.drafts[`${prefix}-finding`] ?? "";
  const result = currentEvidence(sql, state.drafts[`${prefix}-evidence`]);
  const checkPass = state.drafts[`${prefix}-check`] === "pass" && !!result?.checkPassed;
  const findings = savedFindings(state.drafts, prefix);
  const collected = allFindings(project, state.drafts);
  const complete = projectIsComplete(project, state.drafts);
  const minimum = stage.validation.kind === "exploration" ? stage.validation.minimumEvidence : 1;
  const reportReady = project.reportTemplate.sections.filter(s => s.required).every(s => !!state.drafts[reportSectionKey(project, s.id)]?.trim());
  const priorComplete = project.stages.slice(0, stageIndex).every(s => stageIsComplete(s, state.drafts, draftPrefix(project, s.id), project));
  const canContinue = (stage.type === "orientation" || (needsSql ? isExploration ? findings.length >= minimum : checkPass && !!finding.trim() : stage.type === "report" ? reportReady && priorComplete : stageIsComplete(stage, state.drafts, prefix, project)));
  const setDraft = (key: string, value: string) => state.setDraft(key, value);

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const requested = new URLSearchParams(window.location.search).get("stage");
    const index = project.stages.findIndex(s => s.id === requested);
    setStageIndex(index >= 0 ? index : 0);
  }, [hydrated, positionKey, project]);
  // Start the download while the learner reads the brief.
  useEffect(() => { preloadDatabase(dataset.seed); return () => cancelSql(); }, [dataset.seed]);

  useEffect(() => {
    if (!saveFailed) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveFailed]);

  const go = (index: number) => {
    generation.current++; cancelSql(); running.current = false; setBusy(null);
    const url = new URL(window.location.href);
    url.searchParams.set("stage", project.stages[index]!.id);
    window.history.replaceState(window.history.state, "", url);
    setReferenceView("task"); setStageIndex(index); setDraft(positionKey, String(index)); setResponse(null); setNotice(""); setPanel(null); setCompleteScreen(false); window.scrollTo({ top: 0 });
  };
  const saveAnalysis = (updateId?: string) => {
    if (!result || !finding.trim() || (!isExploration && !checkPass)) return;
    const saved: SavedFinding = { ...result, id: updateId ?? crypto.randomUUID(), finding: finding.trim() };
    const next = updateId ? findings.map(f => f.id === updateId ? saved : f) : isExploration ? [...findings, saved] : [saved];
    setDraft(`${prefix}-findings`, JSON.stringify(next)); setNotice("✓ Finding saved");
  };
  const next = () => {
    if (!canContinue || saveFailed) return;
    if (needsSql && !isExploration) saveAnalysis(findings[0]?.id);
    setDraft(`${prefix}-seen`, "1");
    if (stage.type === "report") { if (!state.drafts[reportSectionKey(project, "completed-at")]) setDraft(reportSectionKey(project, "completed-at"), new Date().toISOString()); setCompleteScreen(true); window.scrollTo({ top: 0 }); }
    else go(stageIndex + 1);
  };
  const run = async (check: boolean) => {
    if (running.current) return;
    running.current = true;
    const token = ++generation.current;
    const query = sql;
    setBusy(check ? "check" : "run"); setNotice("");
    setDraft(`${prefix}-sql`, query);
    if (check) setDraft(`${prefix}-check`, "");
    try {
      const replay = priorBuildSql(project, stageIndex, useLearning.getState().drafts);
      const request = {
        seed: `${dataset.seed}\n${replay}\n${isBuild ? buildSetup[stage.id] ?? "" : ""}`,
        query: isBuild ? `${query}\n;\n${check ? "SELECT 1 AS validated;" : "SELECT name, type, sql AS definition FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name;"}` : query,
        allowWrites: isBuild,
        ...(check ? isBuild ? buildValidation(project, stage.id) : { answer: stage.validation.kind === "checkpoint" ? getProjectReference(stage.validation.referenceId) : undefined, mutation: stage.validation.kind === "checkpoint" ? dataset.mutation : undefined, ordered: stage.validation.kind === "checkpoint" && stage.validation.ordered } : {}),
      };
      const res = await executeSql(request);
      if (token !== generation.current || res.superseded) return;
      setResponse(res);
      if (res.error || !res.result) { setDraft(`${prefix}-check`, ""); return; }
      // An edit while a query is running must never validate the new draft.
      if (fingerprint(useLearning.getState().drafts[`${prefix}-sql`] ?? "") !== fingerprint(query)) return;
      const evidence: StoredEvidence = { query, result: res.result, total: res.total ?? res.result.values.length, queryFingerprint: fingerprint(query), savedAt: new Date().toISOString(), checkPassed: check ? !!res.grade?.ok : checkPass };
      setDraft(`${prefix}-evidence`, JSON.stringify(evidence));
      if (check) setDraft(`${prefix}-check`, res.grade?.ok ? "pass" : "fail");
    } catch (e) { if (token === generation.current) setResponse({ error: e instanceof Error ? e.message : String(e) }); }
    finally { if (token === generation.current) { running.current = false; setBusy(null); } }
  };
  const reportDocument = projectReportDocument(project, state.drafts);
  const exportReport = async () => {
    if (exporting) return;
    setExporting(true); setExportError("");
    try {
      const { downloadProjectPdf } = await import("./report-pdf");
      await downloadProjectPdf(projectReportDocument(project, useLearning.getState().drafts), `${project.id}-certificate-and-report.pdf`);
    } catch (error) { setExportError(error instanceof Error ? error.message : "Couldn’t create the PDF. Please try again."); }
    finally { setExporting(false); }
  };
  const reportActions = <section className="project-delivery" aria-label="Project download"><div><h3>Your project portfolio</h3><p>{complete ? "Download your certificate, analysis, saved results, and SQL in one PDF." : "Preview your report now. Complete the project to download your certificate and analysis as a PDF."}</p></div><label className="project-certificate-input">Name on certificate <span>(optional)</span><input maxLength={100} value={state.drafts[reportSectionKey(project, "certificate-name")] ?? ""} onChange={e => setDraft(reportSectionKey(project, "certificate-name"), e.target.value)} placeholder="Your name" /></label><div className="project-actions"><button className="rx-btn" onClick={() => setPanel("preview")}>Preview report</button><button className="rx-btn primary" disabled={!complete || exporting || saveFailed} onClick={() => void exportReport()}>{exporting ? "Creating PDF…" : "Download certificate & report"}</button></div>{exportError && <p role="alert">{exportError}</p>}</section>;
  const textField = (label: string, key: string, prompt?: string, rows = 3) => <label className="rx-project-field"><span className="rx-label">{label}</span>{prompt && <span className="rx-small">{prompt}</span>}<textarea className="rx-project-textarea" rows={rows} value={state.drafts[key] ?? ""} onChange={e => setDraft(key, e.target.value)} /></label>;
  const savedList = <div className="project-findings">{collected.length ? collected.map(f => <section key={f.id}>
    <h3>{f.stage.title}</h3><p>{f.finding}</p><p className="rx-small">Saved from Stage {f.stageNumber}{fingerprint(state.drafts[`${draftPrefix(project, f.stage.id)}-sql`] ?? f.query) !== fingerprint(f.query) ? " · Saved from an earlier query" : ""}</p>
    <details><summary>View query</summary><SqlCode source={f.query} label="Saved query" /></details>
    <details><summary>View result</summary><Output query={f.query} res={{ result: f.result, total: f.total }} /></details>
  </section>) : <p>No saved findings yet.</p>}</div>;
  const continuation = <div className="rx-project-nav"><button className="rx-btn amber" disabled={!canContinue || saveFailed || busy !== null} onClick={next}>{isBrief ? "Begin project →" : stage.type === "orientation" ? "Continue to analysis →" : stage.type === "report" ? "Complete project" : stage.type === "synthesis" ? project.stages[stageIndex + 1]?.type === "report" ? "Continue to report →" : "Continue →" : isExploration ? "Continue →" : "Save & continue →"}</button></div>;

  return <Shell path={[{ label: "sql" }, { label: "projects", href: SQL_PROJECTS_LIBRARY_HREF }]} section="projects">
    <div className="rx-task rx-project project-contract">
      <header className="project-header">
        <ProjectPicker currentId={project.id} />
        <h1>{project.title}</h1>
        <p className="project-subtitle">{project.role} · {datasetName(project.datasetId)}</p>
        {saveFailed && <span className="rx-small" role="alert">Couldn’t save changes · <button className="rx-btn ghost" onClick={() => setDraft(positionKey, String(stageIndex))}>Retry</button></span>}
      </header>
      <nav className="project-stage-nav" aria-label="Project stages">{project.stages.map((s, i) => <button key={s.id} title={s.title} aria-label={`Stage ${i + 1}: ${s.title}`} aria-current={i === stageIndex ? "step" : undefined} onClick={() => go(i)}>{i + 1}</button>)}</nav>
      {!hydrated ? <p role="status">Loading your project…</p> : completeScreen && complete ? <article className="rx-project-page">
        <h2>Project complete</h2><p>{project.title}</p><p>You completed the investigation and produced a final report.</p><div className="project-actions"><button className="rx-btn" onClick={() => setCompleteScreen(false)}>View report</button><Link href={SQL_PROJECTS_LIBRARY_HREF}>Back to Projects</Link></div>{reportActions}
      </article> : needsSql ? <div className="rx-task-split">
        <section className="rx-brief"><p className="project-current-stage">Stage {stageIndex + 1} of {project.stages.length}</p><h2>{stage.title}</h2><div className="project-reference-tabs" role="tablist" aria-label="Stage reference" onKeyDown={event => {
          const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
          const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
          const index = event.key === "ArrowRight" ? (current + 1) % tabs.length : event.key === "ArrowLeft" ? (current - 1 + tabs.length) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
          if (index >= 0) { event.preventDefault(); tabs[index].focus(); tabs[index].click(); }
        }}>{(["task", "tables", "metrics"] as const).filter(view => view !== "metrics" || !!stage.scaffolding?.metricDefinitions?.length).map(view => <button key={view} id={`project-tab-${view}`} role="tab" aria-selected={referenceView === view} aria-controls={`project-panel-${view}`} tabIndex={referenceView === view ? 0 : -1} onClick={() => setReferenceView(view)}>{view === "task" ? "Task" : view === "tables" ? "Tables" : "Metrics"}</button>)}</div>
        <div role="tabpanel" id={`project-panel-${referenceView}`} aria-labelledby={`project-tab-${referenceView}`} tabIndex={0}>
        {referenceView === "task" && <><p className="rx-lead">{stage.investigation.replace(/\bedition\b/gi, "dataset")}</p>
          <h3>{isBuild ? "Engineering requirement" : "Context"}</h3><p>{stage.context.replace(/\bedition\b/gi, "dataset")}</p>
          {!isExploration && <><h3>{isBuild ? "Expected result" : "What to return"}</h3><p>{stage.validation.kind === "checkpoint" ? stage.validation.grain.replace(/\bedition\b/gi, "dataset") : stage.expectedEvidence?.grain}</p>{!isBuild && stage.validation.kind === "checkpoint" && <ul className="project-output-columns">{stage.validation.expectedColumns.map(c => <li key={c}><code>{c}</code></li>)}</ul>}{isBuild && <ul>{buildRules[stage.id]?.map(r => <li key={r.description}>{r.description}</li>)}</ul>}</>}
          {!!stage.scaffolding?.guidance?.length && <section className="project-reference-section"><h3>Analysis notes</h3><ul className="project-guidance-list">{stage.scaffolding.guidance.map(d => <li key={d}>{d}</li>)}</ul></section>}
          {stage.hints.length > 0 && <section className="project-help" aria-label="Guidance"><h3><Lightbulb size={18} aria-hidden="true" />Guidance</h3><ol>{stage.hints.map(h => <li key={h.level}><p>{h.text}</p></li>)}</ol></section>}
        </>}
        {referenceView === "metrics" && <MetricDefinitions definitions={stage.scaffolding?.metricDefinitions ?? []} />}
        {referenceView === "tables" && <ProjectTables datasetId={project.datasetId} names={tables} />}
        </div></section>
        <section className="rx-work" aria-label="SQL workspace"><>
          <div className="rx-cell"><div className="rx-cell-head"><span className="name">SQL workspace</span></div><Editor key={stage.id} value={sql} label="SQL workspace" minHeight="320px" tables={tables} seedSql={dataset.seed} onChange={v => { setDraft(`${prefix}-sql`, v); setDraft(`${prefix}-check`, ""); setNotice(""); }} onRun={() => void run(false)} onCheck={!isExploration ? () => void run(true) : undefined} />
            <div className="rx-cell-foot"><button className="rx-btn" disabled={busy !== null} onClick={() => void run(false)}>{busy === "run" ? "Running…" : isBuild ? "Execute" : "Run"}</button>{!isExploration && <button className="rx-btn primary" disabled={busy !== null} onClick={() => void run(true)}>{busy === "check" ? "Checking…" : isBuild ? "Validate" : "Check"}</button>}</div></div>
          <h3>{isBuild ? "Database changes" : "Results"}{(response?.result ?? result?.result) ? ` · ${response?.total ?? result?.total ?? 0} ${(response?.total ?? result?.total ?? 0) === 1 ? "row" : "rows"}` : ""}</h3>
          {response ? <>{response.error && <h4>SQL error</h4>}<Output res={response} query={sql} /></> : result ? <Output res={{ result: result.result, total: result.total }} query={sql} /> : <p className="rx-small">Run your query to see results.</p>}
          {checkPass ? <p className="project-check-pass" role="status">✓ {isBuild ? "Validation passed" : "Check passed"}</p> : response?.grade && <p role="status">Not quite. {response.grade.message}</p>}
          {(isExploration || checkPass) && textField(isBuild ? "What decisions did you make?" : isExploration ? "What did you find?" : "What did you learn?", `${prefix}-finding`, stage.findingPrompt ?? "Write 1–3 sentences about what the result means.")}
          {isExploration && <><button className="rx-btn" disabled={!result || !finding.trim()} onClick={() => saveAnalysis()}>Save finding</button><p className="rx-small">Saved findings for this stage: {findings.length} · At least {minimum} saved finding{minimum === 1 ? "" : "s"} required</p></>}
          {findings.map(f => fingerprint(f.query) !== fingerprint(sql) && <p key={f.id} className="rx-small">Saved from an earlier query <button className="rx-btn ghost" disabled={!result || !finding.trim() || (!isExploration && !checkPass)} onClick={() => saveAnalysis(f.id)}>Update saved finding</button></p>)}
          {notice && <p role="status">{notice}</p>}{collected.length > 0 && <button className="rx-btn ghost" onClick={() => setPanel("findings")}>View saved findings</button>}{continuation}
        </></section>
      </div> : <article className="rx-project-page">
        <h2 className="project-page-title">{isBrief ? "Project brief" : stage.type === "report" ? "Final report" : stage.type === "synthesis" ? "Review your analysis" : stage.title}</h2>
        {isBrief ? <div className="project-overview-grid"><div><h3>The project</h3><p>{project.brief.who}</p><p>{project.brief.situation}</p><h3>Your question</h3><p className="project-overview-question">{project.brief.ask}</p><h3>Before you start</h3><p>{project.prerequisites.join(" · ")}</p>{continuation}</div><div><h3>What you’ll deliver</h3><p>{project.brief.deliverable}</p><h3>Your data</h3><p>{project.brief.data}</p><h3>Your investigations</h3><ol>{project.stages.filter(s => ["checkpoint", "exploration", "build"].includes(s.type)).map(s => <li key={s.id}><strong>{s.title}</strong><p>{s.investigation}</p></li>)}</ol></div></div> : stage.type === "orientation" ? <><p>{stage.investigation}</p><p>{datasetName(project.datasetId)} · {tables.length} related tables</p><ProjectTables datasetId={project.datasetId} names={tables} /><DataNotes text={stage.context} /></> : stage.type === "synthesis" ? <>
          <p>{stage.id === "define-contracts" ? stage.investigation : "Connect your saved findings before writing the final report."}</p>{savedList}
          {textField("What are the 2–3 most important conclusions?", `${prefix}-finding`, stage.reviewPrompt ?? (stage.id === "define-contracts" ? stage.findingPrompt : undefined))}
          {project.level !== "beginner" && textField("What should the team prioritize?", `${prefix}-priority`, "Explain the likely business impact and recommended action.")}
          {project.level === "advanced" && textField("What uncertainty or limitation affects your conclusion?", `${prefix}-limitations`)}
        </> : <>
          {project.reportTemplate.sections.slice(0, 1).map(section => <div key={section.id}>{textField(section.title, reportSectionKey(project, section.id), section.prompt, 4)}</div>)}
          <h3>Key findings</h3><p>Select saved findings to include. You can edit their report wording here.</p>
          {collected.map(f => { const key = reportSectionKey(project, `include-${f.id}`); const included = state.drafts[key] !== "no"; return <section className="project-report-finding" key={f.id}><label><input type="checkbox" checked={included} onChange={e => setDraft(key, e.target.checked ? "yes" : "no")} /> {f.stage.title}</label>{included && <label className="rx-project-field"><span className="rx-small">Finding for report</span><textarea className="rx-project-textarea" rows={3} value={state.drafts[reportSectionKey(project, `finding-${f.id}`)] ?? f.finding} onChange={e => setDraft(reportSectionKey(project, `finding-${f.id}`), e.target.value)} /></label>}</section>; })}
          {project.reportTemplate.sections.slice(1).map(section => <div key={section.id}>{textField(section.title, reportSectionKey(project, section.id), section.prompt, 4)}</div>)}
          {reportActions}
        </>}{!isBrief && continuation}
      </article>}
      {panel && <ProjectDialog title={panel === "findings" ? "Saved findings" : "Report preview"} close={() => setPanel(null)}>
        {panel === "findings" ? savedList : <ProjectReport report={reportDocument} />}
      </ProjectDialog>}
    </div>
  </Shell>;
}
