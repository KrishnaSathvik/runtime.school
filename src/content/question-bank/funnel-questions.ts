import type { BankQuestion } from './types';
import { canonicalEvents, sessions, after, funnelPairs, eventRules, sessionRules } from './event-queries';
const context = { version: 1, datasetId: 'market', mode: 'query' as const, tables: ['market_web_events'], ordered: true, prerequisites: [20,21,24,48] };
const orderedCarts = `${canonicalEvents}
SELECT DISTINCT v.shopper_id,v.cart_id FROM events v
JOIN events c ON c.shopper_id=v.shopper_id AND c.cart_id=v.cart_id AND c.event_type='checkout' AND ${after('c','v')}
JOIN events p ON p.shopper_id=v.shopper_id AND p.cart_id=v.cart_id AND p.event_type='purchase' AND ${after('p','c')}
WHERE v.event_type='view' AND unixepoch(p.occurred_at)-unixepoch(v.occurred_at)<=1800
ORDER BY v.shopper_id,v.cart_id`;
const abandoned = `${canonicalEvents}
SELECT c.id AS checkout_id,c.shopper_id,c.cart_id,datetime(c.occurred_at,'+30 minutes') AS deadline
FROM events c WHERE c.event_type='checkout' AND NOT EXISTS(
 SELECT 1 FROM events p WHERE p.shopper_id=c.shopper_id AND p.cart_id=c.cart_id
 AND p.event_type='purchase' AND ${after('p','c')}
 AND unixepoch(p.occurred_at)-unixepoch(c.occurred_at)<=1800)
ORDER BY checkout_id`;
const retries = `${canonicalEvents}
SELECT e.event_key,e.id AS canonical_id,e.event_type AS canonical_type,COUNT(r.id)-1 AS retry_count
FROM events e JOIN market_web_events r ON r.event_key=e.event_key
GROUP BY e.event_key,e.id,e.event_type HAVING COUNT(r.id)>1 ORDER BY e.event_key`;
const boundaries = `${sessions} SELECT shopper_id,id AS event_id,session_no FROM session_events ORDER BY shopper_id,occurred_at,id`;
const conversion = `${sessions}${funnelPairs}
SELECT s.channel,COUNT(*) AS sessions,COUNT(c.session_no) AS converted_sessions,
ROUND(100.0*COUNT(c.session_no)/COUNT(*),2) AS conversion_pct
FROM session_list s LEFT JOIN converted c ON c.shopper_id=s.shopper_id AND c.session_no=s.session_no
GROUP BY s.channel ORDER BY s.channel`;
export const funnelQuestions: BankQuestion[] = [{
 ...context,id:'qb-0053',slug:'ordered-cart-funnel',title:'Find a truly ordered cart funnel',difficulty:'hard',
 difficultyWhy:'Reason about a three-step sequence, same-cart identity, retry deduplication and an inclusive time limit.',primaryTopic:'analytics.conversion',topicTags:['dates.sessions','joins.self'],
 objective:'Distinguish an ordered funnel from the mere presence of three event types.',
 task:'Find every shopper/cart pair with a view followed by checkout followed by purchase, all for that cart, where purchase occurs within 30 minutes of the view. Return each qualifying pair once.',
 columns:['shopper_id','cart_id'],rules:[...eventRules,'The 30-minute limit is inclusive. No session boundary rule is used for this question. Order by shopper_id, cart_id.'],
 hints:['Join canonical events three times on both shopper and cart.', 'Use the total order for each step and bound purchase time relative to view time.'],solution:orderedCarts,
 equivalent:[orderedCarts.replace('SELECT DISTINCT v.shopper_id,v.cart_id','SELECT v.shopper_id,v.cart_id').replace('ORDER BY v.shopper_id,v.cart_id','GROUP BY v.shopper_id,v.cart_id ORDER BY v.shopper_id,v.cart_id')],
 explanation:'A cart can contain all three event types in the wrong order. Matching identities, ordered step predicates and a bounded view-to-purchase duration establish a real qualifying path. DISTINCT removes multiple valid paths for one cart.',
 wrong:[{sql:`${canonicalEvents} SELECT shopper_id,cart_id FROM events GROUP BY shopper_id,cart_id HAVING COUNT(DISTINCT CASE WHEN event_type IN ('view','checkout','purchase') THEN event_type END)=3 ORDER BY shopper_id,cart_id`,mistake:'Counts event types without respecting order or duration.'},{sql:orderedCarts.replace('<=1800','<1800'),mistake:'Rejects a conversion exactly 30 minutes after its view.'}],
},{
 ...context,id:'qb-0054',slug:'abandoned-checkout-attempts',title:'Identify abandoned checkout attempts',difficulty:'medium',
 difficultyWhy:'Use a same-cart anti-join with a temporal deadline and distinguish attempts from shoppers.',primaryTopic:'analytics.conversion',topicTags:['joins.anti','dates.diff'],
 objective:'Find checkout attempts without a timely later purchase of the same cart.',
 task:'At the fixed observation cutoff 2025-05-03 00:00:00, list each canonical checkout that had no later purchase of the same cart within 30 minutes. Return checkout_id, shopper_id, cart_id and its deadline.',
 columns:['checkout_id','shopper_id','cart_id','deadline'],rules:[...eventRules,'All provided checkout deadlines are before the observation cutoff. A purchase at the deadline counts as timely. Different checkout keys are separate attempts even if timestamps match. Order by checkout_id.'],
 hints:['Start from checkout rows, then rule out a qualifying purchase with NOT EXISTS.', 'A purchase for a different cart must not rescue this attempt.'],solution:abandoned,
 explanation:'NOT EXISTS preserves one row per canonical checkout and avoids multiplying attempts by purchases. The deadline is per attempt; a purchase in a later session can still be timely if it is within the stated window.',
 wrong:[{sql:abandoned.replace(/p.cart_id=c.cart_id\s+AND/, ''),mistake:'Lets a purchase of a different cart rescue checkout.'},{sql:abandoned.replace('AND unixepoch(p.occurred_at)-unixepoch(c.occurred_at)<=1800',''),mistake:'Treats a much later recovery as a timely conversion.'}],
},{
 ...context,id:'qb-0055',slug:'canonical-event-retries',title:'Audit conflicting event retries',difficulty:'medium',
 difficultyWhy:'Select a canonical row while retaining multiplicity and detecting retries with conflicting payload.',primaryTopic:'cleaning.dedupe',topicTags:['windows.row-number','analytics.conversion'],
 objective:'Separate logical event identity from ingestion row identity.',
 task:'Report only retried event keys. Return event_key, the smallest id as canonical_id, the event_type from that canonical row as canonical_type, and the number of additional ingestion rows as retry_count.',
 columns:['event_key','canonical_id','canonical_type','retry_count'],rules:[...eventRules,'Count all retry rows even when their payload differs. Order by event_key.'],
 hints:['Rank ingestion rows within event_key by id.', 'Do not use MIN(event_type): the canonical type belongs to the minimum-id row.'],solution:retries,
 explanation:'Deduplication chooses one entire row, not independent minima for each field. Joining the canonical row back to its ingestion group gives the retry count while retaining its authoritative event type.',
 wrong:[{sql:`SELECT event_key,MIN(id) AS canonical_id,MIN(event_type) AS canonical_type,COUNT(*)-1 AS retry_count FROM market_web_events GROUP BY event_key HAVING COUNT(*)>1 ORDER BY event_key`,mistake:'Takes the smallest event type rather than the canonical row payload.'},{sql:retries.replace('COUNT(r.id)-1 AS retry_count','COUNT(r.id) AS retry_count'),mistake:'Counts the original event as a retry.'}],
},{
 ...context,id:'qb-0056',slug:'session-boundaries-with-retries',title:'Sessionize retries and exact boundaries',difficulty:'hard',
 difficultyWhy:'Deduplicate before LAG, flag strict inactivity boundaries and use a row-based running sum with deterministic ties.',primaryTopic:'dates.sessions',topicTags:['windows.lag-lead','windows.running','cleaning.dedupe'],
 objective:'Build stable session identifiers from canonical events and inactivity gaps.',
 task:'Assign each canonical website event a session_no for its shopper. Return shopper_id, event_id and session_no, in shopper and event order.',
 columns:['shopper_id','event_id','session_no'],rules:[...sessionRules,'Order by shopper_id, occurred_at, id; occurred_at is only a sort key, not an output column.'],
 hints:['Deduplicate before computing the previous event timestamp.', 'Flag the first event and gaps greater than 1800 seconds; cumulatively sum the flag with a ROWS frame.'],solution:boundaries,
 equivalent:[boundaries.replace('unixepoch(occurred_at)-unixepoch(previous_at)>1800', "occurred_at>datetime(previous_at,'+30 minutes')")],
 explanation:'Retry rows are not new activity. LAG measures inactivity between canonical events, and a running sum converts boundary flags into stable per-shopper session numbers. An exact 30-minute gap remains in the session.',
 wrong:[{sql:boundaries.replace('>1800','>=1800'),mistake:'Starts a new session at exactly 30 minutes.'},{sql:boundaries.replace('WHERE retry_rank=1','WHERE retry_rank>=1'),mistake:'Includes retries as additional events.'}],
},{
 ...context,id:'qb-0057',slug:'session-conversion-by-first-touch',title:'Attribute session conversion to first touch',difficulty:'hard',
 difficultyWhy:'Combine sessionization, first-touch attribution and an ordered same-cart funnel without counting event rows as sessions.',primaryTopic:'analytics.conversion',topicTags:['dates.sessions','windows.row-number'],
 objective:'Measure session-level conversion using a deterministic acquisition channel.',
 task:'For each first-touch channel, count sessions and converted_sessions, then return conversion_pct rounded to two decimals. A converted session contains an ordered view → checkout → purchase of the same cart within that session.',
 columns:['channel','sessions','converted_sessions','conversion_pct'],rules:[...sessionRules,'Attribute the whole session to the channel of its first event. Conversion is binary per session, regardless of how many carts convert. There is no additional view-to-purchase time limit. Include zero-conversion channels. Order by channel.'],
 hints:['Make one session_list row per session and one converted row per successful session before joining.', 'Take the channel from the first event, not the purchase event.'],solution:conversion,
 explanation:'Session and conversion tables each have one row per shopper/session, preventing retry and cart fan-out. First-touch attribution stays fixed even when a purchase arrives through direct traffic.',
 wrong:[{sql:conversion.replace('SELECT DISTINCT shopper_id,session_no FROM funnel_pairs','SELECT shopper_id,session_no FROM funnel_pairs UNION ALL SELECT shopper_id,session_no FROM funnel_pairs'),mistake:'Counts successful paths instead of binary converted sessions.'},{sql:conversion.replace('100.0*COUNT(c.session_no)','100*COUNT(c.session_no)'),mistake:'Truncates the rate with integer division.'}],
}];
