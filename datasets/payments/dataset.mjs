import { col, fk, table } from '../lib/schema.mjs';
import { createRng, ts, ms, DAY, HOUR, MINUTE } from '../lib/rng.mjs';
import { FIRST_NAMES, LAST_NAMES, COMPANY_A, US_CITIES } from '../lib/names.mjs';
import { distinct, maxShare } from '../lib/contract.mjs';

const SEED = 20253;
const GENERATOR_VERSION = '3.0.0';
const START = ms('2025-01-01 00:00:00');
const END = ms('2025-07-01 00:00:00');
const CUSTOMERS = 1120;

/** Merchant categories with ISO 18245 merchant category codes and typical ticket sizes (USD). */
const CATEGORIES = [
  ['Grocery stores', '5411', 46, 0.6, 16], ['Restaurants', '5812', 34, 0.55, 12], ['Fast food', '5814', 12, 0.45, 14], ['Gas stations', '5541', 48, 0.3, 9],
  ['Taxis and rideshare', '4121', 19, 0.5, 6], ['Drug stores', '5912', 22, 0.6, 5], ['Department stores', '5311', 64, 0.7, 4], ['Electronics', '5732', 140, 0.8, 2],
  ['Hotels', '7011', 210, 0.5, 1.2], ['Airlines', '4511', 310, 0.5, 1], ['Misc retail', '5999', 28, 0.7, 8], ['Clothing', '5651', 58, 0.6, 4],
  ['Home supply', '5200', 72, 0.8, 3], ['Bookstores', '5942', 24, 0.4, 1.5], ['Streaming services', '4899', 15, 0.3, 0], ['Gyms and clubs', '7997', 42, 0.3, 0],
  ['Telecom', '4814', 75, 0.25, 0], ['Utilities', '4900', 120, 0.35, 0],
];
const STREAMING = [8.99, 11.99, 15.49, 17.99, 22.99, 6.99, 13.99];
const FX = { EUR: 1.09, GBP: 1.27, CAD: 0.73, MXN: 0.055 };
const FOREIGN = [['Paris', 'FR', 'EUR'], ['Rome', 'IT', 'EUR'], ['London', 'GB', 'GBP'], ['Toronto', 'CA', 'CAD'], ['Vancouver', 'CA', 'CAD'], ['Cancun', 'MX', 'MXN'], ['Berlin', 'DE', 'EUR']];
const EMPLOYERS = ['Northwind Health', 'Lakeside School District', 'Summit Logistics', 'Brightline Retail', 'Orbit Software', 'County of Riverside', 'Harbor Hospital', 'Pioneer Manufacturing', 'Cedar Bank', 'Atlas Consulting'];

