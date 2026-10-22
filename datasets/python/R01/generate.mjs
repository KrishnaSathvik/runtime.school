/**
 * R01 Runtime Market: a fictional US online marketplace, 2024-01-01 to 2025-12-31.
 *
 * Deterministic: the same seed always produces the same rows. Every name, email and address is invented.
 * The shape follows real e-commerce behaviour (modelled on D02's transaction patterns): growth over time,
 * seasonality with a Black Friday/Cyber Monday spike and a December peak, weekday and hour-of-day rhythms,
 * a long tail of prices, a small share of customers placing most orders, products launching and being
 * discontinued, payment retries and split payments, cancellations, returns and refunds, and reviews that
 * get worse when delivery is late.
 *
 * generateMarket() returns the clean tables. Natural gaps only: optional fields that real systems leave empty.
 * The deliberately messy export is made from these by raw.mjs.
 */
import { createRng, ts, day, ms, DAY, HOUR, MINUTE, round2 } from '../../lib/rng.mjs';

export const R01_SEED = 20260101;
export const START = ms('2024-01-01');
export const END = ms('2025-12-31 23:59:59');

const CITIES = [
  ['New York', 'NY', 14], ['Los Angeles', 'CA', 10], ['Chicago', 'IL', 7], ['Houston', 'TX', 6], ['Phoenix', 'AZ', 4],
  ['Philadelphia', 'PA', 4], ['San Antonio', 'TX', 3], ['San Diego', 'CA', 3], ['Dallas', 'TX', 4], ['Austin', 'TX', 4],
  ['Seattle', 'WA', 5], ['Denver', 'CO', 4], ['Boston', 'MA', 4], ['Portland', 'OR', 3], ['Atlanta', 'GA', 4],
  ['Miami', 'FL', 4], ['Minneapolis', 'MN', 3], ['Nashville', 'TN', 2], ['Columbus', 'OH', 2], ['Raleigh', 'NC', 2],
  ['Salt Lake City', 'UT', 2], ['Kansas City', 'MO', 2], ['Pittsburgh', 'PA', 2], ['Sacramento', 'CA', 2], ['Tucson', 'AZ', 1],
  ['Albuquerque', 'NM', 1], ['Omaha', 'NE', 1], ['Boise', 'ID', 1], ['Burlington', 'VT', 1], ['Anchorage', 'AK', 1],
];
const FIRST = ['Ava', 'Liam', 'Maya', 'Noah', 'Zoe', 'Ethan', 'Priya', 'Lucas', 'Amara', 'Mateo', 'Hana', 'Omar', 'Elena', 'Kai', 'Sofia',
  'Jamal', 'Mei', 'Diego', 'Nora', 'Arjun', 'Leila', 'Samuel', 'Yuki', 'Isaac', 'Fatima', 'Leo', 'Grace', 'Ravi', 'Chloe', 'Tariq',
  'Ines', 'Owen', 'Aisha', 'Felix', 'Lena', 'Marcus', 'Rosa', 'Theo', 'Nadia', 'Hugo', 'Ana', 'Ben', 'Iris', 'Caleb', 'Mira', 'Jonah'];
const LAST = ['Garcia', 'Smith', 'Nguyen', 'Johnson', 'Patel', 'Kim', 'Brown', 'Lopez', 'Okafor', 'Williams', 'Chen', 'Davis', 'Haddad',
  'Miller', 'Singh', 'Wilson', 'Rossi', 'Moore', 'Tanaka', 'Clark', 'Mensah', 'Lewis', 'Novak', 'Walker', 'Silva', 'Young', 'Ali',
  'King', 'Ivanova', 'Scott', 'Murphy', 'Reyes', 'Cohen', 'Baker', 'Sato', 'Adams', 'Kowalski', 'Hill', 'Andersen', 'Green'];
const MAIL = [['gmail.com', 45], ['outlook.com', 15], ['yahoo.com', 12], ['icloud.com', 12], ['proton.me', 4], ['fastmail.com', 2], ['company', 10]];

