/** Discovery guidance for existing, executable projects. Estimates are editorial, not measured completion times. */
export type ProjectLevel = 'beginner' | 'intermediate' | 'advanced';
export type ProjectGuide = {
  level: ProjectLevel;
  skills: string[];
  sessions: string;
  preparation: string[];
  deliverables: string[];
  reflection: string;
};
export const projectGuides: Record<string, ProjectGuide> = {
  'retail-order-engine': {
    level: 'beginner', skills: ['Functions', 'JSON', 'Validation'], sessions: '3–4 sessions of 20–30 minutes',
    preparation: ['numbers-and-arithmetic', 'if-else-and-indentation', 'parameters-and-return-values', 'json-data-and-nested-objects'],
    deliverables: ['receipt.txt', 'totals.json', 'validation.json'],
    reflection: 'Explain why tax is calculated after the discount. Show one boundary input that would expose a pricing mistake.',
  },
  'customer-data-quality': {
    level: 'intermediate', skills: ['JSON', 'Validation', 'Functions'], sessions: '4–5 sessions of 20–30 minutes',
    preparation: ['string-methods-for-cleaning-text', 'sets-membership-and-deduplication', 'parameters-and-return-values', 'json-data-and-nested-objects'],
    deliverables: ['clean.json', 'rejected.json', 'quality.json'],
    reflection: 'Explain which repairs are safe and why rejected records keep their original IDs. What does your email rule fail to establish?',
  },
  'product-event-investigation': {
    level: 'intermediate', skills: ['JSON', 'Dates', 'Analytics'], sessions: '4–5 sessions of 20–30 minutes',
    preparation: ['nested-records-and-collections', 'dictionary-iteration-and-safe-lookup', 'json-data-and-nested-objects', 'dates-times-and-time-zones'],
    deliverables: ['investigation.json'],
    reflection: 'Trace one event from the source into your report. Explain why a presence-based funnel cannot establish a valid chronological conversion.',
  },
  'csv-sales-analyst': {
    level: 'intermediate', skills: ['CSV', 'Dates', 'Validation', 'Analytics'], sessions: '4–5 sessions of 20–30 minutes',
    preparation: ['try-except-else-and-finally', 'csv-rows-and-headers', 'dates-times-and-time-zones', 'writing-data-exports'],
    deliverables: ['clean.csv', 'metrics.csv', 'rejected.json', 'quality.json'],
    reflection: 'Explain how you reconciled both row identities and revenue. Why is a cancelled order valid data but not paid revenue?',
  },
  'marketplace-eda': {
    level: 'advanced', skills: ['pandas', 'CSV', 'Analytics'], sessions: '4–5 sessions of 25–40 minutes',
    preparation: ['reading-and-inspecting-data', 'cleaning-strings-dates-and-duplicates', 'merging-and-reshaping-data', 'groupby-and-aggregation'],
    deliverables: ['cleaned.csv', 'cohorts.csv', 'findings.json'],
    reflection: 'Explain how the join preserves unmatched revenue. Name a limitation that prevents your small sample from supporting a marketplace-wide trend.',
  },
  'reliable-mini-etl': {
    level: 'advanced', skills: ['ETL', 'JSON', 'CSV', 'Validation'], sessions: '5–6 sessions of 25–40 minutes',
    preparation: ['define-input-and-output-contracts', 'data-quality-rules-and-rejections', 'incremental-processing-and-idempotence', 'pipeline-tests-and-observability'],
    deliverables: ['output.csv', 'rejected.json', 'manifest.json'],
    reflection: 'Demonstrate what happens when you replay a batch. Explain the tie-breaking policy and how the manifest accounts for invalid source lines.',
  },
};
export const projectLevels: ProjectLevel[] = ['beginner', 'intermediate', 'advanced'];
export const projectSkills = [...new Set(Object.values(projectGuides).flatMap(g => g.skills))].sort();
