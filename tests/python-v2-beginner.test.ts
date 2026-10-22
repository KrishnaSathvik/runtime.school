// Beginner simulation for authored Python modules. A learner starts from nothing, takes lessons in order,
// and every program is checked against the concepts taught so far. The same check covers later modules
// as soon as their lessons are authored. It cannot judge whether an explanation is confusing; that
// still needs a person. See docs/python/content-rules.md.
import { describe, expect, it } from "vitest";
import { authoredLessons, authoredQuestions } from "@/content/python-v2/content";
import { beginnerProblems, hintLeaksSolution, type ConceptCourse, type ConceptItem } from "@/content/python-v2/concepts";
import type { PyLesson, PyQuestion } from "@/content/python-v2/model";
import { pyRegistry } from "@/content/python-v2/registry";

const M01_LESSON_IDS = ["PY-L01-01", "PY-L01-02", "PY-L01-03", "PY-L01-04", "PY-L01-05"];
const M02_LESSON_IDS = ["PY-L02-01", "PY-L02-02", "PY-L02-03", "PY-L02-04", "PY-L02-05"];
const M03_LESSON_IDS = ["PY-L03-01", "PY-L03-02", "PY-L03-03", "PY-L03-04", "PY-L03-05"];
const M04_LESSON_IDS = ["PY-L04-01", "PY-L04-02", "PY-L04-03", "PY-L04-04", "PY-L04-05"];
const M05_LESSON_IDS = ["PY-L05-01", "PY-L05-02", "PY-L05-03", "PY-L05-04", "PY-L05-05"];
const M06_LESSON_IDS = ["PY-L06-01", "PY-L06-02", "PY-L06-03", "PY-L06-04", "PY-L06-05"];
const M07_LESSON_IDS = ["PY-L07-01", "PY-L07-02", "PY-L07-03", "PY-L07-04", "PY-L07-05"];
const M08_LESSON_IDS = ["PY-L08-01", "PY-L08-02", "PY-L08-03", "PY-L08-04", "PY-L08-05"];
const M09_LESSON_IDS = ["PY-L09-01", "PY-L09-02", "PY-L09-03", "PY-L09-04", "PY-L09-05"];
const M10_LESSON_IDS = ["PY-L10-01", "PY-L10-02", "PY-L10-03", "PY-L10-04", "PY-L10-05"];
const M11_LESSON_IDS = ["PY-L11-01", "PY-L11-02", "PY-L11-03", "PY-L11-04", "PY-L11-05"];
const M12_LESSON_IDS = ["PY-L12-01", "PY-L12-02", "PY-L12-03", "PY-L12-04", "PY-L12-05"];
const M13_LESSON_IDS = ["PY-L13-01", "PY-L13-02", "PY-L13-03", "PY-L13-04", "PY-L13-05"];
const M14_LESSON_IDS = ["PY-L14-01", "PY-L14-02", "PY-L14-03", "PY-L14-04", "PY-L14-05"];
const M15_LESSON_IDS = ["PY-L15-01", "PY-L15-02", "PY-L15-03", "PY-L15-04", "PY-L15-05"];
const M16_LESSON_IDS = ["PY-L16-01", "PY-L16-02", "PY-L16-03", "PY-L16-04", "PY-L16-05"];
const M17_LESSON_IDS = ["PY-L17-01", "PY-L17-02", "PY-L17-03", "PY-L17-04", "PY-L17-05"];
const M18_LESSON_IDS = ["PY-L18-01", "PY-L18-02", "PY-L18-03", "PY-L18-04", "PY-L18-05"];
const M19_LESSON_IDS = ["PY-L19-01", "PY-L19-02", "PY-L19-03", "PY-L19-04", "PY-L19-05"];
const M20_LESSON_IDS = ["PY-L20-01", "PY-L20-02", "PY-L20-03", "PY-L20-04", "PY-L20-05"];
const M21_LESSON_IDS = ["PY-L21-01", "PY-L21-02", "PY-L21-03", "PY-L21-04", "PY-L21-05"];
const M22_LESSON_IDS = ["PY-L22-01", "PY-L22-02", "PY-L22-03", "PY-L22-04", "PY-L22-05"];
const M23_LESSON_IDS = ["PY-L23-01", "PY-L23-02", "PY-L23-03", "PY-L23-04", "PY-L23-05"];
const M24_LESSON_IDS = ["PY-L24-01", "PY-L24-02", "PY-L24-03", "PY-L24-04", "PY-L24-05"];
const M25_LESSON_IDS = ["PY-L25-01", "PY-L25-02", "PY-L25-03", "PY-L25-04", "PY-L25-05"];
const M26_LESSON_IDS = ["PY-L26-01", "PY-L26-02", "PY-L26-03", "PY-L26-04", "PY-L26-05"];
const M27_LESSON_IDS = ["PY-L27-01", "PY-L27-02", "PY-L27-03", "PY-L27-04", "PY-L27-05"];
const M28_LESSON_IDS = ["PY-L28-01", "PY-L28-02", "PY-L28-03", "PY-L28-04", "PY-L28-05"];
const M29_LESSON_IDS = ["PY-L29-01", "PY-L29-02", "PY-L29-03", "PY-L29-04", "PY-L29-05"];
const M30_LESSON_IDS = ["PY-L30-01", "PY-L30-02", "PY-L30-03", "PY-L30-04", "PY-L30-05"];
const M31_LESSON_IDS = ["PY-L31-01", "PY-L31-02", "PY-L31-03", "PY-L31-04", "PY-L31-05"];
const M32_LESSON_IDS = ["PY-L32-01", "PY-L32-02", "PY-L32-03", "PY-L32-04", "PY-L32-05"];
const M33_LESSON_IDS = ["PY-L33-01", "PY-L33-02", "PY-L33-03", "PY-L33-04", "PY-L33-05"];
const M34_LESSON_IDS = ["PY-L34-01", "PY-L34-02", "PY-L34-03", "PY-L34-04", "PY-L34-05"];
const M35_LESSON_IDS = ["PY-L35-01", "PY-L35-02", "PY-L35-03", "PY-L35-04", "PY-L35-05"];
const M36_LESSON_IDS = ["PY-L36-01", "PY-L36-02", "PY-L36-03", "PY-L36-04", "PY-L36-05"];
const M37_LESSON_IDS = ["PY-L37-01", "PY-L37-02", "PY-L37-03", "PY-L37-04", "PY-L37-05"];
const M38_LESSON_IDS = ["PY-L38-01", "PY-L38-02", "PY-L38-03", "PY-L38-04", "PY-L38-05"];
const M39_LESSON_IDS = ["PY-L39-01", "PY-L39-02", "PY-L39-03", "PY-L39-04", "PY-L39-05"];
const M40_LESSON_IDS = ["PY-L40-01", "PY-L40-02", "PY-L40-03", "PY-L40-04", "PY-L40-05"];
const M41_LESSON_IDS = ["PY-L41-01", "PY-L41-02", "PY-L41-03", "PY-L41-04", "PY-L41-05"];
const M42_LESSON_IDS = ["PY-L42-01", "PY-L42-02", "PY-L42-03", "PY-L42-04", "PY-L42-05"];
const M43_LESSON_IDS = ["PY-L43-01", "PY-L43-02", "PY-L43-03", "PY-L43-04", "PY-L43-05"];
const M44_LESSON_IDS = ["PY-L44-01", "PY-L44-02", "PY-L44-03", "PY-L44-04", "PY-L44-05"];
const M45_LESSON_IDS = ["PY-L45-01", "PY-L45-02", "PY-L45-03", "PY-L45-04", "PY-L45-05"];
const M46_LESSON_IDS = ["PY-L46-01", "PY-L46-02", "PY-L46-03", "PY-L46-04", "PY-L46-05"];
const M47_LESSON_IDS = ["PY-L47-01", "PY-L47-02", "PY-L47-03", "PY-L47-04", "PY-L47-05"];
const M48_LESSON_IDS = ["PY-L48-01", "PY-L48-02", "PY-L48-03", "PY-L48-04", "PY-L48-05"];
const M49_LESSON_IDS = ["PY-L49-01", "PY-L49-02", "PY-L49-03", "PY-L49-04", "PY-L49-05"];
const M50_LESSON_IDS = ["PY-L50-01", "PY-L50-02", "PY-L50-03", "PY-L50-04", "PY-L50-05"];
const M01_QUESTION_IDS = ["PY-Q01-02", "PY-Q01-03", "PY-Q01-06", "PY-Q01-09", "PY-Q01-10", "PY-Q01-12", "PY-Q01-13", "PY-Q01-20", "PY-Q01-22", "PY-Q01-23"];
const M02_QUESTION_IDS = ["PY-Q02-02", "PY-Q02-03", "PY-Q02-06", "PY-Q02-10", "PY-Q02-12", "PY-Q02-13", "PY-Q02-16", "PY-Q02-22", "PY-Q02-23", "PY-Q02-25"];
const M03_QUESTION_IDS = ["PY-Q03-02", "PY-Q03-03", "PY-Q03-10", "PY-Q03-12", "PY-Q03-13", "PY-Q03-15", "PY-Q03-20", "PY-Q03-22", "PY-Q03-23", "PY-Q03-25"];
const M04_QUESTION_IDS = ["PY-Q04-02", "PY-Q04-03", "PY-Q04-06", "PY-Q04-09", "PY-Q04-10", "PY-Q04-12", "PY-Q04-13", "PY-Q04-16", "PY-Q04-20", "PY-Q04-22"];
const M05_QUESTION_IDS = ["PY-Q05-02", "PY-Q05-03", "PY-Q05-06", "PY-Q05-10", "PY-Q05-12", "PY-Q05-13", "PY-Q05-16", "PY-Q05-19", "PY-Q05-20", "PY-Q05-22"];
const M06_QUESTION_IDS = ["PY-Q06-02", "PY-Q06-03", "PY-Q06-06", "PY-Q06-10", "PY-Q06-12", "PY-Q06-13", "PY-Q06-16", "PY-Q06-19", "PY-Q06-20", "PY-Q06-22"];
const M07_QUESTION_IDS = ["PY-Q07-02", "PY-Q07-03", "PY-Q07-06", "PY-Q07-10", "PY-Q07-12", "PY-Q07-13", "PY-Q07-16", "PY-Q07-19", "PY-Q07-20", "PY-Q07-22"];
const M08_QUESTION_IDS = ["PY-Q08-02", "PY-Q08-03", "PY-Q08-06", "PY-Q08-10", "PY-Q08-12", "PY-Q08-13", "PY-Q08-16", "PY-Q08-19", "PY-Q08-20", "PY-Q08-22"];
const M09_QUESTION_IDS = ["PY-Q09-02", "PY-Q09-03", "PY-Q09-06", "PY-Q09-10", "PY-Q09-12", "PY-Q09-13", "PY-Q09-16", "PY-Q09-19", "PY-Q09-20", "PY-Q09-22"];
const M10_QUESTION_IDS = ["PY-Q10-02", "PY-Q10-03", "PY-Q10-06", "PY-Q10-10", "PY-Q10-12", "PY-Q10-13", "PY-Q10-16", "PY-Q10-19", "PY-Q10-20", "PY-Q10-22"];
const M11_QUESTION_IDS = ["PY-Q11-02", "PY-Q11-03", "PY-Q11-06", "PY-Q11-10", "PY-Q11-12", "PY-Q11-13", "PY-Q11-16", "PY-Q11-19", "PY-Q11-20", "PY-Q11-22"];
const M12_QUESTION_IDS = ["PY-Q12-02", "PY-Q12-03", "PY-Q12-06", "PY-Q12-10", "PY-Q12-12", "PY-Q12-13", "PY-Q12-16", "PY-Q12-19", "PY-Q12-20", "PY-Q12-22"];
const M13_QUESTION_IDS = ["PY-Q13-02", "PY-Q13-03", "PY-Q13-06", "PY-Q13-10", "PY-Q13-12", "PY-Q13-13", "PY-Q13-16", "PY-Q13-19", "PY-Q13-20", "PY-Q13-22"];
const M14_QUESTION_IDS = ["PY-Q14-02", "PY-Q14-03", "PY-Q14-06", "PY-Q14-10", "PY-Q14-12", "PY-Q14-13", "PY-Q14-16", "PY-Q14-19", "PY-Q14-20", "PY-Q14-22"];
const M15_QUESTION_IDS = ["PY-Q15-02", "PY-Q15-03", "PY-Q15-06", "PY-Q15-10", "PY-Q15-12", "PY-Q15-13", "PY-Q15-16", "PY-Q15-19", "PY-Q15-20", "PY-Q15-22"];
const M16_QUESTION_IDS = ["PY-Q16-02", "PY-Q16-03", "PY-Q16-06", "PY-Q16-10", "PY-Q16-12", "PY-Q16-13", "PY-Q16-16", "PY-Q16-19", "PY-Q16-20", "PY-Q16-22"];
const M17_QUESTION_IDS = ["PY-Q17-02", "PY-Q17-03", "PY-Q17-06", "PY-Q17-10", "PY-Q17-12", "PY-Q17-13", "PY-Q17-16", "PY-Q17-19", "PY-Q17-20", "PY-Q17-22"];
const M18_QUESTION_IDS = ["PY-Q18-02", "PY-Q18-03", "PY-Q18-06", "PY-Q18-10", "PY-Q18-12", "PY-Q18-13", "PY-Q18-16", "PY-Q18-19", "PY-Q18-20", "PY-Q18-22"];
const M19_QUESTION_IDS = ["PY-Q19-02", "PY-Q19-03", "PY-Q19-06", "PY-Q19-10", "PY-Q19-12", "PY-Q19-13", "PY-Q19-16", "PY-Q19-19", "PY-Q19-20", "PY-Q19-22"];
const M20_QUESTION_IDS = ["PY-Q20-02", "PY-Q20-03", "PY-Q20-06", "PY-Q20-10", "PY-Q20-12", "PY-Q20-13", "PY-Q20-16", "PY-Q20-19", "PY-Q20-20", "PY-Q20-22"];
const M21_QUESTION_IDS = ["PY-Q21-02", "PY-Q21-03", "PY-Q21-06", "PY-Q21-10", "PY-Q21-12", "PY-Q21-13", "PY-Q21-16", "PY-Q21-19", "PY-Q21-20", "PY-Q21-22"];
const M22_QUESTION_IDS = ["PY-Q22-02", "PY-Q22-03", "PY-Q22-06", "PY-Q22-10", "PY-Q22-12", "PY-Q22-13", "PY-Q22-16", "PY-Q22-19", "PY-Q22-20", "PY-Q22-22"];
const M23_QUESTION_IDS = ["PY-Q23-02", "PY-Q23-03", "PY-Q23-06", "PY-Q23-10", "PY-Q23-12", "PY-Q23-13", "PY-Q23-16", "PY-Q23-19", "PY-Q23-20", "PY-Q23-22"];
const M24_QUESTION_IDS = ["PY-Q24-02", "PY-Q24-03", "PY-Q24-06", "PY-Q24-10", "PY-Q24-12", "PY-Q24-13", "PY-Q24-16", "PY-Q24-19", "PY-Q24-20", "PY-Q24-22"];
const M25_QUESTION_IDS = ["PY-Q25-02", "PY-Q25-03", "PY-Q25-06", "PY-Q25-10", "PY-Q25-12", "PY-Q25-13", "PY-Q25-16", "PY-Q25-19", "PY-Q25-20", "PY-Q25-22"];
const M26_QUESTION_IDS = ["PY-Q26-02", "PY-Q26-03", "PY-Q26-06", "PY-Q26-10", "PY-Q26-12", "PY-Q26-13", "PY-Q26-16", "PY-Q26-19", "PY-Q26-20", "PY-Q26-22"];
const M27_QUESTION_IDS = ["PY-Q27-02", "PY-Q27-03", "PY-Q27-06", "PY-Q27-10", "PY-Q27-12", "PY-Q27-13", "PY-Q27-16", "PY-Q27-19", "PY-Q27-20", "PY-Q27-22"];
const M28_QUESTION_IDS = ["PY-Q28-02", "PY-Q28-03", "PY-Q28-06", "PY-Q28-10", "PY-Q28-12", "PY-Q28-13", "PY-Q28-16", "PY-Q28-19", "PY-Q28-20", "PY-Q28-22"];
const M29_QUESTION_IDS = ["PY-Q29-02", "PY-Q29-03", "PY-Q29-06", "PY-Q29-10", "PY-Q29-12", "PY-Q29-13", "PY-Q29-16", "PY-Q29-19", "PY-Q29-20", "PY-Q29-22"];
const M30_QUESTION_IDS = ["PY-Q30-02", "PY-Q30-03", "PY-Q30-06", "PY-Q30-10", "PY-Q30-12", "PY-Q30-13", "PY-Q30-16", "PY-Q30-19", "PY-Q30-20", "PY-Q30-22"];
const M31_QUESTION_IDS = ["PY-Q31-02", "PY-Q31-03", "PY-Q31-06", "PY-Q31-10", "PY-Q31-12", "PY-Q31-13", "PY-Q31-16", "PY-Q31-19", "PY-Q31-20", "PY-Q31-22"];
const M32_QUESTION_IDS = ["PY-Q32-02", "PY-Q32-03", "PY-Q32-06", "PY-Q32-10", "PY-Q32-12", "PY-Q32-13", "PY-Q32-16", "PY-Q32-19", "PY-Q32-20", "PY-Q32-22"];
const M33_QUESTION_IDS = ["PY-Q33-02", "PY-Q33-03", "PY-Q33-06", "PY-Q33-10", "PY-Q33-12", "PY-Q33-13", "PY-Q33-16", "PY-Q33-19", "PY-Q33-20", "PY-Q33-22"];
const M34_QUESTION_IDS = ["PY-Q34-02", "PY-Q34-03", "PY-Q34-06", "PY-Q34-10", "PY-Q34-12", "PY-Q34-13", "PY-Q34-16", "PY-Q34-19", "PY-Q34-20", "PY-Q34-22"];
const M35_QUESTION_IDS = ["PY-Q35-02", "PY-Q35-03", "PY-Q35-06", "PY-Q35-10", "PY-Q35-12", "PY-Q35-13", "PY-Q35-16", "PY-Q35-19", "PY-Q35-20", "PY-Q35-22"];
const M36_QUESTION_IDS = ["PY-Q36-02", "PY-Q36-03", "PY-Q36-06", "PY-Q36-10", "PY-Q36-12", "PY-Q36-13", "PY-Q36-16", "PY-Q36-19", "PY-Q36-20", "PY-Q36-22"];
const M37_QUESTION_IDS = ["PY-Q37-02", "PY-Q37-03", "PY-Q37-06", "PY-Q37-10", "PY-Q37-12", "PY-Q37-13", "PY-Q37-16", "PY-Q37-19", "PY-Q37-20", "PY-Q37-22"];
const M38_QUESTION_IDS = ["PY-Q38-02", "PY-Q38-03", "PY-Q38-06", "PY-Q38-10", "PY-Q38-12", "PY-Q38-13", "PY-Q38-16", "PY-Q38-19", "PY-Q38-20", "PY-Q38-22"];
const M39_QUESTION_IDS = ["PY-Q39-02", "PY-Q39-03", "PY-Q39-06", "PY-Q39-10", "PY-Q39-12", "PY-Q39-13", "PY-Q39-16", "PY-Q39-19", "PY-Q39-20", "PY-Q39-22"];
const M40_QUESTION_IDS = ["PY-Q40-02", "PY-Q40-03", "PY-Q40-06", "PY-Q40-10", "PY-Q40-12", "PY-Q40-13", "PY-Q40-16", "PY-Q40-19", "PY-Q40-20", "PY-Q40-22"];
const M41_QUESTION_IDS = ["PY-Q41-02", "PY-Q41-03", "PY-Q41-06", "PY-Q41-10", "PY-Q41-12", "PY-Q41-13", "PY-Q41-16", "PY-Q41-19", "PY-Q41-20", "PY-Q41-22"];
const M42_QUESTION_IDS = ["PY-Q42-02", "PY-Q42-03", "PY-Q42-06", "PY-Q42-10", "PY-Q42-12", "PY-Q42-13", "PY-Q42-16", "PY-Q42-19", "PY-Q42-20", "PY-Q42-22"];
const M43_QUESTION_IDS = ["PY-Q43-02", "PY-Q43-03", "PY-Q43-06", "PY-Q43-10", "PY-Q43-12", "PY-Q43-13", "PY-Q43-16", "PY-Q43-19", "PY-Q43-20", "PY-Q43-22"];
const M44_QUESTION_IDS = ["PY-Q44-02", "PY-Q44-03", "PY-Q44-06", "PY-Q44-10", "PY-Q44-12", "PY-Q44-13", "PY-Q44-16", "PY-Q44-19", "PY-Q44-20", "PY-Q44-22"];
const M45_QUESTION_IDS = ["PY-Q45-02", "PY-Q45-03", "PY-Q45-06", "PY-Q45-10", "PY-Q45-12", "PY-Q45-13", "PY-Q45-16", "PY-Q45-19", "PY-Q45-20", "PY-Q45-22"];
const M46_QUESTION_IDS = ["PY-Q46-02", "PY-Q46-03", "PY-Q46-06", "PY-Q46-10", "PY-Q46-12", "PY-Q46-13", "PY-Q46-16", "PY-Q46-19", "PY-Q46-20", "PY-Q46-22"];
const M47_QUESTION_IDS = ["PY-Q47-02", "PY-Q47-03", "PY-Q47-06", "PY-Q47-10", "PY-Q47-12", "PY-Q47-13", "PY-Q47-16", "PY-Q47-19", "PY-Q47-20", "PY-Q47-22"];
const M48_QUESTION_IDS = ["PY-Q48-02", "PY-Q48-03", "PY-Q48-06", "PY-Q48-10", "PY-Q48-12", "PY-Q48-13", "PY-Q48-16", "PY-Q48-19", "PY-Q48-20", "PY-Q48-22"];
const M49_QUESTION_IDS = ["PY-Q49-02", "PY-Q49-03", "PY-Q49-06", "PY-Q49-10", "PY-Q49-12", "PY-Q49-13", "PY-Q49-16", "PY-Q49-19", "PY-Q49-20", "PY-Q49-22"];
const M50_QUESTION_IDS = ["PY-Q50-02", "PY-Q50-03", "PY-Q50-06", "PY-Q50-10", "PY-Q50-12", "PY-Q50-13", "PY-Q50-16", "PY-Q50-19", "PY-Q50-20", "PY-Q50-22"];

