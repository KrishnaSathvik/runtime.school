import { describe, expect, it } from "vitest";
import { REFERENCE_ONLY_CONCEPTS } from "@/content/syntax-notes";
import { searchResults } from "@/components/shell/search-index";
import { PROGRESS_HREF } from "@/lib/routes";
import { dialectGuide } from "@/content";
import { availableSubjects } from "@/platform/subjects";

describe("final navigation and clarity corrections", () => {
  it("points progress aliases at Learn, not a dashboard", () => {
    expect(PROGRESS_HREF).toBe("/sql");
    expect(searchResults("progress").find((item) => item.label === "Progress")).toBeUndefined();
    expect(searchResults("my learning").some((item) => item.href === "/my-learning")).toBe(false);
    expect(searchResults("").some((item) => item.label === "Learn" && item.href === "/sql")).toBe(true);
    expect(searchResults("").some((item) => item.label === "All subjects" && item.href === "/")).toBe(true);
  });

  it("keeps a single available practice and projects hub for redirects", () => {
    const practice = availableSubjects.filter((s) => s.practiceHref);
    const projects = availableSubjects.filter((s) => s.projectsHref);
    expect(practice).toHaveLength(1);
    expect(projects).toHaveLength(1);
    expect(practice[0].practiceHref).toBe("/practice");
    expect(projects[0].projectsHref).toBe("/projects/sql");
  });

  it("marks only the three non-runnable syntax concepts as Reference", () => {
    expect([...REFERENCE_ONLY_CONCEPTS].sort()).toEqual([
      "CSV ingestion",
      "Partitioning",
      "Stored procedure",
    ]);
    for (const title of REFERENCE_ONLY_CONCEPTS) {
      expect(dialectGuide.some((row) => row[0] === title)).toBe(true);
    }
  });
});
