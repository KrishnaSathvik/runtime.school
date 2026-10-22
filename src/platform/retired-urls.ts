/**
 * Addresses earlier versions of the site published (and Google indexed) that no longer exist.
 * Each one permanently redirects to the closest current page, or to its section when nothing matches,
 * so old links and search results land somewhere useful instead of a 404.
 * No "@/" imports: next.config.ts loads this file directly.
 */

/** Practice questions from the bank the SQL rebuild replaced, keyed to the question that teaches the same idea. */
const practice: Record<string, string> = {
  "abandoned-checkout-attempts": "abandoned-checkouts",
  "above-regional-average": "big-spenders-for-their-state",
  "average-salary-by-department": "average-price-by-category",
  "bestsellers-within-category": "bestsellers-within-each-category",
  "build-region-history": "build-a-country-history-from-invoices",
  "canonical-event-retries": "debug-redelivered-events",
  "catalog-by-price": "kitchen-catalog-from-most-to-least-expensive",
  "category-audience-overlap": "department-audience-overlap",
  "checkout-case-session-baseline": "upgrade-review-1-the-daily-pricing-audience",
  "checkout-case-funnel-dropoff": "upgrade-review-2-where-the-funnel-drops",
  "checkout-case-delay-tail": "upgrade-review-3-time-from-checkout-to-subscription",
  "checkout-case-later-recovery": "upgrade-review-4-abandoned-checkouts-that-came-back",
  "checkout-case-channel-priorities": "upgrade-review-5-which-channels-to-fix-first",
  "co-purchased-product-pairs": "products-bought-together",
  "cover-the-event-export": "cover-the-export-query",
  "covering-index-for-units": "a-covering-index-for-unit-totals",
  "days-to-deliver": "how-long-did-delivery-take",
  "days-without-orders": "days-with-no-orders",
  "debug-distinct-credit-rank": "debug-the-second-best-win-total",
  "debug-last-window-value": "debug-each-account-s-last-posted-amount",
  "debug-month-boundary": "debug-february-flights-at-the-boundary",
  "debug-null-filter": "debug-find-products-with-no-description",
  "debug-outer-join-filter": "debug-keep-carriers-without-next-day-shipments",
  "deduplicate-shopper-accounts": "keep-one-invitation-per-person",
  "delivered-revenue-by-category": "2011-net-sales-by-department",
  "employees-and-departments": "developers-and-their-teams",
  "everyone-with-a-department-label": "every-developer-with-a-team-label",
  "first-versus-latest-order": "first-and-latest-order-per-customer",
  "garden-repricing": "reprice-the-garden-range",
  "lamps-in-the-catalog": "find-the-lamps",
  "longest-login-streak": "longest-winning-streak",
  "loyal-and-never-refunded": "loyal-customers-who-never-returned-anything",
  "management-chain": "management-chain-for-every-developer",
  "march-signups": "users-created-in-march-2025",
  "monthly-active-buyers": "active-buyers-per-month",
  "monthly-net-revenue": "monthly-sales-after-cancellations",
  "monthly-signup-cohorts": "next-month-retention-by-signup-cohort",
  "normalize-contact-imports": "normalize-invitee-emails",
  "office-locations": "countries-customers-come-from",
  "ordered-cart-funnel": "an-ordered-upgrade-funnel",
  "orders-by-status": "orders-by-country-and-type",
  "orders-not-fully-paid": "orders-whose-payments-don-t-match",
  "out-earning-the-manager": "more-pull-requests-than-their-manager",
  "overlapping-salary-periods": "encounters-that-overlap-in-time",
  "parse-exact-money-cents": "parse-statement-amounts-into-cents",
  "predict-count-grain": "predict-count-rows-or-known-values",
  "predict-null-comparison": "predict-unknown-prices-in-a-filter",
  "predict-partition-lag": "predict-the-previous-leg-of-the-same-aircraft",
  "predict-peer-frames": "predict-a-frame-that-includes-peers",
  "predict-rank-ties": "predict-positions-and-shared-ranks",
  "predict-unmatched-bookings": "predict-patients-with-and-without-missed-appointments",
  "purchase-lookup-index": "design-a-flight-lookup-index",
  "recover-a-stock-allocation": "recover-a-partially-failed-transfer",
  "repeat-shoppers": "frequent-customers",
  "replay-safe-ledger-load": "a-replay-safe-ledger-load",
  "rolling-seven-day-logins": "seven-day-rolling-high-temperature",
  "salary-at-review-time": "customer-segment-at-order-time",
  "sargable-event-day": "make-the-event-day-filter-searchable",
  "second-highest-salary": "second-highest-home-run-total-per-team",
  "session-boundaries-with-retries": "sessionize-retries-and-exact-boundaries",
  "session-conversion-by-first-touch": "paid-conversion-by-acquisition-channel",
  "shared-emails": "people-invited-by-several-workspaces",
  "shopper-contact-list": "customer-list",
  "shopper-totals-view": "a-reusable-customer-totals-view",
  "shoppers-in-every-category": "customers-who-bought-from-every-home-category",
  "three-cheapest-items": "the-three-cheapest-products",
  "three-way-payment-reconciliation": "settlements-refunds-and-disputes",
  "top-events-without-a-sort": "latest-failed-deliveries-without-a-sort",
  "validated-reservation-boundary": "enforce-delivery-slot-rules",
};

