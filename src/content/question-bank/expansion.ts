import { caseStudyQuestions } from "./case-study-questions";
import { textQuestions } from "./text-questions";
import { relationshipQuestions } from "./relationship-questions";
import { engineeringQuestions } from "./engineering-questions";
import { funnelQuestions } from "./funnel-questions";
import type { BankQuestion } from './types';
import { optimizationFixture, optimizationMutation } from './expansion-data';

const lookup = `SELECT id,event_at,amount FROM market_query_log
WHERE shopper_id=42 AND event_kind='purchase'
AND event_at>='2025-01-04 00:00:00' AND event_at<'2025-01-05 00:00:00'
ORDER BY event_at,id`;
const lookupIndex = 'CREATE INDEX purchase_lookup ON market_query_log(shopper_id,event_kind,event_at);';

export const optimizationQuestions: BankQuestion[] = [{
  id: 'qb-0049', slug: 'purchase-lookup-index', title: 'Design a purchase lookup index',
  version: 1, difficulty: 'hard', difficultyWhy: 'Choose equality-prefix and range-key order, preserve a half-open boundary, and satisfy a catalog plus plan contract.',
  primaryTopic: 'optimization.indexes', topicTags: ['optimization.plans','dates.filter'],
  objective: 'Combine two equality predicates and a timestamp range in a composite index.',
  prerequisites: [66,67,39], datasetId: 'market', mode: 'lab',
  setupSql: optimizationFixture, extraMutation: optimizationMutation,
  task: 'Harbor Market needs the purchases for shopper 42 on January 4, 2025. Create a full index with exactly (shopper_id, event_kind, event_at), in that order, then return id, event_at and amount for those purchases. The submitted SELECT must use an indexed search through that index.',
  columns: ['id','event_at','amount'], ordered: true,
  rules: ['Use event_kind = purchase and the half-open timestamp interval [2025-01-04 00:00:00, 2025-01-05 00:00:00).', 'Order by event_at, then id, ascending. Choose any index name; do not change source rows.', 'This controlled archive contains 12,005 rows. Indexed access is the learning objective, not a claim about elapsed execution time.'],
  tables: ['market_query_log'], stateQueries: ['SELECT * FROM market_query_log'],
  hints: ['Place equality keys before the range key in the composite index.', 'Compare the stored ISO timestamp directly with the lower and upper bounds.'],
  solution: lookupIndex + lookup,
  equivalent: [lookupIndex.replace('purchase_lookup','another_name') + `WITH found AS (${lookup}) SELECT * FROM found ORDER BY event_at,id`, lookupIndex + lookup.replace("shopper_id=42", "42=shopper_id")],
  explanation: 'The two equality keys narrow the index prefix, then event_at bounds a contiguous range. The exclusive next-day boundary excludes midnight on January 5. Checks inspect the index column order and use EXPLAIN QUERY PLAN to check your final SELECT with both the sample data and different data.',
  planValidation: { indexes: [{ id: 'purchase lookup', table: 'market_query_log', columns: ['shopper_id','event_kind','event_at'] }], access: [{ index: 'purchase lookup', strategy: 'search' }] },
  wrong: [
    { sql: lookup, mistake: 'Returns the right rows without creating the required index.' },
    { sql: lookupIndex.replace('shopper_id,event_kind,event_at','shopper_id,event_at,event_kind') + lookup, mistake: 'Puts the range key before the second equality key.' },
    { sql: lookupIndex + lookup.replace('FROM market_query_log','FROM market_query_log NOT INDEXED'), mistake: 'Creates the index but scans the table instead of using it.' },
    { sql: lookupIndex + lookup.replace("event_at<'2025-01-05", "event_at<='2025-01-05"), mistake: 'Includes the next day at midnight.' },
  ],
}];