function lessonItem(lesson: PyLesson): ConceptItem {
  const code = [
    ...lesson.blocks.flatMap((b) => (b.kind === "example" || b.kind === "error-example" ? [b.code] : [])),
    lesson.tryIt.starter,
    lesson.tryIt.answer,
    ...(lesson.tryIt.alternatives ?? []),
    ...lesson.challenges.flatMap((ex) => [ex.starter, ex.answer, ...(ex.alternatives ?? [])]),
    ...lesson.concept.flatMap((q) => (q.program ? [q.program] : [])),
  ];
  const entry = pyRegistry.lessons.find((l) => l.id === lesson.id)!;
  return { id: lesson.id, prerequisites: entry.prerequisites, requires: lesson.requires, teaches: lesson.teaches, code };
}

function questionItem(q: PyQuestion): ConceptItem {
  const entry = pyRegistry.questions.find((e) => e.id === q.id)!;
  const code = q.predict ? [q.predict.program] : [q.code!.starter, q.code!.answer, ...(q.code!.alternatives ?? [])];
  return { id: q.id, prerequisites: entry.prerequisites, requires: q.requires, code };
}

function course(): ConceptCourse {
  return {
    lessonOrder: pyRegistry.lessons.map((l) => l.id),
    lessons: authoredLessons.map(lessonItem),
    questions: authoredQuestions.map(questionItem),
  };
}

