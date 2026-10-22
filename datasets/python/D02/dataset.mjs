/**
 * D02 UCI Online Retail II: real invoice lines from a UK online gift wholesaler, December 2009 – December 2011,
 * in the source's own column layout (Invoice, StockCode, Description, Quantity, InvoiceDate, Price, Customer ID,
 * Country). Python reuses the pinned extract the SQL retail dataset already commits (datasets/retail/extract,
 * provenance in datasets/retail/source.json): a deterministic 14% customer sample. Nothing is injected; every
 * problem in it is a real one (cancellations, negative quantities, anonymous invoices, repeated lines, fees).
 * CC BY 4.0: credit Chen (2012), UCI Machine Learning Repository.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readExtract } from '../../lib/extract.mjs';

const EXTRACT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../retail/extract');
const col = (name, type, description, nullable = false) => ({ name, type, description, nullable });
const read = (name, numeric) => {
  const { columns, rows } = readExtract(path.join(EXTRACT, `${name}.tsv.gz`), numeric);
  return rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
};

function generate() {
  const orders = new Map(read('orders', ['order_id', 'customer_id']).map(o => [o.order_id, o]));
  const items = read('order_items', ['order_item_id', 'order_id', 'line_number', 'quantity', 'unit_price']);
  // One row per invoice line, in invoice then line order, shaped like the published workbook.
  const invoice_lines = items.map(it => {
    const o = orders.get(it.order_id);
    return {
      Invoice: o.order_type === 'cancellation' ? `C${o.invoice_no}` : String(o.invoice_no),
      StockCode: it.stock_code,
      Description: it.description,
      Quantity: it.quantity,
      InvoiceDate: o.ordered_at,
      Price: it.unit_price,
      'Customer ID': o.customer_id,
      Country: o.country,
    };
  });
  const products = read('products', ['list_price']);
  const customers = read('customers', ['customer_id']);
  return { invoice_lines, products, customers };
}

const EDITIONS = {
  preview: { from: '2010-12-01', to: '2010-12-01 23:59:59', limit: 25 },
  starter: { from: '2010-12-01', to: '2010-12-07 23:59:59' },
  standard: { from: '2010-09-01', to: '2010-11-30 23:59:59' },
  full: { from: '0000', to: '9999' },
};

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  let lines = full.invoice_lines.filter(l => l.InvoiceDate >= e.from && l.InvoiceDate <= e.to);
  if (e.limit) lines = lines.slice(0, e.limit);
  const codes = new Set(lines.map(l => l.StockCode));
  const ids = new Set(lines.map(l => l['Customer ID']).filter(x => x !== null));
  return {
    invoice_lines: lines,
    products: full.products.filter(p => codes.has(p.stock_code)),
    customers: full.customers.filter(c => ids.has(c.customer_id)),
  };
}

const FEES = new Set(['POST', 'DOT', 'M', 'C2', 'D', 'BANK CHARGES', 'ADJUST', 'S', 'AMAZONFEE', 'B', 'CRUK', 'PADS']);

function realIssues({ invoice_lines: l }) {
  const seen = new Set();
  let dupes = 0;
  for (const r of l) {
    const k = JSON.stringify(r);
    if (seen.has(k)) dupes++;
    seen.add(k);
  }
  return [
    { id: 'cancellations', description: 'Cancellation lines: Invoice starts with C and Quantity is negative', count: l.filter(r => r.Invoice.startsWith('C')).length },
    { id: 'anonymous', description: 'Lines with no Customer ID (walk-in or unregistered buyers)', count: l.filter(r => r['Customer ID'] === null).length },
    { id: 'duplicate_lines', description: 'Lines identical to an earlier line in every column', count: dupes },
    { id: 'zero_price', description: 'Lines with Price 0 (adjustments, samples, damaged stock)', count: l.filter(r => r.Price === 0).length },
    { id: 'fees', description: 'Non-product codes: postage, carriage, manual adjustments, bank and marketplace fees', count: l.filter(r => FEES.has(r.StockCode) || r.StockCode.startsWith('gift_')).length },
    { id: 'missing_description', description: 'Lines with an empty Description', count: l.filter(r => r.Description === null || r.Description === '').length },
  ];
}

const dataset = {
  id: 'D02',
  title: 'UCI Online Retail II',
  version: 1,
  seed: null,
  description:
    'Real invoice lines from a UK online gift wholesaler, December 2009 – December 2011, in the source’s own layout. ' +
    'A deterministic 14% sample of customers (and of anonymous invoices). Cancellations, refunds, fees, anonymous buyers ' +
    'and repeated lines are all real.',
  licence: { name: 'CC BY 4.0', status: 'cleared' },
  attribution: 'Chen, D. (2012). Online Retail II [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5CG6D. Sampled and reshaped by Runtime.',
  source: 'UCI Machine Learning Repository, Online Retail II (2019), via datasets/retail/extract (datasets/retail/source.json)',
  generator: 'datasets/python/D02/dataset.mjs from datasets/retail/extract',
  window: ['2009-12-01', '2011-12-09'],
  tables: {
    invoice_lines: {
      description: 'One line of an invoice, as the wholesaler’s system recorded it. Not unique: the same line can appear twice.',
      primaryKey: [],
      // The export's own column names, so the joins aren't obvious from the names alone.
      foreignKeys: [
        { column: 'StockCode', references: 'products.stock_code' },
        { column: 'Customer ID', references: 'customers.customer_id' },
      ],
      columns: [
        col('Invoice', 'text', 'Invoice number; a leading C marks a cancellation'),
        col('StockCode', 'text', 'Product code; some codes are fees or adjustments, not products'),
        col('Description', 'text', 'Line description as typed on the invoice', true),
        col('Quantity', 'integer', 'Units; negative on cancellations'),
        col('InvoiceDate', 'timestamp', 'Invoice date and time (UK local time)'),
        col('Price', 'decimal', 'Unit price in pounds sterling'),
        col('Customer ID', 'integer', 'Customer number; empty for anonymous invoices', true),
        col('Country', 'text', 'Customer country'),
      ],
    },
    products: {
      description: 'One stock code, with the description and price it most often had.',
      primaryKey: ['stock_code'],
      columns: [col('stock_code', 'text', 'Stock code'), col('description', 'text', 'Most common description', true), col('list_price', 'decimal', 'Most common unit price; empty when never sold at a price', true), col('first_sold_at', 'timestamp', 'First invoice with this code', true)],
    },
    customers: {
      description: 'One registered customer who appears in these invoices.',
      primaryKey: ['customer_id'],
      columns: [col('customer_id', 'integer', 'Customer number'), col('country', 'text', 'Country'), col('first_order_at', 'timestamp', 'First invoice')],
    },
  },
  editions: Object.fromEntries(Object.keys(EDITIONS).map(k => [k, k])),
  parquet: { tables: ['invoice_lines'] },
  stress: false,
  generate,
  cutEdition,
  realIssues,
};

export default dataset;
