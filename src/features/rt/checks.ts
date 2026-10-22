import type { ExecuteResponse } from "@/engine/sql-client";
import { changedDataDetail, gradeFeedback, rowCountDetail, type FeedbackContext } from "./feedback";

export type CheckState = "pass" | "fail" | "wait";
export type VisibleCheck = { state: CheckState; label: string; detail?: string };

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((c, i) => c.toLowerCase() === b[i].toLowerCase());

/**
 * Turns the real grader's response into the checks a learner can see.
 * Nothing is simulated: every line reads a field the engine returned. `ctx` only changes the
 * wording of a failed line (see feedback.ts), never its state.
 */
export function visibleChecks(res: ExecuteResponse, ordered: boolean, ctx: FeedbackContext = {}): VisibleCheck[] {
  const grade = res.grade;
  if (res.error) {
    return [
      // The output below explains the error once; repeating the raw text here added noise.
      { state: "fail", label: "Runs without an error" },
      { state: "wait", label: "Returns the requested columns" },
      { state: "wait", label: "Returns the right rows" },
      { state: "wait", label: "Still correct on different data" },
    ];
  }
  const out: VisibleCheck[] = [{ state: "pass", label: "Runs without an error" }];
  const expected = res.expected;
  const actual = res.result;
  let upstream = true;

  if (expected && actual) {
    const colsOk = same(actual.columns, expected.columns);
    out.push({
      state: colsOk ? "pass" : "fail",
      label: `Returns columns ${expected.columns.join(", ")}`,
      detail: colsOk ? undefined : `Yours returned ${actual.columns.join(", ") || "no columns"}.`,
    });
    const actualCount = res.total ?? actual.values.length;
    const expectedCount = res.expectedTotal ?? expected.values.length;
    const rowsOk = actualCount === expectedCount;
    out.push({
      state: !colsOk ? "wait" : rowsOk ? "pass" : "fail",
      label: `Returns ${expectedCount} row${expectedCount === 1 ? "" : "s"}`,
      detail: colsOk && !rowsOk ? rowCountDetail(actualCount, expectedCount, ctx, actual) : undefined,
    });
    upstream = colsOk && rowsOk;
  }

  if (grade) {
    // Original data passed when the grade is ok, or when only the changed-data or plan step failed.
    const originalOk = grade.ok || !!grade.variationFailed || !!grade.planFailed;
    out.push({
      state: !upstream ? "wait" : originalOk ? "pass" : "fail",
      label: ordered ? "Values match, in the requested order" : "Values match",
      detail: upstream && !originalOk ? gradeFeedback(res, ordered, ctx) : undefined,
    });
    if (grade.planFailed) {
      out.push({ state: "fail", label: "Uses the required query plan", detail: grade.message });
    }
    out.push({
      state: grade.ok ? "pass" : grade.variationFailed ? "fail" : "wait",
      label: "Still correct on different data",
      detail: grade.variationFailed ? (/changed-data check failed/i.test(grade.message) ? changedDataDetail(res, ctx) : grade.message) : undefined,
    });
    for (const c of grade.checks ?? []) {
      out.push({ state: c.ok ? "pass" : "fail", label: c.label, detail: c.ok ? undefined : c.detail });
    }
  }
  return out;
}
