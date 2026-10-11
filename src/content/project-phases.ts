/**
 * Presentation-only grouping of long projects into phases. Milestone order and
 * requirements come from the content pack and are not changed here; tests
 * assert each grouping covers every milestone exactly once, in order.
 */
export type Phase = { title: string; summary: string; milestoneIds: number[] };

export const projectPhases: Record<number, Phase[]> = {
  3: [
    { title: "Bronze — inspect raw data", summary: "See what arrived before changing anything.", milestoneIds: [69] },
    { title: "Silver — clean and deduplicate", summary: "Trim, map and keep the latest version of each record.", milestoneIds: [70] },
    { title: "Gold — model and test", summary: "Build dimensions and facts with quality gates.", milestoneIds: [71] },
    { title: "Report", summary: "Explore the model and publish repeatable reports.", milestoneIds: [72, 74, 73] },
  ],
  4: [
    {
      title: "1 · Land the sources",
      summary: "Check that every source row arrived before you trust it.",
      milestoneIds: [76],
    },
    {
      title: "2 · Integrate and validate",
      summary: "Combine CRM and ERP by source authority, then validate dates and quarantine bad rows.",
      milestoneIds: [77, 78, 79, 80],
    },
    {
      title: "3 · Quality gates and stable keys",
      summary: "Automate tests and keep surrogate keys stable across loads.",
      milestoneIds: [81, 82],
    },
    {
      title: "4 · History and safe loading",
      summary: "Track change over time and load incrementally without corrupting published data.",
      milestoneIds: [83, 84, 85],
    },
    {
      title: "5 · Trusted reporting",
      summary: "Report at the right grain, then bring everything together in the capstone.",
      milestoneIds: [86, 87],
    },
  ],
};
