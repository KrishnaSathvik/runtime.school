import { col, fk, table } from '../lib/schema.mjs';
import { createRng, ts, ms, DAY, HOUR, MINUTE } from '../lib/rng.mjs';
import { FIRST_NAMES, LAST_NAMES, COMPANY_A, COMPANY_B, COMPANY_SUFFIX, COUNTRIES } from '../lib/names.mjs';
import { distinct, maxShare, nulls } from '../lib/contract.mjs';

const SEED = 20252;
const GENERATOR_VERSION = '3.0.0';
const START = ms('2024-01-01 00:00:00');
const END = ms('2025-07-01 00:00:00'); // exclusive: data ends 2025-06-30
const ACCOUNTS = 3200;
const PLANS = { free: 0, starter: 2900, pro: 9900, business: 29900 };
const INDUSTRIES = [['Software', 22], ['E-commerce', 14], ['Agency', 12], ['Education', 9], ['Healthcare', 8], ['Finance', 9], ['Manufacturing', 7], ['Media', 7], ['Nonprofit', 5], ['Logistics', 7]];
const SIZES = [['1-10', 38], ['11-50', 30], ['51-200', 18], ['201-1000', 10], ['1000+', 4]];
const SIZE_TEAM = { '1-10': 0.9, '11-50': 1.8, '51-200': 3.2, '201-1000': 5, '1000+': 7 };
const CHANNELS = [['organic', 34], ['paid_search', 24], ['referral', 14], ['partner', 10], ['outbound_sales', 8], ['social', 10]];
const DEVICES = [['web', 62], ['desktop_app', 18], ['ios', 12], ['android', 8]];
const FEATURE_EVENTS = [['dashboard_viewed', 34], ['report_created', 12], ['report_shared', 6], ['comment_added', 10], ['search_performed', 16], ['data_exported', 6], ['integration_connected', 2], ['filter_applied', 14]];

/** Twenty experiments; five carry a real effect on the stated metric. */
const EXPERIMENTS = [
  ['onboarding_checklist', 'Onboarding checklist', 'onboarding_completed', '2024-02-05', '2024-03-18', { treatment: 0.12 }],
  ['pricing_page_annual_toggle', 'Annual toggle on pricing page', 'checkout_started', '2024-03-04', '2024-04-15', { treatment: 0.25 }],
  ['empty_state_templates', 'Templates in empty projects', 'project_created', '2024-04-08', '2024-05-20', { treatment: 0.15 }],
  ['invite_nudge', 'Invite teammates nudge', 'invite_sent', '2024-05-06', '2024-06-17', { treatment: 0.3 }],
  ['dark_mode_default', 'Dark mode by default', 'dashboard_viewed', '2024-06-03', '2024-07-01', {}],
  ['report_builder_v2', 'Report builder v2', 'report_created', '2024-07-08', '2024-08-19', { treatment: 0.18 }],
  ['search_autocomplete', 'Search autocomplete', 'search_performed', '2024-08-05', '2024-09-02', {}],
  ['onboarding_video', 'Onboarding video', 'onboarding_completed', '2024-09-09', '2024-10-21', {}],
  ['trial_length_14_vs_30', 'Trial length test', 'checkout_started', '2024-10-07', '2024-11-18', {}],
  ['export_button_position', 'Export button position', 'data_exported', '2024-11-04', '2024-12-02', {}],
  ['holiday_discount_banner', 'Holiday discount banner', 'checkout_started', '2024-11-25', '2024-12-30', {}],
  ['integrations_gallery', 'Integrations gallery', 'integration_connected', '2025-01-06', '2025-02-17', {}],
  ['comment_mentions', 'Comment mentions', 'comment_added', '2025-01-20', '2025-03-03', {}],
  ['three_arm_pricing', 'Three-arm pricing copy', 'checkout_started', '2025-02-10', '2025-03-24', {}],
  ['welcome_email_timing', 'Welcome email timing', 'onboarding_completed', '2025-03-03', '2025-04-14', {}],
  ['share_dialog_redesign', 'Share dialog redesign', 'report_shared', '2025-03-31', '2025-05-12', {}],
  ['filter_presets', 'Saved filter presets', 'filter_applied', '2025-04-14', '2025-05-26', {}],
  ['mobile_nav', 'Mobile navigation', 'dashboard_viewed', '2025-05-05', '2025-06-16', {}],
  ['seat_based_pricing_copy', 'Seat-based pricing copy', 'checkout_started', '2025-05-19', null, {}],
  ['ai_summary_beta', 'AI report summaries (beta)', 'report_created', '2025-06-02', null, {}],
];

