/** Domain questions on real fixture columns, verified by the tools Spark gate. */
export const DOMAIN_EXAMPLES: Record<string, { title: string; table: string; group: string; about: string }> = {
  "PS-D01": { title: "Orders by status", table: "orders", group: "status", about: "Customers, products and orders from a retail business." },
  "PS-D02": { title: "Accounts by currency", table: "accounts", group: "currency", about: "Bank accounts, payments, transfers and reconciliation." },
  "PS-D03": { title: "Employees by department", table: "employees", group: "department_id", about: "Employees, departments, pay and attendance." },
  "PS-D04": { title: "Providers by specialty", table: "providers", group: "specialty", about: "Patient encounters, providers, claims and medication." },
  "PS-D05": { title: "Movies by genre", table: "movies", group: "primary_genre", about: "Movies, ratings, viewing sessions and subscriptions." },
  "PS-D06": { title: "Page views by arrival batch", table: "page_views", group: "batch", about: "Nested shopping events with event and arrival times." },
  "PS-D07": { title: "Trips by pickup zone", table: "trips", group: "pickup_zone_id", about: "Taxi trips, zones, fares and weather enrichment." },
  "PS-D08": { title: "Warehouses by region", table: "warehouses", group: "region", about: "Inventory, shipments and changing supply-chain records." },
  "PS-D09": { title: "Devices by type", table: "devices", group: "device_type", about: "Devices, nested sensor readings, alerts and maintenance." },
  "PS-D10": { title: "Securities by sector", table: "securities", group: "sector", about: "Invented securities, prices, trades and corporate actions." },
  "PS-D11": { title: "Learners by country", table: "learners", group: "country", about: "Learners, courses, attempts and completions." },
  "PS-D12": { title: "Campaigns by channel", table: "campaigns", group: "channel", about: "Campaigns, advertising events, budgets and conversions." },
  "PS-D13": { title: "Stations by country", table: "stations", group: "country", about: "Weather stations, observations, forecasts and alerts." },
  "PS-D14": { title: "Accounts by industry", table: "accounts", group: "industry", about: "Business accounts, invoices and change-data feeds." },
  "PS-D15": { title: "Requests by service", table: "api_requests", group: "service", about: "Requests, nested logs, traces, deployments and errors." },
};
export function domainProgram(id: string) {
  const e = DOMAIN_EXAMPLES[id];
  return `from pyspark.sql import functions as F\n\nresult = ${e.table}.groupBy("${e.group}").count().orderBy("${e.group}")\ndisplay(result, "${e.title}")\n`;
}
