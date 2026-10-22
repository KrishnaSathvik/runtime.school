/**
 * Authored content, joined to the registry. What a learner can see depends on status (plan §3):
 * `published` everywhere; in local development also `tests-pass` and `reviewed`, marked "in review",
 * so the owner can review authored work in the app before it's published.
 */
import { pyRegistry } from "./registry";
import { PY_STATUSES, type PyItemStatus, type PyLessonEntry, type PyQuestionEntry } from "./types";
import type { PyLesson, PyProject, PyQuestion } from "./model";
import { m01Lessons } from "./lessons/M01";
import { m02Lessons } from "./lessons/M02";
import { m03Lessons } from "./lessons/M03";
import { m04Lessons } from "./lessons/M04";
import { m05Lessons } from "./lessons/M05";
import { m06Lessons } from "./lessons/M06";
import { m07Lessons } from "./lessons/M07";
import { m08Lessons } from "./lessons/M08";
import { m09Lessons } from "./lessons/M09";
import { m10Lessons } from "./lessons/M10";
import { m11Lessons } from "./lessons/M11";
import { m12Lessons } from "./lessons/M12";
import { m13Lessons } from "./lessons/M13";
import { m14Lessons } from "./lessons/M14";
import { m15Lessons } from "./lessons/M15";
import { m16Lessons } from "./lessons/M16";
import { m17Lessons } from "./lessons/M17";
import { m18Lessons } from "./lessons/M18";
import { m19Lessons } from "./lessons/M19";
import { m20Lessons } from "./lessons/M20";
import { m21Lessons } from "./lessons/M21";
import { m22Lessons } from "./lessons/M22";
import { m23Lessons } from "./lessons/M23";
import { m24Lessons } from "./lessons/M24";
import { m25Lessons } from "./lessons/M25";
import { m26Lessons } from "./lessons/M26";
import { m27Lessons } from "./lessons/M27";
import { m28Lessons } from "./lessons/M28";
import { m29Lessons } from "./lessons/M29";
import { m30Lessons } from "./lessons/M30";
import { m31Lessons } from "./lessons/M31";
import { m32Lessons } from "./lessons/M32";
import { m33Lessons } from "./lessons/M33";
import { m34Lessons } from "./lessons/M34";
import { m35Lessons } from "./lessons/M35";
import { m36Lessons } from "./lessons/M36";
import { m37Lessons } from "./lessons/M37";
import { m38Lessons } from "./lessons/M38";
import { m39Lessons } from "./lessons/M39";
import { m40Lessons } from "./lessons/M40";
import { m41Lessons } from "./lessons/M41";
import { m42Lessons } from "./lessons/M42";
import { m43Lessons } from "./lessons/M43";
import { m44Lessons } from "./lessons/M44";
import { m45Lessons } from "./lessons/M45";
import { m46Lessons } from "./lessons/M46";
import { m47Lessons } from "./lessons/M47";
import { m48Lessons } from "./lessons/M48";
import { m49Lessons } from "./lessons/M49";
import { m50Lessons } from "./lessons/M50";
import { m01Questions } from "./questions/M01";
import { m02Questions } from "./questions/M02";
import { m03Questions } from "./questions/M03";
import { m04Questions } from "./questions/M04";
import { m05Questions } from "./questions/M05";
import { m06Questions } from "./questions/M06";
import { m07Questions } from "./questions/M07";
import { m08Questions } from "./questions/M08";
import { m09Questions } from "./questions/M09";
import { m10Questions } from "./questions/M10";
import { m11Questions } from "./questions/M11";
import { m12Questions } from "./questions/M12";
import { m13Questions } from "./questions/M13";
import { m14Questions } from "./questions/M14";
import { m15Questions } from "./questions/M15";
import { m16Questions } from "./questions/M16";
import { m17Questions } from "./questions/M17";
import { m18Questions } from "./questions/M18";
import { m19Questions } from "./questions/M19";
import { m20Questions } from "./questions/M20";
import { m21Questions } from "./questions/M21";
import { m22Questions } from "./questions/M22";
import { m23Questions } from "./questions/M23";
import { m24Questions } from "./questions/M24";
import { m25Questions } from "./questions/M25";
import { m26Questions } from "./questions/M26";
import { m27Questions } from "./questions/M27";
import { m28Questions } from "./questions/M28";
import { m29Questions } from "./questions/M29";
import { m30Questions } from "./questions/M30";
import { m31Questions } from "./questions/M31";
import { m32Questions } from "./questions/M32";
import { m33Questions } from "./questions/M33";
import { m34Questions } from "./questions/M34";
import { m35Questions } from "./questions/M35";
import { m36Questions } from "./questions/M36";
import { m37Questions } from "./questions/M37";
import { m38Questions } from "./questions/M38";
import { m39Questions } from "./questions/M39";
import { m40Questions } from "./questions/M40";
import { m41Questions } from "./questions/M41";
import { m42Questions } from "./questions/M42";
import { m43Questions } from "./questions/M43";
import { m44Questions } from "./questions/M44";
import { m45Questions } from "./questions/M45";
import { m46Questions } from "./questions/M46";
import { m47Questions } from "./questions/M47";
import { m48Questions } from "./questions/M48";
import { m49Questions } from "./questions/M49";
import { m50Questions } from "./questions/M50";
import { p01 } from "./projects/P01";
import { p02 } from "./projects/P02";
import { p03 } from "./projects/P03";
import { p04 } from "./projects/P04";
import { p05 } from "./projects/P05";
import { p06 } from "./projects/P06";
import { p07 } from "./projects/P07";
import { p08 } from "./projects/P08";
import { p09 } from "./projects/P09";
import { p10 } from "./projects/P10";

