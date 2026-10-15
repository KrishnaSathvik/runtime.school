import { courseOrder, lessons } from "@/content";
import { sqlLessonHref } from "@/platform/sql-lesson-href";
import { featureTags, rubricDifficulty, rubricScore, similarity, skeleton, sqlFeatures } from "./rubric";
import type { Difficulty, QuestionRecord, TopicId } from "./types";

/**
 * Primary topic per lesson (both challenges share it). Chosen from what the
 * lesson teaches; secondary tags come from the reference SQL's features.
 */
const LESSON_TOPIC: Record<number, TopicId> = {
  0: "basics.select", 1: "basics.alias", 2: "basics.distinct", 30: "aggregation.basic", 54: "basics.schema",
  3: "filtering.where", 4: "filtering.between", 5: "filtering.logic", 6: "filtering.like", 7: "filtering.null",
  8: "basics.order-by", 31: "filtering.null",
  9: "aggregation.basic", 10: "aggregation.group-by", 11: "aggregation.having", 12: "cleaning.case",
  13: "aggregation.conditional", 32: "analytics.statistics", 55: "aggregation.group-by", 56: "cleaning.validation",
  14: "joins.inner", 15: "joins.left", 16: "joins.multi", 34: "joins.self", 35: "dates.series", 36: "joins.anti",
  37: "joins.left", 38: "joins.set-ops",
  17: "subqueries.scalar", 18: "subqueries.exists", 20: "subqueries.cte", 26: "dates.buckets", 33: "cleaning.strings",
  39: "dates.filter",
  21: "windows.row-number", 22: "windows.rank", 23: "windows.running", 24: "windows.lag-lead", 25: "windows.top-n",
  40: "windows.lag-lead", 41: "windows.rolling", 42: "windows.rolling", 43: "analytics.statistics", 53: "windows.top-n",
  57: "windows.rank",
  19: "joins.set-ops", 27: "subqueries.recursive", 28: "optimization.plans", 29: "analytics.segmentation",
  44: "cleaning.dedupe", 45: "analytics.active-users", 46: "analytics.conversion", 47: "analytics.retention",
  48: "dates.sessions", 49: "joins.fan-out", 50: "warehousing.reconciliation", 51: "analytics.revenue",
  52: "analytics.conversion",
  58: "engineering.ddl", 59: "engineering.dml", 60: "engineering.constraints", 61: "engineering.transactions",
  62: "engineering.views", 63: "engineering.views", 64: "engineering.views", 65: "engineering.constraints",
  66: "optimization.indexes", 67: "optimization.plans", 68: "optimization.plans", 75: "optimization.plans",
  69: "warehousing.layers", 70: "warehousing.layers", 71: "warehousing.layers", 72: "aggregation.basic",
  73: "analytics.segmentation", 74: "windows.running",
  76: "warehousing.reconciliation", 77: "warehousing.layers", 78: "warehousing.history", 79: "cleaning.validation",
  80: "warehousing.reconciliation", 81: "warehousing.reconciliation", 82: "warehousing.incremental",
  83: "warehousing.history", 84: "warehousing.incremental", 85: "engineering.transactions", 86: "joins.fan-out",
  87: "warehousing.layers",
};

/**
 * Human review of the rubric. Each override states why the score misjudges
 * the reasoning actually required.
 */
export const DIFFICULTY_OVERRIDES: Record<string, { difficulty: Difficulty; why: string }> = {
  "35/0": { difficulty: "medium", why: "Fixed VALUES date list plus CROSS JOIN; mechanical once the date source is given." },
  "35/1": { difficulty: "medium", why: "Same date-grid pattern with one signup filter." },
  "53/0": { difficulty: "medium", why: "Aggregate-then-rank top-N with an explicit tie-breaker; a standard intermediate pattern." },
  "53/1": { difficulty: "medium", why: "Top-N with ties via DENSE_RANK; the prompt states the tie rule." },
  "32/1": { difficulty: "medium", why: "LEFT JOIN + NULLIF ratio; several features but one clear idea." },
  "64/0": { difficulty: "medium", why: "Trigger syntax is new but the logic is a single audit insert." },
  "64/1": { difficulty: "medium", why: "Same trigger plus one UPDATE." },
  "75/1": { difficulty: "medium", why: "Fixing integer division and a filter in a given query; guided by the prompt." },
  "83/0": { difficulty: "easy", why: "A single IS NULL filter, but it requires understanding open-ended SCD rows." },
  "76/1": { difficulty: "easy", why: "Missing-or-blank check needs TRIM and NULL reasoning, beyond a warm-up." },
  "69/1": { difficulty: "easy", why: "Invalid-date detection via date() returning NULL is a non-obvious idea." },
  "39/0": { difficulty: "easy", why: "Inclusive/exclusive month boundary reasoning is the point of the task." },
};

