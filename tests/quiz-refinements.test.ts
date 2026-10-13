import { beforeAll, expect, it } from "vitest";
import { lessons } from "@/content";
import { reviewedQuizIds } from "@/content/reviewed-quizzes";
import additionalProofs from "./helpers/quiz-proofs.json";
import { bootWorker } from "./helpers/original";
let send: Awaited<ReturnType<typeof bootWorker>>;
beforeAll(async()=>{send=await bootWorker();});
const proofs = [
  {id:9,query:"WITH cities(city) AS (VALUES('Chicago'),('Austin'),(NULL)) SELECT COUNT(*),COUNT(city) FROM cities",rows:[[3,2]]},
  {id:10,query:"WITH products(category) AS (VALUES('A'),('A'),('B')) SELECT category,COUNT(*) FROM products GROUP BY category ORDER BY category",rows:[['A',2],['B',1]]},
  {id:11,query:"WITH orders(customer_id,quantity) AS (VALUES(1,6),(1,6),(2,9)) SELECT customer_id,SUM(quantity) FROM orders GROUP BY customer_id HAVING SUM(quantity)>10",rows:[[1,12]]},
  {id:14,query:"WITH customers(id) AS (VALUES(1),(2)),orders(customer_id) AS (VALUES(1),(1)) SELECT c.id FROM customers c INNER JOIN orders o ON o.customer_id=c.id",rows:[[1],[1]]},
  {id:15,query:"WITH customers(id) AS (VALUES(1),(2)),orders(id,customer_id) AS (VALUES(3,1)) SELECT c.id,COUNT(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id=c.id GROUP BY c.id ORDER BY c.id",rows:[[1,1],[2,0]]},
  {id:17,query:"WITH products(price) AS (VALUES(10),(20),(30)) SELECT price FROM products WHERE price>(SELECT AVG(price) FROM products)",rows:[[30]]},
  {id:20,query:"WITH totals AS (SELECT 3 AS n) SELECT n FROM totals",rows:[[3]]},
  {id:21,query:"WITH orders(id,customer_id,ordered_at) AS (VALUES(1,1,'2025-01-01'),(2,1,'2025-01-01'),(3,2,'2025-01-01')) SELECT id,ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY ordered_at,id) FROM orders ORDER BY id",rows:[[1,1],[2,2],[3,1]]},
  {id:45,query:"WITH watches(viewer_id) AS (VALUES(1),(1),(1)) SELECT COUNT(DISTINCT viewer_id) FROM watches",rows:[[1]]},
];
it.each([...proofs, ...additionalProofs])("lesson $id concept check is grounded in actual SQLite behavior",async({id,query,rows})=>{
 const r=await send({seed:"",query,allowWrites:/^CREATE/i.test(query)});expect(r.error).toBeUndefined();if (rows) expect(r.result.values).toEqual(rows);
 else expect(r.result.columns).toContain("detail");
 const quiz=lessons[id].quiz;expect(quiz.options[quiz.correct]).toBeTruthy();expect(quiz.why.length).toBeGreaterThan(30);
});
it("CTE scope ends at the statement",async()=>{
 const r=await send({seed:"",query:"WITH totals AS (SELECT 3 AS n) SELECT n FROM totals; SELECT n FROM totals;",allowWrites:true});expect(r.error).toMatch(/no such table: totals/);
});
it("reviewed checks align with their specific teaching objectives",()=>{
 expect(reviewedQuizIds.length).toBeGreaterThanOrEqual(42);
 expect(new Set(reviewedQuizIds).size).toBe(reviewedQuizIds.length);
 for(const id of reviewedQuizIds){const l=lessons[id];expect(l.quiz.correct).toBeGreaterThanOrEqual(0);expect(l.quiz.correct).toBeLessThan(l.quiz.options.length);}
 expect(lessons[69].quiz.why).toMatch(/traceable source records/);
 expect(lessons[9].quiz.q).not.toContain('LEFT JOIN');expect(lessons[17].quiz.q).not.toContain('January');
 expect(lessons[16].quiz.q).toMatch(/quantity \* price|revenue/i);
 expect(lessons[16].quiz.q).not.toMatch(/requests and three invoices/i);
 expect(lessons[70].quiz.q).toMatch(/rn = 1|latest|Silver|natural key/i);
 expect(lessons[70].quiz.q).not.toMatch(/surrogate keys with fresh ROW_NUMBER/i);
});
