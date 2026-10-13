import { describe, expect, it } from "vitest";
import { courseOrder, groups, lessons, lessonsInModule } from "@/content";
import { moduleObjectives } from "@/content/ux-summaries";
import { PLACEMENT_IDS, placementStart } from "@/lib/learning-state";

/** Exact approved sequence from docs/curriculum/SEQUENCE_IMPLEMENTATION_PLAN.md */
const APPROVED = [
  0, 1, 3, 4, 5, 6, 7, 8, 2, 9, 10, 30, 11, 12, 13, 56, 54, 14, 15, 32, 16, 34, 35, 36, 37, 19, 38,
  17, 18, 31, 20, 26, 33, 39, 21, 22, 23, 55, 24, 25, 40, 41, 42, 43, 53, 57, 27, 28, 29, 44, 45, 46,
  47, 48, 49, 50, 51, 52, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 75, 69, 70, 71, 72, 73, 74, 76,
  77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87,
];

const RELOCATED = {
  2: 2,
  30: 2,
  54: 3,
  31: 4,
  32: 3,
  55: 5,
  19: 3,
} as const;

describe("approved learning sequence", () => {
  it("matches the documented courseOrder permutation", () => {
    expect(courseOrder).toEqual(APPROVED);
    expect(new Set(courseOrder).size).toBe(88);
    expect([...courseOrder].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 88 }, (_, i) => i),
    );
  });

  it("keeps INNER JOIN immediately before LEFT JOIN and pins placement all-pass to 15", () => {
    expect(courseOrder[courseOrder.indexOf(14) + 1]).toBe(15);
    expect(placementStart({ index: 6, done: true, answers: Array(6).fill({ ok: true, time: 1 }) })).toBe(15);
  });

  it("places the seven relocated lessons in the approved modules", () => {
    for (const [id, group] of Object.entries(RELOCATED)) {
      expect(lessons[Number(id)].group, `lesson ${id}`).toBe(group);
    }
    expect(groups[1]).toBe("Filtering & sorting");
    expect(groups[3]).toBe("Joins & sets");
    expect(moduleObjectives[0]).toMatch(/calculated values/i);
    expect(moduleObjectives[1]).toMatch(/sort/i);
    expect(moduleObjectives[2]).toMatch(/DISTINCT|aggregate/i);
    expect(moduleObjectives[3]).toMatch(/join|set/i);
  });

  it("makes module Continue and global Next share the beginner path", () => {
    expect(lessonsInModule(0).map((l) => l.id)).toEqual([0, 1]);
    expect(lessonsInModule(1).map((l) => l.id)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(lessonsInModule(2).map((l) => l.id)).toEqual([2, 9, 10, 30, 11, 12, 13, 56]);
    expect(lessonsInModule(3).map((l) => l.id).slice(0, 4)).toEqual([54, 14, 15, 32]);
    expect(courseOrder[0]).toBe(0);
    expect(courseOrder[1]).toBe(1);
    expect(courseOrder[2]).toBe(3);
    expect(courseOrder[courseOrder.indexOf(9) + 1]).toBe(10);
    expect(courseOrder[courseOrder.indexOf(10) + 1]).toBe(30);
    expect(courseOrder[courseOrder.indexOf(18) + 1]).toBe(31);
    expect(courseOrder[courseOrder.indexOf(19) + 1]).toBe(38);
    expect(courseOrder[courseOrder.indexOf(23) + 1]).toBe(55);
  });

  it("applies the six prerequisite array edits with no forward references", () => {
    expect(lessons[3].prereq).toEqual([1]);
    expect(lessons[19].prereq).toEqual([3]);
    expect(lessons[20].prereq).toEqual([10]);
    expect(lessons[26].prereq).toEqual([10]);
    expect(lessons[30].prereq).toEqual([9, 10]);
    expect(lessons[35].prereq).toEqual([14]);
    const pos = new Map(courseOrder.map((id, i) => [id, i]));
    for (const lesson of lessons) {
      for (const p of lesson.prereq) {
        expect(pos.get(p)! < pos.get(lesson.id)!, `${lesson.id} → ${p}`).toBe(true);
      }
    }
  });

  it("preserves placement slot ids and maps a ratio miss to INNER JOIN for new learners", () => {
    expect(PLACEMENT_IDS).toEqual([0, 3, 5, 10, 32, 14]);
    const answers = [true, true, true, true, false, true].map((ok) => ({ ok, time: 1 }));
    expect(placementStart({ index: 6, done: true, answers })).toBe(14);
    expect(placementStart({ index: 6, done: true, answers }, { joinMastered: true })).toBe(32);
  });

  it("does not renumber lessons, project milestones, or module route indexes", () => {
    expect(lessons.map((l) => l.id)).toEqual(Array.from({ length: 88 }, (_, i) => i));
    expect(groups).toHaveLength(10);
  });
});