/** category → [subcategories, median price, price spread, nouns, weight median kg]. */
const CATEGORIES = {
  electronics: [['audio', 'accessories', 'smart home', 'computing'], 59, 0.9, ['Headphones', 'Speaker', 'Charger', 'Cable', 'Webcam', 'Keyboard', 'Mouse', 'Smart Plug', 'Router', 'Monitor Stand', 'Power Bank', 'Earbuds'], 0.4],
  home: [['kitchen', 'decor', 'bedding', 'storage'], 32, 0.7, ['Mug Set', 'Throw Blanket', 'Pan', 'Knife Set', 'Vase', 'Pillow', 'Storage Bin', 'Lamp', 'Cutting Board', 'Candle', 'Sheet Set', 'Kettle'], 1.2],
  fashion: [['tops', 'outerwear', 'shoes', 'accessories'], 38, 0.6, ['T-Shirt', 'Hoodie', 'Jacket', 'Sneakers', 'Scarf', 'Beanie', 'Belt', 'Backpack', 'Socks', 'Rain Coat', 'Boots', 'Cap'], 0.5],
  beauty: [['skincare', 'hair', 'fragrance', 'tools'], 22, 0.6, ['Face Serum', 'Moisturizer', 'Shampoo', 'Conditioner', 'Perfume', 'Hair Dryer', 'Brush Set', 'Sunscreen', 'Lip Balm', 'Cleanser'], 0.3],
  sports: [['fitness', 'outdoor', 'cycling', 'yoga'], 45, 0.8, ['Yoga Mat', 'Dumbbells', 'Water Bottle', 'Tent', 'Bike Light', 'Resistance Bands', 'Running Belt', 'Hiking Poles', 'Jump Rope', 'Foam Roller'], 1.5],
  books: [['fiction', 'nonfiction', 'children', 'technical'], 16, 0.4, ['Novel', 'Cookbook', 'Field Guide', 'Picture Book', 'Workbook', 'Biography', 'Handbook', 'Atlas', 'Journal'], 0.6],
  toys: [['games', 'building', 'outdoor', 'learning'], 27, 0.6, ['Puzzle', 'Board Game', 'Building Kit', 'Kite', 'Card Game', 'Science Kit', 'Plush Toy', 'Train Set'], 0.8],
  grocery: [['coffee', 'snacks', 'tea', 'pantry'], 14, 0.5, ['Coffee Beans', 'Granola', 'Green Tea', 'Olive Oil', 'Hot Sauce', 'Trail Mix', 'Honey', 'Pasta', 'Dark Chocolate'], 0.7],
};
const ADJ = ['Classic', 'Compact', 'Everyday', 'Pro', 'Eco', 'Deluxe', 'Mini', 'Ultra', 'Essential', 'Studio', 'Travel', 'Organic', 'Premium', 'Lite', 'Heritage', 'Nordic'];
const SELLER_A = ['North', 'Blue', 'Maple', 'Harbor', 'Copper', 'Summit', 'Willow', 'Cedar', 'Bright', 'Golden', 'River', 'Pine', 'Atlas', 'Fern', 'Iron', 'Juniper'];
const SELLER_B = ['Goods', 'Supply', 'Trading Co', 'Outfitters', 'Studio', 'Market', 'Works', 'Collective', 'House', 'Labs'];

const MONTH = [0.86, 0.8, 0.92, 0.95, 1.0, 0.96, 0.94, 1.0, 0.98, 1.05, 1.32, 1.58];
const WEEKDAY = [1.12, 0.95, 0.94, 0.96, 1.0, 1.04, 1.15]; // Sunday first
const HOURS = [1, 0.6, 0.4, 0.3, 0.3, 0.5, 1, 2, 3, 3.6, 3.8, 4, 4.4, 4.3, 4, 4, 4.2, 4.6, 5.2, 6, 6.4, 5.6, 4, 2.2];

/** Black Friday is the fourth Thursday of November plus one day. */
function blackFriday(year) {
  const nov1 = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const thanksgiving = 1 + ((4 - nov1 + 7) % 7) + 21;
  return Date.UTC(year, 10, thanksgiving + 1);
}

