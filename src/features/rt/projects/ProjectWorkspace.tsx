"use client";

import { focusWorkspaceEditor } from "../workspace-focus";
import Link from "next/link";
import { ArrowDown, ArrowRight, Check, Download, Play } from "lucide-react";
import { HelpButtons, HelpPanel } from "@/features/python/Help";
import { DataNotes } from "./ProjectGuidance";
import { Fragment, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { projects as allProjects, type Project, type ProjectStage } from "@/content/projects";
import { SQL_PROJECTS_LIBRARY_HREF, sqlProjectHref } from "@/content/projects/paths";
import { getProjectReference } from "@/content/projects/references";
import { toolDataset } from "@/content/tools/datasets";
import { cancelSql, executeSql, preloadDatabase, type ExecuteResponse } from "@/engine/sql-client";
import { gradeFeedback } from "../feedback";
import { useDraftSaveFailed, useHydrated, useLearning } from "@/lib/learning-state";
import { Shell } from "../Shell";
import { Editor } from "../Editor";
import { Keys, MacOnly } from "../Keys";
import { PLAYGROUND_EDITOR_HEIGHT } from "../editor-height";
import { Output } from "../Output";
import { SqlCode } from "../SqlCode";
import { allFindings, currentEvidence, draftPrefix, fingerprint, projectIsComplete, reportSectionKey, savedFindings, stageIsComplete, type SavedFinding, type StoredEvidence } from "./evidence";
import { projectReportDocument } from "./report-document";
import { ProjectReport } from "./ProjectReport";
import { buildRules, buildSetup, buildValidation, priorBuildSql } from "./build";
import { ProjectRelationshipLines, ProjectTableCards } from "./ProjectTables";
import { ProjectDialog } from "./ProjectDialog";
import { sqlLessonLink, sqlOverview } from "@/content/projects/overviews";
import { ProjectOverview, ProjectReview, ProjectStepBar, type FrameStep } from "../project-frame";
import { jumpTo, revealRange } from "../reveal";

const shortDate = (t: string) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

export function ProjectWorkspace({ project }: { project: Project }) {
  const state = useLearning();
  const hydrated = useHydrated();
  const saveFailed = useDraftSaveFailed();
  const [stageIndex, setStageIndex] = useState(0);
  const restored = useRef(false);
  const [panel, setPanel] = useState<"findings" | "preview" | null>(null);
  const [busy, setBusy] = useState<"run" | "check" | null>(null);
  const running = useRef(false);
  const generation = useRef(0);
  const [response, setResponse] = useState<ExecuteResponse | null>(null);
  const [outPanel, setOutPanel] = useState<"results" | "checks">("results");
  const [notice, setNotice] = useState("");
  // Hints open one at a time from the editor bar, as in Python and PySpark.
  const [hintsShown, setHintsShown] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const stage = project.stages[stageIndex]!;
  // The conclusions and the final report are the Review page, as in Python and PySpark: the bar lists only the work.
  const synthIndex = project.stages.findIndex(s => s.type === "synthesis");
  const reportIndex = project.stages.findIndex(s => s.type === "report");
  const workEnd = synthIndex >= 0 ? synthIndex : reportIndex >= 0 ? reportIndex : project.stages.length;
  const isReview = stageIndex >= workEnd;
  const prefix = draftPrefix(project, stage.id);
  const positionKey = draftPrefix(project, "current-stage");
  const lastStepKey = draftPrefix(project, "last-step");
  const dataset = toolDataset(project.datasetId);
  const tables = stage.relevantTables.length ? stage.relevantTables : project.relevantTables;
  const isBuild = stage.type === "build";
  const fileName = isBuild ? "build.sql" : "query.sql";
  const isExploration = stage.type === "exploration";
  const needsSql = isBuild || isExploration || stage.type === "checkpoint";
  const isBrief = stage.type === "orientation" && stage.id === "brief";
  // Overview already shows tables; skip understand-data so Start opens the first coding step (as in Python).
  const firstWorkIndex = Math.max(1, project.stages.findIndex(s => s.type !== "orientation"));
  const workStageList = project.stages.slice(0, workEnd).filter(s => s.type !== "orientation");
  const workStepNumber = workStageList.findIndex(s => s.id === stage.id) + 1;
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
  const setDraft = (key: string, value: string) => state.setDraft(key, value);
  const stageDone = project.stages.map(s => stageIsComplete(s, state.drafts, draftPrefix(project, s.id), project));
  // Check and Validate save the step themselves. Exploration still uses Save finding.
  const checkedStep = needsSql && !isExploration;
  const canContinue = (stage.type === "orientation" || (checkedStep ? !!stageDone[stageIndex] : needsSql ? findings.length >= minimum : stage.type === "report" ? reportReady && priorComplete : stageIsComplete(stage, state.drafts, prefix, project)));
  const nextStage = project.stages[stageIndex + 1];
  const advanceTitle = stageIndex + 1 >= workEnd ? "Review" : nextStage?.type === "orientation" ? (project.stages[stageIndex + 2]?.title ?? nextStage.title) : (nextStage?.title ?? "Review");
  const footRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const findingRef = useRef<HTMLTextAreaElement>(null);
  // After Run or Check, bring the Output panel in under the Run / Check bar.
  useEffect(() => {
    if (!response) return;
    const frame = requestAnimationFrame(() => {
      const checksEl = resultsRef.current?.querySelector<HTMLElement>(".rx-verdict, .project-check-pass, .project-check-fail");
      if (footRef.current && resultsRef.current) revealRange(footRef.current, checksEl ?? resultsRef.current, checksEl ? Infinity : 320);
    });
    return () => cancelAnimationFrame(frame);
  }, [response, outPanel]);

  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    const requested = new URLSearchParams(window.location.search).get("stage");
    let index = project.stages.findIndex(s => s.id === requested);
    // Without ?stage, a project opens on its overview, as in Python and PySpark; Continue there resumes the last step.
    if (index < 0) index = 0;
    else if (index >= workEnd && reportIndex >= 0) index = reportIndex;
    else if (index > 0 && index < workEnd && project.stages[index]?.type === "orientation") index = firstWorkIndex;
    setStageIndex(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, after saved progress has loaded
  }, [hydrated, positionKey, project]);
  // Start the download while the learner reads the brief.
  useEffect(() => { preloadDatabase(dataset.seed); return () => cancelSql(); }, [dataset.seed]);

  // The report's completion date: the first time every work step is done.
  useEffect(() => {
    if (hydrated && complete && !state.drafts[reportSectionKey(project, "completed-at")]) state.setDraft(reportSectionKey(project, "completed-at"), new Date().toISOString());
  }, [hydrated, complete, project, state]);

  useEffect(() => {
    if (!saveFailed) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saveFailed]);

  // A written note can land after the check. Keep the saved row in step with it so the report stays current.
  useEffect(() => {
    if (!hydrated || !checkedStep || !checkPass || !result?.checkPassed) return;
    const text = finding.trim() || stage.title;
    const existing = savedFindings(useLearning.getState().drafts, prefix);
    if (existing.some(s => fingerprint(s.query) === fingerprint(sql) && s.checkPassed && s.finding.trim() === text)) return;
    const row: SavedFinding = { ...result, id: existing[0]?.id ?? crypto.randomUUID(), finding: text, checkPassed: true };
    setDraft(`${prefix}-findings`, JSON.stringify([row]));
  }, [hydrated, checkedStep, checkPass, finding, sql, result, prefix, stage.title, setDraft]);

  const markOrientationsSeen = () => {
    for (const s of project.stages) {
      if (s.type === "orientation") setDraft(`${draftPrefix(project, s.id)}-seen`, "1");
    }
  };
  const go = (to: number) => {
    let index = to >= workEnd && reportIndex >= 0 ? reportIndex : to;
    // Never land on understand-data — overview already covers the data.
    if (index > 0 && index < workEnd && project.stages[index]?.type === "orientation") index = firstWorkIndex;
    generation.current++; cancelSql(); running.current = false; setBusy(null);
    const url = new URL(window.location.href);
    url.searchParams.set("stage", project.stages[index]!.id);
    window.history.replaceState(window.history.state, "", url);
    setHintsShown(0); setStageIndex(index); setDraft(positionKey, String(index));
    if (index > 0) { setDraft(lastStepKey, String(index)); markOrientationsSeen(); }
    setResponse(null); setOutPanel("results"); setNotice(""); setPanel(null); window.scrollTo({ top: 0 });
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
    if (stage.type === "report") { if (!state.drafts[reportSectionKey(project, "completed-at")]) setDraft(reportSectionKey(project, "completed-at"), new Date().toISOString()); window.scrollTo({ top: 0 }); }
    else {
      let n = stageIndex + 1;
      while (n < workEnd && project.stages[n]?.type === "orientation") n++;
      go(n);
    }
  };
  const run = async (check: boolean) => {
    if (running.current) return;
    running.current = true;
    const token = ++generation.current;
    const query = sql;
    setBusy(check ? "check" : "run"); setNotice("");
    setOutPanel(check && !isExploration ? "checks" : "results");
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
      if (check) {
        const passed = !!res.grade?.ok;
        setDraft(`${prefix}-check`, passed ? "pass" : "fail");
        if (passed && !isExploration) {
          const draftsNow = useLearning.getState().drafts;
          const written = (draftsNow[`${prefix}-finding`] ?? "").trim() || stage.title;
          const existing = savedFindings(draftsNow, prefix);
          const row: SavedFinding = { ...evidence, id: existing[0]?.id ?? crypto.randomUUID(), finding: written, checkPassed: true };
          setDraft(`${prefix}-findings`, JSON.stringify([row]));
          setDraft(`${prefix}-seen`, "1");
        }
      }
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
  const textField = (label: string, key: string, prompt?: string, rows = 3, ref?: Ref<HTMLTextAreaElement>) => <label className="rx-project-field"><span className="rx-label">{label}</span>{prompt && <span className="rx-small">{prompt}</span>}<textarea ref={ref} className="rx-project-textarea" rows={rows} value={state.drafts[key] ?? ""} onChange={e => setDraft(key, e.target.value)} /></label>;
  const savedList = <div className="project-findings">{collected.length ? collected.map(f => <section key={f.id}>
    <h3>{f.stage.title}</h3><p>{f.finding}</p><p className="rx-small">Saved from step {f.stageNumber}{fingerprint(state.drafts[`${draftPrefix(project, f.stage.id)}-sql`] ?? f.query) !== fingerprint(f.query) ? " · Saved from an earlier query" : ""}</p>
    <details><summary>View query</summary><SqlCode source={f.query} label="Saved query" /></details>
    <details><summary>View result</summary><Output query={f.query} res={{ result: f.result, total: f.total }} /></details>
  </section>) : <p>No saved findings yet.</p>}</div>;
  /** Why a stage still blocks the report, in the learner's terms. */
  const openReason = (s: ProjectStage) => {
    const pre = draftPrefix(project, s.id);
    if (s.type === "orientation") return "open it and press Continue";
    if (s.type === "synthesis") return "answer its review questions";
    if (s.type === "exploration") return "save the findings it asks for";
    const saved = savedFindings(state.drafts, pre);
    if (saved.length && !saved.some(f => fingerprint(f.query) === fingerprint(state.drafts[`${pre}-sql`] ?? ""))) return "its query changed after the check passed: check it again";
    return "pass its check";
  };
  const blockers = stage.type === "report" ? project.stages.map((s, i) => ({ s, i })).filter(({ s, i }) => i < stageIndex && !stageDone[i] && s.type !== "report") : [];
  const missing = stage.type === "report" ? project.reportTemplate.sections.filter(s => s.required && !state.drafts[reportSectionKey(project, s.id)]?.trim()) : [];
  const reason = canContinue || saveFailed ? "" : stage.type === "report" ? [blockers.length ? (blockers.some(b => b.i < workEnd) ? "Finish every step and answer the conclusions first." : "Answer the conclusions first.") : "", missing.length ? `Fill in: ${missing.map(m => m.title).join(", ")}.` : ""].filter(Boolean).join(" ")
    : needsSql ? isExploration ? `Save at least ${minimum} finding${minimum === 1 ? "" : "s"} to continue.` : !checkPass ? `${isBuild ? "Pass validation" : "Pass the check"} to continue.` : "Write what you learned to continue."
    : stage.type === "synthesis" ? "Answer each question above to continue." : "";
  const continuation = <div className="rx-project-nav">
    {blockers.length > 0 && !isReview && <ul className="project-blockers" aria-label="Stages to finish">{blockers.map(({ s, i }) => {
      const n = workStageList.findIndex(w => w.id === s.id) + 1;
      return <li key={s.id}><button type="button" className="rx-link" onClick={() => go(i)}>{i >= workEnd || n < 1 ? s.title : `Step ${n}: ${s.title}`}</button> <span className="rx-small">· {openReason(s)}</span></li>;
    })}</ul>}
    {reason ? <p className="rx-small project-continue-reason" id={`${prefix}-reason`}>{reason}</p> : !isBrief && stage.type !== "report" && nextStage && <p className="rx-small project-continue-reason">Next: {stageIndex + 1 >= workEnd ? "Review" : `Step ${workStepNumber + 1} · ${nextStage.type === "orientation" ? (project.stages[stageIndex + 2]?.title ?? nextStage.title) : nextStage.title}`}</p>}
    <button className="rx-btn amber" aria-describedby={reason ? `${prefix}-reason` : undefined} disabled={!canContinue || saveFailed || busy !== null} onClick={next}>{isBrief ? "Begin project →" : stage.type === "orientation" ? "Continue to analysis →" : stage.type === "report" ? "Complete project" : stage.type === "synthesis" ? project.stages[stageIndex + 1]?.type === "report" ? "Continue to report →" : "Continue →" : isExploration ? "Continue →" : "Save & continue →"}</button></div>;
  const nextProject = (() => { const at = allProjects.findIndex(p => p.id === project.id); return [...allProjects.slice(at + 1), ...allProjects.slice(0, at)].find(p => !projectIsComplete(p, state.drafts)); })();

  const overview = sqlOverview(project.id);
  // The brief is the overview; coding/build/exploration stages are the steps (understand-data is skipped).
  const frameSteps: FrameStep[] = workStageList.map((s, k) => {
    const index = project.stages.findIndex(x => x.id === s.id);
    return {
      key: s.id,
      number: k + 1,
      title: s.title,
      label: overview?.labels[s.id] ?? s.title,
      summary: overview?.summaries[s.id],
      done: stageDone[index] ?? false,
      onOpen: () => go(index),
    };
  });
  const last = Number(state.drafts[lastStepKey] ?? state.drafts[positionKey]);
  const started = (Number.isInteger(last) && last > 0) || workStageList.some((_, k) => stageDone[project.stages.findIndex(x => x.id === workStageList[k]!.id)]);
  const resumeRaw = Number.isInteger(last) && last > 0 && last < project.stages.length ? last : Math.max(firstWorkIndex, stageDone.findIndex((d, i) => i >= firstWorkIndex && !d));
  const resumeAt = project.stages[resumeRaw]?.type === "orientation" ? firstWorkIndex : resumeRaw;
  // The overview and the review use the shared frame's page, as in Python and PySpark; the stages keep SQL's workspace.
  const frame = hydrated && (isBrief || isReview);
  const openReview = () => go(reportIndex >= 0 ? reportIndex : workEnd);
  return <Shell path={[{ label: "sql" }, { label: "projects", href: SQL_PROJECTS_LIBRARY_HREF }]} section="projects">
    <div className={frame ? "p2 pf-sql" : `rx-task rx-project project-contract pf-project${needsSql && hydrated ? " workspace-bounded" : ""}`}>
      <header className={frame ? "p2-project-head" : "p2 p2-project-head pf-sql-head"}>
        <Link href={SQL_PROJECTS_LIBRARY_HREF}>All projects</Link>
        <h1>{project.title}</h1>
        <p>{project.brief.ask}</p>
        {saveFailed && <span className="rx-small" role="alert">Couldn’t save changes · <button className="rx-btn ghost" onClick={() => setDraft(positionKey, String(stageIndex))}>Retry</button></span>}
      </header>
      {hydrated && !isBrief && <div className="pf-bar"><ProjectStepBar steps={frameSteps} current={isReview ? "review" : stage.id} onOverview={() => go(0)} onReview={openReview} /></div>}
      {!hydrated ? <p role="status">Loading your project…</p> : isReview ? <ProjectReview
        complete={complete}
        finishedOn={complete && collected.length ? shortDate(collected.map(f => f.savedAt).sort().at(-1)!) : undefined}
        actions={<>
          {complete && <button type="button" className="p2-btn line" disabled={exporting || saveFailed} onClick={() => void exportReport()}><Download size={14} aria-hidden="true" /> {exporting ? "Creating PDF…" : "Download your report (PDF)"}</button>}
          {collected.length > 0 && <button type="button" className="p2-btn line" onClick={() => setPanel("preview")}>Preview report</button>}
          {exportError && <p role="alert">{exportError}</p>}
        </>}
        workTitle="Your findings"
        work={workStageList.map(s => {
          const f = savedFindings(state.drafts, draftPrefix(project, s.id)).at(-1);
          return { key: s.id, name: s.title, about: f ? f.finding : "No finding saved yet.", ok: stageIsComplete(s, state.drafts, draftPrefix(project, s.id), project) };
        })}
        workNote="Your report is built from these findings and the queries behind them."
        references={workStageList.flatMap((s, k) => {
          const sqlText = s.validation.kind === "checkpoint" ? getProjectReference(s.validation.referenceId) : undefined;
          return sqlText ? [{ key: s.id, title: `Step ${k + 1}: ${s.title}`, body: <pre><code>{sqlText.trim()}</code></pre> }] : [];
        })}
        referencesNote="One query that answers each step. Yours doesn't have to match: any query that passes the same check is right."
            nextProject={nextProject ? { href: sqlProjectHref(nextProject.id), label: nextProject.title } : undefined}
      /> : needsSql ? <>
      <div className="rx-task-split">
        <section className="rx-brief" aria-label="Project requirements" tabIndex={0}>
          <p className="project-current-stage">Step {workStepNumber} of {workStageList.length}</p>
          <h2>{stage.title}</h2>
          <p className="pf-step-text">{stage.investigation.replace(/\bedition\b/gi, "dataset")}</p>
          <p className="pf-step-text">{stage.context.replace(/\bedition\b/gi, "dataset")}</p>
          {(() => {
            const text = (t: string) => t.replace(/\bedition\b/gi, "dataset");
            const grain = stage.validation.kind === "checkpoint" ? stage.validation.grain : stage.expectedEvidence?.grain;
            const doneWhen: ReactNode[] = isExploration
              ? [`Save at least ${minimum} finding${minimum === 1 ? "" : "s"} from your queries.`]
              : [
                  ...(grain ? [text(grain[0].toUpperCase() + grain.slice(1))] : []),
                  ...(!isBuild && stage.validation.kind === "checkpoint" ? [<>Return {stage.validation.expectedColumns.map((c, k) => <Fragment key={c}>{k > 0 && ", "}<code>{c}</code></Fragment>)}.</>] : []),
                  ...(isBuild ? buildRules[stage.id]?.map(r => r.description) ?? [] : []),
                ];
            const done = stageDone[stageIndex];
            return (
              <section className="project-step-checks" aria-label="Step criteria">
                <h3>Done when</h3>
                <ul className="p2-done">{doneWhen.map((d, k) => <li key={k}><span className={`p2-mark ${done ? "pass" : "not-run"}`} aria-hidden="true">{done ? "✓" : "◌"}</span><span>{d}</span></li>)}</ul>
                {!!stage.scaffolding?.guidance?.length && <details className="project-more"><summary>Analysis notes</summary><ul className="project-guidance-list">{stage.scaffolding.guidance.map(d => <li key={d}>{d}</li>)}</ul></details>}
              </section>
            );
          })()}
          {checkedStep && stageDone[stageIndex] && <button type="button" className="rx-btn amber p2-next" onClick={next}>Next: {advanceTitle} →</button>}
        </section>
        <section className="rx-work" aria-label="SQL workspace" tabIndex={0} onFocusCapture={focusWorkspaceEditor}><>
          <div className="pf-sql-files" role="tablist" aria-label="Files"><span role="tab" aria-selected="true">{fileName}</span><span className="pf-sql-file-keys" aria-hidden="true"><MacOnly><Keys keys={["mod", "enter"]} /> <span>run</span>{!isExploration && <><Keys keys={["mod", "shift", "enter"]} /> <span>check</span></>}</MacOnly></span></div>
          <div className="rx-cell"><Editor key={stage.id} value={sql} label="SQL workspace" minHeight={PLAYGROUND_EDITOR_HEIGHT} tables={tables} seedSql={dataset.seed} onChange={v => { setDraft(`${prefix}-sql`, v); setDraft(`${prefix}-check`, ""); setNotice(""); }} onRun={() => void run(false)} onCheck={!isExploration ? () => void run(true) : undefined} />
            <div className="rx-cell-foot pf-sql-foot p2" ref={footRef}><div>{stage.hints.length > 0 && <HelpButtons hintsShown={hintsShown} hintCount={stage.hints.length} revealed={false} onHint={() => setHintsShown(n => Math.min(stage.hints.length, n + 1))} />}</div><div><button type="button" className="p2-btn line" disabled={busy !== null} onClick={() => void run(false)}><Play size={14} aria-hidden="true" /> {busy === "run" ? "Running…" : isBuild ? "Execute" : "Run"}</button>{!isExploration && <button type="button" className="p2-btn primary" disabled={busy !== null} onClick={() => void run(true)}><Check size={14} aria-hidden="true" /> {busy === "check" ? "Checking…" : isBuild ? "Validate" : "Check step"}</button>}</div></div></div>
          <HelpPanel hints={stage.hints.map(h => h.text)} shown={hintsShown} revealed={false} assisted={false} />
          <div className="rx-results p2-results" ref={resultsRef}>
              <div className="p2-tabs" role="tablist" aria-label="Output">
                <span role="tab" aria-selected="true">Output</span>
              </div>
              {outPanel === "results" && (response || result) && (
                <div className="rx-results-pane" role="tabpanel">
                  {response ? (
                    <Output res={response} query={sql} echo={false} tables={dataset.metadata.tables.map(t => t.name)} surface="exercise" />
                  ) : result ? (
                    <Output res={{ result: result.result, total: result.total }} query={sql} echo={false} />
                  ) : null}
                </div>
              )}
              {!isExploration && outPanel === "checks" && (
                <div className="rx-results-pane" role="tabpanel">
                  {checkPass ? (
                    <>
                      <p className={`rx-verdict ok`} role="status">✓ {isBuild ? "Validation passed" : "Check passed"}</p>
                      {stageDone[stageIndex] && <div className="p2-verdict-next"><button type="button" className="p2-btn primary" onClick={next}>Next step: {advanceTitle} <ArrowRight size={14} aria-hidden="true" /></button></div>}
                      {!finding.trim() && (
                        <p className="rx-small">Read the result, then write what you learned under it.{" "}
                          <button type="button" className="rx-btn ghost" onClick={() => jumpTo(findingRef.current)}>
                            <ArrowDown size={13} aria-hidden="true" /> Write your finding
                          </button>
                        </p>
                      )}
                    </>
                  ) : response?.grade ? (
                    <p className="rx-verdict bad" role="status">Not quite. {gradeFeedback(response, stage.validation.kind === "checkpoint" && !!stage.validation.ordered, { query: sql, tables })}</p>
                  ) : busy === "check" ? (
                    <p className="rx-results-empty">Checking…</p>
                  ) : (
                    <p className="rx-results-empty">Press {isBuild ? "Validate" : "Check step"} to grade your query.</p>
                  )}
                </div>
              )}
            </div>
          {(isExploration || checkPass) && textField(isBuild ? "What decisions did you make?" : isExploration ? "What did you find?" : "What did you learn?", `${prefix}-finding`, stage.findingPrompt ?? "Write 1–3 sentences about what the result means.", 3, findingRef)}
          {isExploration && <><button className="rx-btn" disabled={!result || !finding.trim()} onClick={() => saveAnalysis()}>Save finding</button><p className="rx-small">Saved findings for this stage: {findings.length} · At least {minimum} saved finding{minimum === 1 ? "" : "s"} required</p></>}
          {findings.map(f => fingerprint(f.query) !== fingerprint(sql) && <p key={f.id} className="rx-small">Saved from an earlier query <button className="rx-btn ghost" disabled={!result || !finding.trim() || (!isExploration && !checkPass)} onClick={() => saveAnalysis(f.id)}>Update saved finding</button></p>)}
          {notice && <p role="status">{notice}</p>}{collected.length > 0 && <button className="rx-btn ghost" onClick={() => setPanel("findings")}>View saved findings</button>}{checkedStep ? null : continuation}
        </></section>
      </div>
      </> : isBrief ? <ProjectOverview
        banner={complete ? <div className="p2-complete"><b>Project complete</b><p>You finished the analysis and the final report. Look back over the project, or download your report.</p><div className="p2-complete-acts"><button type="button" className="p2-btn primary" onClick={openReview}>Review the project <ArrowRight size={14} aria-hidden="true" /></button></div></div> : undefined}
        task={<p>{overview?.task ?? `${project.brief.who} ${project.brief.situation}`}</p>}
        started={started}
        onStart={() => go(started ? resumeAt : firstWorkIndex)}
        outputs={overview?.produce ?? [{ name: "Final report", about: project.brief.deliverable }]}
        steps={frameSteps}
        data={<p className="pf-text">{project.brief.data}</p>}
        tables={<ProjectTableCards datasetId={project.datasetId} names={project.relevantTables} />}
        relationships={<ProjectRelationshipLines datasetId={project.datasetId} names={project.relevantTables} />}
        problems={overview?.problems ?? []}
        preparation={(overview?.preparation ?? []).flatMap(slug => { const l = sqlLessonLink(slug); return l ? [l] : []; })}
        preparationSide="left"
      /> : <article className="rx-project-page">
        {/* Fallback for a deep link to understand-data: bounce to the first coding step. */}
        <h2 className="project-page-title">{stage.title}</h2>
        <p>{stage.investigation}</p>
        <DataNotes text={stage.context} />
        <div className="rx-project-nav">
          <button className="rx-btn amber" onClick={() => go(firstWorkIndex)}>Continue to analysis →</button>
        </div>
      </article>}
      {panel && <ProjectDialog title={panel === "findings" ? "Saved findings" : "Report preview"} close={() => setPanel(null)}>
        {panel === "findings" ? savedList : <ProjectReport report={reportDocument} />}
      </ProjectDialog>}
    </div>
  </Shell>;
}
