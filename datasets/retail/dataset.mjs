import path from 'node:path';
import { col, fk, table } from '../lib/schema.mjs';
import { readExtract } from '../lib/extract.mjs';
import { createRng, ms, ts, DAY, MINUTE, round2 } from '../lib/rng.mjs';
import { maxShare, distinct, nulls } from '../lib/contract.mjs';

const SEED = 20251;

/** Keyword rules applied to the recorded product description, first match wins. */
const CATEGORY_RULES = [
  [1, 'Christmas & Seasonal', 'Seasonal', /CHRISTMAS|XMAS|ADVENT|SANTA|REINDEER|SNOWFLAKE|BAUBLE|EASTER|HALLOWEEN/],
  [2, 'Candles & Lighting', 'Home', /CANDLE|T-LIGHT|TEALIGHT|TEA LIGHT|LANTERN|LIGHTS?\b|LAMP|INCENSE|OIL BURNER/],
  [3, 'Kitchen & Dining', 'Home', /MUG|TEACUP|\bCUPS?\b|PLATE|BOWL|CUTLERY|DISH|TRAY|JUG|TEAPOT|NAPKIN|CAKE STAND|CAKE CASES|BAKING|APRON|OVEN|KITCHEN|COASTER|SPOON|TEA TOWEL/],
  [6, 'Bags & Accessories', 'Fashion', /\bBAGS?\b|PURSE|WALLET|UMBRELLA|SCARF|\bHAT\b|GLOVES|HAIR|SLIPPER/],
  [7, 'Jewellery', 'Fashion', /NECKLACE|BRACELET|EARRING|BROOCH|CHARM|DIAMANTE|BEAD|PENDANT|\bRING\b/],
  [8, 'Stationery & Gift Wrap', 'Paper & Party', /\bCARDS?\b|WRAP|PAPER|NOTEBOOK|\bPENS?\b|PENCIL|ENVELOPE|STICKER|TAPE|RIBBON|GIFT TAG|JOURNAL|CALENDAR|MAGNET|ERASER|DIARY/],
  [9, 'Party & Celebrations', 'Paper & Party', /PARTY|BALLOON|BIRTHDAY|BUNTING|CONFETTI|PICNIC|WEDDING/],
  [10, 'Toys & Games', 'Kids', /TOY|GAME|PUZZLE|DOLL|JIGSAW|SKITTLES|DOMINOES|KIDS|CHILDRENS|CHILDS|TEDDY|SPACEBOY/],
  [11, 'Garden & Outdoor', 'Home', /GARDEN|PLANT|FLOWER POT|WATERING|BIRD|\bPEGS?\b/],
  [12, 'Bath & Wellbeing', 'Home', /SOAP|\bBATH|TOWEL|HOT WATER BOTTLE|SPONGE/],
  [13, 'Pets', 'Lifestyle', /\bDOGS?\b|\bCAT\b|COLLAR|\bPET\b/],
  [4, 'Home Decor', 'Home', /SIGN|FRAME|CLOCK|MIRROR|CUSHION|DOORMAT|HOOK|WALL|GARLAND|DECORATION|ORNAMENT|VASE|PHOTO|PLAQUE|KNOB|DOORSTOP|HANGING/],
  [5, 'Storage & Organisation', 'Home', /\bBOX|\bTINS?\b|\bJARS?\b|BASKET|STORAGE|DRAWER|LUNCH|BOTTLE|\bCASE|HOLDER|CABINET/],
];
const CATEGORIES = [
  ...CATEGORY_RULES.map(([id, name, dept]) => [id, name, dept]),
  [14, 'Gift Vouchers', 'Services'],
  [15, 'Shipping & Fees', 'Non-merchandise'],
  [16, 'Adjustments & Samples', 'Non-merchandise'],
  [17, 'Other Gifts', 'Gifts'],
].sort((a, b) => a[0] - b[0]);
const FEE_CODES = new Set(['POST', 'DOT', 'C2', 'C3', 'AMAZONFEE', 'BANK CHARGES', 'CRUK']);
const ADJUST_CODES = /^(ADJUST\d*|B|D|M|m|S|TEST\d+)$/;

