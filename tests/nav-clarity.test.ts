import { describe, expect, it } from "vitest";
import { SYNTAX_CONCEPTS } from "@/content/syntax-notes";
import { availableSubjects } from "@/platform/subjects";

describe("final navigation and clarity corrections", () => {
  it("keeps a single available practice and projects hub for redirects", () => {
    const practice = availableSubjects.filter((s) => s.practiceHref);
    const projects = availableSubjects.filter((s) => s.projectsHref);
    expect(practice).toHaveLength(1);
    expect(projects).toHaveLength(1);
    expect(practice[0].practiceHref).toBe("/sql/practice");
    expect(projects[0].projectsHref).toBe("/sql/projects");
  });

  it("marks only the three non-runnable syntax concepts as Reference", () => {
    expect(SYNTAX_CONCEPTS.filter((c) => !c.runs).map((c) => c.id).sort()).toEqual([
      "csv-ingestion",
      "partitioning",
      "stored-procedure",
    ]);
  });
});