/**
 * Challenges that only make sense inside their lesson (reviewed individually).
 * They stay reachable through the lesson flow, but are not listed
 * in the Practice browser because the prompt depends on earlier lesson context.
 */
export const LESSON_ONLY: Record<string, string> = {
  "35/1": "“the same date range” refers to challenge 1",
  "28/0": "asks the learner to use Explain mode in the lesson",
  "28/1": "asks the learner to use Explain mode in the lesson",
  "47/1": "“the same output and cutoff” refers to challenge 1",
  "48/1": "“the same rule” refers to challenge 1's session definition",
  "50/1": "“the same definition” refers to challenge 1",
  "52/1": "“the same post-assignment rule” refers to challenge 1",
  "64/1": "“the same trigger” refers to challenge 1",
  "70/1": "“the same TEMP silver_customers” refers to challenge 1",
  "71/1": "“the same TEMP built_fact” refers to challenge 1",
  "77/0": "uses the integration contract defined in the lesson's Understand stage",
  "77/1": "uses the integration contract defined in the lesson's Understand stage",
  "79/1": "“the same rule” refers to challenge 1",
  "84/1": "“that UPSERT” refers to challenge 1",
  "87/1": "“the same two TEMP outputs” refers to challenge 1",
};

function lessonHref(id: number) {
  return sqlLessonHref(id);
}

export function existingQuestions(): QuestionRecord[] {
  const out: QuestionRecord[] = [];
  for (const id of courseOrder) {
    const l = lessons[id];
    l.tasks.forEach((t, v) => {
      const f = sqlFeatures(t.answer, t.validate?.length ?? 0);
      const score = rubricScore(f);
      const key = `${id}/${v}`;
      const override = DIFFICULTY_OVERRIDES[key];
      const rubric = rubricDifficulty(score, f);
      const primary = LESSON_TOPIC[id];
      out.push({
        id: `lc-${id}-${v}`,
        slug: `lesson-${id}-challenge-${v + 1}`,
        title: `${l.title} · Challenge ${v + 1}`,
        difficulty: override?.difficulty ?? rubric,
        difficultyWhy: override
          ? `Reviewed (rubric said ${rubric}, score ${score}): ${override.why}`
          : `Rubric score ${score} → ${rubric}.`,
        primaryTopic: primary,
        topicTags: featureTags(f).filter((x) => x !== primary),
        datasetId: l.dataset,
        sourceType: "lesson",
        sourceLessonId: id,
        sourceVariant: v,
        moduleId: l.group,
        prompt: t.prompt,
        ordered: t.ordered,
        pattern: "",
        practiceEligible: !(key in LESSON_ONLY),
        href: lessonHref(id),
      });
    });
  }
  assignPatterns(out);
  return out;
}

/** Same-reasoning groups: identical structure anywhere, or ≥0.8 structural similarity within a lesson. */
function assignPatterns(rows: QuestionRecord[]) {
  const sk = rows.map((r) => skeleton(lessons[r.sourceLessonId!].tasks[r.sourceVariant!].answer));
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const sameLesson = rows[i].sourceLessonId === rows[j].sourceLessonId;
      if (sk[i] === sk[j] || (sameLesson && similarity(sk[i], sk[j]) >= 0.8)) parent[find(j)] = find(i);
    }
  rows.forEach((r, i) => {
    const root = rows[find(i)];
    r.pattern = `p-${root.sourceLessonId}-${root.sourceVariant}`;
  });
}
