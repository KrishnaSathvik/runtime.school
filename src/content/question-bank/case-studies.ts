/**
 * Editorial metadata for Practice Case Studies.
 * Stages remain the existing bank questions (qb-0067…, qb-0084…).
 * This module never copies grading, solutions, or progress records.
 */
import { bankQuestions } from "./questions";
import type { BankQuestion } from "./types";

export type CasePrepDemo = {
  title: string;
  description: string;
  query: string;
};

export type CaseStageMeta = {
  questionId: string;
  /** Short investigation label for the case overview. */
  brief: string;
  /** Why this investigation matters in the business scenario. */
  businessWhy: string;
};

export type CaseStudyMeta = {
  id: string;
  title: string;
  summary: string;
  scenario: string;
  investigation: string;
  dataOverview: string;
  dataTables: { name: string; role: string }[];
  difficultyLabel: string;
  complexityNote: string;
  skillLessonIds: number[];
  skillLabels: string[];
  independentNote: string;
  preparation?: {
    title: string;
    intro: string;
    points: string[];
    demos: CasePrepDemo[];
  };
  stages: CaseStageMeta[];
  completionSummary: string;
};

export const caseStudies: CaseStudyMeta[] = [
  {
    id: "harbor-checkout-review",
    title: "Harbor Market: checkout reliability",
    summary: "Investigate checkout drop-off, delays, and later recoveries from web events.",
    scenario:
      "Harbor Market’s product team sees checkout complaints and wants evidence, not guesses. You investigate the same fictional web-event log that captures views, checkouts, purchases, and heartbeats for shoppers and carts.",
    investigation:
      "You will build a session baseline, locate funnel drop-off, measure checkout-to-purchase delay, find later recoveries, and prioritize channels by unresolved abandonment—five separate investigations that share one scenario and dataset.",
    dataOverview:
      "The working table is market_web_events. Duplicate event_key values are intentional retries. Session rules (dedupe, 30-minute gaps, total event order) apply in every graded stage and must be recomputed each time.",
    dataTables: [
      {
        name: "market_web_events",
        role: "One row per ingested event (including retries). Key fields: event_key, shopper_id, occurred_at, event_type, channel, cart_id.",
      },
    ],
    difficultyLabel: "Medium → Hard",
    complexityNote:
      "Stage 1 is already a medium sessionization exercise. Later stages are hard ordered-funnel and window work. This is not a beginner case.",
    skillLessonIds: [20, 21, 24, 46, 48],
    skillLabels: ["CTEs", "ROW_NUMBER", "LAG / LEAD", "Ordered funnels", "Sessionization"],
    independentNote:
      "Each stage starts from the original event tables in a fresh database. Recompute any intermediate results; nothing is carried over from earlier stages.",
    preparation: {
      title: "Before you write graded SQL",
      intro:
        "Stage 1 asks for a daily session baseline. That assumes you already understand how Harbor defines a session. Use these ungraded inspections to see duplicates, gaps, and day boundaries in the sample data—they do not reveal the graded answers.",
      points: [
        "Retries share an event_key; keep the smallest id as the canonical event.",
        "A new session starts after a gap strictly greater than 30 minutes for that shopper (exactly 30 minutes stays in the same session).",
        "Midnight alone does not split a session; attribute the whole session to the UTC date of its first event.",
        "Event order is (occurred_at, id)—equal timestamps follow id order.",
      ],
      demos: [
        {
          title: "Find retry duplicates",
          description:
            "Several event_key values appear more than once. Graded work keeps one canonical row per key before building sessions.",
          query:
            "SELECT event_key, COUNT(*) AS rows, GROUP_CONCAT(id) AS ids\nFROM market_web_events\nGROUP BY event_key\nHAVING COUNT(*) > 1\nORDER BY event_key\nLIMIT 8;",
        },
        {
          title: "Inspect one shopper’s timeline",
          description:
            "Look at consecutive timestamps for a single shopper. Gaps larger than 30 minutes matter for session starts; smaller gaps do not.",
          query:
            "SELECT id, event_key, occurred_at, event_type, channel, cart_id\nFROM market_web_events\nWHERE shopper_id = 1\nORDER BY occurred_at, id\nLIMIT 20;",
        },
        {
          title: "Spot events around midnight",
          description:
            "Sessions can cross midnight. When you later group by day, use the session’s first event date so one session is not counted on two days.",
          query:
            "SELECT shopper_id, id, occurred_at, event_type\nFROM market_web_events\nWHERE occurred_at >= '2025-05-01 23:00:00' AND occurred_at < '2025-05-02 01:00:00'\nORDER BY occurred_at, id;",
        },
      ],
    },
    stages: [
      {
        questionId: "qb-0067",
        brief: "Establish the daily session baseline",
        businessWhy:
          "Without a correct session denominator, later drop-off and recovery rates are meaningless.",
      },
      {
        questionId: "qb-0068",
        brief: "Locate ordered funnel drop-off",
        businessWhy:
          "Shows whether sessions stall before checkout or between checkout and purchase under Harbor’s ordered rules.",
      },
      {
        questionId: "qb-0069",
        brief: "Measure the checkout delay tail",
        businessWhy:
          "Separates typical checkout latency from the slow tail by channel for converted sessions only.",
      },
      {
        questionId: "qb-0070",
        brief: "Find later same-cart recoveries",
        businessWhy:
          "Distinguishes permanent abandonment from purchases that return in a later session within 24 hours.",
      },
      {
        questionId: "qb-0071",
        brief: "Prioritize channels by unrecovered loss",
        businessWhy:
          "Turns the review into a triage table: unresolved abandoned sessions by first-touch channel.",
      },
    ],
    completionSummary:
      "You completed five independent Harbor checkout investigations: session baseline, funnel drop-off, delay tail, later recovery, and channel prioritization.",
  },
  {
    id: "regional-capacity",
    title: "Infrastructure Capacity Planning",
    summary: "Plan capacity across regions, sites, validity windows, and incoming deliveries.",
    scenario:
      "A capacity analyst must publish reproducible regional reports from fictional site inventories. Capacity records have validity intervals; future supply arrives on delivery dates. Units are compute units—not a claim about any real provider.",
    investigation:
      "You will snapshot regional capacity, retain missing/unmapped sites, find next deliveries (including ties), reconcile capacity with incoming supply without fan-out, and project month-end regional capacity.",
    dataOverview:
      "Four tables describe regions, sites, current capacity intervals, and future deliveries. Snapshot date is 2026-04-01. Intervals include valid_from and exclude valid_to; NULL valid_to means open-ended.",
    dataTables: [
      { name: "capacity_regions", role: "Region ids and names (including empty regions that must still appear)." },
      { name: "capacity_sites", role: "Sites mapped to regions; some sites may be unmapped (NULL region)." },
      { name: "current_capacity", role: "Capacity intervals with units, valid_from, and optional valid_to." },
      { name: "future_supply", role: "Incremental deliveries with units and delivery_date." },
    ],
    difficultyLabel: "Medium → Hard",
    complexityNote:
      "Early stages are medium joins and aggregates. Later stages require careful grain control and fixed cutoffs. Expect hard multi-table work by stage 3.",
    skillLessonIds: [15, 20, 39, 49],
    skillLabels: ["LEFT JOIN", "CTEs", "Date boundaries", "Multi-grain joins"],
    independentNote:
      "Every stage runs on a fresh database; earlier queries do not carry forward. Re-aggregate facts at the requested grain in each stage.",
    preparation: {
      title: "Before you write graded SQL",
      intro:
        "Capacity mistakes usually come from wrong validity windows or joining facts at different grains. Inspect the fixtures first.",
      points: [
        "Active capacity on the snapshot must satisfy valid_from ≤ 2026-04-01 and (valid_to IS NULL OR valid_to > 2026-04-01).",
        "Deliveries on the snapshot date are excluded from the snapshot itself; projections add them once under the stated cutoff.",
        "Empty regions and unmapped sites are intentional; preserve them when the task asks.",
      ],
      demos: [
        {
          title: "List sites and region mappings",
          description: "Drift has no region. Reports that require every site must keep that NULL mapping.",
          query:
            "SELECT s.id AS site_id, s.name AS site, r.id AS region_id, r.name AS region\nFROM capacity_sites s\nLEFT JOIN capacity_regions r ON r.id = s.region_id\nORDER BY s.id;",
        },
        {
          title: "See capacity validity windows",
          description:
            "Some intervals expire on the snapshot date or start later. Active filters must exclude those rows for the snapshot.",
          query:
            "SELECT id, site_id, units, valid_from, valid_to\nFROM current_capacity\nORDER BY site_id, valid_from, id;",
        },
        {
          title: "Scan upcoming deliveries",
          description: "Multiple deliveries can share a date for one site—ties must all count when asked.",
          query:
            "SELECT id, site_id, units, delivery_date\nFROM future_supply\nWHERE delivery_date >= '2026-04-01'\nORDER BY site_id, delivery_date, id;",
        },
      ],
    },
    stages: [
      {
        questionId: "qb-0084",
        brief: "Current regional totals on the snapshot",
        businessWhy: "Leadership needs active capacity by region, including empty regions as zero.",
      },
      {
        questionId: "qb-0085",
        brief: "Retain missing and unmapped sites",
        businessWhy: "Operations needs every site visible—even without a region or active capacity.",
      },
      {
        questionId: "qb-0086",
        brief: "Next delivery date and tied units",
        businessWhy: "Planners need the earliest upcoming delivery and the full tied quantity on that date.",
      },
      {
        questionId: "qb-0087",
        brief: "Reconcile capacity and April supply",
        businessWhy: "Avoid fan-out when comparing snapshot capacity to April deliveries in separate columns.",
      },
      {
        questionId: "qb-0088",
        brief: "Project regional capacity at month end",
        businessWhy: "Publish an April 30 projection using validity at the cutoff plus inclusive April deliveries.",
      },
    ],
    completionSummary:
      "You completed five independent capacity investigations: regional snapshot, site retention, next deliveries, fan-out-safe reconciliation, and month-end projection.",
  },
];

export const caseStudyById = new Map(caseStudies.map((c) => [c.id, c]));

export function questionsForCase(caseId: string): BankQuestion[] {
  return bankQuestions
    .filter((q) => q.caseStudy?.id === caseId)
    .sort((a, b) => (a.caseStudy!.stage ?? 0) - (b.caseStudy!.stage ?? 0));
}

export function stageMetaFor(questionId: string): CaseStageMeta | undefined {
  for (const c of caseStudies) {
    const stage = c.stages.find((s) => s.questionId === questionId);
    if (stage) return stage;
  }
  return undefined;
}
