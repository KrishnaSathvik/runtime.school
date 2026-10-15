/** Writes the data the canonical browser checks need (tests/e2e/canonical.mjs) from the content sources. */
import fs from "node:fs";
import { it } from "vitest";
import { lessons, lessonFixture } from "@/content";
import { bankCheckRequest, bankQuestions } from "@/content/question-bank";
import { learningDatasets } from "@/data/datasets/learning";

it("write canonical e2e fixtures", () => {
  const datasets = Object.fromEntries(Object.entries(learningDatasets).map(([id, d]) => {
    const tables = d.metadata.tables;
    const fact = [...tables].sort((a, b) => d.metadata.rows[b.name] - d.metadata.rows[a.name])[0];
    return [id, { name: d.metadata.name, seed: d.seed, mutation: d.mutation, asset: d.asset, fact: { name: fact.name, primaryKey: fact.primaryKey, foreignKeys: fact.foreignKeys, columns: fact.columns.map((c) => c.name), rows: d.metadata.rows[fact.name] } }];
  }));
  const fixture = {
    datasets,
    lessons: lessons.map((l) => ({ id: l.id, title: l.title, dataset: l.dataset, mode: l.mode, quizCorrect: l.quiz.correct, answers: l.tasks.map((t) => t.answer), checks: l.tasks.map((t) => ({ ...lessonFixture(l), answer: t.answer, query: t.answer, ordered: t.ordered, required: t.required, validate: t.validate, planValidation: t.planValidation ?? null, stateQueries: t.stateQueries, repeatCheck: t.repeatCheck, allowWrites: l.mode === "lab" })) })),
    questions: bankQuestions.map((q) => ({ id: q.id, slug: q.slug, title: q.title, dataset: q.datasetId, exerciseType: q.exerciseType, mode: q.mode, solution: q.solution, tables: q.tables, check: bankCheckRequest(q, q.solution) })),
  };
  fs.writeFileSync(process.env.OUT ?? "tests/e2e/.canonical-fixtures.json", JSON.stringify(fixture));
});