const optContext = {
  version: 1, prerequisites: [66,67,68], datasetId: 'market', mode: 'lab' as const,
  setupSql: optimizationFixture, extraMutation: optimizationMutation,
  tables: ['market_query_log'], stateQueries: ['SELECT * FROM market_query_log'], ordered: true,
};
const coveringQuery = `SELECT event_at,amount FROM market_query_log WHERE shopper_id=7
AND event_at>='2025-01-04 00:00:00' AND event_at<'2025-01-05 00:00:00' ORDER BY event_at,amount`;
const coveringIndex = 'CREATE INDEX covered ON market_query_log(shopper_id,event_at,amount);';
const rangeQuery = `SELECT id,event_at,amount FROM market_query_log
WHERE event_at>='2025-01-04 00:00:00' AND event_at<'2025-01-05 00:00:00' ORDER BY event_at,id`;
const rangeIndex = 'CREATE INDEX event_time ON market_query_log(event_at);';
const topQuery = 'SELECT id,amount FROM market_query_log WHERE shopper_id=5 ORDER BY amount DESC,id DESC LIMIT 8';
const topIndex = 'CREATE INDEX ranked ON market_query_log(shopper_id,amount,id);';
optimizationQuestions.push({
  ...optContext, id: 'qb-0050', slug: 'cover-the-event-export', title: 'Cover the event export', difficulty: 'hard',
  difficultyWhy: 'Separate filter keys from payload columns and demonstrate covering access while preserving a time boundary.',
  primaryTopic: 'optimization.indexes', topicTags: ['optimization.plans'],
  objective: 'Build an index that supplies the selected payload without a table lookup.',
  task: 'Export event_at and amount for shopper 7 on January 4, 2025. Create a full index with exactly (shopper_id, event_at, amount) and make the final query use a covering indexed search.',
  columns: ['event_at','amount'],
  rules: ['Use the half-open interval [2025-01-04 00:00:00, 2025-01-05 00:00:00). Order by event_at then amount, ascending.', 'Choose any index name. Keep the source data unchanged. This task checks covering access, not execution time.'],
  hints: ['An index can return values stored in its key columns without fetching the table row.', 'Keep the equality key first, the range key second, and the exported amount last.'],
  solution: coveringIndex + coveringQuery,
  equivalent: [coveringIndex.replace('covered','my_cover') + coveringQuery.replace('shopper_id=7','shopper_id IN (7)')],
  explanation: 'The index constrains the shopper and timestamp range and contains amount as payload. SQLite can satisfy both output columns from the index. Selecting an extra unindexed column would require a table lookup.',
  planValidation: { indexes: [{ id: 'event export', table: 'market_query_log', columns: ['shopper_id','event_at','amount'] }], access: [{ index: 'event export', strategy: 'covering-search' }] },
  wrong: [
    { sql: coveringIndex.replace('shopper_id,event_at,amount','shopper_id,event_at') + coveringQuery, mistake: 'Omits the payload column from the index.' },
    { sql: coveringIndex + coveringQuery.replace('FROM market_query_log','FROM market_query_log NOT INDEXED'), mistake: 'Does not use the covering index.' },
  ],
}, {
  ...optContext, id: 'qb-0051', slug: 'sargable-event-day', title: 'Make the event-day filter SARGable', difficulty: 'medium',
  difficultyWhy: 'Rewrite a function-wrapped timestamp predicate as a half-open range and verify the resulting access.',
  primaryTopic: 'optimization.plans', topicTags: ['dates.filter'],
  objective: 'Preserve day-filter semantics while enabling a timestamp index search.',
  task: "The starting approach is SELECT id,event_at,amount FROM market_query_log WHERE date(event_at)='2025-01-04' ORDER BY event_at,id. Rewrite the filter, create a full index on exactly (event_at), and return the same rows using an indexed search.",
  columns: ['id','event_at','amount'],
  rules: ['Timestamps are normalized UTC ISO strings. Include midnight on January 4, exclude midnight on January 5.', 'Order by event_at then id ascending. Do not change source rows or use an expression index.'],
  hints: ['Wrapping the indexed column in date() prevents a normal timestamp range search.', 'Compare event_at itself to the start of the day and the start of the next day.'],
  solution: rangeIndex + rangeQuery,
  equivalent: [rangeIndex + rangeQuery.replace("event_at>='2025-01-04 00:00:00'", "'2025-01-04 00:00:00'<=event_at")],
  explanation: 'Lexicographic order matches chronological order for these normalized timestamps. Direct bounds expose the index range; a date() call on every value can return correct rows while failing this access objective.',
  planValidation: { indexes: [{ id: 'timestamp range', table: 'market_query_log', columns: ['event_at'] }], access: [{ index: 'timestamp range', strategy: 'search' }] },
  wrong: [
    { sql: rangeIndex + rangeQuery.replace("event_at>='2025-01-04 00:00:00' AND event_at<'2025-01-05 00:00:00'", "date(event_at)='2025-01-04'"), mistake: 'Leaves a function on the indexed column: correct output, wrong access.' },
    { sql: rangeIndex + rangeQuery.replace("event_at<'2025-01-05", "event_at<='2025-01-05"), mistake: 'Includes next-day midnight.' },
  ],
}, {
  ...optContext, id: 'qb-0052', slug: 'top-events-without-a-sort', title: 'Top events without a temporary sort', difficulty: 'hard',
  difficultyWhy: 'Align equality filtering, two descending sort keys and a deterministic top-N boundary with index traversal.',
  primaryTopic: 'optimization.plans', topicTags: ['basics.order-by','windows.top-n'],
  objective: 'Use reverse index traversal to satisfy a tie-broken top-N request without a temporary B-tree.',
  task: 'Return the eight highest-amount events for shopper 5, breaking ties by larger id first. Build a full index with exactly (shopper_id, amount, id). Require an indexed search and no temporary sorting B-tree in the final plan.',
  columns: ['id','amount'],
  rules: ['Order by amount DESC, id DESC, limit 8. Keep source rows unchanged.', 'This exercise expressly requires avoiding temporary sorting; no general speed claim is made.'],
  hints: ['The shopper equality selects one contiguous prefix.', 'SQLite can read an ascending index backwards when both requested sort directions are reversed together.'],
  solution: topIndex + topQuery,
  equivalent: [topIndex.replace('ranked','reverse_walk') + topQuery.replace('shopper_id=5','5=shopper_id')],
  explanation: 'Fixing shopper_id leaves amount and id in index order. Reading that range backwards supplies both descending keys and permits the LIMIT without building a temporary sort. The id key makes ties deterministic.',
  planValidation: { indexes: [{ id: 'top events', table: 'market_query_log', columns: ['shopper_id','amount','id'] }], access: [{ index: 'top events', strategy: 'search' }], noTempSort: true },
  wrong: [
    { sql: topIndex + topQuery.replace('ORDER BY amount DESC','ORDER BY amount+0 DESC'), mistake: 'Computes the sort key and forces a temporary sort despite correct output.' },
    { sql: topIndex + topQuery.replace('id DESC LIMIT','id ASC LIMIT'), mistake: 'Uses the wrong tie-break direction.' },
  ],
});

export const expansionQuestions: BankQuestion[] = [...optimizationQuestions, ...funnelQuestions, ...engineeringQuestions, ...relationshipQuestions, ...textQuestions, ...caseStudyQuestions];