const tables = [
  table('customers', 'One fictional retail-banking customer.', [
    col('customer_id', 'INTEGER', 'Customer key'),
    col('full_name', 'TEXT', 'Fictional name'),
    col('city', 'TEXT', 'Home city'),
    col('state', 'TEXT', 'Home state'),
    col('date_of_birth', 'TEXT', 'Date of birth'),
    col('customer_since', 'TEXT', 'Relationship start date'),
    col('risk_tier', 'TEXT', 'low, medium or high (internal credit-risk tier)'),
  ]),
  table('accounts', 'One deposit or credit-card account owned by one customer.', [
    col('account_id', 'INTEGER', 'Account key'),
    col('customer_id', 'INTEGER', 'Owner'),
    col('account_type', 'TEXT', 'checking, savings or credit_card'),
    col('opened_at', 'TEXT', 'Opening date'),
    col('closed_at', 'TEXT', 'Closing date; NULL while open', true),
    col('credit_limit_cents', 'INTEGER', 'Credit limit for credit cards; NULL for deposit accounts', true),
    col('opening_balance_cents', 'INTEGER', 'Ledger balance at 2025-01-01 00:00 (or 0 if opened later); credit-card balances owed are negative'),
  ], { foreignKeys: [fk('customer_id', 'customers')], indexes: [['customer_id']] }),
  table('cards', 'One payment card. Lost or expired cards are replaced by a new card on the same account.', [
    col('card_id', 'INTEGER', 'Card key'),
    col('account_id', 'INTEGER', 'Funding account (checking for debit, credit_card for credit)'),
    col('card_type', 'TEXT', 'debit or credit'),
    col('network', 'TEXT', 'visa, mastercard or amex'),
    col('last4', 'TEXT', 'Last four digits'),
    col('issued_at', 'TEXT', 'Issue date'),
    col('expires_on', 'TEXT', 'Expiry date'),
    col('status', 'TEXT', 'active, lost, expired or frozen'),
  ], { foreignKeys: [fk('account_id', 'accounts')], indexes: [['account_id']] }),
  table('merchants', 'One card-accepting merchant location.', [
    col('merchant_id', 'INTEGER', 'Merchant key'),
    col('merchant_name', 'TEXT', 'Fictional merchant name'),
    col('category', 'TEXT', 'Merchant category'),
    col('mcc', 'TEXT', 'ISO 18245 merchant category code'),
    col('city', 'TEXT', 'City'),
    col('country', 'TEXT', 'ISO country code'),
  ], { indexes: [['category']] }),
  table('authorizations', 'One card authorization request. The same request can appear more than once when the network retries.', [
    col('authorization_id', 'INTEGER', 'Authorization key'),
    col('request_key', 'TEXT', 'Merchant request id; a retried request reuses it'),
    col('card_id', 'INTEGER', 'Card presented'),
    col('merchant_id', 'INTEGER', 'Merchant'),
    col('requested_at', 'TEXT', 'Request time (UTC)'),
    col('amount', 'REAL', 'Requested amount in the transaction currency'),
    col('currency', 'TEXT', 'USD, EUR, GBP, CAD or MXN'),
    col('channel', 'TEXT', 'in_store, online or recurring'),
    col('status', 'TEXT', 'approved or declined'),
    col('decline_reason', 'TEXT', 'insufficient_funds, credit_limit, suspected_fraud, expired_card or card_frozen; NULL when approved', true),
  ], { foreignKeys: [fk('card_id', 'cards'), fk('merchant_id', 'merchants')], indexes: [['card_id'], ['merchant_id'], ['requested_at'], ['request_key']] }),
  table('settlements', 'One completed card purchase. The final amount can differ from the authorization (tips, hotels, currency conversion).', [
    col('settlement_id', 'INTEGER', 'Settlement key'),
    col('authorization_id', 'INTEGER', 'Authorization being cleared'),
    col('settled_at', 'TEXT', 'Clearing time (UTC)'),
    col('amount_cents', 'INTEGER', 'Cleared amount in US cents'),
  ], { foreignKeys: [fk('authorization_id', 'authorizations')], indexes: [['authorization_id'], ['settled_at']] }),
  table('refunds', 'One merchant refund against a settlement; a settlement can have several partial refunds.', [
    col('refund_id', 'INTEGER', 'Refund key'),
    col('settlement_id', 'INTEGER', 'Settlement refunded'),
    col('refunded_at', 'TEXT', 'Refund time (UTC)'),
    col('amount_cents', 'INTEGER', 'Refunded US cents (positive)'),
    col('reason', 'TEXT', 'returned_item, price_adjustment, canceled_service or duplicate_charge'),
  ], { foreignKeys: [fk('settlement_id', 'settlements')], indexes: [['settlement_id']] }),
  table('chargebacks', 'One cardholder dispute against a settlement.', [
    col('chargeback_id', 'INTEGER', 'Dispute key'),
    col('settlement_id', 'INTEGER', 'Disputed settlement'),
    col('opened_at', 'TEXT', 'Dispute opened (UTC)'),
    col('amount_cents', 'INTEGER', 'Disputed US cents'),
    col('reason_code', 'TEXT', 'fraud, not_received, not_as_described or duplicate'),
    col('status', 'TEXT', 'credited (cardholder won), rejected or open'),
    col('resolved_at', 'TEXT', 'Resolution time; NULL while open', true),
  ], { foreignKeys: [fk('settlement_id', 'settlements')], indexes: [['settlement_id']] }),
  table('transactions', 'One money movement on an account. Negative amounts are money out. Pending entries have no posted time yet.', [
    col('transaction_id', 'INTEGER', 'Ledger entry key'),
    col('account_id', 'INTEGER', 'Account'),
    col('transaction_type', 'TEXT', 'Kind of money movement (purchase, refund, transfer, fee, and similar)'),
    col('status', 'TEXT', 'posted, pending or reversed'),
    col('amount_cents', 'INTEGER', 'Signed US cents'),
    col('initiated_at', 'TEXT', 'When the movement started (UTC)'),
    col('posted_at', 'TEXT', 'When it reached the ledger; NULL while pending or after reversal', true),
    col('description', 'TEXT', 'Statement description'),
    col('merchant_id', 'INTEGER', 'Merchant for card and bill entries', true),
    col('authorization_id', 'INTEGER', 'Card authorization for card purchases', true),
    col('refund_id', 'INTEGER', 'Refund credited', true),
    col('chargeback_id', 'INTEGER', 'Dispute credited', true),
  ], { foreignKeys: [fk('account_id', 'accounts'), fk('merchant_id', 'merchants'), fk('authorization_id', 'authorizations'), fk('refund_id', 'refunds'), fk('chargeback_id', 'chargebacks')], indexes: [['account_id', 'posted_at'], ['authorization_id'], ['transaction_type']] }),
];