function dayRate(t) {
  const d = new Date(t);
  const progress = (t - START) / (END - START);
  let rate = 26 * (1 + 0.65 * progress) * MONTH[d.getUTCMonth()] * WEEKDAY[d.getUTCDay()];
  const bf = blackFriday(d.getUTCFullYear());
  if (t === bf) rate *= 3.1;
  else if (t === bf + 3 * DAY) rate *= 2.5; // Cyber Monday
  else if (t > bf - 7 * DAY && t < bf + 7 * DAY) rate *= 1.4;
  if (d.getUTCMonth() === 11 && d.getUTCDate() >= 23) rate *= 0.7; // shipping cut-off before Christmas
  return rate;
}

const pad = (n, w) => String(n).padStart(w, '0');
const slug = s => s.toLowerCase().replace(/[^a-z]+/g, '');

/** Prefix-sum weighted picker over an array that only grows at the end. */
function grower() {
  const items = [], sums = [];
  return {
    add(item, w) { items.push(item); sums.push((sums.at(-1) ?? 0) + w); },
    pick(r) {
      const x = r * sums.at(-1);
      let lo = 0, hi = sums.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (sums[mid] > x) hi = mid; else lo = mid + 1; }
      return items[lo];
    },
    get size() { return items.length; },
  };
}

