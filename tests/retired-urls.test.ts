import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { retiredPracticeSlugs, retiredProjectIds, retiredRedirects } from "@/platform/retired-urls";

const live = new Set(sitemap().map((e) => new URL(e.url).pathname));
// Hubs that aren't in the sitemap but always render (they open the learner's next step).
const hubs = new Set(["/", "/sql", "/sql/practice", "/sql/projects"]);

describe("retired URLs", () => {
  it("send old practice questions and projects to pages that exist", () => {
    for (const slug of Object.values(retiredPracticeSlugs)) expect(live, slug).toContain(`/sql/practice/${slug}`);
    for (const id of Object.values(retiredProjectIds)) expect(live, id).toContain(`/sql/projects/${id}`);
  });

  it("never redirect away from a live page", () => {
    for (const r of retiredRedirects()) expect(live.has(r.source) || hubs.has(r.source), r.source).toBe(false);
  });

  it("only point fixed destinations at live pages or hubs", () => {
    for (const r of retiredRedirects().filter((r) => !r.destination.includes(":"))) {
      expect(live.has(r.destination) || hubs.has(r.destination), r.destination).toBe(true);
    }
  });
});
