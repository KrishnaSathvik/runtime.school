import { lessons, projects } from "@/content";
import { bankQuestions } from "@/content/question-bank/questions";
import { tracks } from "@/content/question-bank/tracks";
import { isMastered, milestoneDone, type LearningState } from "@/lib/learning-state";

export function lessonNextSteps(id: number, state: Pick<LearningState, "stats" | "questions" | "projects">) {
  const mastered = (lessonId: number) => !!state.stats[lessonId] && isMastered(state.stats[lessonId]);
  const eligible = bankQuestions.filter((q) => q.prerequisites.includes(id) &&
    q.prerequisites.every(mastered) && !state.questions[q.id]?.solved);
  const practice = [eligible.find(q=>q.exerciseType === "predict" || q.exerciseType === "debug"), ...eligible].filter((q,i,all): q is NonNullable<typeof q> => !!q && all.indexOf(q)===i).slice(0,2);
  const track = tracks.find((t) => t.questionIds.some((qid) => qid.startsWith(`lc-${id}-`) || practice.some((q) => q.id === qid)));
  const project = projects.find((p) => {
    const foundations = [...new Set(p.milestoneIds.slice(0, 2).flatMap((mid) => lessons[mid].prereq))];
    return foundations.includes(id) && foundations.every(mastered) &&
      !p.milestoneIds.every((mid) => milestoneDone(state.projects[p.id]?.milestones[mid]));
  });
  return { practice, track, project };
}
