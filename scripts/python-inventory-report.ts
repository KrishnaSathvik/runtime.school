/** Inventory accompanies runtime test evidence; these counts alone do not establish correctness. */
import { writeFileSync } from 'node:fs';
import { pythonLessons, pythonModules } from '../src/content/python';
import { pythonQuestions, pythonTracks } from '../src/content/python/practice';
import { pythonCases, pythonProjects } from '../src/content/python/journeys';
const inventory = {
  lessons: pythonLessons.length,
  challenges: pythonLessons.reduce((n,l)=>n+l.challenges.length,0),
  lessonGradingChecks: pythonLessons.reduce((n,l)=>n+l.challenges.reduce((sum,c)=>sum+c.task.checks.length,0),0),
  conceptChecks: pythonLessons.reduce((n,l)=>n+l.quiz.length,0),
  modules: pythonModules.map(m=>({id:m.id,title:m.title,lessons:m.lessons.map(slug=>{
    const l=pythonLessons.find(l=>l.slug===slug)!;
    return {ref:l.ref,title:l.title,challenges:l.challenges.length,conceptChecks:l.quiz.length};
  })})),
  practice: {
    questions:pythonQuestions.length,
    kinds:Object.fromEntries(['write','debug','predict'].map(kind=>[kind,pythonQuestions.filter(q=>q.kind===kind).length])),
    gradingChecks:pythonQuestions.reduce((n,q)=>n+(q.kind==='predict'?0:q.task.checks.length),0),
    tracks:pythonTracks.map(t=>({ref:t.id,title:t.title,questions:t.questions.length})),
  },
  cases:pythonCases.map(j=>({ref:j.ref,title:j.title,stages:j.stages.length,finalChecks:j.stages.at(-1)!.task.checks.length})),
  projects:pythonProjects.map(j=>({ref:j.ref,title:j.title,milestones:j.stages.length,finalChecks:j.stages.at(-1)!.task.checks.length})),
};
writeFileSync('docs/python/inventory.json',JSON.stringify(inventory,null,2)+'\n');
console.log(JSON.stringify({...inventory,modules:inventory.modules.map(m=>({title:m.title,lessons:m.lessons.length}))},null,2));
