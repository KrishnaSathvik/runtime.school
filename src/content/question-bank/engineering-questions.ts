import type { BankQuestion } from './types';
const context = { version: 1, datasetId: 'market', mode: 'lab' as const, difficulty: 'hard' as const, ordered: true };
const latest = `WITH ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY external_id ORDER BY version DESC,id DESC) AS rn FROM market_load_feed)`;
const ledgerExpected = `${latest} SELECT external_id,version,amount FROM ranked WHERE rn=1 AND external_id<>'Z' UNION ALL SELECT 'Z',9,90`;
const load = `${latest} INSERT INTO market_ledger(external_id,version,amount)
SELECT external_id,version,amount FROM ranked WHERE rn=1
ON CONFLICT(external_id) DO UPDATE SET version=excluded.version,amount=excluded.amount
WHERE excluded.version>=market_ledger.version;
SELECT external_id,version,amount FROM market_ledger ORDER BY external_id;`;
function stateChecks(actual: string, expected: string) {
 return [
  { sql: `SELECT COUNT(*) FROM (${actual} EXCEPT SELECT * FROM (${expected}))`, value: 0 },
  { sql: `SELECT COUNT(*) FROM (SELECT * FROM (${expected}) EXCEPT ${actual})`, value: 0 },
 ];
}
const validReservations = `WITH eligible AS (
SELECT f.*,ROW_NUMBER() OVER(PARTITION BY shopper_id,item_id ORDER BY f.id DESC) AS rn
FROM market_reservation_feed f WHERE typeof(quantity)='integer' AND quantity BETWEEN 1 AND 5
AND EXISTS(SELECT 1 FROM shoppers s WHERE s.id=f.shopper_id)
AND EXISTS(SELECT 1 FROM catalog_items c WHERE c.id=f.item_id))
SELECT shopper_id,item_id,quantity FROM eligible WHERE rn=1`;
const reservationsDDL = `CREATE TABLE safe_reservations(
shopper_id INTEGER NOT NULL REFERENCES shoppers(id),item_id INTEGER NOT NULL REFERENCES catalog_items(id),
quantity INTEGER NOT NULL CHECK(typeof(quantity)='integer' AND quantity BETWEEN 1 AND 5),
PRIMARY KEY(shopper_id,item_id));`;
const reservations = reservationsDDL + `INSERT INTO safe_reservations ${validReservations};
SELECT shopper_id,item_id,quantity FROM safe_reservations ORDER BY shopper_id,item_id`;
const recovery = `BEGIN;
SAVEPOINT provisional;
UPDATE market_stock SET available=available-2,reserved=reserved+2 WHERE item_id=1;
INSERT INTO market_allocation_audit VALUES('rejected',2);
ROLLBACK TO provisional;
RELEASE provisional;
UPDATE market_stock SET
available=available-COALESCE((SELECT quantity FROM market_allocation_feed f WHERE f.batch='accepted' AND f.item_id=market_stock.item_id),0),
reserved=reserved+COALESCE((SELECT quantity FROM market_allocation_feed f WHERE f.batch='accepted' AND f.item_id=market_stock.item_id),0);
INSERT INTO market_allocation_audit SELECT 'accepted',SUM(quantity) FROM market_allocation_feed WHERE batch='accepted';
COMMIT;
SELECT item_id,available,reserved FROM market_stock ORDER BY item_id;`;
const stockExpected = `SELECT s.item_id,s.capacity-COALESCE(f.quantity,0) AS available,COALESCE(f.quantity,0) AS reserved FROM market_stock s LEFT JOIN market_allocation_feed f ON f.item_id=s.item_id AND f.batch='accepted'`;
export const engineeringQuestions: BankQuestion[] = [{
 ...context,id:'qb-0058',slug:'replay-safe-ledger-load',title:'Build a replay-safe ledger load',primaryTopic:'engineering.dml',topicTags:['warehousing.incremental','windows.row-number'],
 difficultyWhy:'Resolve conflicting source versions, preserve newer target records and prove repeated execution is safe.',
 objective:'Implement an idempotent upsert that handles duplicate source versions and late stale records.',prerequisites:[59,84],tables:['market_load_feed','market_ledger'],repeatCheck:true,
 stateQueries:["SELECT * FROM market_load_feed","SELECT * FROM market_ledger"],
 task:'Merge market_load_feed into market_ledger. For each external_id choose the highest source version, breaking ties by greatest feed id. Insert missing keys and replace a target only when the source version is at least its version. Return the entire final ledger.',
 columns:['external_id','version','amount'],rules:['Do not delete target-only or newer target rows. Z starts at version 9, amount 90 and must survive its stale feed record.', 'Order by external_id. Your complete script is tested twice on the same database to check that it is safe to rerun. This is checked with both the sample data and different data.', 'The feed is immutable; do not clear it or use a one-shot marker to bypass processing.'],
 hints:['Rank feed rows before UPSERT so conflicting versions have one deterministic winner.', 'Add a WHERE condition to DO UPDATE to protect newer target versions.'],solution:load,
 equivalent:[load.replace('excluded.version>=market_ledger.version','NOT (excluded.version<market_ledger.version)')],
 explanation:'Deduplication gives one source winner per key. UPSERT preserves newer targets and applies the same values on replay, so a second execution changes neither the result nor required database state.',
 validate:[...stateChecks('SELECT external_id,version,amount FROM market_ledger',ledgerExpected),{sql:"SELECT COUNT(*) FROM market_load_feed WHERE external_id='Z' AND version=2 AND amount=999",value:1},{sql:"INSERT INTO market_ledger VALUES('X',9,999)",mustFail:true}],
 wrong:[{sql:load.replace('WHERE excluded.version>=market_ledger.version',''),mistake:'Overwrites a newer target with a stale source version.'},{sql:'CREATE TABLE load_once(x);'+load,mistake:'Works once but fails when the whole script is replayed.'},{sql:load.replace('version DESC,id DESC','version DESC,id ASC'),mistake:'Chooses the wrong source record at a tied version.'}],
},{
 ...context,id:'qb-0059',slug:'validated-reservation-boundary',title:'Enforce the reservation boundary',primaryTopic:'engineering.constraints',topicTags:['cleaning.validation','windows.row-number'],
 difficultyWhy:'Filter invalid references and storage types before deduplicating, then enforce equivalent rules for future writes.',
 objective:'Separate staging cleanup from durable relational and domain constraints.',prerequisites:[58,60,65],tables:['market_reservation_feed','shoppers','catalog_items'],
 stateQueries:['SELECT * FROM safe_reservations','SELECT * FROM market_reservation_feed','SELECT * FROM shoppers','SELECT * FROM catalog_items'],
 task:'Create safe_reservations with shopper_id, item_id and quantity. Load the latest valid feed row for each shopper/item pair, then return the loaded rows. Valid input has existing shopper and item keys and an integer-stored quantity from 1 through 5.',
 columns:['shopper_id','item_id','quantity'],rules:['Filter invalid feed rows before choosing greatest feed id per pair. A later invalid row must not suppress an earlier valid one.', 'The target must reject NULL keys, orphan keys, duplicate pairs, NULL quantity, fractional quantity and quantities outside 1–5; valid new rows must remain insertable.', 'Use a composite primary key, NOT NULL, foreign keys and a quantity CHECK including typeof(quantity). Order by shopper_id,item_id.'],
 hints:['Rank only rows that already passed type, range and parent-existence checks.', 'SQLite type affinity alone does not guarantee an integer; combine NOT NULL and a domain CHECK.'],solution:reservations,
 explanation:'Validation before deduplication prevents a bad retry from erasing a good reservation. The target constraints enforce the same boundary after the initial load. Checks try both invalid writes and a valid new write, then undo them with ROLLBACK.',
 validate:[...stateChecks('SELECT shopper_id,item_id,quantity FROM safe_reservations',validReservations),
 {sql:'INSERT INTO safe_reservations VALUES(1,1,2)',mustFail:true},
 ...['NULL,13,2','17,NULL,2','999,13,2','17,999,2','17,13,NULL','17,13,0','17,13,6','17,13,1.5'].map(v=>({sql:`INSERT INTO safe_reservations VALUES(${v})`,mustFail:true})),
 {sql:'INSERT INTO safe_reservations VALUES(17,13,3)',mustSucceed:true}],
 wrong:[{sql:reservations.replace('CHECK(typeof(quantity)=\'integer\' AND quantity BETWEEN 1 AND 5)',''),mistake:'Produces correct initial rows but accepts invalid future quantities.'},{sql:reservations.replaceAll('REFERENCES shoppers(id)','').replaceAll('REFERENCES catalog_items(id)',''),mistake:'Omits foreign keys: future orphan reservations succeed.'},{sql:reservations.replace('f.id DESC','f.id ASC'),mistake:'Loads the oldest valid row instead of the latest.'}],
},{
 ...context,id:'qb-0060',slug:'recover-a-stock-allocation',title:'Recover a failed stock allocation',primaryTopic:'engineering.transactions',topicTags:['warehousing.reconciliation'],
 difficultyWhy:'Recover both stock and audit effects of a rejected batch, preserve history and apply a valid batch atomically.',
 objective:'Verify recovery by the final state of all affected tables, not transaction keywords.',prerequisites:[61,85],tables:['market_stock','market_allocation_feed','market_allocation_audit'],
 stateQueries:['SELECT * FROM market_stock','SELECT * FROM market_allocation_feed','SELECT * FROM market_allocation_audit'],
 task:'The rejected batch cannot fit available stock: its item 2 request exceeds availability. Demonstrate recovery from a provisional reservation of 2 units of item 1 and a rejected audit entry, then apply only the accepted batch. Return item_id, available and reserved from the final stock table.',
 columns:['item_id','available','reserved'],rules:['Use a savepoint to undo the provisional stock and audit work, then commit the accepted batch. Your answer is checked by looking at the resulting tables, without requiring particular SQL keywords.', 'Every stock row starts with available=capacity and reserved=0. Preserve all capacities and the historical audit row (units=5).', 'End with one accepted audit row whose units equal the accepted feed total, no rejected audit row, and each stock balance adjusted exactly once for its accepted quantity. Order by item_id.'],
 hints:['A rollback to the savepoint must undo both provisional table changes.', 'Drive the accepted update and audit total from the feed, including items added by changed data.'],solution:recovery,
 equivalent:[recovery.replace('SAVEPOINT provisional','SAVEPOINT retry_boundary').replace('ROLLBACK TO provisional','ROLLBACK TO retry_boundary').replace('RELEASE provisional','RELEASE retry_boundary')],
 explanation:'A recoverable unit includes both inventory and audit changes. Rolling back only one leaves inconsistent state. After recovery, feed-driven updates apply the valid batch and preserve historical evidence; scalar and set-difference checks inspect both final tables.',
 validate:[...stateChecks('SELECT item_id,available,reserved FROM market_stock',stockExpected),
 ...stateChecks('SELECT item_id,capacity FROM market_stock','SELECT 1,5 UNION ALL SELECT 2,2 UNION ALL SELECT 3,9'),
 ...stateChecks('SELECT batch,units FROM market_allocation_audit',"SELECT 'historical',5 UNION ALL SELECT 'accepted',SUM(quantity) FROM market_allocation_feed WHERE batch='accepted'")],
 wrong:[{sql:recovery.replace('ROLLBACK TO provisional;',''),mistake:'Commits the rejected provisional stock and audit changes.'},{sql:recovery.replace("INSERT INTO market_allocation_audit VALUES('rejected',2);","INSERT INTO market_allocation_audit VALUES('rejected',2);").replace('COMMIT;',"INSERT INTO market_allocation_audit VALUES('rejected',2); COMMIT;"),mistake:'Returns correct stock but leaves a rejected audit artifact.'}],
}];
