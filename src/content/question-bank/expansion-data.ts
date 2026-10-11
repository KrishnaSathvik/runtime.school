/** Synthetic Harbor Market extensions. Shared schema; large plan fixtures are opt-in. */
export const expansionSeed = `
CREATE TABLE market_query_log(id INTEGER PRIMARY KEY, shopper_id INTEGER NOT NULL, event_kind TEXT NOT NULL, event_at TEXT NOT NULL, amount INTEGER NOT NULL);
CREATE TABLE market_web_events(id INTEGER PRIMARY KEY,event_key TEXT NOT NULL,shopper_id INTEGER NOT NULL REFERENCES shoppers(id),occurred_at TEXT NOT NULL,event_type TEXT NOT NULL,channel TEXT NOT NULL,cart_id TEXT);
INSERT INTO market_web_events VALUES
(1,'a1',1,'2025-05-01 09:00:00','view','email','A'),
(2,'a2',1,'2025-05-01 09:05:00','checkout','direct','A'),
(3,'a3',1,'2025-05-01 09:10:00','purchase','direct','A'),
(4,'a3',1,'2025-05-01 09:10:00','purchase','direct','A'),
(5,'b1',1,'2025-05-01 10:00:00','view','search','B'),
(6,'b2',1,'2025-05-01 10:05:00','checkout','direct','B'),
(7,'b3',1,'2025-05-01 10:35:00','heartbeat','direct','B'),
(8,'b4',1,'2025-05-01 11:05:01','view','social','B'),
(9,'c1',2,'2025-05-01 09:00:00','view','social','C'),
(10,'c2',2,'2025-05-01 09:00:00','checkout','email','C'),
(11,'c3',2,'2025-05-01 09:00:00','purchase','direct','C'),
(12,'d1',3,'2025-05-01 09:00:00','checkout','email','D'),
(13,'d2',3,'2025-05-01 09:01:00','purchase','direct','D'),
(14,'d3',3,'2025-05-01 09:02:00','view','direct','D'),
(15,'e1',4,'2025-05-01 23:50:00','view','search','E'),
(16,'e2',4,'2025-05-02 00:05:00','checkout','direct','E'),
(17,'e3',4,'2025-05-02 00:20:00','purchase','direct','E'),
(18,'f1',5,'2025-05-01 09:00:00','view','email','F'),
(19,'f2',5,'2025-05-01 09:05:00','checkout','direct','F'),
(20,'f3',5,'2025-05-01 09:50:00','purchase','direct','F'),
(21,'g1',6,'2025-05-01 09:00:00','view','social','G'),
(22,'g2',6,'2025-05-01 09:10:00','checkout','direct','G'),
(23,'g3',6,'2025-05-01 09:20:00','purchase','direct','OTHER'),
(24,'h1',7,'2025-05-01 09:00:00','view','direct','H'),
(25,'h2',7,'2025-05-01 09:31:00','checkout','direct','H'),
(26,'i1',8,'2025-05-01 08:00:00','view','email','I'),
(27,'i2',8,'2025-05-01 08:02:00','checkout','direct','I'),
(28,'i3',8,'2025-05-01 08:03:00','purchase','direct','I'),
(29,'i3',8,'2025-05-01 08:03:00','checkout','social','I'),
(30,'b5',1,'2025-05-02 09:00:00','purchase','email','B'),
(31,'j1',9,'2025-05-02 08:00:00','view','search','J'),
(32,'j2',9,'2025-05-02 08:01:00','checkout','direct','J'),
(33,'j3',9,'2025-05-02 08:04:00','purchase','direct','J'),
(34,'k1',10,'2025-05-02 10:00:00','view','social','K'),
(35,'k2',10,'2025-05-02 10:01:00','checkout','direct','K'),
(36,'k3',10,'2025-05-02 10:01:00','checkout','direct','K'),
(37,'l1',11,'2025-05-02 11:00:00','view','email','L'),
(38,'k2b',10,'2025-05-02 10:04:00','checkout','direct','K');
CREATE TABLE market_load_feed(id INTEGER PRIMARY KEY,external_id TEXT NOT NULL,version INTEGER NOT NULL,amount INTEGER NOT NULL);
CREATE TABLE market_ledger(external_id TEXT PRIMARY KEY,version INTEGER NOT NULL,amount INTEGER NOT NULL);
INSERT INTO market_ledger VALUES('X',1,10),('Z',9,90);
INSERT INTO market_load_feed VALUES(1,'X',1,10),(2,'X',2,20),(3,'X',2,25),(4,'Y',1,5),(5,'Z',2,999);
CREATE TABLE market_reservation_feed(id INTEGER PRIMARY KEY,shopper_id INTEGER,item_id INTEGER,quantity BLOB);
INSERT INTO market_reservation_feed VALUES(1,1,1,2),(2,1,1,4),(3,2,4,1),(4,2,4,9),(5,3,7,0),(6,999,1,2),(7,4,99,1),(8,5,2,NULL),(9,6,3,1.5),(10,7,4,5),(20,8,8,'3');
CREATE TABLE market_stock(item_id INTEGER PRIMARY KEY,capacity INTEGER NOT NULL,available INTEGER NOT NULL,reserved INTEGER NOT NULL);
INSERT INTO market_stock VALUES(1,5,5,0),(2,2,2,0),(3,9,9,0);
CREATE TABLE market_allocation_feed(batch TEXT NOT NULL,item_id INTEGER NOT NULL,quantity INTEGER NOT NULL,PRIMARY KEY(batch,item_id));
INSERT INTO market_allocation_feed VALUES('rejected',1,2),('rejected',2,3),('accepted',1,1),('accepted',2,1);
CREATE TABLE market_allocation_audit(batch TEXT PRIMARY KEY,units INTEGER NOT NULL);
INSERT INTO market_allocation_audit VALUES('historical',5);
CREATE TABLE market_raw_import(id INTEGER PRIMARY KEY,raw_code TEXT,raw_email TEXT,raw_amount TEXT);
INSERT INTO market_raw_import VALUES
(1,' hm-0042-us ',' Ana@Harbor.test ','19.99'),
(2,'HM-0007-GB','ana@harbor.test','0.29'),
(3,'HM-12x4-US',' Ben@harbor.test ','-12.50'),
(4,'HM-12345-US',char(9)||'BEN@HARBOR.TEST'||char(10),'+12'),
(5,'HM-123-US','a@@harbor.test','12x'),
(6,'HM-0042-U1',' A@@harbor.test ','1e2'),
(7,'HM-0000-US','ana+sale@harbor.test','1.234'),
(8,'HM-9999-JP','ANA+SALE@HARBOR.TEST','1,200.00'),
(9,'HM-0011-us','no-at-address',''),
(10,'HM-0012-FR','two words@harbor.test',NULL),
(11,NULL,'x@.test','.50'),
(12,'HM-0013-DE',NULL,'12.'),
(13,'HM-0014-CA','x@harbor.','--5'),
(14,'HM_0015_US','valid@harbor.test','999999.99'),
(15,'HM-0016-US','valid@harbor.test','1000000.00'),
(16,'HM-00 2-US','a@b..test',' -0.01 '),
(17,'HM-0020-AU','a@b..test','000012.3'),
(18,'HM-0022-US',char(13)||'normal@harbor.test','+0'),
(19,'HM-0023-US','NORMAL@HARBOR.TEST'||char(9),'-0.00');
`;
export const expansionMutation = `INSERT INTO market_web_events VALUES
(40,'k4',10,'2025-05-02 10:20:00','purchase','direct','K'),
(41,'k4',10,'2025-05-02 10:20:00','purchase','direct','K'),
(42,'m1',12,'2025-05-02 12:00:00','view','search','M'),
(43,'m2',12,'2025-05-02 12:00:00','checkout','direct','M'),
(44,'m3',12,'2025-05-02 12:05:00','purchase','direct','M'),
(45,'g4',6,'2025-05-02 09:09:59','purchase','email','G');
INSERT INTO market_load_feed VALUES(6,'Y',2,7),(7,'X',0,999);
INSERT INTO market_reservation_feed VALUES(11,3,7,2),(12,1,1,3);
INSERT INTO market_allocation_feed VALUES('accepted',3,2);
INSERT INTO market_raw_import VALUES
(30,'hm-0021-jp','ANa@HARBOR.TEST','123.45'),
(31,'HM-00A1-US','bad@@harbor.test','9.999'),
(32,'HM-0009-GB','BAD@@harbor.test','-0.29'),
(33,'HM-0010-US','new@harbor.test','0'),
(34,'HM-0011-US',' NEW@HARBOR.TEST ','+001.20');
`;

/** 12,000 deterministic rows, including repeated shoppers and timestamps across days. */
export const optimizationFixture = `
WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<12000)
INSERT INTO market_query_log
SELECT x,x%97,CASE WHEN x%3=0 THEN 'purchase' ELSE 'view' END,
       datetime('2025-01-01', '+' || x || ' minutes'),x%500 FROM n;
INSERT INTO market_query_log VALUES
(12001,42,'purchase','2025-01-04 00:00:00',700),
(12002,42,'purchase','2025-01-05 00:00:00',701),
(12003,7,'view','2025-01-04 12:00:00',702),
(12004,5,'purchase','2025-01-04 12:00:00',900),
(12005,5,'purchase','2025-01-04 12:00:00',900);
`;
export const optimizationMutation = `
INSERT INTO market_query_log VALUES
(13001,42,'purchase','2025-01-04 16:00:00',777),
(13002,7,'view','2025-01-04 16:01:00',778),
(13003,5,'purchase','2025-01-04 16:02:00',999);
`;
