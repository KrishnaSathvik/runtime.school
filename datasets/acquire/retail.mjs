/**
 * Retail extract from UCI Online Retail II (CC BY 4.0).
 *   node datasets/acquire/retail.mjs <downloads-dir>
 *
 * Selection: every invoice line, Dec 2009 – Dec 2011, for a deterministic 14% sample of
 * customers (FNV-1a of the customer id) plus the same share of anonymous invoices. Sampling
 * whole customers keeps complete purchase histories for cohort and retention analysis.
 * The two worksheets overlap on 2010-12-01..09; worksheet 1 supplies dates before 2010-12-01
 * and worksheet 2 the rest. Quantities, prices, signs and descriptions are preserved as recorded.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import { readWorkbook, excelDate } from './xlsx.mjs';
import { writeExtract } from '../lib/extract.mjs';
import { hash32 } from '../lib/rng.mjs';
import { SOURCES } from './sources.mjs';

const SAMPLE_PERCENT = 14;
const dir = process.argv[2];
if (!dir) throw new Error('Usage: node datasets/acquire/retail.mjs <downloads-dir>');
const bytes = fs.readFileSync(path.join(dir, 'online-retail-ii.zip'));
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (sha256 !== SOURCES['online-retail-ii.zip'].sha256) throw new Error('Unexpected upstream hash');
const wb = readWorkbook(unzipSync(bytes)['online_retail_II.xlsx']);

const all = [];
let sourceRows = 0;
for (const [sheet, file] of [[1, 'xl/worksheets/sheet1.xml'], [2, 'xl/worksheets/sheet2.xml']]) {
  let first = true;
  for (const r of wb.rows(file)) {
    if (first) {
      first = false;
      if (r.A !== 'Invoice' || r.B !== 'StockCode' || r.F !== 'Price' || r.G !== 'Customer ID') throw new Error(`Unexpected header ${JSON.stringify(r)}`);
      continue;
    }
    sourceRows++;
    const at = excelDate(r.E);
    if ((sheet === 1 && at >= '2010-12-01') || (sheet === 2 && at < '2010-12-01')) continue;
    const customer = r.G == null ? null : String(Math.round(r.G));
    all.push({ invoice: String(r.A), code: String(r.B).trim(), description: r.C == null ? null : String(r.C).trim() || null, quantity: r.D, at, price: r.F, customer, country: String(r.H) });
  }
}

// Product catalog over the full source: most frequent description, modal positive sale price, first sale.
const productStats = new Map();
for (const r of all) {
  let p = productStats.get(r.code);
  if (!p) productStats.set(r.code, p = { descriptions: new Map(), prices: new Map(), first: r.at });
  if (r.description) p.descriptions.set(r.description, (p.descriptions.get(r.description) ?? 0) + 1);
  if (r.quantity > 0 && r.price > 0 && !r.invoice.startsWith('C')) p.prices.set(r.price, (p.prices.get(r.price) ?? 0) + 1);
  if (r.at < p.first) p.first = r.at;
}
const mode = m => [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))[0]?.[0] ?? null;
const products = [...productStats].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([code, p]) => [code, mode(p.descriptions), mode(p.prices), p.first]);

const keep = r => (r.customer ? hash32(`cust:${r.customer}`) : hash32(`inv:${r.invoice}`)) % 100 < SAMPLE_PERCENT;
const lines = all.filter(keep);

// One header per invoice number: earliest timestamp, first recorded customer and country.
const headers = new Map();
for (const r of lines) {
  const h = headers.get(r.invoice);
  if (!h) headers.set(r.invoice, { invoice: r.invoice, at: r.at, customer: r.customer, country: r.country });
  else {
    if (r.at < h.at) h.at = r.at;
    h.customer ??= r.customer;
  }
}
const orderList = [...headers.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.invoice < b.invoice ? -1 : 1));
const orderId = new Map(orderList.map((o, i) => [o.invoice, i + 1]));
const type = inv => (inv.startsWith('C') ? 'cancellation' : inv.startsWith('A') ? 'adjustment' : 'sale');
const orders = orderList.map(o => [orderId.get(o.invoice), o.invoice, o.customer === null ? null : Number(o.customer), o.at, o.country, type(o.invoice)]);

const lineNumbers = new Map();
const items = lines
  .map((r, i) => ({ r, i }))
  .sort((a, b) => orderId.get(a.r.invoice) - orderId.get(b.r.invoice) || a.i - b.i)
  .map(({ r }, i) => {
    const n = (lineNumbers.get(r.invoice) ?? 0) + 1;
    lineNumbers.set(r.invoice, n);
    return [i + 1, orderId.get(r.invoice), n, r.code, r.description, r.quantity, r.price];
  });

const customerFirst = new Map();
for (const o of orderList) if (o.customer !== null && !customerFirst.has(o.customer)) customerFirst.set(o.customer, o);
const customers = [...customerFirst].sort((a, b) => Number(a[0]) - Number(b[0])).map(([id, o]) => [Number(id), o.country, o.at]);

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '../retail/extract');
writeExtract(path.join(out, 'products.tsv.gz'), ['stock_code', 'description', 'list_price', 'first_sold_at'], products);
writeExtract(path.join(out, 'customers.tsv.gz'), ['customer_id', 'country', 'first_order_at'], customers);
writeExtract(path.join(out, 'orders.tsv.gz'), ['order_id', 'invoice_no', 'customer_id', 'ordered_at', 'country', 'order_type'], orders);
writeExtract(path.join(out, 'order_items.tsv.gz'), ['order_item_id', 'order_id', 'line_number', 'stock_code', 'description', 'quantity', 'unit_price'], items);
fs.writeFileSync(path.join(out, '../source.json'), JSON.stringify({
  file: 'online-retail-ii.zip', sha256, sourceRows, samplePercent: SAMPLE_PERCENT,
  window: ['2009-12-01', '2011-12-10'], extracted: { products: products.length, customers: customers.length, orders: orders.length, order_items: items.length },
}, null, 2) + '\n');
console.log({ sourceRows, products: products.length, customers: customers.length, orders: orders.length, items: items.length });
