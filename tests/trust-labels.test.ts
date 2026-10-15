import { expect, it } from "vitest";
import { lessonTouched, moduleStatusLabel } from "@/features/discovery/selectors";
import { sessionKey, useLearning, type LearningState } from "@/lib/learning-state";


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
