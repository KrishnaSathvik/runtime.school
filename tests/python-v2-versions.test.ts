// Content versions (src/content/python-v2/versions.ts) must agree with the `version` field on each authored item,
// so the progress store (which reads only the small map) retires exactly the records the content says changed.
import { describe, expect, it } from "vitest";
import { authoredLessons, authoredQuestions } from "@/content/python-v2/content";
import { PY_CONTENT_VERSIONS, contentVersion } from "@/content/python-v2/versions";

describe("content versions", () => {
  it("match the version field on every authored lesson and question", () => {
    for (const item of [...authoredLessons, ...authoredQuestions]) expect(contentVersion(item.id), item.id).toBe(item.version ?? 1);
    const authored = new Set([...authoredLessons, ...authoredQuestions].map((x) => x.id as string));
    for (const id of Object.keys(PY_CONTENT_VERSIONS)) expect(authored.has(id), `${id} is versioned but not authored`).toBe(true);
  });
});