export const authoredLessons: PyLesson[] = [...m01Lessons, ...m02Lessons, ...m03Lessons, ...m04Lessons, ...m05Lessons, ...m06Lessons, ...m07Lessons, ...m08Lessons, ...m09Lessons, ...m10Lessons, ...m11Lessons, ...m12Lessons, ...m13Lessons, ...m14Lessons, ...m15Lessons, ...m16Lessons, ...m17Lessons, ...m18Lessons, ...m19Lessons, ...m20Lessons, ...m21Lessons, ...m22Lessons, ...m23Lessons, ...m24Lessons, ...m25Lessons, ...m26Lessons, ...m27Lessons, ...m28Lessons, ...m29Lessons, ...m30Lessons, ...m31Lessons, ...m32Lessons, ...m33Lessons, ...m34Lessons, ...m35Lessons, ...m36Lessons, ...m37Lessons, ...m38Lessons, ...m39Lessons, ...m40Lessons, ...m41Lessons, ...m42Lessons, ...m43Lessons, ...m44Lessons, ...m45Lessons, ...m46Lessons, ...m47Lessons, ...m48Lessons, ...m49Lessons, ...m50Lessons];
export const authoredQuestions: PyQuestion[] = [...m01Questions, ...m02Questions, ...m03Questions, ...m04Questions, ...m05Questions, ...m06Questions, ...m07Questions, ...m08Questions, ...m09Questions, ...m10Questions, ...m11Questions, ...m12Questions, ...m13Questions, ...m14Questions, ...m15Questions, ...m16Questions, ...m17Questions, ...m18Questions, ...m19Questions, ...m20Questions, ...m21Questions, ...m22Questions, ...m23Questions, ...m24Questions, ...m25Questions, ...m26Questions, ...m27Questions, ...m28Questions, ...m29Questions, ...m30Questions, ...m31Questions, ...m32Questions, ...m33Questions, ...m34Questions, ...m35Questions, ...m36Questions, ...m37Questions, ...m38Questions, ...m39Questions, ...m40Questions, ...m41Questions, ...m42Questions, ...m43Questions, ...m44Questions, ...m45Questions, ...m46Questions, ...m47Questions, ...m48Questions, ...m49Questions, ...m50Questions];
export const authoredProjects: PyProject[] = [p01, p02, p03, p04, p05, p06, p07, p08, p09, p10];

const rank = (s: PyItemStatus) => PY_STATUSES.indexOf(s);

/** Visible to learners here: published, or (in development) past its automated gates. */
export function isVisible(status: PyItemStatus, dev = process.env.NODE_ENV === "development"): boolean {
  return status === "published" || (dev && rank(status) >= rank("tests-pass"));
}

const lessonEntry = new Map(pyRegistry.lessons.map((l) => [l.id, l]));
const questionEntry = new Map(pyRegistry.questions.map((q) => [q.id, q]));

export type VisibleLesson = PyLesson & { entry: PyLessonEntry; number: number };
export type VisibleQuestion = PyQuestion & { entry: PyQuestionEntry; number: number };

/** Lessons in course order, with their registry entry and course number (1–250). */
export function visibleLessons(dev?: boolean): VisibleLesson[] {
  return authoredLessons
    .map((l) => ({ ...l, entry: lessonEntry.get(l.id)!, number: pyRegistry.lessons.findIndex((e) => e.id === l.id) + 1 }))
    .filter((l) => l.entry && isVisible(l.entry.status, dev))
    .sort((a, b) => a.number - b.number);
}

export function visibleQuestions(dev?: boolean): VisibleQuestion[] {
  return authoredQuestions
    .map((q) => ({ ...q, entry: questionEntry.get(q.id)!, number: pyRegistry.questions.findIndex((e) => e.id === q.id) + 1 }))
    .filter((q) => q.entry && isVisible(q.entry.status, dev))
    .sort((a, b) => a.number - b.number);
}

export function visibleProjects(dev?: boolean) {
  return authoredProjects
    .map((p) => {
      const entry = pyRegistry.projects.find((e) => e.id === p.id)!;
      const milestones = p.milestones.filter((m) => isVisible(entry.milestones.find((e) => e.id === m.id)!.status, dev));
      return { ...p, entry, milestones };
    })
    .filter((p) => p.milestones.length > 0);
}

export { pyLessonHref, pyQuestionHref, pyProjectHref, pyDatasetHref, PY_PLAYGROUND_HREF, PY_DATASETS_HREF, PY_DBLAB_HREF, PY_PERF_HREF, PY_COMPARE_HREF } from "./paths";