function generate() {
  const rng = createRng(SEED);
  const customers = [], accounts = [], cards = [], merchants = [], auths = [], settlements = [], refunds = [], chargebacks = [];
  // Merchants: domestic locations per category plus a few foreign merchants.
  const merchantsBy = new Map();
  for (const [category, mcc, , , weight] of CATEGORIES) {
    const n = Math.max(8, Math.round(weight * 11));
    for (let i = 0; i < n; i++) {
      const [city, state] = rng.weighted(US_CITIES.map(c => [c, c[2]]));
      const id = merchants.length + 1;
      const brand = `${rng.pick(COMPANY_A)} ${category.split(' ')[0].replace(/s$/, '')}`;
      merchants.push([id, `${brand} #${rng.int(10, 999)}`, category, mcc, `${city}, ${state}`, 'US']);
      (merchantsBy.get(category) ?? merchantsBy.set(category, []).get(category)).push({ id, currency: 'USD' });
    }
  }
  for (const [city, country, currency] of FOREIGN) for (const category of ['Restaurants', 'Hotels', 'Misc retail', 'Taxis and rideshare']) {
    const id = merchants.length + 1;
    merchants.push([id, `${rng.pick(COMPANY_A)} ${category.split(' ')[0]} ${city}`, category, CATEGORIES.find(c => c[0] === category)[1], city, country]);
    (merchantsBy.get(`foreign:${category}`) ?? merchantsBy.set(`foreign:${category}`, []).get(`foreign:${category}`)).push({ id, currency, country });
  }
  const catInfo = Object.fromEntries(CATEGORIES.map(c => [c[0], { median: c[2], sigma: c[3], weight: c[4] }]));
  const shopping = CATEGORIES.filter(c => c[4] > 0).map(c => [c[0], c[4]]);

  let authSeq = 0, requestSeq = 0;
  const pendingLedger = [];
  const post = (account, type, status, amount, initiated, posted, description, extra = {}) =>
    pendingLedger.push([0, account, type, status, Math.round(amount), ts(initiated), posted === null ? null : ts(posted), description, extra.merchant ?? null, extra.auth ?? null, extra.refund ?? null, extra.chargeback ?? null, initiated]);

  for (let c = 0; c < CUSTOMERS; c++) {
    const r = rng.fork(`customer:${c}`);
    const customerId = c + 1;
    const [city, state] = r.weighted(US_CITIES.map(x => [x, x[2]]));
    const since = START - Math.floor(r.exponential(4 * 365) * DAY) + (r.chance(0.12) ? Math.floor(r.float(0.05, 0.9) * (END - START)) + 4 * 365 * DAY : 0);
    const sinceMs = Math.min(since, END - 20 * DAY);
    const risk = r.weighted([['low', 55], ['medium', 33], ['high', 12]]);
    const dob = ms('1950-01-01 00:00:00') + Math.floor(r.float(0, 1) ** 0.8 * (ms('2006-01-01 00:00:00') - ms('1950-01-01 00:00:00')));
    customers.push([customerId, `${r.pick(FIRST_NAMES)} ${r.pick(LAST_NAMES)}`, city, state, ts(dob).slice(0, 10), ts(sinceMs).slice(0, 10), risk]);
    const affluence = r.lognormal(1, 0.55);

    const openAccount = (type, opened, balance, limit = null) => {
      const id = accounts.length + 1;
      accounts.push([id, customerId, type, ts(opened).slice(0, 10), null, limit, opened < START ? balance : 0]);
      return { id, type, balance: opened < START ? balance : 0, holds: 0, limit, opened };
    };
    const checking = openAccount('checking', sinceMs, Math.round(r.lognormal(1800, 0.9) * affluence * 100));
    const wantsSavings = r.chance(0.45 * Math.min(1.6, affluence));
    const savingsOpened = sinceMs + r.int(0, 400) * DAY, savingsBalance = Math.round(r.lognormal(6000, 1.1) * affluence * 100);
    const savings = wantsSavings && savingsOpened < END - 7 * DAY ? openAccount('savings', savingsOpened, savingsBalance) : null;
    const hasCredit = r.chance(risk === 'high' ? 0.35 : 0.6);
    const limit = hasCredit ? Math.round((risk === 'low' ? r.int(50, 150) : risk === 'medium' ? r.int(20, 80) : r.int(5, 25)) * 100 * affluence) * 100 : null;
    const creditOpened = sinceMs + r.int(0, 600) * DAY, creditBalance = hasCredit ? -Math.round(r.float(0, 0.4) * limit) : 0;
    const credit = hasCredit && creditOpened < END - 7 * DAY ? openAccount('credit_card', creditOpened, creditBalance, limit) : null;

    const issueCard = (acct, type, issued) => {
      const id = cards.length + 1;
      const network = type === 'credit' ? r.weighted([['visa', 50], ['mastercard', 35], ['amex', 15]]) : r.weighted([['visa', 65], ['mastercard', 35]]);
      const expires = issued + 4 * 365 * DAY;
      cards.push([id, acct.id, type, network, String(r.int(0, 9999)).padStart(4, '0'), ts(issued).slice(0, 10), ts(expires).slice(0, 10), expires < END ? 'expired' : 'active']);
      return { id, acct, type, issued, expires, frozenUntil: 0 };
    };
    const activeCards = [issueCard(checking, 'debit', Math.max(checking.opened, START - r.int(30, 1300) * DAY))];
    if (credit) activeCards.push(issueCard(credit, 'credit', Math.max(credit.opened, START - r.int(30, 1300) * DAY)));

    // Build this customer's schedule of money movements.
    const schedule = [];
    const begin = Math.max(START, checking.opened);
    const employed = r.chance(0.86);
    if (employed) {
      const employer = r.pick(EMPLOYERS);
      const pay = r.lognormal(2100, 0.45) * affluence;
      if (r.chance(0.6)) {
        let t = begin + ((5 - new Date(begin).getUTCDay() + 7) % 7) * DAY + r.int(0, 1) * 7 * DAY + 9 * HOUR;
        for (; t < END; t += 14 * DAY) schedule.push({ t, kind: 'payroll', amount: Math.round(pay * r.float(0.98, 1.02) * 100), employer });
      } else for (let m = 0; m < 6; m++) {
        const t = Date.UTC(2025, m + 1, 0) + 9 * HOUR;
        if (t >= begin && t < END) schedule.push({ t, kind: 'payroll', amount: Math.round(pay * 2.15 * r.float(0.98, 1.02) * 100), employer });
      }
    } else {
      // Self-employed, retired or benefit income arrives as irregular external deposits.
      for (let t = begin + r.int(1, 20) * DAY; t < END; t += r.int(12, 35) * DAY) schedule.push({ t: Math.floor(t / DAY) * DAY + r.int(9, 18) * HOUR, kind: 'deposit', amount: Math.round(r.lognormal(1900, 0.5) * affluence * 100) });
    }
    const rent = r.chance(0.7) ? Math.round(r.lognormal(1350, 0.35) * Math.sqrt(affluence) * 100) : null;
    const utility = merchantsBy.get('Utilities'), telecom = merchantsBy.get('Telecom');
    const utilityMerchant = r.pick(utility).id, telecomMerchant = r.pick(telecom).id;
    for (let m = 0; m < 6; m++) {
      const first = Date.UTC(2025, m, 1);
      if (rent && first + 8 * HOUR >= begin) schedule.push({ t: first + 8 * HOUR, kind: 'bill', amount: rent, label: 'RENT PAYMENT' });
      const u = Date.UTC(2025, m, r.int(10, 20)) + 10 * HOUR;
      if (u >= begin) schedule.push({ t: u, kind: 'bill', amount: Math.round(r.lognormal(110, 0.3) * (m < 2 || m > 4 ? 1.3 : 1) * 100), label: 'UTILITY BILL', merchant: utilityMerchant });
      const p = Date.UTC(2025, m, r.int(20, 27)) + 10 * HOUR;
      if (p >= begin) schedule.push({ t: p, kind: 'bill', amount: Math.round(r.pick([45, 65, 85]) * 100 + 99), label: 'PHONE BILL', merchant: telecomMerchant });
      if (savings && savings.opened < first && r.chance(0.7)) schedule.push({ t: Date.UTC(2025, m, r.int(2, 6)) + 12 * HOUR, kind: 'save', amount: Math.round(r.pick([50, 100, 200, 250, 500]) * affluence) * 100 });
      if (savings && savings.opened < Date.UTC(2025, m + 1, 0)) schedule.push({ t: Date.UTC(2025, m + 1, 0) + 23 * HOUR, kind: 'interest' });
      if (credit && credit.opened < first) schedule.push({ t: Date.UTC(2025, m, 25) + 14 * HOUR, kind: 'card_payment' });
    }
    for (const _ of Array.from({ length: r.int(0, 3) })) {
      void _;
      const cat = r.chance(0.7) ? 'Streaming services' : 'Gyms and clubs';
      const merchant = r.pick(merchantsBy.get(cat)).id;
      const amount = cat === 'Streaming services' ? r.pick(STREAMING) : r.pick([29.99, 39.99, 49.99, 24.99]);
      const day = r.int(1, 28);
      const increase = r.chance(0.2) ? r.int(1, 5) : 99;
      for (let m = 0; m < 6; m++) {
        const t = Date.UTC(2025, m, day) + r.int(4, 8) * HOUR;
        if (t >= begin) schedule.push({ t, kind: 'card', category: cat, merchant, amount: m >= increase ? Math.round(amount * 1.15 * 100) / 100 : amount, channel: 'recurring', currency: 'USD' });
      }
    }
    const weekly = r.lognormal(0.8, 0.75) * Math.min(2, affluence);
    const travels = r.chance(0.16);
    const travelStart = START + r.int(10, 160) * DAY;
    for (let t = begin + r.exponential(7 / weekly) * DAY; t < END; t += Math.max(HOUR, r.exponential(7 / weekly) * DAY)) {
      const abroad = travels && t >= travelStart && t < travelStart + 12 * DAY;
      let category = r.weighted(shopping);
      let pool = merchantsBy.get(category);
      if (abroad) { category = r.pick(['Restaurants', 'Hotels', 'Misc retail', 'Taxis and rideshare']); pool = merchantsBy.get(`foreign:${category}`).filter(m => m.country === pool?.[0]?.country || true); }
      const m = r.pick(pool);
      const info = catInfo[category];
      const local = Math.max(1, Math.round(r.lognormal(info.median, info.sigma) * 100) / 100);
      const amount = m.currency === 'USD' ? local : Math.round((local / FX[m.currency]) * 100) / 100;
      const hourOfDay = category === 'Fast food' ? r.int(11, 22) : r.int(8, 23);
      const tt = Math.floor(t / DAY) * DAY + hourOfDay * HOUR + r.int(0, 59) * MINUTE + r.int(0, 59) * 1000;
      schedule.push({ t: tt, kind: 'card', category, merchant: m.id, amount, currency: m.currency, channel: r.chance(['Electronics', 'Airlines', 'Hotels', 'Department stores', 'Clothing', 'Bookstores'].includes(category) ? 0.6 : 0.08) ? 'online' : 'in_store' });
    }
    if (r.chance(0.55)) for (let t = begin + r.exponential(20) * DAY; t < END; t += r.exponential(24) * DAY) schedule.push({ t: Math.floor(t / DAY) * DAY + r.int(9, 21) * HOUR, kind: 'atm', amount: r.pick([40, 60, 80, 100, 120, 200]) * 100 });
    schedule.sort((a, b) => a.t - b.t);

    // Card events need settlement after authorization, so they are queued and released in time order.
    const queue = [];
    const pushQ = (t, fn) => { queue.push({ t, fn }); };
    const cardFor = (t, preferCredit) => {
      const usable = activeCards.filter(k => k.issued <= t);
      const pick = preferCredit ? usable.find(k => k.type === 'credit') ?? usable[0] : usable.find(k => k.type === 'debit') ?? usable[0];
      return pick;
    };
    const available = a => (a.type === 'credit_card' ? a.limit + a.balance - a.holds : a.balance - a.holds);
    const settle = (a, cents) => { a.balance += cents; };

    for (const ev of schedule) pushQ(ev.t, () => {
      if (ev.kind === 'payroll') { settle(checking, ev.amount); post(checking.id, 'payroll', 'posted', ev.amount, ev.t, ev.t, `PAYROLL ${ev.employer.toUpperCase()}`); return; }
      if (ev.kind === 'deposit') { settle(checking, ev.amount); post(checking.id, 'deposit', 'posted', ev.amount, ev.t, ev.t + r.int(0, 1) * DAY, r.pick(['MOBILE CHECK DEPOSIT', 'ACH CREDIT', 'CASH DEPOSIT'])); return; }
      if (ev.kind === 'bill') {
        settle(checking, -ev.amount);
        post(checking.id, 'bill_payment', 'posted', -ev.amount, ev.t, ev.t + HOUR, ev.label, { merchant: ev.merchant ?? null });
        if (checking.balance < 0 && r.chance(0.85)) { settle(checking, -3500); post(checking.id, 'fee', 'posted', -3500, ev.t + 2 * HOUR, ev.t + 2 * HOUR, 'OVERDRAFT FEE'); }
        return;
      }
      if (ev.kind === 'save') {
        if (available(checking) < ev.amount + 50000) return;
        settle(checking, -ev.amount); settle(savings, ev.amount);
        post(checking.id, 'transfer_out', 'posted', -ev.amount, ev.t, ev.t, `TRANSFER TO SAVINGS ${savings.id}`);
        post(savings.id, 'transfer_in', 'posted', ev.amount, ev.t, ev.t, `TRANSFER FROM CHECKING ${checking.id}`);
        return;
      }
      if (ev.kind === 'interest') {
        const cents = Math.round(Math.max(0, savings.balance) * 0.035 / 12);
        if (cents > 0) { settle(savings, cents); post(savings.id, 'interest', 'posted', cents, ev.t, ev.t, 'INTEREST PAID'); }
        return;
      }
      if (ev.kind === 'card_payment') {
        const owed = -credit.balance;
        if (owed <= 0) return;
        const pay = r.chance(0.55) ? owed : Math.max(2500, Math.round(owed * r.float(0.03, 0.4)));
        const amount = Math.min(pay, Math.max(0, available(checking)));
        if (amount > 0) {
          settle(checking, -amount); settle(credit, amount);
          post(checking.id, 'card_payment', 'posted', -amount, ev.t, ev.t, `CARD PAYMENT ${credit.id}`);
          post(credit.id, 'payment_received', 'posted', amount, ev.t, ev.t + DAY, 'PAYMENT RECEIVED');
        }
        if (owed - amount > 0) { const interest = -Math.round((owed - amount) * 0.24 / 12); settle(credit, interest); post(credit.id, 'interest', 'posted', interest, ev.t + 2 * DAY, ev.t + 2 * DAY, 'INTEREST CHARGE'); }
        return;
      }
      if (ev.kind === 'atm') {
        if (available(checking) < ev.amount) return;
        settle(checking, -ev.amount);
        post(checking.id, 'atm_withdrawal', 'posted', -ev.amount, ev.t, ev.t, 'ATM WITHDRAWAL');
        return;
      }
      // Card authorization.
      const card = cardFor(ev.t, credit && r.chance(0.55));
      if (!card) return;
      const acct = card.acct;
      const usdCents = Math.round(ev.amount * 100 * (ev.currency === 'USD' ? 1 : FX[ev.currency]));
      const preauth = ev.category === 'Gas stations' ? r.pick([10000, 17500]) : ev.category === 'Hotels' ? Math.round(usdCents * 1.25) : usdCents;
      const requestKey = `req_${String(++requestSeq).padStart(7, '0')}`;
      let reason = null;
      if (card.expires <= ev.t) reason = 'expired_card';
      else if (card.frozenUntil > ev.t) reason = 'card_frozen';
      else if (r.chance(ev.currency !== 'USD' ? 0.03 : 0.004)) reason = 'suspected_fraud';
      else if (available(acct) < preauth) reason = acct.type === 'credit_card' ? 'credit_limit' : 'insufficient_funds';
      const authId = ++authSeq;
      const authAmount = ev.currency === 'USD' ? preauth / 100 : ev.amount;
      auths.push([authId, requestKey, card.id, ev.merchant, ts(ev.t), Math.round(authAmount * 100) / 100, ev.currency, ev.channel, reason ? 'declined' : 'approved', reason]);
      if (reason === 'suspected_fraud' && r.chance(0.4)) card.frozenUntil = ev.t + r.int(1, 4) * DAY;
      if (reason) return;
      if (r.chance(0.008)) auths.push([++authSeq, requestKey, card.id, ev.merchant, ts(ev.t + r.int(2, 40) * 1000), Math.round(authAmount * 100) / 100, ev.currency, ev.channel, 'approved', null]); // network retry: duplicate approval, never settles
      acct.holds += preauth;
      const description = merchants[ev.merchant - 1][1].toUpperCase();
      const voided = r.chance(0.012);
      const settleAt = ev.t + (ev.channel === 'recurring' ? r.int(1, 2) : r.int(1, 3)) * DAY + r.int(0, 600) * MINUTE;
      if (voided || settleAt >= END) {
        // Merchant void (hold released) or still pending at extract time.
        pushQ(voided ? ev.t + r.int(1, 5) * DAY : END + DAY, () => { acct.holds -= preauth; });
        post(acct.id, 'card_purchase', voided ? 'reversed' : 'pending', -usdCents, ev.t, null, description, { merchant: ev.merchant, auth: authId });
        return;
      }
      pushQ(settleAt, () => {
        acct.holds -= preauth;
        let final = usdCents;
        if (ev.category === 'Restaurants' && ev.channel === 'in_store') final = Math.round(usdCents * r.float(1.15, 1.25));
        if (ev.currency !== 'USD') final = Math.round(final * r.float(0.995, 1.012));
        const sid = settlements.length + 1;
        settlements.push([sid, authId, ts(settleAt), final]);
        settle(acct, -final);
        if (!r.chance(0.002)) post(acct.id, 'card_purchase', 'posted', -final, ev.t, settleAt, description, { merchant: ev.merchant, auth: authId });
        if (ev.currency !== 'USD') { const fee = -Math.round(final * 0.03); settle(acct, fee); post(acct.id, 'fee', 'posted', fee, settleAt, settleAt, 'FOREIGN TRANSACTION FEE'); }
        if (acct.type === 'checking' && acct.balance < 0 && r.chance(0.6)) { settle(acct, -3500); post(acct.id, 'fee', 'posted', -3500, settleAt + MINUTE, settleAt + MINUTE, 'OVERDRAFT FEE'); }
        // Refunds and disputes against this settlement.
        if (r.chance(['Electronics', 'Clothing', 'Department stores', 'Home supply', 'Airlines', 'Hotels'].includes(ev.category) ? 0.09 : 0.02)) {
          const parts = r.chance(0.3) ? 2 : 1;
          let remaining = final;
          for (let p = 0; p < parts; p++) {
            const amount = parts === 1 && r.chance(0.6) ? final : Math.max(100, Math.round(remaining * r.float(0.2, 0.6)));
            remaining -= amount;
            const at = settleAt + r.int(2, 35) * DAY + p * r.int(1, 10) * DAY;
            if (at >= END || remaining < 0) break;
            pushQ(at, () => {
              const rid = refunds.length + 1;
              refunds.push([rid, sid, ts(at), amount, r.weighted([['returned_item', 55], ['price_adjustment', 15], ['canceled_service', 20], ['duplicate_charge', 10]])]);
              settle(acct, amount);
              post(acct.id, 'refund', 'posted', amount, at, at + r.int(0, 2) * DAY, `REFUND ${description}`, { merchant: ev.merchant, refund: rid });
            });
          }
        }
        if (r.chance(ev.currency !== 'USD' ? 0.03 : 0.006)) {
          const opened = settleAt + r.int(5, 50) * DAY;
          if (opened < END) pushQ(opened, () => {
            const status = r.weighted([['credited', 60], ['rejected', 25], ['open', 15]]);
            const resolved = status === 'open' ? null : opened + r.int(10, 45) * DAY;
            const cid = chargebacks.length + 1;
            const finalStatus = resolved !== null && resolved >= END ? 'open' : status;
            chargebacks.push([cid, sid, ts(opened), final, r.weighted([['fraud', 35], ['not_received', 25], ['not_as_described', 30], ['duplicate', 10]]), finalStatus, finalStatus === 'open' ? null : ts(resolved)]);
            if (finalStatus === 'credited') pushQ(resolved, () => { settle(acct, final); post(acct.id, 'chargeback_credit', 'posted', final, resolved, resolved, `DISPUTE CREDIT ${description}`, { chargeback: cid }); });
          });
        }
      });
    });
    // Lost cards and replacements.
    if (r.chance(0.1)) {
      const lostAt = START + r.int(5, 170) * DAY;
      const old = activeCards[0];
      cards[old.id - 1][7] = 'lost';
      old.expires = lostAt;
      activeCards[0] = issueCard(old.acct, old.type, lostAt + 2 * DAY);
    }
    if (r.chance(0.01)) cards[activeCards[0].id - 1][7] = 'frozen';
    // Run the customer's timeline.
    while (queue.length) {
      queue.sort((a, b) => a.t - b.t);
      const next = queue.shift();
      if (next.t < END) next.fn();
    }
    // A closed account in the period for a small share of customers.
    if (savings && r.chance(0.04)) accounts[savings.id - 1][4] = ts(END - r.int(5, 60) * DAY).slice(0, 10);
  }
  // A few manual adjustments with no originating card event.
  for (let i = 0; i < 40; i++) {
    const a = accounts[rng.int(0, accounts.length - 1)];
    const t = START + rng.int(1, 170) * DAY + rng.int(0, 23) * HOUR;
    post(a[0], 'adjustment', 'posted', rng.pick([-1, 1]) * rng.int(100, 5000), t, t, 'MANUAL ADJUSTMENT');
  }
  pendingLedger.sort((a, b) => a[12] - b[12] || a[1] - b[1]);
  const transactions = pendingLedger.map((p, i) => [i + 1, ...p.slice(1, 12)]);
  return { customers, accounts, cards, merchants, authorizations: auths, settlements, refunds, chargebacks, transactions };
}

