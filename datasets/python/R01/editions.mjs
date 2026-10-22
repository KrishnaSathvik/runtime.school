/**
 * Cut an edition from the full market without breaking relationships: whole customers are kept with their
 * entire history (orders, lines, payments, reviews), and only the products and sellers they reference.
 * Customers are taken in a stable hashed order, so a bigger edition never reshuffles which ones appear.
 */
import { hash32 } from '../../lib/rng.mjs';

export function cutEdition(full, edition, targetOrders) {
  if (targetOrders === Infinity) return full;
  const ordersBy = new Map();
  for (const o of full.orders) (ordersBy.get(o.customer_id) ?? ordersBy.set(o.customer_id, []).get(o.customer_id)).push(o);
  const linesBy = new Map();
  for (const l of full.order_items) (linesBy.get(l.order_id) ?? linesBy.set(l.order_id, []).get(l.order_id)).push(l);
  const order = full.customers.slice().sort((a, b) => hash32(`${edition}|${a.customer_id}`) - hash32(`${edition}|${b.customer_id}`));
  const preview = edition === 'preview';
  // Small editions skip very heavy buyers so a few accounts don't fill them.
  const cap = preview ? 3 : Math.max(4, Math.round(targetOrders / 12));
  const keep = new Set();
  let orders = 0, lines = 0, nonBuyers = 0;
  for (const c of order) {
    const os = ordersBy.get(c.customer_id) ?? [];
    if (!os.length) {
      // Keep about one non-buyer per eight buyers, as in the full data (for left-join questions).
      if (nonBuyers * 8 < keep.size && !preview) { keep.add(c.customer_id); nonBuyers++; }
      continue;
    }
    if (os.length > cap || orders + os.length > targetOrders) continue;
    const n = os.reduce((s, o) => s + (linesBy.get(o.order_id)?.length ?? 0), 0);
    if (preview && lines + n > 25) continue;
    keep.add(c.customer_id);
    orders += os.length;
    lines += n;
    if (orders >= targetOrders) break;
  }
  const customers = full.customers.filter(c => keep.has(c.customer_id));
  const ords = full.orders.filter(o => keep.has(o.customer_id));
  const ids = new Set(ords.map(o => o.order_id));
  const items = full.order_items.filter(l => ids.has(l.order_id));
  const usedProducts = new Set(items.map(l => l.product_id));
  // Starter and standard also include some products nobody bought (for "never sold" questions).
  const products = full.products.filter(p => usedProducts.has(p.product_id) || (!preview && hash32(`${edition}|${p.product_id}`) % 10 === 0));
  const sellerIds = new Set(products.map(p => p.seller_id));
  return {
    customers,
    sellers: full.sellers.filter(s => sellerIds.has(s.seller_id)),
    products,
    orders: ords,
    order_items: items,
    payments: full.payments.filter(p => ids.has(p.order_id)),
    reviews: full.reviews.filter(r => ids.has(r.order_id)),
  };
}
