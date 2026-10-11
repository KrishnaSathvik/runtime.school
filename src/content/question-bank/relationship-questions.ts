import type { BankQuestion } from './types';
const context = { version:1,datasetId:'market',mode:'query' as const,ordered:true,prerequisites:[16,18,49],tables:['shoppers','catalog_items','sales_orders','order_lines'] };
const pairs = `SELECT a.item_id AS item_a,b.item_id AS item_b,COUNT(*) AS shared_orders
FROM order_lines a JOIN order_lines b ON b.order_id=a.order_id AND a.item_id<b.item_id
JOIN sales_orders o ON o.id=a.order_id WHERE o.status='delivered'
GROUP BY a.item_id,b.item_id ORDER BY shared_orders DESC,item_a,item_b`;
const allCategories = `SELECT s.id AS shopper_id,s.name FROM shoppers s WHERE NOT EXISTS(
 SELECT 1 FROM catalog_items c WHERE NOT EXISTS(
 SELECT 1 FROM sales_orders o JOIN order_lines l ON l.order_id=o.id JOIN catalog_items bought ON bought.id=l.item_id
 WHERE o.shopper_id=s.id AND o.status='delivered' AND bought.category=c.category)) ORDER BY shopper_id`;
const divisionFixture = `INSERT INTO sales_orders VALUES(9101,1,'2025-04-10','delivered','2025-04-12'),(9102,2,'2025-04-10','cancelled',NULL);
INSERT INTO order_lines VALUES(9101,7,1,25),(9102,1,1,39);`;
const overlap = `WITH membership AS (
SELECT DISTINCT o.shopper_id,c.category FROM sales_orders o JOIN order_lines l ON l.order_id=o.id
JOIN catalog_items c ON c.id=l.item_id WHERE o.status='delivered'
), totals AS (SELECT category,COUNT(*) AS buyers FROM membership GROUP BY category), intersections AS (
SELECT a.category AS category_a,b.category AS category_b,COUNT(*) AS shared_buyers
FROM membership a JOIN membership b ON b.shopper_id=a.shopper_id AND a.category<b.category GROUP BY a.category,b.category)
SELECT i.category_a,i.category_b,i.shared_buyers,ta.buyers+tb.buyers-i.shared_buyers AS union_buyers,
ROUND(1.0*i.shared_buyers/(ta.buyers+tb.buyers-i.shared_buyers),3) AS jaccard
FROM intersections i JOIN totals ta ON ta.category=i.category_a JOIN totals tb ON tb.category=i.category_b
ORDER BY i.category_a,i.category_b`;
export const relationshipQuestions: BankQuestion[] = [{
 ...context,id:'qb-0061',slug:'co-purchased-product-pairs',title:'Measure co-purchased product pairs',difficulty:'medium',
 difficultyWhy:'Self-join a bridge table while eliminating self-pairs, mirrored pairs and quantity weighting.',primaryTopic:'joins.self',topicTags:['joins.fan-out','aggregation.group-by'],
 objective:'Count distinct baskets supporting each unordered product combination.',
 task:'Find unordered pairs of distinct products appearing together in delivered orders. Return the smaller item id as item_a, the larger as item_b, and the number of shared orders.',columns:['item_a','item_b','shared_orders'],
 rules:['Count an order once regardless of item quantities. The order_lines primary key is (order_id,item_id).', 'Only delivered orders qualify. Order by shared_orders descending, then item_a,item_b ascending.'],
 hints:['Join order_lines to itself on order_id.', 'Use a.item_id < b.item_id to remove both self-pairs and mirrored combinations.'],solution:pairs,
 equivalent:[pairs.replace('COUNT(*) AS shared_orders','COUNT(DISTINCT a.order_id) AS shared_orders')],
 explanation:'The bridge primary key guarantees each ordered product appears once. The strict item-id inequality enumerates one unordered pair per basket, so counting rows at pair grain counts baskets rather than units.',
 wrong:[{sql:pairs.replace('a.item_id<b.item_id','a.item_id<>b.item_id'),mistake:'Counts both mirrored versions of each pair.'},{sql:pairs.replace('COUNT(*) AS shared_orders','SUM(a.quantity*b.quantity) AS shared_orders'),mistake:'Weights basket support by quantities.'}],
},{
 ...context,id:'qb-0062',slug:'shoppers-in-every-category',title:'Find shoppers in every category',difficulty:'hard',
 difficultyWhy:'Express relational division over a dynamic category universe, respecting delivered-order membership.',primaryTopic:'subqueries.exists',topicTags:['joins.multi','aggregation.distinct-count'],
 objective:'Find entities related to every member of a changing required set.',setupSql:divisionFixture,
 extraMutation:`INSERT INTO catalog_items VALUES(9001,'Bath Brush','Wellness',18);
INSERT INTO sales_orders VALUES(9103,1,'2025-04-11','delivered','2025-04-12'),(9104,2,'2025-04-11','delivered','2025-04-12');
INSERT INTO order_lines VALUES(9103,9001,1,18),(9104,9001,1,18),(9104,1,1,39);`,
 task:'Return shoppers who bought at least one item from every distinct category currently in catalog_items, considering only delivered orders.',columns:['shopper_id','name'],
 rules:['Derive the required category set from the catalog; do not hardcode four categories or named categories.', 'Multiple products and orders in one category count only once. Include every qualifying shopper and order by shopper_id.', 'This exercise adds two illustrative orders to the standard Harbor Market data; previews include them.'],
 hints:['Read double NOT EXISTS as “there is no required category missing from this shopper”.', 'An alternative is counting distinct purchased categories against the catalog category count.'],solution:allCategories,
 equivalent:[`SELECT s.id AS shopper_id,s.name FROM shoppers s JOIN sales_orders o ON o.shopper_id=s.id JOIN order_lines l ON l.order_id=o.id JOIN catalog_items c ON c.id=l.item_id WHERE o.status='delivered' GROUP BY s.id,s.name HAVING COUNT(DISTINCT c.category)=(SELECT COUNT(DISTINCT category) FROM catalog_items) ORDER BY shopper_id`],
 explanation:'The outer anti-condition rules out any shopper with a missing category. The category universe comes from the catalog, so an added category changes the requirement instead of silently leaving an obsolete fixed count.',
 wrong:[{sql:allCategories.replace("AND o.status='delivered'",''),mistake:'Lets a cancelled order satisfy a required category.'},{sql:`SELECT s.id AS shopper_id,s.name FROM shoppers s JOIN sales_orders o ON o.shopper_id=s.id JOIN order_lines l ON l.order_id=o.id JOIN catalog_items c ON c.id=l.item_id WHERE o.status='delivered' GROUP BY s.id,s.name HAVING COUNT(DISTINCT c.category)=4 ORDER BY shopper_id`,mistake:'Hardcodes the initial number of categories.'}],
},{
 ...context,id:'qb-0063',slug:'category-audience-overlap',title:'Compare category audience overlap',difficulty:'hard',
 difficultyWhy:'Reduce the bridge to shopper/category membership before computing set intersections and unions.',primaryTopic:'joins.fan-out',topicTags:['analytics.statistics','aggregation.distinct-count'],
 objective:'Compute Jaccard overlap without inflating membership by line-item or repeat-order counts.',
 task:'For each alphabetically ordered pair of categories sharing at least one delivered-order shopper, return shared_buyers, union_buyers and jaccard = shared / union rounded to three decimals.',columns:['category_a','category_b','shared_buyers','union_buyers','jaccard'],
 rules:['A shopper belongs to a category once, regardless of repeat orders or quantities. Include only pairs with shared buyers.', 'Use category_a < category_b. Order by category_a,category_b.'],
 hints:['Build DISTINCT shopper_id/category membership first.', 'The union size is buyers(A) + buyers(B) − shared buyers.'],solution:overlap,
 explanation:'Deduplicating at the membership grain turns an order bridge into sets of shoppers. Self-joining those sets gives intersection sizes; inclusion-exclusion gives each union without a second fan-out.',
 wrong:[{sql:overlap.replace('SELECT DISTINCT o.shopper_id,c.category','SELECT o.shopper_id,c.category'),mistake:'Lets repeat purchases multiply memberships and intersections.'},{sql:overlap.replaceAll('ta.buyers+tb.buyers-i.shared_buyers','ta.buyers+tb.buyers'),mistake:'Double-counts shared shoppers in the union.'}],
}];
