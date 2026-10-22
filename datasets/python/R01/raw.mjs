/**
 * The messy export: what Runtime Market's tables look like when pulled from production systems.
 * Built from clean tables with deliberate, counted problems. Each problem is reported with the number
 * of rows it actually changed, so lessons can say exactly what learners will find.
 */
import { createRng } from '../../lib/rng.mjs';
import { money } from '../lib/csv.mjs';

const pad = (n, w) => String(n).padStart(w, '0');

export const RAW_ISSUES = {
  'email-case-whitespace': 'Emails with uppercase letters or surrounding spaces',
  'city-inconsistent': 'City names with inconsistent case or stray spaces',
  'duplicate-customer': 'The same person signed up twice: a second customer_id with the same email in different case',
  'duplicate-rows': 'Exact duplicate order rows from a retried export',
  'mixed-date-format': 'ordered_at written as MM/DD/YYYY HH:MM instead of YYYY-MM-DD HH:MM:SS',
  'status-variants': 'Status values with different case or surrounding spaces',
  'currency-text': 'unit_price written with a dollar sign, so the column is text',
  'negative-quantity': 'Return lines entered as extra rows with a negative quantity',
  'orphan-product': 'product_id values that are not in the product catalogue',
  'missing-quantity': 'quantity left empty',
  'price-with-unit': 'list_price written with a currency suffix, e.g. "12.99 USD"',
  'category-case': 'Category names with inconsistent capitalisation',
};

export function makeRaw(clean, seed) {
  const rng = createRng(seed);
  const counts = Object.fromEntries(Object.keys(RAW_ISSUES).map(k => [k, 0]));
  // At least one of each problem when a table is big enough to hide it.
  const howMany = (n, rate) => (n >= 10 ? Math.max(1, Math.round(n * rate)) : 0);
  const sample = (rows, k) => new Set(rng.shuffle(rows.map((_, i) => i)).slice(0, k));

  // customers
  const customers = clean.customers.map(c => ({ ...c, marketing_opt_in: c.marketing_opt_in }));
  for (const i of sample(customers, howMany(customers.length, 0.04))) {
    const e = customers[i].email;
    customers[i].email = rng.pick([` ${e} `, `${e} `, e[0].toUpperCase() + e.slice(1), e.toUpperCase()]);
    if (customers[i].email !== e) counts['email-case-whitespace']++;
  }
  for (const i of sample(customers, howMany(customers.length, 0.06))) {
    const city = customers[i].city;
    if (!city) continue;
    const variant = rng.pick([city.toLowerCase(), city.toUpperCase(), `${city} `, ` ${city}`]);
    if (variant !== city) { customers[i].city = variant; counts['city-inconsistent']++; }
  }
  let nextId = Math.max(...clean.customers.map(c => Number(c.customer_id.slice(1)))) + 1;
  for (const i of sample(clean.customers, howMany(clean.customers.length, 0.015))) {
    const c = clean.customers[i];
    customers.push({ ...c, customer_id: `C${pad(nextId++, 5)}`, email: c.email.toUpperCase(), marketing_opt_in: !c.marketing_opt_in });
    counts['duplicate-customer']++;
  }

  // orders
  const orders = clean.orders.map(o => ({ ...o }));
  for (const i of sample(orders, howMany(orders.length, 0.03))) {
    const [d, t] = orders[i].ordered_at.split(' ');
    const [y, m, dd] = d.split('-');
    orders[i].ordered_at = `${m}/${dd}/${y} ${t.slice(0, 5)}`;
    counts['mixed-date-format']++;
  }
  for (const i of sample(orders, howMany(orders.length, 0.03))) {
    const s = orders[i].status;
    const v = rng.pick([s[0].toUpperCase() + s.slice(1), s.toUpperCase(), ` ${s}`, `${s} `]);
    orders[i].status = v;
    counts['status-variants']++;
  }
  const dupes = [...sample(orders, howMany(orders.length, 0.02))].sort((a, b) => a - b);
  for (const i of dupes.reverse()) { orders.splice(i + 1, 0, { ...orders[i] }); counts['duplicate-rows']++; }

  // order_items
  const items = clean.order_items.map(r => ({ ...r }));
  for (const i of sample(items, howMany(items.length, 0.03))) { items[i].unit_price = `$${money(items[i].unit_price)}`; counts['currency-text']++; }
  for (const i of sample(items, howMany(items.length, 0.005))) { items[i].product_id = `P${pad(9000 + rng.int(0, 999), 4)}`; counts['orphan-product']++; }
  for (const i of sample(items, howMany(items.length, 0.005))) { items[i].quantity = null; counts['missing-quantity']++; }
  const returned = new Set(clean.orders.filter(o => o.status === 'returned').map(o => o.order_id));
  const returnLines = clean.order_items.filter(r => returned.has(r.order_id));
  const lastLine = {};
  for (const r of clean.order_items) lastLine[r.order_id] = Math.max(lastLine[r.order_id] ?? 0, r.line_no);
  for (const i of sample(returnLines, Math.min(returnLines.length, howMany(clean.order_items.length, 0.01)))) {
    const r = returnLines[i];
    items.push({ ...r, line_no: ++lastLine[r.order_id], quantity: -r.quantity, line_total: -r.line_total });
    counts['negative-quantity']++;
  }

  // products
  const products = clean.products.map(p => ({ ...p }));
  for (const i of sample(products, howMany(products.length, 0.04))) { products[i].list_price = `${money(products[i].list_price)} USD`; counts['price-with-unit']++; }
  for (const i of sample(products, howMany(products.length, 0.05))) {
    const c = products[i].category;
    products[i].category = rng.chance(0.5) ? c[0].toUpperCase() + c.slice(1) : c.toUpperCase();
    counts['category-case']++;
  }

  return { tables: { customers, orders, order_items: items, products }, counts };
}