const tables = [
  table('accounts', 'One customer workspace (a company or team).', [
    col('account_id', 'INTEGER', 'Workspace key'),
    col('account_name', 'TEXT', 'Fictional company name'),
    col('industry', 'TEXT', 'Self-reported industry'),
    col('company_size', 'TEXT', 'Employee band'),
    col('country', 'TEXT', 'Billing country'),
    col('acquisition_channel', 'TEXT', 'How the workspace was acquired'),
    col('created_at', 'TEXT', 'Workspace signup time (UTC)'),
  ], { indexes: [['created_at']] }),
  table('users', 'One person in one workspace.', [
    col('user_id', 'INTEGER', 'User key'),
    col('account_id', 'INTEGER', 'Workspace'),
    col('full_name', 'TEXT', 'Fictional name'),
    col('email', 'TEXT', 'Login email'),
    col('role', 'TEXT', 'owner, admin or member'),
    col('signup_source', 'TEXT', 'workspace_creator, invitation or domain_join'),
    col('referred_by_user_id', 'INTEGER', 'User in another workspace who referred this workspace creator; NULL otherwise', true),
    col('created_at', 'TEXT', 'Account creation time (UTC)'),
    col('deactivated_at', 'TEXT', 'When an admin removed the user; NULL if still active', true),
  ], { foreignKeys: [fk('account_id', 'accounts'), fk('referred_by_user_id', 'users', 'user_id')], indexes: [['account_id'], ['created_at'], ['referred_by_user_id']] }),
  table('subscriptions', 'One plan period for a workspace. Each workspace has exactly one current plan (no end date).', [
    col('subscription_id', 'INTEGER', 'Subscription interval key'),
    col('account_id', 'INTEGER', 'Workspace'),
    col('plan', 'TEXT', 'free, starter, pro or business'),
    col('billing_period', 'TEXT', 'monthly or annual; NULL on the free plan', true),
    col('mrr_cents', 'INTEGER', 'Monthly recurring revenue in US cents (annual plans divided by 12)'),
    col('started_at', 'TEXT', 'Interval start (inclusive)'),
    col('ended_at', 'TEXT', 'When this plan period ended; NULL for the current plan', true),
    col('end_reason', 'TEXT', 'upgrade, downgrade or canceled; NULL for the current plan', true),
  ], { foreignKeys: [fk('account_id', 'accounts')], indexes: [['account_id']] }),
  table('sessions', 'One product session by one user.', [
    col('session_id', 'INTEGER', 'Session key'),
    col('user_id', 'INTEGER', 'User'),
    col('started_at', 'TEXT', 'First activity (UTC)'),
    col('ended_at', 'TEXT', 'Last activity (UTC)'),
    col('device', 'TEXT', 'web, desktop_app, ios or android'),
  ], { foreignKeys: [fk('user_id', 'users')], indexes: [['user_id']] }),
  table('events', 'One product event as received. Retries can repeat the same event, and some events arrive late.', [
    col('delivery_id', 'INTEGER', 'Ingestion order key'),
    col('event_id', 'TEXT', 'Logical event id; repeats when the client retried'),
    col('user_id', 'INTEGER', 'Acting user'),
    col('account_id', 'INTEGER', 'Workspace'),
    col('session_id', 'INTEGER', 'Session; NULL for server-side events', true),
    col('event_name', 'TEXT', 'What happened'),
    col('occurred_at', 'TEXT', 'When it happened on the client or server (UTC)'),
    col('received_at', 'TEXT', 'When the pipeline ingested this delivery (UTC)'),
  ], { foreignKeys: [fk('user_id', 'users'), fk('account_id', 'accounts'), fk('session_id', 'sessions')], indexes: [['user_id', 'occurred_at'], ['event_id'], ['account_id', 'occurred_at']] }),
  table('projects', 'One project created in a workspace.', [
    col('project_id', 'INTEGER', 'Project key'),
    col('account_id', 'INTEGER', 'Workspace'),
    col('created_by_user_id', 'INTEGER', 'Creator'),
    col('project_name', 'TEXT', 'Project name'),
    col('created_at', 'TEXT', 'Creation time (UTC)'),
    col('archived_at', 'TEXT', 'Archive time; NULL while active', true),
  ], { foreignKeys: [fk('account_id', 'accounts'), fk('created_by_user_id', 'users', 'user_id')], indexes: [['account_id'], ['created_by_user_id']] }),
  table('invitations', 'One invitation sent from a workspace.', [
    col('invitation_id', 'INTEGER', 'Invitation key'),
    col('account_id', 'INTEGER', 'Workspace'),
    col('invited_by_user_id', 'INTEGER', 'Sender'),
    col('invitee_email', 'TEXT', 'Address invited'),
    col('sent_at', 'TEXT', 'Sent time (UTC)'),
    col('accepted_at', 'TEXT', 'Acceptance time; NULL if never accepted', true),
    col('accepted_user_id', 'INTEGER', 'User created by accepting; NULL if not accepted', true),
  ], { foreignKeys: [fk('account_id', 'accounts'), fk('invited_by_user_id', 'users', 'user_id'), fk('accepted_user_id', 'users', 'user_id')], indexes: [['account_id'], ['invited_by_user_id']] }),
  table('experiments', 'One product experiment.', [
    col('experiment_id', 'INTEGER', 'Experiment key'),
    col('experiment_key', 'TEXT', 'Stable code name'),
    col('experiment_name', 'TEXT', 'Description'),
    col('primary_metric', 'TEXT', 'Event name the experiment aims to increase'),
    col('started_at', 'TEXT', 'Start date'),
    col('ended_at', 'TEXT', 'When the experiment ended; NULL while it is still running', true),
  ]),
  table('experiment_assignments', 'One user’s assigned experiment variant, recorded the first time they see it.', [
    col('experiment_id', 'INTEGER', 'Experiment'),
    col('user_id', 'INTEGER', 'User'),
    col('variant', 'TEXT', 'control, treatment, or variant_b in three-arm tests'),
    col('assigned_at', 'TEXT', 'First exposure time (UTC)'),
  ], { primaryKey: ['experiment_id', 'user_id'], foreignKeys: [fk('experiment_id', 'experiments'), fk('user_id', 'users')], indexes: [['user_id']] }),
  table('billing_events', 'One billing charge or credit for a paid subscription.', [
    col('billing_event_id', 'INTEGER', 'Billing event key'),
    col('account_id', 'INTEGER', 'Workspace'),
    col('subscription_id', 'INTEGER', 'Subscription interval billed'),
    col('event_type', 'TEXT', 'invoice_paid, payment_failed or refund_issued'),
    col('occurred_at', 'TEXT', 'Event time (UTC)'),
    col('amount_cents', 'INTEGER', 'US cents; refunds are negative, failed payments record the attempted amount'),
  ], { foreignKeys: [fk('account_id', 'accounts'), fk('subscription_id', 'subscriptions')], indexes: [['account_id'], ['subscription_id']] }),
];