/** Retired practice questions with no close match; they go to Practice. */
const practiceWithoutMatch = [
  "capacity-avoid-fan-out", "capacity-fixed-cutoff-projection", "capacity-missing-sites", "capacity-next-deliveries",
  "capacity-regional-snapshot", "debug-count-bookings", "hired-in-2023", "items-never-ordered", "median-order-value",
  "open-orders-feb-mar", "orders-without-delivery-date", "parse-import-product-codes", "payroll-versus-budget",
  "salary-column-alias", "shoppers-in-the-west", "status-mix-by-region",
];

/** Guided projects the catalog replaced (by slug and by their earlier numeric id). */
const projects: Record<string, string> = {
  "warehouse-and-reporting": "trusted-retail-warehouse",
  "3": "trusted-retail-warehouse",
  "social-product-analytics": "saas-activation-retention",
  "1": "saas-activation-retention",
};
const projectsWithoutMatch = ["video-product-analytics", "0", "ai-platform-economics", "2", "crm-erp-integration", "4"];

export const retiredPracticeSlugs = practice;
export const retiredProjectIds = projects;

type Redirect = { source: string; destination: string; permanent: true };
const to = (source: string, destination: string): Redirect => ({ source, destination, permanent: true });

export function retiredRedirects(): Redirect[] {
  return [
    ...Object.entries(practice).map(([from, slug]) => to(`/sql/practice/${from}`, `/sql/practice/${slug}`)),
    ...practiceWithoutMatch.map((from) => to(`/sql/practice/${from}`, "/sql/practice")),
    // Project milestone and report pages were per-learner steps inside a guided project.
    to("/sql/projects/:id/m/:lesson", "/sql/projects/:id"),
    to("/sql/projects/:id/report", "/sql/projects/:id"),
    ...Object.entries(projects).map(([from, id]) => to(`/sql/projects/${from}`, `/sql/projects/${id}`)),
    ...projectsWithoutMatch.map((from) => to(`/sql/projects/${from}`, "/sql/projects")),
    // The app routes from before everything moved under /sql.
    to("/learn/:path*", "/sql"),
    to("/lesson/:id", "/sql/lesson/:id"),
    to("/practice/sql", "/sql/practice"),
    to("/practice/questions", "/sql/practice"),
    to("/practice/tracks/:path*", "/sql/practice"),
    to("/practice/cases/:path*", "/sql/practice"),
    to("/practice/:slug", "/sql/practice/:slug"),
    to("/practice", "/sql/practice"),
    to("/projects/sql", "/sql/projects"),
    to("/projects/:id/:rest*", "/sql/projects/:id"),
    to("/projects", "/sql/projects"),
    to("/skills/:path*", "/sql"),
    to("/review/:path*", "/sql"),
    ...["/explore", "/subjects", "/my-learning", "/progress", "/placement", "/settings"].map((from) => to(from, "/")),
  ];
}