const dataset = {
  id: 'payments',
  version: '3.0.0',
  name: 'Finance / Payments',
  domain: 'Retail banking and card payments',
  kind: 'synthetic',
  description: 'Six months of a fictional bank: customers, checking, savings and credit-card accounts, cards, merchants, card authorizations and settlements, refunds, disputes and the account ledger.',
  source: {
    publisher: 'Runtime',
    url: 'https://github.com/KrishnaSathvik/runtime.school',
    release: `Runtime payments generator ${GENERATOR_VERSION}, seed ${SEED}`,
    license: 'Runtime-owned synthetic data',
    licenseUrl: 'https://github.com/KrishnaSathvik/runtime.school',
    commercialReuse: 'permitted',
    attribution: 'Synthetic data generated by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'Each customer’s accounts are simulated in time order: holds, available balance, declines, settlements, overdrafts and refunds follow from the running balance.',
      'Payroll, rent, utilities, subscriptions, savings transfers, card payments and interest recur on realistic schedules.',
      'Merchant category codes follow ISO 18245; names, people and amounts are fictional.',
    ],
  },
  reproduction: { command: 'node datasets/build.mjs payments', implementation: 'datasets/payments/dataset.mjs', seed: SEED, notes: `Generator version ${GENERATOR_VERSION}; deterministic for a given seed.` },
  coverage: { start: '2025-01-01', end: '2025-06-30', grain: 'ledger entry; card authorization' },
  tables,
  edgeCases: [
    'Declines for insufficient funds, credit limit, fraud, frozen and expired cards',
    'Duplicate approvals from network retries (shared request_key) that never settle',
    'Settled amounts different from authorized amounts (tips, fuel, hotels, currency)',
    'Merchant voids (reversed) and purchases still pending at the end of the period',
    'Partial and multiple refunds; disputes credited, rejected or open',
    'Overdrafts and overdraft fees',
    'Recurring charges with mid-period price increases',
    'Lost cards replaced on the same account',
    'Settlements with no ledger posting and manual ledger adjustments',
  ],
  qualityNotes: [
    'All money is integer US cents except authorization amounts, which are in the transaction currency.',
    'Authorizations are requests, not money movement; only posted ledger entries change balances.',
    'Balance at time t = opening_balance_cents + SUM(amount_cents) of posted entries with posted_at <= t.',
  ],
  concepts: ['running totals', 'window frames', 'reconciliation', 'fan-out', 'transactions', 'triggers', 'latest row', 'fill-forward'],
  rows: () => generate(),
  mutation: `
UPDATE settlements SET amount_cents = amount_cents + 500 WHERE settlement_id % 101 = 0;
UPDATE transactions SET amount_cents = amount_cents - 500 WHERE authorization_id IN (SELECT authorization_id FROM settlements WHERE settlement_id % 101 = 0) AND transaction_type = 'card_purchase';
DELETE FROM transactions WHERE transaction_id IN (SELECT transaction_id FROM transactions WHERE transaction_type = 'atm_withdrawal' AND transaction_id % 7 = 0);
INSERT INTO refunds VALUES ((SELECT MAX(refund_id) + 1 FROM refunds), (SELECT MIN(settlement_id) FROM settlements), '2025-03-03 12:00:00', 1500, 'price_adjustment');
UPDATE authorizations SET status = 'declined', decline_reason = 'suspected_fraud' WHERE authorization_id IN (SELECT a.authorization_id FROM authorizations a WHERE a.status = 'approved' AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.authorization_id = a.authorization_id) AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.authorization_id = a.authorization_id) LIMIT 30);
UPDATE accounts SET opening_balance_cents = opening_balance_cents + 25000 WHERE account_id % 17 = 0 AND account_type = 'checking';
UPDATE chargebacks SET status = 'credited', resolved_at = '2025-06-20 10:00:00' WHERE status = 'open' AND chargeback_id % 2 = 0;
UPDATE transactions SET amount_cents = amount_cents - 700 WHERE account_id = 6 AND status = 'posted' AND posted_at >= '2025-04-10' AND posted_at < '2025-04-20';
UPDATE accounts SET opening_balance_cents = opening_balance_cents + 1234 WHERE account_id BETWEEN 1 AND 5;
UPDATE cards SET status = 'lost' WHERE card_id = 1;
UPDATE cards SET status = 'frozen' WHERE card_id = 115;
`,
  contract: {
    totalRows: [120000, 180000],
    minRows: { customers: 1000, accounts: 2000, cards: 1500, merchants: 800, authorizations: 35000, settlements: 30000, refunds: 800, chargebacks: 100, transactions: 70000 },
    checks: [
      { name: 'months covered by ledger', sql: "SELECT COUNT(DISTINCT substr(initiated_at, 1, 7)) FROM transactions", equals: 6 },
      { name: 'largest customer share of authorizations', sql: maxShare('authorizations a JOIN cards c USING (card_id) JOIN accounts x ON x.account_id = c.account_id', 'x.customer_id'), max: 0.02 },
      { name: 'merchant categories used', sql: distinct('merchants', 'category'), min: 15 },
      { name: 'declined authorizations', sql: "SELECT COUNT(*) FROM authorizations WHERE status = 'declined'", min: 500 },
      { name: 'decline reasons', sql: distinct('authorizations', 'decline_reason'), min: 4 },
      { name: 'duplicate approvals (shared request_key)', sql: "SELECT COUNT(*) FROM (SELECT request_key FROM authorizations WHERE status = 'approved' GROUP BY request_key HAVING COUNT(*) > 1)", min: 100 },
      { name: 'settled amount differs from authorization', sql: "SELECT COUNT(*) FROM settlements s JOIN authorizations a USING (authorization_id) WHERE a.currency = 'USD' AND s.amount_cents <> ROUND(a.amount * 100)", min: 1000 },
      { name: 'pending ledger entries', sql: "SELECT COUNT(*) FROM transactions WHERE status = 'pending'", min: 100 },
      { name: 'reversed ledger entries', sql: "SELECT COUNT(*) FROM transactions WHERE status = 'reversed'", min: 200 },
      { name: 'settlements with several refunds', sql: 'SELECT COUNT(*) FROM (SELECT settlement_id FROM refunds GROUP BY settlement_id HAVING COUNT(*) > 1)', min: 50 },
      { name: 'chargeback statuses', sql: distinct('chargebacks', 'status'), equals: 3 },
      { name: 'overdraft fees', sql: "SELECT COUNT(*) FROM transactions WHERE description = 'OVERDRAFT FEE'", min: 100 },
      { name: 'settlements without a ledger posting', sql: "SELECT COUNT(*) FROM settlements s WHERE NOT EXISTS (SELECT 1 FROM transactions t WHERE t.authorization_id = s.authorization_id AND t.transaction_type = 'card_purchase')", min: 20 },
      { name: 'recurring authorizations', sql: "SELECT COUNT(*) FROM authorizations WHERE channel = 'recurring'", min: 3000 },
      { name: 'foreign-currency authorizations', sql: "SELECT COUNT(*) FROM authorizations WHERE currency <> 'USD'", min: 300 },
      { name: 'lost and replaced cards', sql: "SELECT COUNT(*) FROM cards WHERE status = 'lost'", min: 80 },
      { name: 'pending entries have no posted_at', sql: "SELECT COUNT(*) FROM transactions WHERE status <> 'posted' AND posted_at IS NOT NULL", equals: 0 },
    ],
  },
};

export default dataset;