function generate() {
  const rng = createRng(SEED);
  const accounts = [], users = [], subscriptions = [], sessions = [], events = [], projects = [], invitations = [], assignments = [], billing = [];
  const experiments = EXPERIMENTS.map(([key, name, metric, start, end], i) => [i + 1, key, name, metric, start, end]);
  const expWindows = EXPERIMENTS.map(([key, , metric, start, end, effect], i) => ({ id: i + 1, key, metric, start: ms(start), end: end ? ms(end) : END, effect, arms: key === 'three_arm_pricing' ? ['control', 'treatment', 'variant_b'] : ['control', 'treatment'], skew: key === 'search_autocomplete' ? 0.55 : 0.5 }));
  let eventSeq = 0;
  const pending = []; // [occurredMs, receivedMs, user, account, session, name, eventId]
  const emit = (t, user, account, session, name, opts = {}) => {
    const r = opts.rng ?? rng;
    const eventId = `evt_${String(++eventSeq).padStart(7, '0')}`;
    let lag = r.int(1, 20) * 1000;
    const roll = r.next();
    if (roll < 0.04) lag = r.int(5, 240) * MINUTE; // queued on a flaky connection
    else if (roll < 0.05) lag = r.int(1, 6) * DAY; // offline mobile client flushed later
    const received = t + lag;
    if (received >= END && t < END && roll >= 0.04) { /* arrives after the extract: still delivered at the boundary */ }
    pending.push([t, Math.min(received, END - 1000), user, account, session, name, eventId]);
    if (r.chance(opts.retry ?? 0.025)) pending.push([t, Math.min(received + r.int(2, 600) * 1000, END - 1000), user, account, session, name, eventId]);
  };
  const emailOf = (name, domain, n) => `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${n % 7 === 0 ? n % 100 : ''}@${domain}`;

  // Workspace creation times grow over the window (density rising ~linearly).
  const createdTimes = Array.from({ length: ACCOUNTS }, () => START + Math.floor(Math.sqrt(rng.next()) * (END - START - 7 * DAY))).sort((a, b) => a - b);
  const userAssignments = new Map();
  const exposed = new Set();
  /** Assigns the user to experiments running at t; returns the new treatment assignments. */
  const assign = (user, t, r) => {
    const treated = [];
    for (const x of expWindows) {
      if (t < x.start || t >= x.end) continue;
      const key = `${x.id}|${user.id}`;
      if (userAssignments.has(key) || exposed.has(key)) continue;
      exposed.add(key);
      // Only users who reach the tested surface are exposed and assigned.
      if (!r.chance(x.metric === 'onboarding_completed' ? 1 : 0.45)) continue;
      const variant = x.arms.length === 3 ? r.pick(x.arms) : r.chance(x.skew) ? 'control' : 'treatment';
      userAssignments.set(key, variant);
      assignments.push([x.id, user.id, variant, ts(t)]);
      if (variant === 'treatment' && x.effect.treatment) treated.push(x);
    }
    return treated;
  };
  const FEATURE_NAMES = new Set(FEATURE_EVENTS.map(([name]) => name));
  const lift = (user, metric, t) => {
    let m = 1;
    for (const x of expWindows) {
      if (x.metric !== metric || !x.effect.treatment) continue;
      if (userAssignments.get(`${x.id}|${user.id}`) === 'treatment' && t < x.end + 30 * DAY) m *= 1 + x.effect.treatment;
    }
    return m;
  };

  for (let a = 0; a < ACCOUNTS; a++) {
    const r = rng.fork(`account:${a}`);
    const accountId = a + 1, created = createdTimes[a];
    const fit = Math.min(0.98, Math.max(0.02, r.normal(0.5, 0.2)));
    const size = r.weighted(SIZES), channel = r.weighted(CHANNELS);
    const name = `${r.pick(COMPANY_A)} ${r.pick(COMPANY_B)}${(s => (s ? ' ' + s : ''))(r.pick(COMPANY_SUFFIX))}`;
    const domain = `${name.toLowerCase().replace(/ (inc|llc|co|group|ltd)$/, '').replace(/[^a-z]+/g, '')}${accountId}.example`;
    accounts.push([accountId, name, r.weighted(INDUSTRIES), size, r.weighted(COUNTRIES), channel, ts(created)]);

    const accountUsers = [];
    const addUser = (t, role, source, referredBy = null) => {
      const full = `${r.pick(FIRST_NAMES)} ${r.pick(LAST_NAMES)}`;
      const u = { id: users.length + 1, account: accountId, created: t, role, engagement: Math.min(1, Math.max(0.03, r.normal(fit * (role === 'owner' ? 1.15 : 0.9), 0.22))) };
      const referrer = referredBy;
      users.push([u.id, accountId, full, emailOf(full, domain, u.id), role, source, referrer, ts(t), null]);
      accountUsers.push(u);
      return u;
    };
    const referrer = channel === 'referral' && users.length > 50 ? users[r.int(0, users.length - 1)][0] : null;
    const owner = addUser(created, 'owner', 'workspace_creator', referrer && users[referrer - 1][1] !== accountId ? referrer : null);

    // Plan history: one open interval per workspace at all times.
    let plan = 'free', period = null, planStart = created, subId = null;
    const openSub = (t, p, bp) => {
      subId = subscriptions.length + 1;
      plan = p; period = bp; planStart = t;
      const mrr = p === 'free' ? 0 : bp === 'annual' ? Math.round((PLANS[p] * 10) / 12) : PLANS[p];
      subscriptions.push([subId, accountId, p, bp, mrr, ts(t), null, null]);
      return subId;
    };
    const closeSub = (t, reason) => { const s = subscriptions[subId - 1]; s[6] = ts(t); s[7] = reason; };
    const accountSubs = () => subscriptions.filter(x => x[1] === accountId);
    const planAt = t => accountSubs().find(x => ms(x[5]) <= t && (x[6] === null || t < ms(x[6])))?.[2] ?? 'free';
    openSub(created, 'free', null);

    // Onboarding and activation for the creator.
    const sessionFor = (u, t, device) => {
      const len = Math.max(1, Math.round(r.lognormal(9, 0.8))) * MINUTE;
      const s = { id: sessions.length + 1, start: t, end: Math.min(t + len, END - 1000) };
      sessions.push([s.id, u.id, ts(s.start), ts(s.end), device]);
      return s;
    };
    const userDevice = new Map();
    const deviceOf = u => userDevice.get(u.id) ?? userDevice.set(u.id, r.weighted(DEVICES)).get(u.id);
    const firstDay = (u, t) => {
      const treated = assign(u, t, r);
      const s = sessionFor(u, t, deviceOf(u));
      for (const x of treated) if (FEATURE_NAMES.has(x.metric) && r.chance(x.effect.treatment * 1.2)) emit(t + r.int(3, 9) * MINUTE, u.id, accountId, s.id, x.metric, { rng: r });
      emit(t, u.id, accountId, s.id, 'user_signed_up', { rng: r });
      emit(t + r.int(5, 60) * 1000, u.id, accountId, s.id, 'onboarding_started', { rng: r });
      const done = r.chance(Math.min(0.95, (0.35 + 0.45 * u.engagement) * lift(u, 'onboarding_completed', t)));
      if (done) emit(t + r.int(2, Math.max(3, (s.end - s.start) / MINUTE)) * MINUTE, u.id, accountId, s.id, 'onboarding_completed', { rng: r });
      return { s, done };
    };
    const ownerStart = firstDay(owner, created);
    const teamTarget = SIZE_TEAM[size] * (0.4 + fit * 1.6);

    // Invitations from the owner (and later admins) during the first weeks.
    const inviteCount = Math.min(25, r.poisson(teamTarget * 0.8 * (ownerStart.done ? 1.2 : 0.5)));
    const inviteTimes = Array.from({ length: inviteCount }, () => created + Math.floor(r.exponential(9 * DAY))).filter(t => t < END - HOUR).sort((x, y) => x - y);
    for (const t of inviteTimes) {
      const sender = accountUsers.filter(u => u.role !== 'member' && u.created <= t);
      const from = sender.length ? r.pick(sender) : owner;
      const invitee = `${r.pick(FIRST_NAMES)}.${r.pick(LAST_NAMES)}`.toLowerCase();
      const invId = invitations.length + 1;
      const s = sessionFor(from, t, deviceOf(from));
      emit(t + 30000, from.id, accountId, s.id, 'invite_sent', { rng: r });
      const accepted = r.chance(0.62 * lift(from, 'invite_sent', t) ** 0.3) ? t + Math.floor(r.exponential(1.5 * DAY)) + 10 * MINUTE : null;
      const row = [invId, accountId, from.id, `${invitee}${invId % 9 === 0 ? '+work' : ''}@${r.chance(0.8) ? domain : 'mail.example'}`, ts(t), null, null];
      invitations.push(row);
      if (accepted && accepted < END - HOUR) {
        const u = addUser(accepted, r.chance(0.15) ? 'admin' : 'member', 'invitation');
        row[5] = ts(accepted); row[6] = u.id;
        firstDay(u, accepted);
      }
    }
    // Colleagues who join through a verified email domain, without an invitation.
    const domainJoins = r.poisson(teamTarget * 0.55);
    for (let j = 0; j < domainJoins; j++) {
      const t = created + Math.floor(r.exponential(40 * DAY)) + HOUR;
      if (t >= END - HOUR) continue;
      firstDay(addUser(t, 'member', 'domain_join'), t);
    }

    // Plan transitions, decided month by month from fit and team size.
    let t = created + 7 * DAY;
    let canceledOnce = false;
    while (t < END - DAY) {
      const team = accountUsers.filter(u => u.created <= t).length;
      if (plan === 'free') {
        const p = (0.02 + 0.12 * fit * fit) * (1 + Math.min(team, 12) / 8) * (canceledOnce ? 0.4 : 1);
        if (r.chance(p)) {
          const next = team >= 8 && r.chance(0.5) ? 'business' : r.chance(0.35 + 0.4 * fit) ? 'pro' : 'starter';
          // Most self-serve upgrades go through pricing and checkout in one session; sales-led ones do not.
          if (r.chance(0.75)) {
            const s = sessionFor(owner, t - r.int(8, 40) * MINUTE, deviceOf(owner));
            emit(s.start + r.int(1, 3) * MINUTE, owner.id, accountId, s.id, 'pricing_viewed', { rng: r });
            emit(t - r.int(1, 4) * MINUTE, owner.id, accountId, s.id, 'checkout_started', { rng: r });
          }
          closeSub(t, 'upgrade');
          const sid = openSub(t, next, r.chance(0.25 + 0.2 * fit) ? 'annual' : 'monthly');
          const actor = r.chance(0.85) ? owner : r.pick(accountUsers);
          emit(t, actor.id, accountId, null, 'subscription_started', { rng: r, retry: 0.01 });
          void sid;
        }
      } else {
        const tenure = (t - planStart) / DAY;
        const annualLocked = period === 'annual' && tenure < 360;
        const churn = annualLocked ? 0 : 0.035 + 0.09 * (1 - fit) ** 2;
        const roll = r.next();
        if (roll < churn) {
          closeSub(t, 'canceled');
          emit(t, owner.id, accountId, null, 'subscription_canceled', { rng: r, retry: 0.01 });
          openSub(t, 'free', null);
          canceledOnce = true;
        } else if (roll < churn + 0.012 + 0.02 * fit && plan !== 'business' && !annualLocked) {
          const next = plan === 'starter' ? 'pro' : 'business';
          closeSub(t, 'upgrade');
          emit(t, owner.id, accountId, null, 'subscription_upgraded', { rng: r, retry: 0.01 });
          openSub(t, next, period);
        } else if (roll < churn + 0.04 && plan !== 'starter' && !annualLocked && r.chance(0.25)) {
          const next = plan === 'business' ? 'pro' : 'starter';
          closeSub(t, 'downgrade');
          emit(t, owner.id, accountId, null, 'subscription_downgraded', { rng: r, retry: 0.01 });
          openSub(t, next, period);
        }
      }
      t += Math.floor(r.int(25, 35) * DAY);
    }

    // Ongoing usage: sessions per user decay with time; engagement drives frequency.
    const projectNames = ['Q3 Planning', 'Website Redesign', 'Customer Onboarding', 'Sales Pipeline', 'Hiring', 'Marketing Calendar', 'Product Roadmap', 'Support Queue', 'Finance Close', 'Campaign Tracker', 'Data Migration', 'Weekly Metrics'];
    for (const u of accountUsers) {
      const lifetime = r.chance(0.55 - 0.35 * u.engagement) ? 0 : r.exponential((10 + 80 * u.engagement) * DAY);
      const stop = Math.min(END - HOUR, u.created + lifetime);
      let t = u.created + Math.floor(r.exponential(2 * DAY)) + HOUR;
      const projectBoost = lift(u, 'project_created', u.created);
      let made = 0;
      while (t < stop) {
        const s = sessionFor(u, t, deviceOf(u));
        // A treatment that works makes users more likely to try the tested feature during exposure.
        for (const x of assign(u, t, r)) if (FEATURE_NAMES.has(x.metric) && r.chance(x.effect.treatment * 1.2)) emit(s.start + r.int(1, 5) * MINUTE, u.id, accountId, s.id, x.metric, { rng: r });
        const n = 1 + r.poisson(0.9 + 1.8 * u.engagement);
        let et = s.start;
        for (let k = 0; k < n; k++) {
          et = Math.min(s.end, et + r.int(10, 240) * 1000);
          if (made < 12 && r.chance((0.05 + 0.08 * u.engagement) * projectBoost)) {
            const pid = projects.length + 1;
            const archived = r.chance(0.18) ? et + Math.floor(r.exponential(60 * DAY)) : null;
            projects.push([pid, accountId, u.id, `${r.pick(projectNames)}${made ? ' ' + (made + 1) : ''}`, ts(et), archived && archived < END ? ts(archived) : null]);
            made++;
            if (!r.chance(0.012)) emit(et, u.id, accountId, s.id, 'project_created', { rng: r }); // tracking occasionally drops this event
            continue;
          }
          const name = r.weighted(FEATURE_EVENTS);
          if (r.chance(Math.min(0.9, lift(u, name, et) - 1))) emit(et, u.id, accountId, s.id, name, { rng: r });
          emit(et, u.id, accountId, s.id, name, { rng: r });
        }
        if (planAt(s.start) === 'free' && (u.role === 'owner' || u.role === 'admin') && r.chance(0.035 + 0.06 * fit)) {
          emit(s.end - 1000, u.id, accountId, s.id, 'pricing_viewed', { rng: r });
          // Checkouts here are abandoned: the workspace stays on the free plan.
          if (r.chance(0.25 * lift(u, 'checkout_started', et))) emit(s.end, u.id, accountId, s.id, 'checkout_started', { rng: r });
        }
        const gap = r.exponential((4 + 22 * (1 - u.engagement)) * DAY) * (1 + (t - u.created) / (60 * DAY));
        t = s.end + Math.max(HOUR, Math.floor(gap));
      }
      if (u.role === 'member' && r.chance(0.04)) {
        const off = Math.min(END - HOUR, u.created + Math.floor(r.exponential(120 * DAY)) + DAY);
        users[u.id - 1][8] = ts(off);
      }
    }
    void ownerStart;
  }

  // Billing: invoices on each paid interval's renewal dates.
  for (const s of subscriptions) {
    const [sid, account, plan, period, mrr, startText, endText] = s;
    if (plan === 'free') continue;
    const r = rng.fork(`billing:${sid}`);
    const start = ms(startText), end = endText ? ms(endText) : END;
    const step = period === 'annual' ? 365 * DAY : 30 * DAY;
    const amount = period === 'annual' ? PLANS[plan] * 10 : mrr;
    for (let t = start; t < end; t += step) {
      if (r.chance(0.045)) {
        billing.push([0, account, sid, 'payment_failed', ts(t + HOUR), amount]);
        if (r.chance(0.8)) billing.push([0, account, sid, 'invoice_paid', ts(t + r.int(1, 5) * DAY), amount]);
      } else billing.push([0, account, sid, 'invoice_paid', ts(t + r.int(1, 30) * MINUTE), amount]);
      if (r.chance(0.012)) billing.push([0, account, sid, 'refund_issued', ts(t + r.int(2, 20) * DAY), -Math.round(amount * r.pick([1, 0.5, 0.25]))]);
    }
  }
  billing.sort((a, b) => (a[4] < b[4] ? -1 : a[4] > b[4] ? 1 : a[2] - b[2]));
  billing.forEach((b, i) => { b[0] = i + 1; });

  // Deliveries are numbered in arrival order, so occurred_at is out of order for late events.
  pending.sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  pending.forEach((p, i) => events.push([i + 1, p[6], p[2], p[3], p[4], p[5], ts(p[0]), ts(p[1])]));
  assignments.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return { accounts, users, subscriptions, sessions, events, projects, invitations, experiments, experiment_assignments: assignments, billing_events: billing };
}

