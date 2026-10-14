import { pythonLessons, pythonLessonHref } from '@/content/python';
import { pythonQuestions, pythonQuestionHref } from '@/content/python/practice';
import { pythonProjects, journeyHref } from '@/content/python/journeys';
import { isPyLessonMastered, type PyProgress } from '@/lib/python-progress';

/** Match SQL's entry rules without sharing its progress or identifiers. */
export function pythonSectionHrefs(s: PyProgress) {
  const lesson = pythonLessons.find(l => !isPyLessonMastered(s.lessons[l.ref], l.challenges.map(c => c.id))) ?? pythonLessons[0];
  const recent = pythonQuestions.filter(q => s.items[q.ref]).sort((a,b) => s.items[b.ref].updatedAt - s.items[a.ref].updatedAt)[0];
  const at = recent ? pythonQuestions.indexOf(recent) : 0;
  const question = [...pythonQuestions.slice(at), ...pythonQuestions.slice(0,at)].find(q => {
    const r = s.items[q.ref]?.challenges.answer;
    return !r?.solved && !r?.assisted;
  }) ?? pythonQuestions[0];
  const project = pythonProjects.filter(p => s.items[p.ref]).sort((a,b) => s.items[b.ref].updatedAt - s.items[a.ref].updatedAt)[0];
  const stage = project?.stages.find(stage => !s.items[project.ref]?.challenges[stage.id]?.passes);
  return {
    learn: pythonLessonHref(lesson.slug),
    practice: pythonQuestionHref(question.slug),
    projects: project ? `${journeyHref(project)}${stage ? `?stage=${encodeURIComponent(stage.id)}` : ''}` : journeyHref(pythonProjects[0]),
  };
}
