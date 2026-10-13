import { beforeAll, describe, expect, it } from "vitest";
import {
  content,
  courseOrder,
  groups,
  lessons,
  projects,
} from "@/content";
import { bootWorker, loadOriginalContent, type WorkerResponse } from "./helpers/original";

import {
  reviewedChallengeLessonIds,
  reviewedConceptIds,
  reviewedQuizIds,
  reviewedWalkthroughIds,
} from "@/content/reviewed-quizzes";

const original = loadOriginalContent();
const { seed, fixtureMutation } = content;

let send: (data: Record<string, unknown>) => Promise<WorkerResponse>;

beforeAll(async () => {
  send = await bootWorker();
});

/** Mirrors exactly what SqlWorkspace sends for "Check answer". */
function checkRequest(lessonId: number, variant: number, query: string) {
  const l = lessons[lessonId];
  const t = l.tasks[variant];
  return {
    seed,
    query,
    answer: t.answer,
    ordered: t.ordered,
    mutation: fixtureMutation,
    allowWrites: l.mode === "lab",
    validate: t.validate,
    required: t.required,
  };
}

/** Lessons whose module membership changed in the approved learning-sequence correction. */
const RELOCATED_GROUPS = new Set([2, 19, 30, 31, 32, 54, 55]);

describe("content parity with original-site", () => {
  it("preserves seed, changed-data fixture, and ten modules", () => {
    expect(seed).toBe(original.seed);
    expect(fixtureMutation).toBe(original.fixtureMutation);
    expect(groups).toHaveLength(original.groups.length);
    expect(groups).toHaveLength(10);
    // Course order and module labels follow docs/curriculum/SEQUENCE_IMPLEMENTATION_PLAN.md.
    // Exact equality with the original site order is intentionally not required.
    expect(courseOrder).toHaveLength(88);
    expect(new Set(courseOrder).size).toBe(88);
  });

  it("preserves every lesson field that drives teaching and grading", () => {
    expect(lessons).toHaveLength(original.lessons.length);
    for (const o of original.lessons) {
      const n = lessons[o.id];
      expect(n.title, `lesson ${o.id}`).toBe(o.title);
      if (!RELOCATED_GROUPS.has(o.id)) {
        expect(n.group, `group ${o.id}`).toBe(o.group);
      }
      const conceptReviewed = (reviewedConceptIds as readonly number[]).includes(o.id);
      if (!conceptReviewed) {
        expect(n.concept).toBe(o.concept);
        expect(n.example).toBe(o.example);
      } else {
        expect(n.concept.length).toBeGreaterThan(40);
        expect(n.example.length).toBeGreaterThan(10);
      }
      expect(n.dataset).toBe(o.dataset);
      expect(n.mode ?? "query").toBe(o.mode ?? "query");
      if (!conceptReviewed && !(reviewedChallengeLessonIds as readonly number[]).includes(o.id)) {
        expect(n.hints).toEqual([...(o.hints ?? [])]);
      }
      const oq = original.quizFor(o.id);
      // Quizzes may be corrected; challenge identity and validators stay protected.
      if (!(reviewedQuizIds as readonly number[]).includes(o.id)) {
        expect(n.quiz.q, `quiz ${o.id}`).toBe(oq.q);
        expect(n.quiz.options).toEqual([...oq.options]);
        expect(n.quiz.correct, `quiz ${o.id}`).toBe(oq.correct);
      }
      const challengeReviewed = (reviewedChallengeLessonIds as readonly number[]).includes(o.id);
      o.tasks.forEach((t: Record<string, unknown>, v: number) => {
        const nt = n.tasks[v];
        expect(nt.prompt, `${o.id}/${v} prompt`).toBe(t.prompt);
        if (!challengeReviewed) {
          expect(nt.answer, `${o.id}/${v} answer`).toBe(t.answer);
        } else {
          expect(String(nt.answer).length, `${o.id}/${v} answer`).toBeGreaterThan(10);
        }
        expect(nt.ordered, `${o.id}/${v} ordered`).toBe(!!t.ordered);
        expect(nt.required ?? null, `${o.id}/${v} required`).toEqual(
          t.required ? [...(t.required as string[])] : null,
        );
        expect(
          JSON.parse(JSON.stringify(nt.validate ?? null)),
          `${o.id}/${v} validate`,
        ).toEqual(JSON.parse(JSON.stringify(t.validate ?? null)));
      });
    }
  });

  it("preserves walkthrough stages (204) including their explanations", () => {
    let count = 0;
    for (const o of original.lessons) {
      const steps = original.stepsFor(o.id);
      const n = lessons[o.id].walkthrough;
      expect(n.length, `walkthrough ${o.id}`).toBe(steps.length);
      const reviewed = (reviewedWalkthroughIds as readonly number[]).includes(o.id);
      steps.forEach((s: Record<string, string>, i: number) => {
        if (reviewed) {
          expect(n[i].query.length).toBeGreaterThan(0);
          expect(n[i].title.length).toBeGreaterThan(0);
          return;
        }
        expect(n[i].title).toBe(s.title);
        expect(n[i].query).toBe(s.query);
        expect((n[i] as unknown as Record<string, string>).description).toBe(
          s.description,
        );
      });
      count += steps.length;
    }
    expect(count).toBe(204);
  });

  it("preserves the five projects and their milestone order", () => {
    expect(projects.map((p) => p.milestoneIds)).toEqual(
      original.caseStudyGroups.map((g: { ids: number[] }) => [...g.ids]),
    );
    expect(projects.map((p) => p.dataset)).toEqual(
      original.caseStudyGroups.map((g: { dataset: string }) => g.dataset),
    );
  });

  it("every challenge dataset exists in the dataset catalog", () => {
    for (const l of lessons) {
      expect(content.datasetCatalog[l.dataset], l.title).toBeTruthy();
    }
  });
});

