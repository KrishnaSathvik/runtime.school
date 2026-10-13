import { describe, expect, it } from "vitest";
import {
  projectOverviewHref,
  projectResumeHref,
} from "@/features/projects/ProjectList";
import { projects } from "@/content";
import type { LearningState } from "@/lib/learning-state";

describe("project entry hrefs", () => {
  it("overview always points at the project page", () => {
    expect(projectOverviewHref(0)).toBe("/projects/0");
    expect(projectOverviewHref(4)).toBe("/projects/4");
  });

  it("resume opens the first unfinished milestone", () => {
    const p = projects[0];
    const empty = {} as LearningState["projects"];
    expect(projectResumeHref(p.id, empty)).toBe(
      `/projects/${p.id}/milestone/${p.milestoneIds[0]}`,
    );
  });

  it("resume returns overview when every milestone is done", () => {
    const p = projects[0];
    const milestones = Object.fromEntries(
      p.milestoneIds.map((id) => [
        id,
        {
          solved: [0, 1],
          check: true,
          legacy: false,
          queries: {},
          results: {},
          notes: "finding",
        },
      ]),
    );
    const state = {
      [p.id]: { milestones, startedAt: 1, updatedAt: 1 },
    } as LearningState["projects"];
    expect(projectResumeHref(p.id, state)).toBe(`/projects/${p.id}`);
  });
});
