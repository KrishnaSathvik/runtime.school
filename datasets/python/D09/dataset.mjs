/**
 * D09 Open Food Facts: 1,799 of the most-scanned breakfast cereals, chips, plant-based milks, yogurts, chocolates and
 * sodas sold in the United States, recorded from the Open Food Facts search service (acquire.mjs →
 * extract/products.json.gz; source.json). ODbL: the edition files are offered under the ODbL with credit to
 * "Open Food Facts contributors". No images.
 *
 * Each edition has a flat products table (nutrients per 100 g as columns), a long product_tags table, and the
 * nested records as JSON and JSON Lines. Crowd-sourced data: gaps, free-text quantities, grades like "unknown",
 * and brand lists with stray spaces are all as contributors entered them.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonGz } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const col = (name, type, description, nullable = true) => ({ name, type, description, nullable });
const NUTRIENTS = [['energy-kcal_100g', 'energy_kcal_100g', 'Energy, kcal per 100 g'], ['fat_100g', 'fat_100g', 'Fat, g per 100 g'], ['saturated-fat_100g', 'saturated_fat_100g', 'Saturated fat, g per 100 g'],
  ['carbohydrates_100g', 'carbohydrates_100g', 'Carbohydrates, g per 100 g'], ['sugars_100g', 'sugars_100g', 'Sugars, g per 100 g'], ['fiber_100g', 'fiber_100g', 'Fibre, g per 100 g'],
  ['proteins_100g', 'proteins_100g', 'Protein, g per 100 g'], ['salt_100g', 'salt_100g', 'Salt, g per 100 g'], ['sodium_100g', 'sodium_100g', 'Sodium, g per 100 g']];
const TAG_KINDS = [['categories_tags', 'category'], ['labels_tags', 'label'], ['allergens_tags', 'allergen'], ['traces_tags', 'trace'], ['countries_tags', 'country'], ['ingredients_analysis_tags', 'analysis']];
const when = s => (typeof s === 'number' ? new Date(s * 1000).toISOString().replace('T', ' ').slice(0, 19) : null);

function generate() {
  const records = readJsonGz(path.join(dir, 'extract/products.json.gz'));
  const products = records.map(r => ({
    code: r.code, product_name: r.product_name ?? null, brands: r.brands?.join(',') ?? null, quantity: r.quantity ?? null, search_category: r.search_category,
    nutriscore_grade: r.nutriscore_grade ?? null, nova_group: r.nova_group ?? null, ecoscore_grade: r.ecoscore_grade ?? null, completeness: r.completeness ?? null,
    created_at: when(r.created_t), last_modified_at: when(r.last_modified_t),
    ...Object.fromEntries(NUTRIENTS.map(([k, name]) => [name, r.nutriments?.[k] ?? null])),
  }));
  const product_tags = records.flatMap(r => TAG_KINDS.flatMap(([field, kind]) => [...new Set(r[field] ?? [])].map(tag => ({ code: r.code, kind, tag }))));
  return { products, product_tags, records };
}

const EDITIONS = { preview: { limit: 25, category: 'breakfast-cereals' }, starter: { category: 'breakfast-cereals' }, standard: {} };

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  let products = full.products.filter(p => !e.category || p.search_category === e.category);
  if (e.limit) products = products.slice(0, e.limit);
  const codes = new Set(products.map(p => p.code));
  return { products, product_tags: full.product_tags.filter(t => codes.has(t.code)) };
}

function extraFiles(tables, edition, full) {
  const codes = new Set(tables.products.map(p => p.code));
  const records = full.records.filter(r => codes.has(r.code));
  return [
    { path: 'products.json', table: 'products', text: JSON.stringify({ count: records.length, products: records }) + '\n', rows: records.length },
    { path: 'products.jsonl', table: 'products', text: records.map(r => JSON.stringify(r)).join('\n') + '\n', rows: records.length },
  ];
}

function realIssues({ products: p }) {
  return [
    { id: 'no_nutrients', description: 'Products with no nutrition values at all', count: p.filter(x => NUTRIENTS.every(([, n]) => x[n] === null)).length },
    { id: 'grade_unknown', description: 'Nutri-Score recorded as "unknown" or "not-applicable" instead of a–e', count: p.filter(x => x.nutriscore_grade && !/^[a-e]$/.test(x.nutriscore_grade)).length },
    { id: 'no_quantity', description: 'Products with no package quantity', count: p.filter(x => !x.quantity).length },
    { id: 'quantity_text', description: 'Quantities as free text in mixed units ("450g", "12 oz", "1.89 L")', count: p.filter(x => x.quantity).length },
    { id: 'brand_spaces', description: 'Brand lists with stray spaces around names', count: p.filter(x => x.brands && /(^ |, | ,| $)|,\s/.test(x.brands)).length },
    { id: 'leading_zeros', description: 'Barcodes that start with 0 (lost if read as numbers)', count: p.filter(x => x.code.startsWith('0')).length },
    { id: 'salt_sodium', description: 'Products where salt ≠ 2.5 × sodium (rounded or entered separately)', count: p.filter(x => x.salt_100g !== null && x.sodium_100g !== null && Math.abs(x.salt_100g - 2.5 * x.sodium_100g) > 0.02).length },
  ];
}

const dataset = {
  id: 'D09',
  title: 'Open Food Facts Products',
  version: 1,
  seed: null,
  description:
    'Packaged foods sold in the United States, from the crowd-sourced Open Food Facts database: cereals, chips, ' +
    'plant-based milks, yogurts, chocolates and sodas, with nutrition per 100 g, grades, labels, allergens and ' +
    'categories as nested lists.',
  licence: { name: 'Open Database License (ODbL) 1.0; contents DbCL 1.0', status: 'cleared' },
  attribution: 'Data from Open Food Facts (openfoodfacts.org), © Open Food Facts contributors, available under the Open Database License.',
  source: 'Open Food Facts search service, six US categories by scan count (datasets/python/D09/source.json)',
  generator: 'datasets/python/D09/dataset.mjs from datasets/python/D09/extract',
  window: ['2012-01-01', '2026-10-18'],
  tables: {
    products: {
      description: 'One packaged food product.',
      primaryKey: ['code'],
      columns: [
        col('code', 'text', 'Barcode (keep as text: many start with 0)', false), col('product_name', 'text', 'Name as entered'),
        col('brands', 'text', 'Brands, comma-separated as entered'), col('quantity', 'text', 'Package size as free text'),
        col('search_category', 'text', 'Which of the six categories it was collected from', false),
        col('nutriscore_grade', 'text', 'Nutri-Score a–e, or unknown / not-applicable'), col('nova_group', 'integer', 'How processed it is, from 1 (unprocessed) to 4 (ultra-processed)'),
        col('ecoscore_grade', 'text', 'Environmental score a-plus–f, or unknown'), col('completeness', 'decimal', 'How complete the record is, 0–1'),
        col('created_at', 'timestamp', 'When the product was added, UTC'), col('last_modified_at', 'timestamp', 'Last edit, UTC'),
        ...NUTRIENTS.map(([, name, d]) => col(name, 'decimal', d)),
      ],
    },
    product_tags: {
      description: 'One tag on one product: categories, labels, allergens, traces, countries and ingredient analysis.',
      primaryKey: ['code', 'kind', 'tag'],
      foreignKeys: [{ column: 'code', references: 'products.code' }],
      columns: [col('code', 'text', 'Product barcode', false), col('kind', 'text', 'category, label, allergen, trace, country or analysis', false), col('tag', 'text', 'Tag, with language prefix (en:organic)', false)],
    },
  },
  editions: Object.fromEntries(Object.keys(EDITIONS).map(k => [k, k])),
  stress: false,
  generate,
  cutEdition,
  extraFiles,
  realIssues,
};

export default dataset;