export function generateMarket(seed = R01_SEED, scale = 1) {
  const rng = createRng(seed);

  // ---- sellers ----
  const sellerRng = rng.fork('sellers');
  const sellers = [];
  const sellerNames = new Set();
  for (let i = 1; sellers.length < 60; i++) {
    const name = `${sellerRng.pick(SELLER_A)} ${sellerRng.pick(SELLER_B)}`;
    if (sellerNames.has(name)) continue;
    sellerNames.add(name);
    const [city, state] = sellerRng.weighted(CITIES.map(c => [c, c[2]]));
    sellers.push({
      seller_id: `S${pad(sellers.length + 1, 3)}`, name, city, state,
      joined_on: day(START - sellerRng.int(30, 900) * DAY),
      // Platform fee tier: most sellers on standard.
      tier: sellerRng.weighted([['standard', 70], ['plus', 22], ['enterprise', 8]]),
    });
  }

  // ---- products ----
  const prodRng = rng.fork('products');
  const products = [];
  const names = new Set();
  const cats = Object.entries(CATEGORIES);
  const catWeight = { electronics: 16, home: 18, fashion: 16, beauty: 12, sports: 11, books: 10, toys: 8, grocery: 9 };
  while (products.length < Math.round(800 * Math.sqrt(scale))) {
    const [category, [subs, median, spread, nouns, kg]] = prodRng.weighted(cats.map(c => [c, catWeight[c[0]]]));
    const name = `${prodRng.pick(ADJ)} ${prodRng.pick(nouns)}`;
    const full = names.has(name) ? `${name} ${prodRng.pick(['II', 'Plus', 'Max', 'XL', '2.0', 'Set'])}` : name;
    if (names.has(full)) continue;
    names.add(full);
    const id = products.length + 1;
    // Most of the catalogue existed before 2024; the rest launches during the period.
    const launched = prodRng.chance(0.72) ? START - prodRng.int(10, 700) * DAY : START + prodRng.int(0, 680) * DAY;
    const discontinued = prodRng.chance(0.09) ? Math.max(launched + 60 * DAY, START + prodRng.int(120, 700) * DAY) : null;
    const price = Math.max(3.5, prodRng.lognormal(median, spread));
    // Prices end in .99 or .49 like real shelves; a few are round.
    const shelf = prodRng.chance(0.8) ? Math.floor(price) + prodRng.pick([0.99, 0.99, 0.49]) : Math.round(price);
    products.push({
      product_id: `P${pad(id, 4)}`,
      sku: `${category.slice(0, 3).toUpperCase()}-${pad(prodRng.int(1000, 99999), 5)}`,
      name: full, category, subcategory: prodRng.pick(subs),
      seller_id: prodRng.chance(0.35) ? sellers[Math.floor(prodRng.next() ** 2.2 * sellers.length)].seller_id : prodRng.pick(sellers).seller_id,
      list_price: round2(shelf),
      weight_kg: prodRng.chance(0.025) ? null : round2(Math.max(0.05, prodRng.lognormal(kg, 0.6))),
      launched_on: day(launched),
      discontinued_on: discontinued && discontinued < END ? day(discontinued) : null,
      // Popularity is heavy-tailed: a few products sell a lot.
      _pop: prodRng.lognormal(1, 1.15),
      _launch: launched, _end: discontinued && discontinued < END ? discontinued : Infinity,
      // About 1 in 8 products has a price change during the period.
      _change: prodRng.chance(0.13) ? { at: START + prodRng.int(60, 680) * DAY, factor: prodRng.pick([0.85, 0.9, 1.08, 1.12, 1.2]) } : null,
    });
  }
  const byCategory = {};
  for (const p of products) (byCategory[p.category] ??= []).push(p);
  const priceAt = (p, t) => (p._change && t >= p._change.at ? round2(Math.floor(p.list_price * p._change.factor) + 0.99) : p.list_price);

  // ---- customers and orders, day by day ----
  const custRng = rng.fork('customers');
  const ordRng = rng.fork('orders');
  const customers = [];
  const orders = [], items = [], payments = [], reviews = [];
  const active = grower();
  const emails = new Set();
  const PROMOS = ['SPRING15', 'SUMMER10', 'BACK2SCHOOL', 'FREESHIP'];
  let ordSeq = 0, payTotal = 0, revSeq = 0;

  const newCustomer = t => {
    const first = custRng.pick(FIRST), last = custRng.pick(LAST);
    let [domain] = [custRng.weighted(MAIL)];
    const segment = custRng.chance(0.07) ? 'business' : 'consumer';
    if (domain === 'company' || segment === 'business') domain = `${slug(custRng.pick(SELLER_A))}${custRng.pick(['corp', 'co', 'studio', 'labs'])}.com`;
    let email;
    do { email = `${slug(first)}${custRng.pick(['.', '_', ''])}${slug(last)}${custRng.chance(0.45) ? custRng.int(1, 99) : ''}@${domain}`; } while (emails.has(email));
    emails.add(email);
    const [city, state] = custRng.weighted(CITIES.map(c => [c, c[2]]));
    const c = {
      customer_id: `C${pad(customers.length + 1, 5)}`, first_name: first, last_name: last, email,
      city: custRng.chance(0.03) ? null : city, state,
      segment, signup_at: ts(t + Math.floor(custRng.weighted(HOURS.map((w, h) => [h, w])) * HOUR + custRng.int(0, 59) * MINUTE)),
      marketing_opt_in: custRng.chance(0.38),
      // Purchase propensity: a heavy tail of loyal repeat buyers; ~1 in 5 never orders.
      _w: custRng.chance(0.2) ? 0 : Math.min(25, custRng.lognormal(1, 1.05)) * (segment === 'business' ? 1.8 : 1),
      _fav: custRng.weighted(cats.map(([k]) => [k, catWeight[k]])),
      _orders: 0,
    };
    customers.push(c);
    if (c._w > 0) active.add(c, c._w);
    return c;
  };
  // Customers who joined before the period.
  for (let i = 0; i < Math.round(900 * scale); i++) newCustomer(START - custRng.int(1, 720) * DAY);

  const bfYears = [2024, 2025].map(blackFriday);
  for (let t = START; t <= END; t += DAY) {
    const rate = dayRate(t) * scale;
    // New sign-ups follow traffic; a share place their first order the same day.
    const signups = ordRng.poisson(rate * 0.32);
    const fresh = [];
    for (let i = 0; i < signups; i++) fresh.push(newCustomer(t));
    const count = ordRng.poisson(rate);
    for (let i = 0; i < count; i++) {
      const firstTimers = fresh.filter(c => c._w > 0 && c._orders === 0);
      const c = firstTimers.length && ordRng.chance(0.45) ? firstTimers[0] : active.pick(ordRng.next());
      const signup = ms(c.signup_at);
      let at = t + Math.floor(ordRng.weighted(HOURS.map((w, h) => [h, w])) * HOUR + ordRng.int(0, 3599) * 1000);
      if (at < signup) at = signup + ordRng.int(2, 50) * MINUTE;
      if (at > END) continue;
      c._orders++;
      ordSeq++;
      const order_id = `O${pad(100000 + ordSeq, 6)}`;
      const inBf = bfYears.some(bf => at >= bf - 4 * DAY && at < bf + 4 * DAY);
      const promo = c._orders === 1 && ordRng.chance(0.4) ? 'WELCOME10'
        : inBf && ordRng.chance(0.55) ? 'BFCM25'
          : ordRng.chance(0.06) ? ordRng.pick(PROMOS) : null;
      const discount = promo === 'WELCOME10' ? 0.1 : promo === 'BFCM25' ? 0.25 : promo === 'SPRING15' ? 0.15 : promo === 'SUMMER10' || promo === 'BACK2SCHOOL' ? 0.1 : 0;

      // Line items: 1 + Poisson, products available on that date, often from the customer's favourite category.
      const lines = Math.min(8, 1 + ordRng.poisson(c.segment === 'business' ? 1.2 : 0.6));
      const chosen = new Set();
      let subtotal = 0;
      const lineRows = [];
      for (let n = 0; n < lines * 4 && lineRows.length < lines; n++) {
        const pool = ordRng.chance(0.42) ? byCategory[c._fav] : products;
        // Popularity-weighted choice via rejection sampling.
        const p = ordRng.pick(pool);
        if (chosen.has(p.product_id) || at < p._launch || at >= p._end || ordRng.next() * 6 > p._pop) continue;
        chosen.add(p.product_id);
        const qty = c.segment === 'business' && ordRng.chance(0.35) ? ordRng.int(2, 6) : ordRng.weighted([[1, 82], [2, 12], [3, 4], [4, 2]]);
        const unit = priceAt(p, at);
        const line = round2(qty * unit * (1 - discount));
        subtotal += line;
        lineRows.push({ order_id, line_no: lineRows.length + 1, product_id: p.product_id, quantity: qty, unit_price: unit, discount_rate: discount, line_total: line });
      }
      if (!lineRows.length) { ordSeq--; c._orders--; continue; }
      subtotal = round2(subtotal);
      const shipping = subtotal >= 50 || promo === 'FREESHIP' ? 0 : 5.99;
      const tax = round2(subtotal * 0.07);
      const total = round2(subtotal + shipping + tax);

      // Fulfilment. Recent orders are still in progress at the snapshot.
      const age = END - at;
      const shipAfter = (0.4 + ordRng.exponential(0.9)) * DAY;
      const transit = (ordRng.lognormal(2.6, 0.45) + (inBf ? 1.5 : 0) + (at % (365 * DAY) > 330 * DAY ? 0.8 : 0)) * DAY;
      let status = 'delivered';
      if (ordRng.chance(0.035)) status = 'cancelled';
      else if (age < shipAfter) status = 'processing';
      else if (age < shipAfter + transit) status = 'shipped';
      else if (ordRng.chance(c.segment === 'business' ? 0.02 : 0.045)) status = 'returned';
      const shipped = status === 'cancelled' || status === 'processing' ? null : at + shipAfter;
      const delivered = status === 'delivered' || status === 'returned' ? at + shipAfter + transit : null;
      const estimate = at + 6 * DAY;
      orders.push({
        order_id, customer_id: c.customer_id, ordered_at: ts(at), channel: ordRng.weighted([['web', 52], ['app', 38], ['phone', 3], ['marketplace', 7]]),
        status, promo_code: promo, subtotal, shipping_fee: shipping, tax, total,
        ship_city: c.city ?? custRng.pick(CITIES)[0], ship_state: c.state,
        shipped_at: shipped ? ts(shipped) : null, delivered_at: delivered ? ts(delivered) : null, estimated_delivery: day(estimate),
      });
      items.push(...lineRows);

      // Payments: failures and retries, split gift-card payments, refunds for returns, nothing captured for most cancellations.
      const method = ordRng.weighted([['card', 68], ['paypal', 17], ['apple_pay', 9], ['gift_card', 3], ['bank_transfer', 3]]);
      const pay = (attempt, m, st, amount, when) => payments.push({ payment_id: `PAY${pad(++payTotal, 7)}`, order_id, attempt, method: m, status: st, amount: round2(amount), created_at: ts(when) });
      let attempt = 1;
      if (ordRng.chance(0.04)) pay(attempt++, method, 'failed', total, at + 20 * 1000);
      if (status === 'cancelled' && ordRng.chance(0.7)) {
        // Cancelled before capture: an authorisation that was voided.
        pay(attempt, method, 'voided', total, at + 40 * 1000);
      } else if (method !== 'gift_card' && ordRng.chance(0.025)) {
        const gift = round2(Math.min(total - 1, ordRng.pick([10, 25, 50])));
        pay(attempt++, 'gift_card', 'captured', gift, at + 40 * 1000);
        pay(attempt, method, 'captured', total - gift, at + 45 * 1000);
      } else pay(attempt, method, 'captured', total, at + 40 * 1000);
      if (status === 'cancelled' && payments.at(-1).status === 'captured') pay(attempt + 1, method, 'refunded', -total, at + ordRng.int(1, 30) * HOUR);
      if (status === 'returned') pay(attempt + 1, method, 'refunded', -round2(subtotal + tax), delivered + ordRng.int(3, 20) * DAY);

      // Reviews: some delivered or returned lines get one, written after delivery. Late or returned → lower ratings.
      if (delivered) {
        const late = delivered > estimate + DAY;
        for (const line of lineRows) {
          if (!ordRng.chance(status === 'returned' ? 0.5 : 0.24)) continue;
          const when = delivered + ordRng.exponential(4) * DAY + HOUR;
          if (when > END) continue;
          const base = status === 'returned' ? [[1, 38], [2, 30], [3, 20], [4, 9], [5, 3]]
            : late ? [[1, 12], [2, 13], [3, 22], [4, 28], [5, 25]]
              : [[1, 3], [2, 4], [3, 9], [4, 27], [5, 57]];
          const rating = ordRng.weighted(base);
          reviews.push({
            review_id: `R${pad(++revSeq, 6)}`, order_id, product_id: line.product_id, customer_id: c.customer_id, rating,
            title: ordRng.chance(0.18) ? null : reviewTitle(ordRng, rating, late),
            body: ordRng.chance(0.45) ? null : reviewBody(ordRng, rating, late, status === 'returned'),
            created_at: ts(when), verified_purchase: true,
          });
        }
      }
    }
  }

  const strip = rows => rows.map(r => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_'))));
  return {
    customers: strip(customers), sellers, products: strip(products),
    orders, order_items: items, payments, reviews,
  };
}

function reviewTitle(rng, rating, late) {
  const t = {
    1: ['Very disappointed', 'Broke after a week', 'Not as described', 'Would not buy again'],
    2: ['Not great', 'Cheaply made', 'Expected more', 'Meh'],
    3: ['It is okay', 'Does the job', 'Average', 'Fine for the price'],
    4: ['Pretty good', 'Solid purchase', 'Happy with it', 'Good value'],
    5: ['Love it', 'Excellent', 'Exactly what I needed', 'Five stars', 'Great quality'],
  }[rating];
  return late && rating <= 3 ? rng.pick(['Arrived late', 'Slow delivery', ...t]) : rng.pick(t);
}

function reviewBody(rng, rating, late, returned) {
  const parts = [];
  if (late) parts.push(rng.pick(['Took longer than promised to arrive.', 'Delivery was a few days late.', 'Shipping was slow.']));
  if (returned) parts.push(rng.pick(['Sent it back.', 'Returned it for a refund.', 'Had to return this.']));
  parts.push(rng.pick({
    1: ['Stopped working almost immediately.', 'The quality is poor.', 'Nothing like the photos.'],
    2: ['Works, but feels flimsy.', 'Smaller than I expected.', 'The finish is rough.'],
    3: ['Does what it says, nothing more.', 'Okay overall.', 'Decent but not special.'],
    4: ['Good quality for the price.', 'Works well so far.', 'Would recommend with small caveats.'],
    5: ['Great quality and works perfectly.', 'Better than expected.', 'Already ordered another one.'],
  }[rating]));
  return parts.join(' ');
}
