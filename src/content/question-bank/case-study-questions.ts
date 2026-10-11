import type { BankQuestion } from './types';
import { sessions, funnelPairs, after, sessionRules } from './event-queries';
const context = {version:1,datasetId:'market',mode:'query' as const,ordered:true,tables:['market_web_events'],prerequisites:[20,21,24,46,48]};
const caseStudy=(stage:number)=>({id:'harbor-checkout-review',title:'Harbor Market: checkout reliability',stage,total:5});
const independent = 'This stage starts from the original event tables in a fresh database. Recompute any intermediate results; nothing is carried over from earlier stages.';
const conversionRule='A converted session has a view → checkout → purchase in that order, with all three events for the same shopper/cart within the session. Use the total event order. No extra view-to-purchase time limit applies.';
const baseline = `${sessions}
SELECT date(started_at) AS session_date,COUNT(*) AS sessions,COUNT(DISTINCT shopper_id) AS shoppers,
SUM(CASE WHEN session_no>1 THEN 1 ELSE 0 END) AS returning_sessions
FROM session_list GROUP BY date(started_at) ORDER BY session_date`;
const dropoff = `${sessions}${funnelPairs}, viewed AS (
SELECT DISTINCT shopper_id,session_no FROM session_events WHERE event_type='view'), checked_out AS (
SELECT DISTINCT c.shopper_id,c.session_no FROM session_events c WHERE c.event_type='checkout' AND EXISTS(
SELECT 1 FROM session_events v WHERE v.shopper_id=c.shopper_id AND v.session_no=c.session_no AND v.cart_id=c.cart_id AND v.event_type='view' AND ${after('c','v')})),
stages AS (SELECT 1 AS stage_no,'view' AS stage,COUNT(*) AS sessions FROM viewed
UNION ALL SELECT 2,'checkout',COUNT(*) FROM checked_out UNION ALL SELECT 3,'purchase',COUNT(*) FROM converted)
SELECT stage_no,stage,sessions,LAG(sessions) OVER(ORDER BY stage_no)-sessions AS dropoff FROM stages ORDER BY stage_no`;
const delays = `${sessions}${funnelPairs}, chosen AS (
SELECT *,ROW_NUMBER() OVER(PARTITION BY shopper_id,session_no ORDER BY purchase_at,purchase_id,checkout_at DESC,checkout_id DESC) AS rn FROM funnel_pairs),
times AS (SELECT s.channel,ch.shopper_id,ch.session_no,unixepoch(ch.purchase_at)-unixepoch(ch.checkout_at) AS seconds
FROM chosen ch JOIN session_list s ON s.shopper_id=ch.shopper_id AND s.session_no=ch.session_no WHERE ch.rn=1),
ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY channel ORDER BY seconds,shopper_id,session_no) AS rank,
COUNT(*) OVER(PARTITION BY channel) AS n FROM times)
SELECT channel,COUNT(*) AS converted_sessions,ROUND(AVG(seconds),2) AS avg_seconds,
MAX(CASE WHEN rank=(9*n+9)/10 THEN seconds END) AS p90_seconds FROM ranked GROUP BY channel ORDER BY channel`;
const recoveryCTEs = `${sessions}${funnelPairs}, abandoned AS (
SELECT DISTINCT c.shopper_id,c.session_no FROM session_events c WHERE c.event_type='checkout'
AND NOT EXISTS(SELECT 1 FROM converted v WHERE v.shopper_id=c.shopper_id AND v.session_no=c.session_no)),
recovery_candidates AS (
SELECT c.shopper_id,c.session_no AS abandoned_session,p.session_no AS recovery_session,
unixepoch(p.occurred_at)-unixepoch(c.occurred_at) AS seconds,
ROW_NUMBER() OVER(PARTITION BY c.shopper_id,c.session_no ORDER BY p.occurred_at,p.id,c.occurred_at DESC,c.id DESC) AS rn
FROM session_events c JOIN abandoned a ON a.shopper_id=c.shopper_id AND a.session_no=c.session_no
JOIN session_events p ON p.shopper_id=c.shopper_id AND p.cart_id=c.cart_id AND p.event_type='purchase'
AND p.session_no>c.session_no AND unixepoch(p.occurred_at)-unixepoch(c.occurred_at)<=86400
WHERE c.event_type='checkout'), recovered AS (SELECT * FROM recovery_candidates WHERE rn=1)`;
const recovery = `${recoveryCTEs} SELECT shopper_id,abandoned_session,recovery_session,ROUND(seconds/60.0,2) AS recovery_minutes
FROM recovered ORDER BY shopper_id,abandoned_session`;
const priorities = `${recoveryCTEs}, channel_counts AS (
SELECT s.channel,COUNT(*) AS sessions,COUNT(a.session_no) AS abandoned_sessions,
COUNT(r.abandoned_session) AS recovered_sessions,COUNT(a.session_no)-COUNT(r.abandoned_session) AS unrecovered_sessions
FROM session_list s LEFT JOIN abandoned a ON a.shopper_id=s.shopper_id AND a.session_no=s.session_no
LEFT JOIN recovered r ON r.shopper_id=s.shopper_id AND r.abandoned_session=s.session_no GROUP BY s.channel)
SELECT channel,sessions,abandoned_sessions,recovered_sessions,unrecovered_sessions,
DENSE_RANK() OVER(ORDER BY unrecovered_sessions DESC) AS priority_rank FROM channel_counts ORDER BY priority_rank,channel`;
export const caseStudyQuestions: BankQuestion[]=[{
 ...context,id:'qb-0067',slug:'checkout-case-session-baseline',title:'Checkout review 1: establish the baseline',caseStudy:caseStudy(1),difficulty:'medium',primaryTopic:'analytics.active-users',topicTags:['dates.sessions','dates.buckets'],
 difficultyWhy:'Aggregate at session grain, assign cross-midnight sessions to their start day, and distinguish sessions from shoppers.',
 objective:'Establish the daily population before interpreting checkout performance.',
 task:'Harbor Market is investigating checkout reliability. First build a daily session baseline: session_date, sessions, distinct shoppers and returning_sessions. A returning session is any session numbered greater than 1 for that shopper in this observation dataset.',
 columns:['session_date','sessions','shoppers','returning_sessions'],rules:[independent,...sessionRules,'Assign the whole session to the UTC date of its first event, even if it crosses midnight. Order by session_date.'],
 hints:['Build one row per shopper/session before grouping by start date.', 'Returning means a later session in this dataset, not whether the shopper registered earlier.'],solution:baseline,
 explanation:'A correct denominator counts sessions rather than events or people. Start-date attribution prevents a midnight-spanning session from being counted on two days; returning_sessions captures repeat visits inside this fixed observation window.',
 wrong:[{sql:baseline.replace('COUNT(*) AS sessions','COUNT(DISTINCT shopper_id) AS sessions'),mistake:'Counts people instead of sessions.'},{sql:baseline.replace('session_no>1','session_no>=1'),mistake:'Labels every first observed session as returning.'}],
},{
 ...context,id:'qb-0068',slug:'checkout-case-funnel-dropoff',title:'Checkout review 2: locate funnel drop-off',caseStudy:caseStudy(2),difficulty:'hard',primaryTopic:'analytics.conversion',topicTags:['dates.sessions','windows.lag-lead'],
 difficultyWhy:'Build nested ordered-funnel populations before calculating stage-to-stage losses.',objective:'Diagnose the funnel stage at which eligible sessions stop progressing.',
 task:'Continue the checkout review by returning three rows: view, checkout and purchase. Count sessions reaching each ordered stage. Return stage_no (1–3), stage, sessions and dropoff from the preceding stage.',
 columns:['stage_no','stage','sessions','dropoff'],rules:[independent,...sessionRules,conversionRule,'View requires any view. Checkout requires an earlier same-cart view. Purchase requires the full ordered funnel. Count a session at most once per stage.', 'dropoff is previous-stage sessions minus current-stage sessions; use NULL for view. Order by stage_no.'],
 hints:['Produce separate one-row-per-session sets for each reached stage.', 'Union their counts into three rows, then use LAG to calculate losses.'],solution:dropoff,
 explanation:'Stage populations must be nested. A checkout before any qualifying view does not reach the checkout stage. Comparing these populations shows where sessions stop, rather than mistaking an unordered event inventory for a funnel.',
 wrong:[{sql:dropoff.replace(after('c','v'),'1=1'),mistake:'Accepts a view that occurs after checkout in the conversion path.'},{sql:dropoff.replace('LAG(sessions) OVER(ORDER BY stage_no)-sessions','sessions-LAG(sessions) OVER(ORDER BY stage_no)'),mistake:'Reverses stage losses into negative values.'}],
},{
 ...context,id:'qb-0069',slug:'checkout-case-delay-tail',title:'Checkout review 3: measure the delay tail',caseStudy:caseStudy(3),difficulty:'hard',primaryTopic:'analytics.statistics',topicTags:['windows.row-number','dates.diff'],
 difficultyWhy:'Choose a deterministic successful attempt per session and calculate a discrete percentile at the correct grain.',objective:'Measure checkout latency without weighting sessions by repeated attempts.',
 task:'For each first-touch channel with converted sessions, report converted_sessions, avg_seconds from checkout to purchase rounded to two decimals, and the nearest-rank p90_seconds.',
 columns:['channel','converted_sessions','avg_seconds','p90_seconds'],rules:[independent,...sessionRules,conversionRule,'Within a session choose the earliest qualifying purchase in total event order. For that purchase choose the latest preceding same-cart checkout that has an earlier same-cart view in the session.', 'Measure elapsed seconds from that checkout to purchase. Attribute to the session’s first-event channel. For n sessions, nearest-rank p90 is the sorted value at ceil(0.9*n), one-based. Include no unconverted sessions; order by channel.'],
 hints:['Rank qualifying checkout/purchase pairs before computing any channel averages.', 'Use ROW_NUMBER and COUNT per channel; the integer expression (9*n+9)/10 computes the nearest-rank position.'],solution:delays,
 explanation:'Selecting one successful attempt per session keeps retries from biasing the statistics. The average describes typical delay, while a discrete p90 exposes the slower end without assuming interpolation or continuous percentiles.',
 wrong:[{sql:delays.replace('checkout_at DESC,checkout_id DESC','checkout_at,checkout_id'),mistake:'Uses the first rather than the last eligible checkout before the chosen purchase.'},{sql:delays.replace('unixepoch(ch.checkout_at)','unixepoch(s.started_at)'),mistake:'Measures from session start instead of the selected checkout.'},{sql:delays.replace('rank=(9*n+9)/10','rank=1'),mistake:'Reports the fastest session as the 90th percentile.'}],
},{
 ...context,id:'qb-0070',slug:'checkout-case-later-recovery',title:'Checkout review 4: find later recoveries',caseStudy:caseStudy(4),difficulty:'hard',primaryTopic:'analytics.retention',topicTags:['dates.sessions','joins.self'],
 difficultyWhy:'Link abandoned sessions to a later same-cart purchase within a bounded window without multiplying attempts.',objective:'Distinguish same-session conversion from later recovery.',
 task:'An abandoned session contains checkout but no full ordered conversion. Find abandoned sessions with a same-cart purchase in a strictly later session within 24 hours of a checkout in the abandoned session. Return shopper_id, abandoned_session, recovery_session and recovery_minutes.',
 columns:['shopper_id','abandoned_session','recovery_session','recovery_minutes'],rules:[independent,...sessionRules,conversionRule,'A recovery needs a purchase only; the later session need not repeat the view/checkout funnel. Match shopper and cart. The 24-hour bound is inclusive.', 'Choose the earliest qualifying later purchase per abandoned session, then the latest qualifying checkout for that purchase. Return one row per recovered abandoned session, rounded minutes to two decimals, ordered by shopper_id,abandoned_session.'],
 hints:['Derive abandoned session identities before joining checkout and later purchase events.', 'Rank recovery candidates per abandoned session to retain one earliest recovery.'],solution:recovery,
 explanation:'An abandoned session may still lead to a sale after the inactivity boundary. Matching cart identity and bounding checkout-to-purchase time prevents unrelated later purchases from being credited as recovery.',
 wrong:[{sql:recovery.replace('p.session_no>c.session_no','p.session_no>=c.session_no'),mistake:'Calls a same-session unordered purchase a later recovery.'},{sql:recovery.replace('<=86400','<=43200'),mistake:'Uses a 12-hour recovery window instead of 24 hours.'}],
},{
 ...context,id:'qb-0071',slug:'checkout-case-channel-priorities',title:'Checkout review 5: prioritize channel fixes',caseStudy:caseStudy(5),difficulty:'hard',primaryTopic:'analytics.segmentation',topicTags:['analytics.retention','windows.rank','joins.fan-out'],
 difficultyWhy:'Reconcile session, abandonment and recovery populations before ranking unresolved losses with shared ranks for ties.',objective:'Translate the connected review into a channel-level prioritization table.',
 task:'Prioritize channels by unrecovered abandoned sessions. For each session’s first-touch channel, return sessions, abandoned_sessions, recovered_sessions, unrecovered_sessions and priority_rank.',
 columns:['channel','sessions','abandoned_sessions','recovered_sessions','unrecovered_sessions','priority_rank'],rules:[independent,...sessionRules,conversionRule,'Abandoned means the session has checkout but no full ordered conversion. Recovered means it has a same-cart purchase in a strictly later session within 24 hours (inclusive) of any checkout in the abandoned session.', 'Count each abandoned session at most once in recovery, even with several purchases. unrecovered_sessions = abandoned_sessions − recovered_sessions.', 'Keep all first-touch channels, including zeros. Use dense descending rank of unrecovered_sessions, with ties sharing rank. Order by priority_rank, then channel.'],
 hints:['Join one-row-per-session abandonment and recovery sets to the session baseline.', 'Aggregate counts by first-touch channel, then rank the aggregated unresolved counts.'],solution:priorities,
 explanation:'The final table reconciles the baseline with abandonment and later recovery instead of treating all abandoned sessions as permanently lost. Dense ranking preserves equal priority for tied unresolved counts; it is an analytical triage rule, not proof of causation.',
 wrong:[{sql:priorities.replace('COUNT(a.session_no)-COUNT(r.abandoned_session) AS unrecovered_sessions','COUNT(a.session_no) AS unrecovered_sessions'),mistake:'Treats all abandoned sessions as unrecovered.'},{sql:priorities.replace('DENSE_RANK() OVER(ORDER BY unrecovered_sessions DESC)','ROW_NUMBER() OVER(ORDER BY unrecovered_sessions DESC,channel)'),mistake:'Assigns different priorities to tied unresolved counts.'}],
}];
