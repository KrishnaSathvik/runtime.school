import { expect, it } from "vitest";
import { extraTablesLabel, focusedTables } from "@/components/editor/TableInspector";
import { lessonTouched, moduleStatusLabel } from "@/features/discovery/selectors";
import { sessionKey, useLearning, type LearningState } from "@/lib/learning-state";

it("does not call unused catalog tables a task requirement", () => {
  const tables = ["customers", "products", "orders"];
  expect(extraTablesLabel(true)).toBe("Also in this database");
  expect(extraTablesLabel(false)).toBe("Other tables in this database (optional)");
  expect(focusedTables(tables, undefined, true)).toEqual(["customers", "products"]);
  expect(focusedTables(tables, undefined, false)).toEqual(tables);
  expect(focusedTables(tables, ["orders"], false)).toEqual(["orders"]);
});

it("treats an opened lesson as in progress before the first graded attempt", () => {
  const state = {
    ...useLearning.getState(),
    stats: {} as LearningState["stats"],
    sessions: { [sessionKey(1, null)]: { stage: "understand" as const, variant: 0 } },
    active: null,
  } satisfies Pick<LearningState, "stats" | "sessions" | "active"> & Record<string, unknown>;
  expect(lessonTouched(state, 1)).toBe(true);
  expect(state.stats[1]?.attempts ?? 0).toBe(0);
  expect(moduleStatusLabel(state, [0, 1, 2, 3, 4])).toBe("In progress");
  expect(moduleStatusLabel({ ...state, sessions: {}, active: null }, [0, 1, 2, 3, 4])).toBe("Not started");
});