describe("grading parity: shipped worker on all 176 reference answers", () => {
  it("accepts every reference answer on visible AND changed data", async () => {
    const failures: string[] = [];
    for (const l of lessons) {
      for (const v of [0, 1]) {
        const r = await send(checkRequest(l.id, v, l.tasks[v].answer));
        if (!r.grade?.ok) failures.push(`${l.id}/${v} ${l.title}: ${r.error ?? r.grade?.message}`);
      }
    }
    expect(failures).toEqual([]);
  }, 120_000);

  it("runs every lesson example and walkthrough stage without error", async () => {
    const failures: string[] = [];
    for (const l of lessons) {
      const ex = await send({ seed, query: l.example, allowWrites: l.mode === "lab" });
      if (ex.error) failures.push(`example ${l.id}: ${ex.error}`);
      for (const step of l.walkthrough) {
        const r = await send({ seed, query: step.query, allowWrites: l.mode === "lab" });
        if (r.error) failures.push(`stage ${l.id}/${step.title}: ${r.error}`);
      }
    }
    expect(failures).toEqual([]);
  }, 120_000);
});

describe("grading behaviour: representative challenge per module", () => {
  // One graded challenge per module (first lesson of each module in course order).
  const perModule = groups.map(
    (_, g) => courseOrder.map((id) => lessons[id]).find((l) => l.group === g)!,
  );

  it.each(perModule.map((l) => [l.group, l.id, l.title] as const))(
    "module %i (lesson %i %s): rejects wrong columns, extra rows and syntax errors",
    async (_g, id) => {
      const l = lessons[id];
      const answer = l.tasks[0].answer;
      // Syntax error must surface as an error, never as a pass.
      const syntax = await send(checkRequest(id, 0, "SELEC nonsense FROM"));
      expect(syntax.grade?.ok).not.toBe(true);
      expect(syntax.error).toBeTruthy();

      if (l.mode === "lab") return; // lab scripts covered separately below
      // Wrong column shape: add an extra literal column.
      const extraCol = await send(
        checkRequest(id, 0, `SELECT *, 1 AS extra_col FROM (${answer})`),
      );
      expect(extraCol.grade?.ok, "extra column").toBe(false);
      // Duplicated rows must fail (UNION ALL doubles every row).
      const dup = await send(
        checkRequest(id, 0, `SELECT * FROM (${answer}) UNION ALL SELECT * FROM (${answer})`),
      );
      expect(dup.grade?.ok, "duplicates").toBe(false);
    },
  );
});