function categorize(code, description) {
  if (FEE_CODES.has(code)) return 15;
  if (ADJUST_CODES.test(code)) return 16;
  if (/^gift_/.test(code) || /VOUCHER/i.test(description ?? '')) return 14;
  if (!description) return null; // Unknown products stay uncategorised rather than guessed.
  const text = description.toUpperCase();
  for (const [id, , , re] of CATEGORY_RULES) if (re.test(text)) return id;
  return 17;
}

const tables = [
  table('categories', 'One product category (for example Christmas or Kitchen). Products are grouped into these from their descriptions.', [
    col('category_id', 'INTEGER', 'Category key'),
    col('category_name', 'TEXT', 'Category label'),
    col('department', 'TEXT', 'Broader group of categories; Non-merchandise covers fees and accounting adjustments'),
  ]),
  table('products', 'One product in the catalog (one stock code). Some products never appear on invoices in this sample.', [
    col('stock_code', 'TEXT', 'Product code; letter codes often mark fees, samples, or adjustments'),
    col('description', 'TEXT', 'Usual product name; NULL if the source never described this code', true),
    col('category_id', 'INTEGER', 'Category for this product; NULL if it has no description', true),
    col('list_price', 'REAL', 'Typical sale price in GBP; NULL if never sold at a positive price', true),
    col('first_sold_at', 'TEXT', 'First time this product appeared on any invoice'),
    col('is_merchandise', 'INTEGER', '1 for goods, 0 for postage, fees, samples, and adjustments'),
  ], { foreignKeys: [fk('category_id', 'categories')], indexes: [['category_id', 'is_merchandise', 'list_price']] }),
  table('customers', 'One known customer. Anonymous (walk-in) invoices have no matching customer row.', [
    col('customer_id', 'INTEGER', 'Customer number from the source'),
    col('country', 'TEXT', 'Country on the customer’s first invoice'),
    col('region', 'TEXT', 'United Kingdom, Europe, or Rest of World'),
    col('first_order_at', 'TEXT', 'Time of the customer’s first invoice'),
  ], { indexes: [['country']] }),
  table('orders', 'One invoice: a sale, a cancellation (credit note), or an accounting adjustment.', [
    col('order_id', 'INTEGER', 'Invoice key'),
    col('invoice_no', 'TEXT', 'Source invoice number; C = cancellation, A = adjustment'),
    col('customer_id', 'INTEGER', 'Customer; NULL for anonymous invoices', true),
    col('ordered_at', 'TEXT', 'Invoice time'),
    col('country', 'TEXT', 'Delivery country on the invoice'),
    col('order_type', 'TEXT', 'sale, cancellation, or adjustment'),
  ], { foreignKeys: [fk('customer_id', 'customers')], indexes: [['customer_id'], ['ordered_at'], ['order_type']] }),
  table('order_items', 'One line on an invoice. Cancellation lines use negative quantities.', [
    col('order_item_id', 'INTEGER', 'Line key'),
    col('order_id', 'INTEGER', 'Invoice this line belongs to'),
    col('line_number', 'INTEGER', 'Position on the invoice, starting at 1'),
    col('stock_code', 'TEXT', 'Product code'),
    col('description', 'TEXT', 'Text printed on this line; can differ from the catalog name', true),
    col('quantity', 'INTEGER', 'Units sold; negative on cancellations and stock adjustments'),
    col('unit_price', 'REAL', 'Price per unit in GBP'),
  ], { foreignKeys: [fk('order_id', 'orders'), fk('stock_code', 'products')], indexes: [['order_id'], ['stock_code']] }),
  table('payments', 'One payment attempt for a sale invoice. Payments are modeled; the original source has no payment ledger.', [
    col('payment_id', 'INTEGER', 'Payment attempt key'),
    col('order_id', 'INTEGER', 'Sale invoice being paid'),
    col('paid_at', 'TEXT', 'When the attempt happened'),
    col('method', 'TEXT', 'card, bank_transfer, paypal, or account_credit'),
    col('amount', 'REAL', 'Attempted amount in GBP'),
    col('status', 'TEXT', 'captured or failed; only captured attempts count as paid'),
  ], { foreignKeys: [fk('order_id', 'orders')], indexes: [['order_id'], ['paid_at']] }),
  table('returns', 'One cancelled invoice line, linked to the earlier sale it reverses when that sale is in the data.', [
    col('return_id', 'INTEGER', 'Return key'),
    col('order_item_id', 'INTEGER', 'The cancellation line being returned'),
    col('original_order_id', 'INTEGER', 'Earlier sale of the same product to the same customer; NULL if none is found', true),
    col('quantity_returned', 'INTEGER', 'Units returned (positive)'),
    col('refund_amount', 'REAL', 'Credit value in GBP'),
    col('returned_at', 'TEXT', 'When the cancellation invoice was issued'),
  ], { foreignKeys: [fk('order_item_id', 'order_items'), fk('original_order_id', 'orders', 'order_id')], indexes: [['original_order_id'], ['order_item_id']] }),
  table('customer_history', 'One version of a customer’s segment and country over time. A new row starts when either changes.', [
    col('history_id', 'INTEGER', 'Version key'),
    col('customer_id', 'INTEGER', 'Customer'),
    col('segment', 'TEXT', 'occasional, regular, or key_account based on recent net sales'),
    col('country', 'TEXT', 'Country for this version'),
    col('valid_from', 'TEXT', 'First date this version applies'),
    col('valid_to', 'TEXT', 'First date it no longer applies; NULL if this is the current version', true),
    col('is_current', 'INTEGER', '1 if this is the customer’s current version'),
  ], { foreignKeys: [fk('customer_id', 'customers')], indexes: [['customer_id']] }),
];