const dataset = {
  id: 'saas',
  version: '3.0.0',
  name: 'Product / SaaS Analytics',
  domain: 'Product analytics',
  kind: 'synthetic',
  description: 'Eighteen months of a fictional collaboration product: workspaces, users, invitations, projects, sessions, raw event deliveries, experiments, plan changes and billing.',
  source: {
    publisher: 'Runtime',
    url: 'https://github.com/KrishnaSathvik/runtime.school',
    release: `Runtime SaaS generator ${GENERATOR_VERSION}, seed ${SEED}`,
    license: 'Runtime-owned synthetic data',
    licenseUrl: 'https://github.com/KrishnaSathvik/runtime.school',
    commercialReuse: 'permitted',
    attribution: 'Synthetic data generated by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'Workspace fit drives activation, team growth, session frequency, upgrades and churn; exceptions are sampled, not removed.',
      'Five of twenty experiments carry a real effect on their primary metric; one has an intentional 55/45 allocation; one has three arms.',
      'About 2.5% of client events are retried (repeated event_id), 4% arrive minutes to hours late and 1% arrive days late.',
      'About 1.2% of project creations have no project_created event (tracking loss).',
    ],
  },
  reproduction: { command: 'node datasets/build.mjs saas', implementation: 'datasets/saas/dataset.mjs', seed: SEED, notes: `Generator version ${GENERATOR_VERSION}; deterministic for a given seed.` },
  coverage: { start: '2024-01-01', end: '2025-06-30', grain: 'event delivery' },
  tables,
  edgeCases: [
    'Retried deliveries with duplicate event_id',
    'Late and out-of-order deliveries (received_at long after occurred_at)',
    'Server-side events with no session',
    'Projects with no creation event',
    'Invitations never accepted; users who joined without an invitation',
    'Referral relationships between users in different workspaces',
    'Cancellations followed by reactivation',
    'Annual and monthly billing; failed payments and partial refunds',
    'Unequal experiment allocation and a three-arm test',
    'Users who never return after signup',
  ],
  qualityNotes: [
    'Count logical events with DISTINCT event_id; count deliveries only for pipeline questions.',
    'Use occurred_at for behavior and received_at for ingestion questions.',
    'mrr_cents is list price per month, not cash collected; billing_events records cash.',
  ],
  concepts: ['funnels', 'retention', 'cohorts', 'sessionization', 'deduplication', 'experiments', 'self joins', 'ratios', 'usage economics'],
  rows: () => generate(),
  mutation: `
DELETE FROM events WHERE delivery_id % 211 = 0;
INSERT INTO events SELECT (SELECT MAX(delivery_id) FROM events) + delivery_id, event_id, user_id, account_id, session_id, event_name, occurred_at, datetime(received_at, '+3 minutes') FROM events WHERE delivery_id % 307 = 0;
UPDATE events SET occurred_at = datetime(occurred_at, '+1 day') WHERE delivery_id % 401 = 0 AND session_id IS NULL;
UPDATE subscriptions SET mrr_cents = mrr_cents + 1000 WHERE plan = 'pro' AND subscription_id % 5 = 0;
UPDATE experiment_assignments SET variant = 'treatment' WHERE experiment_id = 1 AND user_id % 23 = 0;
UPDATE users SET referred_by_user_id = NULL WHERE user_id % 37 = 0;
DELETE FROM projects WHERE project_id % 97 = 0;
UPDATE accounts SET country = 'Canada' WHERE account_id % 53 = 0;
INSERT INTO users SELECT (SELECT MAX(user_id) + 1 FROM users), account_id, 'Probe User', 'probe.user@runtime.example', 'member', 'domain_join', NULL, '2025-03-31 23:30:00', NULL FROM accounts WHERE account_id = 1;
INSERT INTO invitations SELECT (SELECT MAX(invitation_id) + 1 FROM invitations), account_id, invited_by_user_id, invitee_email, '2025-06-01 10:00:00', NULL, NULL FROM invitations WHERE LOWER(invitee_email) = (SELECT LOWER(invitee_email) FROM invitations GROUP BY LOWER(invitee_email) HAVING COUNT(DISTINCT account_id) > 1 ORDER BY 1 LIMIT 1) LIMIT 1;
INSERT INTO invitations SELECT (SELECT MAX(invitation_id) + 1 FROM invitations), 2, invited_by_user_id, ' Probe.Person@Mail.Example ', '2025-06-02 10:00:00', NULL, NULL FROM invitations WHERE account_id = 2 LIMIT 1;
INSERT INTO invitations SELECT (SELECT MAX(invitation_id) + 1 FROM invitations), 3, invited_by_user_id, 'probe.person@mail.example', '2025-06-03 10:00:00', NULL, NULL FROM invitations WHERE account_id = 3 LIMIT 1;
UPDATE invitations SET accepted_at = NULL, accepted_user_id = NULL WHERE invitation_id % 41 = 0;
UPDATE experiment_assignments SET variant = CASE variant WHEN 'control' THEN 'treatment' ELSE 'control' END WHERE experiment_id = 6 AND user_id % 9 = 0;
INSERT INTO events SELECT (SELECT MAX(delivery_id) FROM events) + a.user_id, 'evt_probe_' || a.user_id, a.user_id, u.account_id, NULL, 'report_created', datetime(a.assigned_at, '+1 hour'), datetime(a.assigned_at, '+1 hour') FROM experiment_assignments a JOIN users u USING (user_id) WHERE a.experiment_id = 6 AND a.user_id % 11 = 0;
`,
  contract: {
    totalRows: [150000, 250000],
    minRows: { accounts: 3000, users: 10000, subscriptions: 4000, sessions: 35000, events: 110000, projects: 8000, invitations: 5000, experiments: 20, experiment_assignments: 10000, billing_events: 3500 },
    checks: [
      { name: 'months with signups', sql: "SELECT COUNT(DISTINCT substr(created_at, 1, 7)) FROM accounts", equals: 18 },
      { name: 'largest account share of events', sql: maxShare('events', 'account_id'), max: 0.01 },
      { name: 'largest user share of events', sql: maxShare('events', 'user_id'), max: 0.005 },
      { name: 'event types', sql: distinct('events', 'event_name'), min: 15 },
      { name: 'retried deliveries (duplicate event_id)', sql: 'SELECT COUNT(*) - COUNT(DISTINCT event_id) FROM events', min: 1500 },
      { name: 'late deliveries (> 1 hour)', sql: "SELECT COUNT(*) FROM events WHERE julianday(received_at) - julianday(occurred_at) > 1.0 / 24", min: 2000 },
      { name: 'out-of-order deliveries', sql: 'SELECT COUNT(*) FROM events e WHERE occurred_at < (SELECT MAX(occurred_at) FROM events p WHERE p.delivery_id = e.delivery_id - 1)', min: 1000 },
      { name: 'server-side events without session', sql: nulls('events', 'session_id'), min: 1000 },
      { name: 'one open subscription per account', sql: 'SELECT COUNT(*) FROM accounts a WHERE (SELECT COUNT(*) FROM subscriptions s WHERE s.account_id = a.account_id AND s.ended_at IS NULL) <> 1', equals: 0 },
      { name: 'accounts that ever paid', sql: "SELECT COUNT(DISTINCT account_id) FROM subscriptions WHERE plan <> 'free'", min: 600 },
      { name: 'cancellations', sql: "SELECT COUNT(*) FROM subscriptions WHERE end_reason = 'canceled'", min: 150 },
      { name: 'reactivated accounts', sql: "SELECT COUNT(*) FROM (SELECT account_id FROM subscriptions WHERE plan <> 'free' GROUP BY account_id HAVING SUM(end_reason = 'canceled') > 0 AND COUNT(*) > SUM(end_reason = 'canceled'))", min: 20 },
      { name: 'paid plan share rises with workspace size', sql: "SELECT (SELECT AVG(paid) FROM (SELECT a.account_id, MAX(s.plan <> 'free') AS paid FROM accounts a JOIN subscriptions s USING (account_id) WHERE company_size IN ('201-1000', '1000+') GROUP BY a.account_id)) > (SELECT AVG(paid) FROM (SELECT a.account_id, MAX(s.plan <> 'free') AS paid FROM accounts a JOIN subscriptions s USING (account_id) WHERE company_size = '1-10' GROUP BY a.account_id))", equals: 1 },
      { name: 'invitations never accepted', sql: nulls('invitations', 'accepted_at'), min: 1500 },
      { name: 'users joined by domain', sql: "SELECT COUNT(*) FROM users WHERE signup_source = 'domain_join'", min: 2000 },
      { name: 'referred users', sql: 'SELECT COUNT(referred_by_user_id) FROM users', min: 200 },
      { name: 'projects without creation event', sql: "SELECT COUNT(*) FROM projects p WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.event_name = 'project_created' AND e.user_id = p.created_by_user_id AND e.occurred_at = p.created_at)", min: 20 },
      { name: 'onboarding experiment lift (treatment − control completion rate, pct points)', sql: "SELECT ROUND(100 * (AVG(CASE WHEN variant = 'treatment' THEN done END) - AVG(CASE WHEN variant = 'control' THEN done END)), 1) FROM (SELECT a.variant, EXISTS (SELECT 1 FROM events e WHERE e.user_id = a.user_id AND e.event_name = 'onboarding_completed') AS done FROM experiment_assignments a WHERE a.experiment_id = 1)", min: 2 },
      { name: 'three-arm experiment variants', sql: "SELECT COUNT(DISTINCT variant) FROM experiment_assignments a JOIN experiments x USING (experiment_id) WHERE x.experiment_key = 'three_arm_pricing'", equals: 3 },
      { name: 'failed payments', sql: "SELECT COUNT(*) FROM billing_events WHERE event_type = 'payment_failed'", min: 100 },
    ],
  },
};

export default dataset;