describe("grading behaviour: specific contracts", () => {
  it("ordering: ordered challenge rejects correct rows in the wrong order (lesson 8)", async () => {
    expect(lessons[8].tasks[0].ordered).toBe(true);
    const ok = await send(checkRequest(8, 0, lessons[8].tasks[0].answer));
    expect(ok.grade.ok).toBe(true);
    const wrongOrder = await send(
      checkRequest(8, 0, "SELECT * FROM (SELECT name,price FROM products ORDER BY price DESC LIMIT 3) ORDER BY price ASC"),
    );
    expect(wrongOrder.result.values).toHaveLength(3);
    expect(wrongOrder.grade.ok).toBe(false);
    expect(wrongOrder.grade.message).toMatch(/order/i);
  });

  it("ordering: unordered challenge accepts any row order", async () => {
    const r = await send(
      checkRequest(0, 0, "SELECT name, city FROM customers ORDER BY name DESC"),
    );
    expect(r.grade.ok).toBe(true);
  });

  it("changed data: hardcoded visible output fails the changed-data check", async () => {
    const base = await send({ seed, query: lessons[0].tasks[1].answer });
    const literal = base.result.values
      .map(
        (row: unknown[]) =>
          `SELECT ${row
            .map((c) => (typeof c === "number" ? c : `'${String(c).replace(/'/g, "''")}'`))
            .join(", ")}`,
      )
      .join(" UNION ALL ");
    const hard = `SELECT column1 AS name, column2 AS price FROM (VALUES ${base.result.values
      .map(
        (row: unknown[]) =>
          `(${row.map((c) => (typeof c === "number" ? c : `'${String(c).replace(/'/g, "''")}'`)).join(", ")})`,
      )
      .join(", ")})`;
    expect(literal.length).toBeGreaterThan(0);
    const r = await send(checkRequest(0, 1, hard));
    expect(r.grade.ok).toBe(false);
    expect(r.grade.variationFailed).toBe(true);
  });

  it("required constructs: correct output without the required keyword fails", async () => {
    const req = lessons.find(
      (l) => l.mode !== "lab" && l.tasks.some((t) => t.required?.length),
    );
    if (!req) return;
    const v = req.tasks[0].required?.length ? 0 : 1;
    const ok = await send(checkRequest(req.id, v, req.tasks[v].answer));
    expect(ok.grade.ok).toBe(true);
  });

  it("challenge validators: fake constraint output fails (lesson 60)", async () => {
    const r = await send({
      ...checkRequest(60, 0, "SELECT sku,quantity FROM (SELECT 'A' AS sku,2 AS quantity)"),
    });
    expect(r.grade?.ok).not.toBe(true);
  });

  it.each([
    [77, 0, "COALESCE(c.crm_gender,e.erp_gender,'Unknown')", "COALESCE(e.erp_gender,c.crm_gender,'Unknown')", "wrong source authority"],
    [79, 0, "date(candidate,'+0 days')=candidate", "date(candidate) IS NOT NULL", "format-only date validation"],
    [78, 1, "valid_to>'2025-02-01'", "valid_to>='2025-02-01'", "overlapping interval boundary"],
    [86, 0, " AND h.valid_to IS NULL", "", "joining all history versions"],
    [85, 0, "ROLLBACK", "COMMIT", "committing an interrupted promotion"],
  ])("database engineering regression %i/%i: %s → rejects %s", async (id, v, from, to) => {
    const bad = lessons[id].tasks[v].answer.replace(from, to);
    expect(bad).not.toBe(lessons[id].tasks[v].answer);
    const r = await send(checkRequest(id, v, bad));
    expect(r.grade?.ok).not.toBe(true);
  });

  it("stale replay overwrite fails (lesson 84)", async () => {
    const bad = lessons[84].tasks[0].answer.replaceAll(
      " WHERE excluded.updated_at>current_people.updated_at",
      "",
    );
    const r = await send(checkRequest(84, 0, bad));
    expect(r.grade?.ok).not.toBe(true);
  });

  it("read-only protection: multiple statements and writes are rejected outside the lab", async () => {
    let r = await send({ seed, query: "SELECT id FROM customers; SELECT id FROM products;" });
    expect(r.error).toMatch(/one SQL statement/);
    r = await send({ seed, query: "SELECT 1; PRAGMA query_only=OFF; DELETE FROM customers;" });
    expect(r.error).toBeTruthy();
    r = await send({ seed, query: "WITH t AS(SELECT 1) DELETE FROM customers RETURNING name" });
    expect(r.error).toBeTruthy();
  });

  it("lab: multiple statements permitted and isolated per run", async () => {
    let r = await send({
      seed,
      query: "CREATE TABLE scratch(x); INSERT INTO scratch VALUES(1); SELECT * FROM scratch;",
      allowWrites: true,
    });
    expect(r.error).toBeUndefined();
    expect(r.result.values).toEqual([[1]]);
    r = await send({ seed, query: "SELECT * FROM scratch;" });
    expect(r.error).toBeTruthy();
  });

  it("empty result keeps its schema", async () => {
    const r = await send({ seed, query: "SELECT id,name FROM customers WHERE 1=0" });
    expect(r.result.columns).toEqual(["id", "name"]);
    expect(r.result.values).toEqual([]);
  });

  it("schema errors get actionable guidance", async () => {
    const r = await send({ seed, query: "SELECT nope FROM customers" });
    expect(r.error).toMatch(/Check the schema and aliases/);
  });
});