describe("beginner simulation", () => {
  it("keeps the M01 ids learner progress is stored under", () => {
    expect(authoredLessons.map((l) => l.id)).toEqual([...M01_LESSON_IDS, ...M02_LESSON_IDS, ...M03_LESSON_IDS, ...M04_LESSON_IDS, ...M05_LESSON_IDS, ...M06_LESSON_IDS, ...M07_LESSON_IDS, ...M08_LESSON_IDS, ...M09_LESSON_IDS, ...M10_LESSON_IDS, ...M11_LESSON_IDS, ...M12_LESSON_IDS, ...M13_LESSON_IDS, ...M14_LESSON_IDS, ...M15_LESSON_IDS, ...M16_LESSON_IDS, ...M17_LESSON_IDS, ...M18_LESSON_IDS, ...M19_LESSON_IDS, ...M20_LESSON_IDS, ...M21_LESSON_IDS, ...M22_LESSON_IDS, ...M23_LESSON_IDS, ...M24_LESSON_IDS, ...M25_LESSON_IDS, ...M26_LESSON_IDS, ...M27_LESSON_IDS, ...M28_LESSON_IDS, ...M29_LESSON_IDS, ...M30_LESSON_IDS, ...M31_LESSON_IDS, ...M32_LESSON_IDS, ...M33_LESSON_IDS, ...M34_LESSON_IDS, ...M35_LESSON_IDS, ...M36_LESSON_IDS, ...M37_LESSON_IDS, ...M38_LESSON_IDS, ...M39_LESSON_IDS, ...M40_LESSON_IDS, ...M41_LESSON_IDS, ...M42_LESSON_IDS, ...M43_LESSON_IDS, ...M44_LESSON_IDS, ...M45_LESSON_IDS, ...M46_LESSON_IDS, ...M47_LESSON_IDS, ...M48_LESSON_IDS, ...M49_LESSON_IDS, ...M50_LESSON_IDS]);
    expect(authoredQuestions.map((q) => q.id).sort()).toEqual([...M01_QUESTION_IDS, ...M02_QUESTION_IDS, ...M03_QUESTION_IDS, ...M04_QUESTION_IDS, ...M05_QUESTION_IDS, ...M06_QUESTION_IDS, ...M07_QUESTION_IDS, ...M08_QUESTION_IDS, ...M09_QUESTION_IDS, ...M10_QUESTION_IDS, ...M11_QUESTION_IDS, ...M12_QUESTION_IDS, ...M13_QUESTION_IDS, ...M14_QUESTION_IDS, ...M15_QUESTION_IDS, ...M16_QUESTION_IDS, ...M17_QUESTION_IDS, ...M18_QUESTION_IDS, ...M19_QUESTION_IDS, ...M20_QUESTION_IDS, ...M21_QUESTION_IDS, ...M22_QUESTION_IDS, ...M23_QUESTION_IDS, ...M24_QUESTION_IDS, ...M25_QUESTION_IDS, ...M26_QUESTION_IDS, ...M27_QUESTION_IDS, ...M28_QUESTION_IDS, ...M29_QUESTION_IDS, ...M30_QUESTION_IDS, ...M31_QUESTION_IDS, ...M32_QUESTION_IDS, ...M33_QUESTION_IDS, ...M34_QUESTION_IDS, ...M35_QUESTION_IDS, ...M36_QUESTION_IDS, ...M37_QUESTION_IDS, ...M38_QUESTION_IDS, ...M39_QUESTION_IDS, ...M40_QUESTION_IDS, ...M41_QUESTION_IDS, ...M42_QUESTION_IDS, ...M43_QUESTION_IDS, ...M44_QUESTION_IDS, ...M45_QUESTION_IDS, ...M46_QUESTION_IDS, ...M47_QUESTION_IDS, ...M48_QUESTION_IDS, ...M49_QUESTION_IDS, ...M50_QUESTION_IDS].sort());
  });

  it("walks every authored module with no knowledge beyond the lessons already finished", () => {
    expect(beginnerProblems(course())).toEqual([]);
  });

  it("flags a question that uses something its unlock lesson has not taught", () => {
    const base = course();
    const earlyInput: ConceptItem = {
      id: "PY-Q99-99",
      prerequisites: ["PY-L01-01"],
      requires: ["print-call", "input"],
      code: ['print(input("Name? "))\n'],
    };
    const problems = beginnerProblems({ ...base, questions: [...base.questions, earlyInput] });
    expect(problems.some((p) => p.includes("PY-Q99-99") && p.includes("input"))).toBe(true);

    const ellipsis: ConceptItem = {
      id: "PY-Q99-98",
      prerequisites: ["PY-L01-05"],
      requires: ["print-call"],
      code: ["print(...)\n"],
    };
    const ellipsisProblems = beginnerProblems({ ...base, questions: [...base.questions, ellipsis] });
    expect(ellipsisProblems.some((p) => p.includes("Ellipsis"))).toBe(true);
  });

  it("gives every lesson one focus, two demonstrations, a try-it, two challenges, and a review", () => {
    for (const lesson of authoredLessons) {
      expect(lesson.focus.length, lesson.id).toBeGreaterThan(0);
      expect(lesson.teaches.length, lesson.id).toBeGreaterThan(0);
      const demos = lesson.blocks.filter((b) => b.kind === "example" || b.kind === "error-example");
      expect(demos.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.challenges, lesson.id).toHaveLength(2);
      expect(lesson.concept.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.concept.some((q) => q.program), `${lesson.id} predicts some output`).toBe(true);
      expect(lesson.review.length, lesson.id).toBeGreaterThanOrEqual(2);
      expect(lesson.tryIt.hints, lesson.id).toHaveLength(3);
    }
  });

  it("never puts the lines the learner still has to write into a hint", () => {
    const leaks: string[] = [];
    const check = (where: string, hints: readonly string[], answer: string, starter: string) => {
      hints.forEach((hint, i) => {
        const lines = hintLeaksSolution(hint, answer, starter);
        if (lines.length) leaks.push(`${where} hint ${i + 1} contains ${lines.join(" | ")}`);
      });
    };
    for (const lesson of authoredLessons) {
      check(`${lesson.id} try`, lesson.tryIt.hints, lesson.tryIt.answer, lesson.tryIt.starter);
      for (const ex of lesson.challenges) check(`${lesson.id} ${ex.id}`, ex.hints, ex.answer, ex.starter);
    }
    for (const q of authoredQuestions) {
      if (q.predict) check(q.id, q.hints, q.predict.output, "");
      else check(q.id, q.hints, q.code!.answer, q.code!.starter);
    }
    expect(leaks).toEqual([]);
  });
});

describe("M01 unlocks", () => {
  const prereq = (id: string) => pyRegistry.questions.find((q) => q.id === id)!.prerequisites;

  it("unlocks one-print after printing and formatting, not after the first lesson", () => {
    expect(prereq("PY-Q01-06")).toEqual(["PY-L01-02"]);
  });

  it("holds the packing slip and the three-bug challenge until the module's last lesson", () => {
    expect(prereq("PY-Q01-09")).toEqual(["PY-L01-05"]);
    expect(prereq("PY-Q01-23")).toEqual(["PY-L01-05"]);
  });

  it("records input() on the assignment lesson, after a name can store a value", () => {
    expect(pyRegistry.lessons.find((l) => l.id === "PY-L02-01")!.title).toBe("assignment and input");
    expect(pyRegistry.lessons.find((l) => l.id === "PY-L01-02")!.title).toBe("printing and formatting");
  });
});
