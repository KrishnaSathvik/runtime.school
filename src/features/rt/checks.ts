import type { ExecuteResponse } from "@/engine/sql-client";

export type CheckState = "pass" | "fail" | "wait";
export type VisibleCheck = { state: CheckState; label: string; detail?: string };

const same = (a: string[], b: string[]) =>
  a.length === b.length && a.every((c, i) => c.toLowerCase() === b[i].toLowerCase());

/**
 * Turns the real grader's response into the checks a learner can see.
 * Nothing is simulated: every line reads a field the engine returned.
 */
export function visibleChecks(res: ExecuteResponse, ordered: boolean): VisibleCheck[] {
  const grade = res.grade;
  if (res.error) {
    return [
      { state: "fail", label: "Runs without an error", detail: res.error },
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
    const rowsOk = actual.values.length === expected.values.length;
    out.push({
      state: !colsOk ? "wait" : rowsOk ? "pass" : "fail",
      label: `Returns ${expected.values.length} row${expected.values.length === 1 ? "" : "s"}`,
      detail: colsOk && !rowsOk ? `Yours returned ${actual.values.length}. Check filters, joins and duplicates.` : undefined,
    });
    upstream = colsOk && rowsOk;
  }

  if (grade) {
    // Original data passed when the grade is ok, or when only the changed-data or plan step failed.
    const originalOk = grade.ok || !!grade.variationFailed || !!grade.planFailed;
    out.push({
      state: !upstream ? "wait" : originalOk ? "pass" : "fail",
      label: ordered ? "Values match, in the requested order" : "Values match",
      detail: upstream && !originalOk ? grade.message : undefined,
    });
    if (grade.planFailed) {
      out.push({ state: "fail", label: "Uses the required query plan", detail: grade.message });
    }
    out.push({
      state: grade.ok ? "pass" : grade.variationFailed ? "fail" : "wait",
      label: "Still correct on different data",
      detail: grade.variationFailed ? grade.message : undefined,
    });
    for (const c of grade.checks ?? []) {
      out.push({ state: c.ok ? "pass" : "fail", label: c.label, detail: c.ok ? undefined : c.detail });
    }
  }
  return out;
}