const EUROPE = new Set(['Austria', 'Belgium', 'Channel Islands', 'Cyprus', 'Czech Republic', 'Denmark', 'EIRE', 'European Community', 'Finland', 'France', 'Germany', 'Greece', 'Iceland', 'Italy', 'Lithuania', 'Malta', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland']);
const region = country => (country === 'United Kingdom' ? 'United Kingdom' : EUROPE.has(country) ? 'Europe' : 'Rest of World');

async function rows({ dir }) {
  const ex = name => readExtract(path.join(dir, 'extract', `${name}.tsv.gz`), {
    products: ['list_price'], customers: ['customer_id'], orders: ['order_id', 'customer_id'],
    order_items: ['order_item_id', 'order_id', 'line_number', 'quantity', 'unit_price'],
  }[name]).rows;
  const productRows = ex('products'), customerRows = ex('customers'), orders = ex('orders'), items = ex('order_items');

  const products = productRows.map(([code, description, price, first]) => {
    const category = categorize(code, description);
    return [code, description, category, price, first, category === 15 || category === 16 ? 0 : 1];
  });
  const customers = customerRows.map(([id, country, first]) => [id, country, region(country), first]);

  const byOrder = new Map(orders.map(o => [o[0], { row: o, lines: [] }]));
  for (const it of items) byOrder.get(it[1]).lines.push(it);

  // Returns: link each cancellation line to the latest earlier sale of the same code to the same customer.
  const salesByKey = new Map();
  const returns = [];
  for (const o of orders) {
    const [id, , customer, at, , type] = o;
    for (const it of byOrder.get(id).lines) {
      const key = `${customer}|${it[3]}`;
      if (type === 'sale' && customer !== null && it[5] > 0) {
        const list = salesByKey.get(key) ?? [];
        list.push({ id, at });
        salesByKey.set(key, list);
      } else if (type === 'cancellation' && it[5] < 0) {
        const prior = customer === null ? null : (salesByKey.get(key) ?? []).filter(s => s.at <= at).at(-1) ?? null;
        returns.push([returns.length + 1, it[0], prior?.id ?? null, -it[5], round2(-it[5] * it[6]), at]);
      }
    }
  }

  // Payments: modeled from each sale invoice total with seeded behavior per customer.
  const rng = createRng(SEED);
  const payments = [];
  const methodFor = new Map();
  for (const o of orders) {
    const [id, , customer, at, country, type] = o;
    if (type !== 'sale') continue;
    const total = round2(byOrder.get(id).lines.reduce((s, it) => s + it[5] * it[6], 0));
    if (total <= 0) continue;
    const r = rng.fork(`order:${id}`);
    let method = customer === null ? 'card' : methodFor.get(customer);
    if (!method) {
      method = country === 'United Kingdom'
        ? rng.weighted([['bank_transfer', 45], ['card', 40], ['account_credit', 15]])
        : rng.weighted([['card', 55], ['paypal', 25], ['bank_transfer', 20]]);
      methodFor.set(customer, method);
    }
    const delay = method === 'bank_transfer' ? r.int(1, 6) * DAY + r.int(0, 600) * MINUTE
      : method === 'account_credit' ? r.int(20, 45) * DAY : r.int(1, 40) * MINUTE;
    let when = ms(at) + delay;
    const roll = r.next();
    const add = (time, amount, status, m = method) => payments.push([0, id, ts(time), m, round2(amount), status]);
    if (roll < 0.025) {
      if (r.chance(0.6)) add(when, total, 'failed', 'card');
    } else if (roll < 0.085) {
      add(when, total, 'failed', 'card');
      add(when + r.int(5, 2 * 24 * 60) * MINUTE, total, 'captured', method === 'card' ? 'card' : method);
    } else if (roll < 0.135) {
      const deposit = round2(total * 0.3);
      add(when, deposit, 'captured');
      add(when + r.int(7, 30) * DAY, round2(total - deposit), 'captured');
    } else add(when, total, 'captured');
  }
  payments.sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : a[1] - b[1]));
  payments.forEach((p, i) => { p[0] = i + 1; });

  // Customer history: segment by trailing-12-month net sales at each month start; country changes when invoices change it.
  const history = [];
  const ordersByCustomer = new Map();
  for (const o of orders) if (o[2] !== null) (ordersByCustomer.get(o[2]) ?? ordersByCustomer.set(o[2], []).get(o[2])).push(o);
  const monthStarts = [];
  for (let y = 2009, m = 12; y < 2012 || (y === 2012 && m <= 1);) { monthStarts.push(`${y}-${String(m).padStart(2, '0')}-01`); m++; if (m > 12) { m = 1; y++; } }
  for (const [customer] of customers) {
    const list = ordersByCustomer.get(customer) ?? [];
    const valueOf = o => byOrder.get(o[0]).lines.reduce((s, it) => s + it[5] * it[6], 0);
    const first = list[0][3].slice(0, 10);
    const states = [];
    const segmentAt = date => {
      const from = ts(ms(date) - 365 * DAY).slice(0, 10);
      const spend = list.filter(o => o[3].slice(0, 10) >= from && o[3].slice(0, 10) < date).reduce((s, o) => s + valueOf(o), 0);
      return spend >= 5000 ? 'key_account' : spend >= 500 ? 'regular' : 'occasional';
    };
    states.push({ date: first, segment: 'occasional', country: list[0][4] });
    const changes = [...monthStarts.filter(d => d > first).map(d => ({ date: d, kind: 'month' })), ...list.map(o => ({ date: o[3].slice(0, 10), kind: 'country', country: o[4] }))]
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.kind === 'month' ? -1 : 1));
    for (const c of changes) {
      const last = states.at(-1);
      const next = { date: c.date, segment: c.kind === 'month' ? segmentAt(c.date) : last.segment, country: c.kind === 'country' ? c.country : last.country };
      if (next.segment !== last.segment || next.country !== last.country) {
        if (next.date === last.date) { states[states.length - 1] = next; continue; }
        states.push(next);
      }
    }
    states.forEach((s, i) => history.push([0, customer, s.segment, s.country, s.date, states[i + 1]?.date ?? null, i === states.length - 1 ? 1 : 0]));
  }
  history.forEach((h, i) => { h[0] = i + 1; });

  return { categories: CATEGORIES, products, customers, orders, order_items: items, payments, returns, customer_history: history };
}

