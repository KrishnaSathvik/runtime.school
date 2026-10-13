import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { getLesson, lessons } from "@/content";

const workspace = readFileSync("src/features/lesson/LessonWorkspace.tsx", "utf8");
const learning = readFileSync("src/lib/learning-state.ts", "utf8");

it("shows and grades the quiz stored on that lesson id", () => {
  expect(workspace).toContain("lesson.quiz");
  expect(learning).toContain("lessons[lessonId]?.quiz");
  for (const lesson of lessons) {
    expect(lesson.id).toBe(lessons.indexOf(lesson));
    expect(getLesson(lesson.id)).toBe(lesson);
    expect(getLesson(lesson.id)?.quiz).toBe(lesson.quiz);
    expect(lesson.quiz.correct).toBeGreaterThanOrEqual(0);
    expect(lesson.quiz.correct).toBeLessThan(lesson.quiz.options.length);
  }
});

it("gives every lesson its own concept check", () => {
  const seen = new Map<string, number>();
  for (const lesson of lessons) {
    const previous = seen.get(lesson.quiz.q);
    expect(previous, `lesson ${lesson.id} repeats the check from lesson ${previous}`).toBeUndefined();
    seen.set(lesson.quiz.q, lesson.id);
  }
  expect(seen.size).toBe(88);
});

it("asks the aliases lesson about a calculated column", () => {
  const quiz = lessons[1].quiz;
  expect(quiz.q).toMatch(/double_price/);
  expect(quiz.options[quiz.correct]).toMatch(/without changing products/);
  expect(quiz.q).not.toBe(lessons[0].quiz.q);
  expect(lessons[1].walkthrough[0].query).toMatch(/FROM products/);
  expect(lessons[1].walkthrough[0].query).not.toMatch(/FROM customers/);
});

it("starts rewritten lessons from the table that lesson actually uses", () => {
  for (const id of [
    1, 2, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
    30, 32, 33, 34, 35, 36, 38, 39, 40, 41, 43, 45, 52, 53, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64,
    65, 66, 67, 68, 70, 71, 72, 73, 75,
  ]) {
    expect(lessons[id].walkthrough[0].title).not.toMatch(/Inspect the source|Inspect the starting state/);
  }
  expect(lessons[3].quiz.q).toMatch(/Chicago/);
  expect(lessons[3].quiz.q).not.toBe(lessons[7].quiz.q);
  expect(lessons[23].quiz.q).not.toBe(lessons[42].quiz.q);
  expect(lessons[26].quiz.q).not.toBe(lessons[39].quiz.q);
  expect(lessons[62].quiz.q).not.toBe(lessons[63].quiz.q);
  expect(lessons[67].quiz.q).not.toBe(lessons[66].quiz.q);
  expect(lessons[75].quiz.q).not.toBe(lessons[66].quiz.q);
  expect(lessons[72].quiz.q).not.toBe(lessons[71].quiz.q);
  expect(lessons[74].quiz.q).toMatch(/month/);
  expect(lessons[16].quiz.options[lessons[16].quiz.correct]).toMatch(/line's revenue|That line/i);
  expect(lessons[70].quiz.options[lessons[70].quiz.correct]).toMatch(/latest/i);
  expect(lessons[35].example).not.toMatch(/RECURSIVE/i);
  expect(lessons[35].tasks[0].answer).not.toMatch(/RECURSIVE/i);
  expect(lessons[54].concept).toMatch(/JOIN/);
  expect(lessons[54].tasks[1].answer).toMatch(/JOIN/);
});
