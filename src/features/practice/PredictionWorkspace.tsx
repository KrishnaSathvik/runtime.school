"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Check, Eye } from "lucide-react";
import { bankSeed, type BankQuestion } from "@/content/question-bank";
import { executeSql, type ExecuteResponse } from "@/engine/sql-client";
import { gradePrediction, parsePrediction } from "@/engine/prediction";
import { useLearning } from "@/lib/learning-state";
import { Output } from "@/features/rt/Output";

type Panel = "checks" | "results";

/**
 * Predict-output practice: enter the rows you think the fixed query returns.
 * Matches TaskCell chrome — prediction cell + one Output panel under it.
 */
export function PredictionWorkspace({
  q,
  nextAction,
  footer,
}: {
  q: BankQuestion;
  nextAction: ReactNode;
  footer?: ReactNode;
}) {
  const state = useLearning();
  const key = `sql-qb-${q.id}`;
  const value = state.drafts[key] ?? "";
  const progress = state.questions[q.id];
  const epoch = progress?.epoch ?? 0;
  const saved = progress?.lastCheck;
  const feedback =
    saved?.version === q.version && saved.input === value && saved.epoch === epoch ? saved : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sqlError, setSqlError] = useState("");
  const [actual, setActual] = useState<ExecuteResponse | null>(null);
  const [panel, setPanel] = useState<Panel>("checks");
  const token = useRef(0);
  const invalidate = useCallback(() => {
    token.current++;
  }, []);

  useEffect(() => {
    invalidate();
    setActual(null);
    setError("");
    setSqlError("");
    setBusy(false);
    setPanel("checks");
    return invalidate;
  }, [q.id, epoch, invalidate]);

  const run = async (reveal: boolean) => {
    setSqlError("");
    let rows;
    if (!reveal) {
      try {
        rows = parsePrediction(value, q.columns.length);
      } catch (e) {
        setError((e as Error).message);
        setPanel("checks");
        return;
      }
    }
    const request = ++token.current;
    setError("");
    setBusy(true);
    // Record exposure before execution, even if the worker fails or navigation interrupts it.
    if (reveal) useLearning.getState().revealQuestion(q.id);
    const result = await executeSql({ seed: bankSeed(q), query: q.solution });
    if (request !== token.current) return;
    setBusy(false);
    if (result.superseded) {
      setError("Another query interrupted this check. Try again.");
      setPanel("checks");
      return;
    }
    if (result.error) {
      setSqlError(result.error);
      setActual(result);
      setPanel("results");
      return;
    }
    if (!result.result) {
      setError("The result could not be checked. Try again.");
      setPanel("checks");
      return;
    }
    if (reveal) {
      setActual(result);
      setPanel("results");
      return;
    }
    // Never associate an in-flight result with a newer draft or a fresh attempt.
    const current = useLearning.getState();
    if ((current.drafts[key] ?? "") !== value || (current.questions[q.id]?.epoch ?? 0) !== epoch) return;
    const grade = gradePrediction(rows!, q.columns, result.result, q.ordered);
    current.recordQuestionCheck(q.id, grade.ok, {
      input: value,
      version: q.version,
      epoch,
      message: grade.message,
    });
    setPanel("checks");
  };

  const example = JSON.stringify([q.columns.map((_, i) => (i === 0 ? 1 : null))], null, 2);
  const placeholder = JSON.stringify([q.columns.map(() => null)], null, 2);
  const taRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 220)}px`;
  }, [value, placeholder, q.id]);
  const showChecks = panel === "checks";
  const showResults = panel === "results";
  const hasResult = !!(actual?.result || actual?.error || sqlError);

  return (
    <>
      <div className="rx-cell">
        <div className="rx-cell-head">
          <span className="name">prediction.json</span>
        </div>
        <p id="prediction-help" className="rx-predict-help">
          Enter the rows you think the query returns, column order{" "}
          <strong className="mono">{q.columns.join(", ")}</strong>
          . JSON array of rows — numbers bare, text in quotes, <code>null</code> for NULL. Example:{" "}
          <code>{example}</code>. {q.ordered ? "Keep ORDER BY order." : "Row order does not matter."}
        </p>
        <label className="sr-only" htmlFor="prediction-rows">
          Your predicted rows
        </label>
        <textarea
          ref={taRef}
          id="prediction-rows"
          aria-describedby="prediction-help"
          className="rx-predict-editor"
          value={value}
          placeholder={placeholder}
          spellCheck={false}
          onChange={(e) => {
            state.setDraft(key, e.target.value);
            setError("");
            setSqlError("");
          }}
        />
        <div className="rx-cell-foot">
          <span className="hint"> </span>
          {footer}
          <button
            type="button"
            className="rx-btn primary"
            disabled={busy || !value.trim()}
            onClick={() => void run(false)}
          >
            <Check size={14} /> {busy && !actual ? "Checking…" : "Check prediction"}
          </button>
          <button type="button" className="rx-btn" disabled={busy} onClick={() => void run(true)}>
            <Eye size={13} /> Show result
          </button>
        </div>
      </div>

      <div className="rx-results">
        <div className="rx-results-tabs" role="tablist" aria-label="Output">
          <span role="tab" aria-selected="true">Output</span>
        </div>

        {showChecks && (busy || error || feedback) && (
          <div className="rx-results-pane" role="tabpanel">
            {busy && !feedback && !error ? (
              <p className="rx-results-empty">Checking with SQLite…</p>
            ) : error ? (
              <p className="rx-verdict bad" role="status">
                {error}
              </p>
            ) : feedback ? (
              <>
                <p className={`rx-verdict ${feedback.ok ? "ok" : "bad"}`} role="status">
                  {feedback.message}
                </p>
                {feedback.ok && (
                  <>
                    <p className="rx-small">
                      {feedback.guided ? "Solved with help." : "Solved without hints."}{" "}
                      {q.explanation}
                    </p>
                    {nextAction && <div className="rx-next">{nextAction}</div>}
                  </>
                )}
              </>
            ) : null}
          </div>
        )}

        {showResults && (busy || hasResult) && (
          <div className="rx-results-pane" role="tabpanel">
            {!hasResult ? (
              <p className="rx-results-empty">Running…</p>
            ) : (
              <>
                {actual && (
                  <Output
                    res={actual}
                    query={q.solution}
                    echo={false}
                    tables={q.tables}
                    surface="exercise"
                  />
                )}
                {actual?.result && <p className="rx-small">{q.explanation}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
