import type { DatasetInfo } from '@/content/types';

// Original small fixtures. Dates and quantities are deliberately fixed.
export const v4Seed = `
CREATE TABLE studio_members(id INTEGER PRIMARY KEY, name TEXT NOT NULL, team TEXT, credits INTEGER);
CREATE TABLE studio_bookings(id INTEGER PRIMARY KEY, member_id INTEGER REFERENCES studio_members(id), fee INTEGER, booked_at TEXT);
INSERT INTO studio_members VALUES(1,'Luz','Red',80),(2,'Kit','Red',80),(3,'Remy','Blue',50),(4,'Sol','Blue',NULL);
INSERT INTO studio_bookings VALUES(11,1,20,'2026-04-01'),(12,1,30,'2026-04-30'),(13,2,NULL,'2026-05-01'),(14,NULL,20,'2026-04-15');
CREATE TABLE capacity_regions(id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE capacity_sites(id INTEGER PRIMARY KEY, region_id INTEGER REFERENCES capacity_regions(id), name TEXT NOT NULL);
CREATE TABLE current_capacity(id INTEGER PRIMARY KEY, site_id INTEGER REFERENCES capacity_sites(id), units INTEGER NOT NULL, valid_from TEXT NOT NULL, valid_to TEXT);
CREATE TABLE future_supply(id INTEGER PRIMARY KEY, site_id INTEGER REFERENCES capacity_sites(id), units INTEGER NOT NULL, delivery_date TEXT NOT NULL);
INSERT INTO capacity_regions VALUES(1,'North'),(2,'South'),(3,'West');
INSERT INTO capacity_sites VALUES(1,1,'Alder'),(2,1,'Birch'),(3,2,'Cedar'),(4,NULL,'Drift');
INSERT INTO current_capacity VALUES(1,1,40,'2026-01-01',NULL),(2,2,40,'2026-01-01',NULL),(3,3,99,'2025-01-01','2026-04-01'),(4,1,5,'2026-05-01',NULL),(5,4,10,'2026-01-01',NULL);
INSERT INTO future_supply VALUES(1,1,7,'2026-04-10'),(2,1,8,'2026-04-10'),(3,1,20,'2026-05-01'),(4,2,5,'2026-04-30'),(5,3,12,'2026-04-01'),(6,2,3,'2026-03-31');
`;
export const v4Mutation = `
INSERT INTO studio_members VALUES(5,'Noor','Blue',50);
INSERT INTO studio_bookings VALUES(15,3,40,'2026-04-02'),(16,3,40,'2026-04-20'),(17,2,7,'2026-04-30');
UPDATE studio_members SET credits=90 WHERE id=1;
INSERT INTO capacity_sites VALUES(5,3,'Elm');
INSERT INTO current_capacity VALUES(6,5,18,'2026-04-01',NULL),(7,2,3,'2026-03-01','2026-04-15');
INSERT INTO future_supply VALUES(7,5,6,'2026-04-30'),(8,1,2,'2026-04-10'),(9,3,1,'2026-05-01');
`;
export const v4Datasets: Record<string, DatasetInfo> = {
  reasoning: { name:'Community Studio', role:'SQL reasoning', description:'Four fictional members and four bookings. Small inputs expose NULLs, unmatched rows, duplicate values and ranking ties.', tables:['studio_members','studio_bookings'] },
  capacity: { name:'Regional Capacity', role:'Capacity analyst', description:'Fictional sites, capacity validity intervals and incoming deliveries. All quantities use compute units; dates are ISO calendar dates.', tables:['capacity_regions','capacity_sites','current_capacity','future_supply'] },
};