const dataset = {
  id: 'retail',
  version: '3.0.0',
  name: 'Retail',
  domain: 'Retail',
  kind: 'hybrid',
  description: 'Two years of real invoice lines from a UK online gift wholesaler: customers, products, sales, cancellations and returns, with modeled payments and customer segment history.',
  source: {
    publisher: 'Daqing Chen, UCI Machine Learning Repository',
    url: 'https://archive.ics.uci.edu/dataset/502/online+retail+ii',
    release: 'Online Retail II (2019), worksheets Year 2009-2010 and Year 2010-2011',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    commercialReuse: 'permitted',
    attribution: 'Chen, D. (2012). Online Retail II [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5CG6D. Modified by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'All invoice lines for a deterministic 14% sample of customers (FNV-1a hash of customer id) and the same share of anonymous invoices, Dec 2009 – Dec 2011.',
      'Overlapping worksheet dates (2010-12-01..09) are taken once, from the second worksheet.',
      'One order header per invoice number (earliest line timestamp); order_type from the invoice prefix.',
      'Product catalog covers every stock code in the full source; description and list price are the modal recorded values.',
      'Categories are derived from product descriptions; products with no description stay uncategorised.',
      'returns links each cancellation line to the latest earlier sale of that code to that customer.',
      'customer_history derives segment from trailing-12-month net sales at each month start.',
      'payments are modeled by Runtime (seed 20251): the source contains no payment ledger.',
    ],
  },
  reproduction: { command: 'node datasets/acquire/download.mjs <dir> retail && node datasets/acquire/retail.mjs <dir> && node datasets/build.mjs retail', implementation: 'datasets/acquire/retail.mjs, datasets/retail/dataset.mjs', seed: SEED, notes: 'Committed extracts in datasets/retail/extract are the build input; the acquisition script regenerates them from the pinned source file.' },
  coverage: { start: '2009-12-01', end: '2011-12-09', grain: 'invoice line' },
  tables,
  edgeCases: [
    'Cancellation invoices with negative quantities',
    'Anonymous invoices without a customer',
    'Repeated identical invoice lines',
    'Zero-price adjustment lines and non-merchandise codes (postage, fees, samples)',
    'Products never bought by the sampled customers',
    'Undescribed products with no category',
    'Returns with no matching earlier sale',
    'Unpaid sale invoices, failed attempts and split payments',
    'Customers whose segment or country changes over time',
  ],
  qualityNotes: [
    'Net sales are quantity × unit_price summed over sale and cancellation lines; payments are a separate modeled ledger.',
    'Timestamps are recorded local times with an unspecified time zone.',
    'A 14% customer sample is not a full-company total; compare shares and trends, not absolute company revenue.',
    'Line descriptions can differ from catalog descriptions for the same stock code.',
  ],
  concepts: ['foundations', 'filtering', 'joins', 'aggregation', 'subqueries', 'revenue', 'customer analysis', 'returns', 'warehouse modeling', 'SCD', 'relational division'],
  rows,
  mutation: `
UPDATE order_items SET quantity = quantity + 7 WHERE order_item_id % 211 = 0 AND quantity > 0;
UPDATE products SET list_price = ROUND(list_price * 1.1, 2) WHERE stock_code IN (SELECT stock_code FROM products WHERE list_price IS NOT NULL ORDER BY stock_code LIMIT 60);
UPDATE products SET description = NULL, category_id = NULL WHERE stock_code IN (SELECT stock_code FROM products WHERE is_merchandise = 1 AND description IS NOT NULL ORDER BY stock_code DESC LIMIT 3);
INSERT INTO customers VALUES (99001, 'Portugal', 'Europe', '2011-11-30 09:00:00');
INSERT INTO customers VALUES (99002, 'United Kingdom', 'United Kingdom', '2010-06-01 10:00:00');
INSERT INTO orders VALUES ((SELECT MAX(order_id) + 1 FROM orders), 'R900001', 99002, '2010-06-01 10:00:00', 'United Kingdom', 'sale');
INSERT INTO order_items SELECT (SELECT MAX(order_item_id) FROM order_items) + n, (SELECT MAX(order_id) FROM orders), n, stock_code, description, 900, list_price FROM (SELECT 1 AS n, stock_code, description, list_price FROM products WHERE stock_code = '85123A' UNION ALL SELECT 2, stock_code, description, list_price FROM products WHERE stock_code = '22423' UNION ALL SELECT 3, stock_code, description, list_price FROM products WHERE stock_code = '84879');
INSERT INTO payments VALUES ((SELECT MAX(payment_id) + 1 FROM payments), (SELECT MAX(order_id) FROM orders), '2010-06-02 11:00:00', 'card', 1000.0, 'captured');
DELETE FROM returns WHERE return_id % 41 = 0;
DELETE FROM payments WHERE payment_id % 53 = 0;
UPDATE customers SET country = 'Germany', region = 'Europe' WHERE customer_id = (SELECT MIN(customer_id) FROM customers WHERE country = 'France');
UPDATE orders SET ordered_at = '2011-01-01 00:00:00' WHERE order_id = (SELECT MAX(order_id) FROM orders WHERE ordered_at < '2010-12-31 23:00:00' AND order_type = 'sale');
INSERT INTO customers VALUES (99003, 'Canada', 'Rest of World', '2010-12-31 23:30:00');
INSERT INTO orders VALUES ((SELECT MAX(order_id) + 1 FROM orders), 'R900002', 99003, '2010-12-31 23:30:00', 'Canada', 'sale');
INSERT INTO order_items SELECT (SELECT MAX(order_item_id) FROM order_items) + 1, (SELECT MAX(order_id) FROM orders), 1, '85123A', 'WHITE HANGING HEART T-LIGHT HOLDER', 48, 2.55;
INSERT INTO orders VALUES ((SELECT MAX(order_id) + 1 FROM orders), 'C900003', 99002, '2011-12-09 12:00:00', 'United Kingdom', 'cancellation');
INSERT INTO order_items SELECT (SELECT MAX(order_item_id) FROM order_items) + 1, (SELECT MAX(order_id) FROM orders), 1, '22423', 'REGENCY CAKESTAND 3 TIER', -2, 10.95;
INSERT INTO products VALUES ('99999LB', 'JUMBO LUNCH BAG DESK LAMP', 6, 0.29, '2011-12-01 09:00:00', 1);
INSERT INTO products VALUES ('99998KD', 'GRAND OAK KITCHEN DRESSER', 3, 395.0, '2011-11-01 09:00:00', 1);
INSERT INTO products VALUES ('FEE02', 'Card surcharge', 15, 0.0005, '2011-06-01 09:00:00', 0);
UPDATE orders SET order_type = 'cancellation' WHERE order_id IN (SELECT order_id FROM orders WHERE order_type = 'sale' AND customer_id IS NOT NULL ORDER BY order_id LIMIT 6 OFFSET 400);
UPDATE orders SET country = 'France' WHERE order_id IN (SELECT order_id FROM orders WHERE order_type = 'sale' AND country = 'Germany' AND ordered_at >= '2011-03-01' AND ordered_at < '2011-06-01' LIMIT 2);
UPDATE customers SET region = 'Rest of World' WHERE customer_id = (SELECT MIN(customer_id) FROM customers WHERE country = 'Switzerland');
INSERT INTO products VALUES ('99997PN', 'PAPER NAPKIN SINGLE', 9, 0.0002, '2011-02-01 09:00:00', 1);
INSERT INTO products VALUES ('PET777', 'DOG BOWL ENAMEL', 13, 4.25, '2011-10-01 09:00:00', 1);
UPDATE products SET list_price = list_price + 1 WHERE stock_code IN (SELECT stock_code FROM products WHERE category_id = 12 AND list_price < 5 ORDER BY stock_code LIMIT 5);
INSERT INTO orders VALUES ((SELECT MAX(order_id) + 1 FROM orders), 'R900004', NULL, '2011-12-05 10:00:00', 'United Kingdom', 'sale');
INSERT INTO order_items SELECT (SELECT MAX(order_item_id) FROM order_items) + 1, (SELECT MAX(order_id) FROM orders), 1, '84879', 'ASSORTED COLOUR BIRD ORNAMENT', 16, 1.69;
INSERT INTO orders VALUES ((SELECT MAX(order_id) + 1 FROM orders), 'R900005', 18102, '2011-12-08 15:00:00', 'United Kingdom', 'sale');
INSERT INTO order_items SELECT (SELECT MAX(order_item_id) FROM order_items) + 1, (SELECT MAX(order_id) FROM orders), 1, '85123A', 'WHITE HANGING HEART T-LIGHT HOLDER', 64, 2.55;
UPDATE order_items SET quantity = quantity + 1 WHERE order_id = (SELECT order_id FROM orders WHERE invoice_no = '580030') AND line_number = 1;
UPDATE order_items SET unit_price = 250 WHERE order_item_id = (SELECT MIN(order_item_id) FROM order_items WHERE unit_price BETWEEN 50 AND 200);
UPDATE orders SET customer_id = (SELECT customer_id FROM orders WHERE order_type = 'sale' AND customer_id IS NOT NULL GROUP BY customer_id HAVING COUNT(*) BETWEEN 12 AND 19 ORDER BY customer_id LIMIT 1) WHERE order_id IN (SELECT order_id FROM orders WHERE customer_id IS NULL AND order_type = 'sale' ORDER BY order_id LIMIT 10);
INSERT INTO orders SELECT (SELECT MAX(order_id) + 1 FROM orders), 'C900006', o.customer_id, '2011-06-15 11:00:00', 'United Kingdom', 'cancellation' FROM orders o WHERE o.order_type = 'sale' AND o.customer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM orders c WHERE c.customer_id = o.customer_id AND c.order_type = 'cancellation') GROUP BY o.customer_id HAVING COUNT(*) >= 10 ORDER BY o.customer_id LIMIT 1;
UPDATE customer_history SET segment = 'key_account' WHERE history_id IN (SELECT history_id FROM customer_history WHERE is_current = 1 AND segment = 'occasional' ORDER BY history_id LIMIT 5);
CREATE TABLE runtime_probe (probe_id INTEGER PRIMARY KEY);
`,
  contract: {
    totalRows: [120000, 180000],
    minRows: { categories: 15, products: 5000, customers: 800, orders: 6000, order_items: 100000, payments: 5000, returns: 1500, customer_history: 1500 },
    checks: [
      { name: 'invoice months covered', sql: "SELECT COUNT(DISTINCT substr(ordered_at, 1, 7)) FROM orders", min: 24 },
      { name: 'countries', sql: distinct('orders', 'country'), min: 20 },
      { name: 'largest customer share of lines', sql: maxShare('order_items JOIN orders USING (order_id) WHERE customer_id IS NOT NULL', 'customer_id'), max: 0.08 },
      { name: 'cancellation orders', sql: "SELECT COUNT(*) FROM orders WHERE order_type = 'cancellation'", min: 500 },
      { name: 'anonymous orders', sql: nulls('orders', 'customer_id'), min: 300 },
      { name: 'negative-quantity lines', sql: 'SELECT COUNT(*) FROM order_items WHERE quantity < 0', min: 1000 },
      { name: 'repeated identical lines', sql: 'SELECT COUNT(*) FROM (SELECT 1 FROM order_items GROUP BY order_id, stock_code, quantity, unit_price HAVING COUNT(*) > 1)', min: 100 },
      { name: 'products never bought in sample', sql: 'SELECT COUNT(*) FROM products p WHERE NOT EXISTS (SELECT 1 FROM order_items i WHERE i.stock_code = p.stock_code)', min: 300 },
      { name: 'uncategorised products', sql: nulls('products', 'category_id'), min: 10 },
      { name: 'categories in use', sql: distinct('products', 'category_id'), min: 15 },
      { name: 'unpaid sale orders', sql: "SELECT COUNT(*) FROM orders o WHERE order_type = 'sale' AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.order_id AND p.status = 'captured')", min: 50 },
      { name: 'failed payment attempts', sql: "SELECT COUNT(*) FROM payments WHERE status = 'failed'", min: 150 },
      { name: 'split-paid orders', sql: "SELECT COUNT(*) FROM (SELECT order_id FROM payments WHERE status = 'captured' GROUP BY order_id HAVING COUNT(*) > 1)", min: 150 },
      { name: 'returns linked to a sale', sql: 'SELECT COUNT(original_order_id) FROM returns', min: 500 },
      { name: 'returns without an earlier sale', sql: nulls('returns', 'original_order_id'), min: 50 },
      { name: 'customers with history changes', sql: 'SELECT COUNT(*) FROM (SELECT customer_id FROM customer_history GROUP BY customer_id HAVING COUNT(*) > 1)', min: 200 },
      { name: 'one current version per customer', sql: 'SELECT COUNT(*) FROM customers c WHERE (SELECT COUNT(*) FROM customer_history h WHERE h.customer_id = c.customer_id AND h.is_current = 1) <> 1', equals: 0 },
      { name: 'non-overlapping history intervals', sql: 'SELECT COUNT(*) FROM customer_history a JOIN customer_history b ON a.customer_id = b.customer_id AND a.history_id < b.history_id AND a.valid_from < COALESCE(b.valid_to, \'9999\') AND b.valid_from < COALESCE(a.valid_to, \'9999\')', equals: 0 },
    ],
  },
};

export default dataset;
