/**
 * D09 Open Food Facts: the 300 most-scanned products sold in the United States in each of six categories, as the
 * Open Food Facts search service (search.openfoodfacts.org) returned them. Open Database License (ODbL); individual contents under DbCL.
 * Run: node datasets/python/D09/acquire.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJson, sleep, today, writeJsonGz, writeSource } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const CATEGORIES = ['breakfast-cereals', 'chips-and-fries', 'plant-based-milk-alternatives', 'yogurts', 'chocolates', 'sodas'];
const FIELDS = 'code,product_name,brands,quantity,serving_size,categories_tags,countries_tags,labels_tags,allergens_tags,traces_tags,additives_tags,ingredients_text,ingredients_analysis_tags,nutriments,nutrition_data_per,nutriscore_grade,nova_group,ecoscore_grade,packaging_tags,created_t,last_modified_t,completeness';
const SEARCH = 'https://search.openfoodfacts.org/search';
// Main nutrients only; the API's nutriments object also carries dozens of rarely filled micronutrients.
const KEEP = /^(energy-kcal|energy|fat|saturated-fat|carbohydrates|sugars|fiber|proteins|salt|sodium)(_100g|_serving|_unit|_value)?$/;
const products = [];
const seen = new Set();
for (const category of CATEGORIES) {
  for (let page = 1; page <= 3; page++) {
    const q = encodeURIComponent(`categories_tags:"en:${category}" AND countries_tags:"en:united-states"`);
    const url = `${SEARCH}?q=${q}&fields=${FIELDS}&sort_by=-unique_scans_n&page_size=100&page=${page}`;
    const r = await getJson(url, { tries: 6 });
    for (const p of r.hits ?? []) {
      if (!p.code || seen.has(p.code)) continue;
      seen.add(p.code);
      if (p.nutriments) p.nutriments = Object.fromEntries(Object.entries(p.nutriments).filter(([k]) => KEEP.test(k)).sort(([a], [b]) => a.localeCompare(b)));
      products.push({ search_category: category, ...p });
    }
    console.log(category, page, (r.hits ?? []).length);
    await sleep(2500);
  }
}
writeJsonGz(path.join(dir, 'extract/products.json.gz'), products);
writeSource(dir, {
  publisher: 'Open Food Facts contributors',
  service: SEARCH,
  query: `q=categories_tags:"en:<category>" AND countries_tags:"en:united-states" for ${CATEGORIES.join(', ')}; sort_by=-unique_scans_n; 3 pages of 100 per category; fields=${FIELDS}`,
  retrieved: today(),
  licence: 'Open Database License (ODbL) 1.0 for the database; Database Contents License (DbCL) 1.0 for contents. This extract is offered under the ODbL. No product images are included.',
  attribution: 'Data from Open Food Facts (openfoodfacts.org), © Open Food Facts contributors, available under the Open Database License.',
  changes: 'Requested the listed fields (the search service does not index serving_size, additives, ingredients text, nutrition_data_per or packaging, so those are absent) and kept, inside nutriments, only energy, fat, saturated fat, carbohydrates, sugars, fiber, proteins, salt and sodium. Products appearing in two categories are kept once. Values are unchanged.',
  products: products.length,
});
console.log('D09 products', products.length);
