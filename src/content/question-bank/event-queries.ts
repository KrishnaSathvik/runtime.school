/** Shared authored SQL fragments; every exercise recomputes them in its own fresh DB. */
export const canonicalEvents = `WITH ranked_events AS (
 SELECT *,ROW_NUMBER() OVER(PARTITION BY event_key ORDER BY id) AS retry_rank
 FROM market_web_events
), events AS (SELECT * FROM ranked_events WHERE retry_rank=1)`;
export const sessions = `${canonicalEvents}, previous_events AS (
 SELECT *,LAG(occurred_at) OVER(PARTITION BY shopper_id ORDER BY occurred_at,id) AS previous_at FROM events
), marked AS (
 SELECT *,CASE WHEN previous_at IS NULL OR unixepoch(occurred_at)-unixepoch(previous_at)>1800 THEN 1 ELSE 0 END AS starts_session FROM previous_events
), session_events AS (
 SELECT *,SUM(starts_session) OVER(PARTITION BY shopper_id ORDER BY occurred_at,id ROWS UNBOUNDED PRECEDING) AS session_no FROM marked
), positioned AS (
 SELECT *,ROW_NUMBER() OVER(PARTITION BY shopper_id,session_no ORDER BY occurred_at,id) AS position FROM session_events
), session_list AS (
 SELECT shopper_id,session_no,occurred_at AS started_at,channel FROM positioned WHERE position=1
)`;
export const after = (later: string, earlier: string) => `(${later}.occurred_at>${earlier}.occurred_at OR (${later}.occurred_at=${earlier}.occurred_at AND ${later}.id>${earlier}.id))`;
export const funnelPairs = `, funnel_pairs AS (
 SELECT c.shopper_id,c.session_no,c.cart_id,c.id AS checkout_id,c.occurred_at AS checkout_at,
        p.id AS purchase_id,p.occurred_at AS purchase_at
 FROM session_events c JOIN session_events p ON p.shopper_id=c.shopper_id AND p.session_no=c.session_no
 AND p.cart_id=c.cart_id AND p.event_type='purchase' AND ${after('p','c')}
 WHERE c.event_type='checkout' AND EXISTS(
 SELECT 1 FROM session_events v WHERE v.shopper_id=c.shopper_id AND v.session_no=c.session_no
 AND v.cart_id=c.cart_id AND v.event_type='view' AND ${after('c','v')})
), converted AS (SELECT DISTINCT shopper_id,session_no FROM funnel_pairs)`;
export const eventRules = [
  'Deduplicate globally by event_key, keeping the smallest id; a retry may have a conflicting payload.',
  'Use (occurred_at, id) as the total event order; equal timestamps follow id order. All times are UTC.',
];
export const sessionRules = [...eventRules,
  'A shopper starts a session at the first canonical event or after a gap strictly greater than 30 minutes from their previous canonical event. Exactly 30 minutes stays in the same session; midnight alone does not split it.',
  'Session numbers start at 1 per shopper and include every event type, including heartbeat and purchase-only sessions.',
];
