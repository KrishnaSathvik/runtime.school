import { defineProject } from "./helpers";

const SALE_LINES = "orders AS o JOIN order_items AS i ON i.order_id = o.order_id";

export const retailPerformanceReview = defineProject({
  id: "retail-performance-review",
  title: "Retail Performance Review",
  level: "beginner",
  role: "Junior Business Analyst",
  datasetId: "retail",
  brief: {
    who: "You support the commercial manager of a UK online gift wholesaler.",
    situation: "Sales for 2011 look lower than 2010. The manager wants to know whether trading really weakened, which departments drove the change, how much value is lost to cancellations, and how much of the business can be traced to known customers.",
    ask: "Is trading weaker in 2011 than in 2010, where does the change come from, and what should the commercial team look at first?",
    data: "Retail: two years of real invoice lines (December 2009 to 9 December 2011) for a sample of customers, with products, departments, customers and their regions. Sale invoices and cancellation invoices are both recorded; cancellation lines carry negative quantities.",
    deliverable: "A short commercial review with three connected findings, two prioritized follow-up actions and the limits of what invoices can show.",
  },
  prerequisites: ["Filtering", "Aggregation", "Joins", "CASE expressions", "Dates"],
  placementAfter: ["joins", "aggregation"],
  relevantTables: ["orders", "order_items", "products", "categories", "customers"],
  understand: {
    title: "Understand the Retail invoices",
    context: "orders has one row per invoice header; order_type is 'sale' or 'cancellation'. order_items has one row per invoice line and joins to orders on order_id. Line value is quantity × unit_price: cancellation lines are negative, and a few lines on sale invoices are negative adjustments too. customer_id is NULL on anonymous invoices. products.category_id links to categories, which groups products into departments; some products have no category. The data ends on 9 December 2011, so December 2011 is incomplete.",
    investigation: "Follow one invoice from orders to its lines in order_items and its products. Which columns identify a sale versus a cancellation, and which rows have no customer?",
  },
  steps: [
    {
      kind: "checkpoint", id: "baseline", title: "Size sales and cancellations",
      context: "Before comparing years, establish control totals for the whole period: how much was invoiced, and how much was taken back by cancellation invoices.",
      investigation: "Across all invoices, how many sale and cancellation invoices are there, what are gross sales, cancelled value and net sales, and what share of gross sales was cancelled?",
      tables: ["orders", "order_items"],
      columns: ["sale_invoices", "cancellation_invoices", "gross_sales", "cancelled_value", "net_sales", "cancellation_rate"],
      grain: "one summary row", ordered: false,
      definitions: [
        "Line value = quantity × unit_price. Use every line; do not drop negative lines.",
        "sale_invoices / cancellation_invoices = distinct orders.order_id with that order_type.",
        "gross_sales = total line value on sale invoices. cancelled_value = total line value on cancellation invoices (negative). net_sales = total of all lines.",
        "cancellation_rate = −cancelled_value / gross_sales as a fraction, rounded to 4 decimals. Round money to 2 decimals after summing.",
      ],
      hints: [
        "Invoices and invoice lines are different units: count invoices with DISTINCT after the join.",
        "Use CASE inside SUM to split sale and cancellation value in one pass.",
        "cancelled_value is already negative, so the rate needs a minus sign to be positive.",
      ],
      finding: "Quote gross sales, cancelled value and the cancellation rate. Is cancellation large enough to matter for the year-on-year comparison?",
      sql: `
SELECT
  COUNT(DISTINCT CASE WHEN o.order_type = 'sale' THEN o.order_id END) AS sale_invoices,
  COUNT(DISTINCT CASE WHEN o.order_type = 'cancellation' THEN o.order_id END) AS cancellation_invoices,
  ROUND(SUM(CASE WHEN o.order_type = 'sale' THEN i.quantity * i.unit_price ELSE 0 END), 2) AS gross_sales,
  ROUND(SUM(CASE WHEN o.order_type = 'cancellation' THEN i.quantity * i.unit_price ELSE 0 END), 2) AS cancelled_value,
  ROUND(SUM(i.quantity * i.unit_price), 2) AS net_sales,
  ROUND(-SUM(CASE WHEN o.order_type = 'cancellation' THEN i.quantity * i.unit_price ELSE 0 END)
        / SUM(CASE WHEN o.order_type = 'sale' THEN i.quantity * i.unit_price ELSE 0 END), 4) AS cancellation_rate
FROM ${SALE_LINES}`,
    },
    {
      kind: "checkpoint", id: "months", title: "Compare 2011 with 2010 by month",
      context: "A yearly total hides when the change happened. Compare the same calendar months in both years, January to November, because December 2011 is incomplete.",
      investigation: "For each month from January to November, what were sale-invoice sales in 2010 and in 2011, and by what percentage did 2011 change?",
      tables: ["orders", "order_items"],
      columns: ["month_number", "sales_2010", "sales_2011", "change_pct"],
      grain: "one row per month 1–11, in month order", ordered: true,
      definitions: [
        "Use sale invoices only. month_number = the invoice month as an integer (1–11); exclude December in both years.",
        "sales_2010 / sales_2011 = total line value in that month and year, rounded to 2 decimals.",
        "change_pct = 100 × (sales_2011 − sales_2010) / sales_2010, from unrounded totals, rounded to 1 decimal.",
      ],
      hints: [
        "strftime('%m', ordered_at) and strftime('%Y', ordered_at) give the month and year as text.",
        "Aggregate by month and year first, then pivot the two years into columns with CASE.",
        "Filter on ordered_at ranges for 2010 and 2011 so the 2009 data is excluded.",
      ],
      finding: "In how many of the eleven months were 2011 sales lower? Name the months with the largest fall and the largest rise.",
      sql: `
WITH monthly AS (
  SELECT CAST(strftime('%m', o.ordered_at) AS INTEGER) AS month_number,
         strftime('%Y', o.ordered_at) AS year,
         SUM(i.quantity * i.unit_price) AS sales
  FROM ${SALE_LINES}
  WHERE o.order_type = 'sale' AND o.ordered_at >= '2010-01-01' AND o.ordered_at < '2012-01-01'
    AND strftime('%m', o.ordered_at) <> '12'
  GROUP BY month_number, year
)
SELECT month_number,
       ROUND(SUM(CASE WHEN year = '2010' THEN sales END), 2) AS sales_2010,
       ROUND(SUM(CASE WHEN year = '2011' THEN sales END), 2) AS sales_2011,
       ROUND(100.0 * (SUM(CASE WHEN year = '2011' THEN sales END) - SUM(CASE WHEN year = '2010' THEN sales END))
             / SUM(CASE WHEN year = '2010' THEN sales END), 1) AS change_pct
FROM monthly
GROUP BY month_number
ORDER BY month_number`,
    },
    {
      kind: "checkpoint", id: "departments", title: "Find the departments behind the change",
      context: "The monthly view shows when sales moved. Department totals show where, so the team can focus on a product area rather than the whole catalogue.",
      investigation: "For January–November of each year, what were sale-invoice sales by department in 2010 and 2011, and which departments changed most?",
      tables: ["orders", "order_items", "products", "categories"],
      columns: ["department", "sales_2010", "sales_2011", "change"],
      grain: "one row per department, largest fall first", ordered: true,
      definitions: [
        "Use sale invoices dated January–November 2010 and January–November 2011.",
        "department = categories.department; products with no category are 'Uncategorised'.",
        "change = sales_2011 − sales_2010. Round all money to 2 decimals. Order by change ascending, then department.",
      ],
      hints: [
        "Join order_items → products → categories; use LEFT JOIN to categories so uncategorised products stay.",
        "COALESCE turns a missing department into 'Uncategorised'.",
        "Put both year windows in the WHERE clause, then split them with CASE inside SUM.",
      ],
      finding: "Which two departments explain most of the fall? Is one of them actual merchandise, or charges such as postage?",
      sql: `
SELECT COALESCE(c.department, 'Uncategorised') AS department,
       ROUND(SUM(CASE WHEN o.ordered_at < '2011-01-01' THEN i.quantity * i.unit_price ELSE 0 END), 2) AS sales_2010,
       ROUND(SUM(CASE WHEN o.ordered_at >= '2011-01-01' THEN i.quantity * i.unit_price ELSE 0 END), 2) AS sales_2011,
       ROUND(SUM(CASE WHEN o.ordered_at >= '2011-01-01' THEN i.quantity * i.unit_price ELSE 0 END)
           - SUM(CASE WHEN o.ordered_at < '2011-01-01' THEN i.quantity * i.unit_price ELSE 0 END), 2) AS change
FROM ${SALE_LINES}
JOIN products AS p ON p.stock_code = i.stock_code
LEFT JOIN categories AS c ON c.category_id = p.category_id
WHERE o.order_type = 'sale'
  AND ((o.ordered_at >= '2010-01-01' AND o.ordered_at < '2010-12-01')
    OR (o.ordered_at >= '2011-01-01' AND o.ordered_at < '2011-12-01'))
GROUP BY department
ORDER BY change, department`,
    },
    {
      kind: "checkpoint", id: "customers", title: "Check who the 2011 sales come from",
      context: "Any customer follow-up needs a known customer. Measure how 2011 sales split across customer regions, and how much comes from anonymous invoices.",
      investigation: "For sale invoices from January to November 2011, how many customers and how much of sales come from each region, and from anonymous invoices?",
      tables: ["orders", "order_items", "customers"],
      columns: ["region", "customers", "sales", "share_pct"],
      grain: "one row per region (plus 'Anonymous'), largest sales first", ordered: true,
      definitions: [
        "region = customers.region; invoices without a customer are 'Anonymous'.",
        "customers = distinct customer_id in the group (0 for Anonymous).",
        "share_pct = 100 × group sales / all sales in the period, rounded to 1 decimal. Round sales to 2 decimals.",
      ],
      hints: [
        "LEFT JOIN customers so anonymous invoices are kept.",
        "COUNT(DISTINCT customer_id) ignores NULLs, so Anonymous counts 0 customers.",
        "A CTE with every line's region and value makes the share's denominator easy.",
      ],
      finding: "What share of 2011 sales is anonymous? What does that mean for a customer-level follow-up?",
      sql: `
WITH sales AS (
  SELECT COALESCE(c.region, 'Anonymous') AS region, o.customer_id, i.quantity * i.unit_price AS value
  FROM ${SALE_LINES}
  LEFT JOIN customers AS c ON c.customer_id = o.customer_id
  WHERE o.order_type = 'sale' AND o.ordered_at >= '2011-01-01' AND o.ordered_at < '2011-12-01'
)
SELECT region,
       COUNT(DISTINCT customer_id) AS customers,
       ROUND(SUM(value), 2) AS sales,
       ROUND(100.0 * SUM(value) / (SELECT SUM(value) FROM sales), 1) AS share_pct
FROM sales
GROUP BY region
ORDER BY sales DESC`,
    },
  ],
  synthesis: {
    title: "Review the commercial picture",
    investigation: "Connect the control totals, the monthly comparison, the department changes and the customer split into one explanation.",
    reviewPrompt: "Which three findings matter most? Explain whether 2011 is weaker across the year or in specific months, which departments drive it, and how the anonymous share limits customer follow-up.",
  },
  report: {
    context: "The commercial manager will use this to choose two follow-up actions.",
    investigation: "Deliver three connected findings, two prioritized actions and the limits of invoice data.",
    summary: "Explain how 2011 compares with 2010, using the monthly and department evidence with amounts and percentages.",
    recommendation: "Prioritize two follow-up actions, naming the department or customer group and the evidence behind each.",
    limitations: "Explain what invoices cannot show: the sample of customers, the incomplete December 2011, anonymous invoices, and that cancellations do not give a reason.",
  },
});

const COMPLETED = "cancelled = 0 AND diverted = 0";

export const airlineReliabilityReview = defineProject({
  id: "airline-reliability-review",
  title: "Airline Reliability Review",
  level: "beginner",
  role: "Airline Operations Analyst",
  datasetId: "flights",
  brief: {
    who: "You support an airline network operations team.",
    situation: "Passenger complaints about late and cancelled flights rose over the winter. Leadership wants to know where unreliability concentrates before choosing where to act.",
    ask: "How reliable was U.S. domestic flying in January–March 2025, which airlines and airports were weakest, and what causes most delay?",
    data: "U.S. Flights: every domestic flight flown by a sample of 435 aircraft in January–March 2025 (Bureau of Transportation Statistics), with airlines, airports, routes, delays, cancellations, diversions and delay causes.",
    deliverable: "A reliability assessment with three findings and one operational recommendation.",
  },
  prerequisites: ["Aggregation", "Joins", "CASE expressions", "NULL handling"],
  placementAfter: ["joins", "conditional aggregation"],
  relevantTables: ["flights", "airlines", "airports", "routes"],
  understand: {
    title: "Understand the flight records",
    context: "flights has one row per scheduled flight leg. cancelled and diverted are 1 or 0. A cancelled flight has no arrival, so arrival_delay is NULL: missing, not on time. arrival_delay is in minutes; negative means early. The five delay-cause columns (carrier, weather, NAS, security, late aircraft) are only filled for flights that arrived 15 or more minutes late. airline_code joins to airlines; origin and destination join to airports.",
    investigation: "Look at a cancelled flight and a delayed flight side by side. Which columns are filled for each?",
  },
  steps: [
    {
      kind: "checkpoint", id: "baseline", title: "Measure network reliability",
      context: "Establish the network-wide picture before blaming a single airline or airport.",
      investigation: "How many flights were scheduled, cancelled and diverted, and what were the cancellation rate, on-time rate and average arrival delay?",
      tables: ["flights"],
      columns: ["scheduled_flights", "cancelled_flights", "diverted_flights", "cancellation_pct", "on_time_pct", "avg_arrival_delay"],
      grain: "one summary row", ordered: false,
      definitions: [
        "scheduled_flights = all rows. cancellation_pct = 100 × cancelled / scheduled, 2 decimals.",
        "A completed flight is neither cancelled nor diverted. on_time_pct = 100 × completed flights with arrival_delay < 15 / completed flights, 2 decimals.",
        "avg_arrival_delay = average arrival_delay of completed flights, 1 decimal (early arrivals count as negative).",
      ],
      hints: [
        "SUM(cancelled) counts cancellations because the column is 1 or 0.",
        "Use CASE to restrict both the on-time count and its denominator to completed flights.",
        "AVG of a CASE that returns NULL for other flights averages only completed ones.",
      ],
      finding: "Summarize the network in one sentence using the cancellation and on-time rates.",
      sql: `
SELECT COUNT(*) AS scheduled_flights,
       SUM(cancelled) AS cancelled_flights,
       SUM(diverted) AS diverted_flights,
       ROUND(100.0 * SUM(cancelled) / COUNT(*), 2) AS cancellation_pct,
       ROUND(100.0 * SUM(CASE WHEN ${COMPLETED} AND arrival_delay < 15 THEN 1 ELSE 0 END)
             / SUM(CASE WHEN ${COMPLETED} THEN 1 ELSE 0 END), 2) AS on_time_pct,
       ROUND(AVG(CASE WHEN ${COMPLETED} THEN arrival_delay END), 1) AS avg_arrival_delay
FROM flights`,
    },
    {
      kind: "checkpoint", id: "airlines", title: "Compare airlines",
      context: "Airlines fly very different volumes, so compare rates, not counts.",
      investigation: "For each airline, how many flights did it operate, and what were its cancellation and on-time rates?",
      tables: ["flights", "airlines"],
      columns: ["airline_name", "flights", "cancellation_pct", "on_time_pct"],
      grain: "one row per airline, least punctual first", ordered: true,
      definitions: [
        "Use the baseline definitions per airline. flights = all scheduled flights for the airline.",
        "Order by on_time_pct ascending, then airline_name.",
      ],
      hints: [
        "Join flights to airlines on airline_code and group by the airline.",
        "Reuse the CASE expressions from the baseline inside each group.",
        "Rates are rounded to 2 decimals.",
      ],
      finding: "Which airline is least punctual and which cancels most? Are they the same airline, and how large is its volume?",
      sql: `
SELECT a.airline_name,
       COUNT(*) AS flights,
       ROUND(100.0 * SUM(f.cancelled) / COUNT(*), 2) AS cancellation_pct,
       ROUND(100.0 * SUM(CASE WHEN f.cancelled = 0 AND f.diverted = 0 AND f.arrival_delay < 15 THEN 1 ELSE 0 END)
             / SUM(CASE WHEN f.cancelled = 0 AND f.diverted = 0 THEN 1 ELSE 0 END), 2) AS on_time_pct
FROM flights AS f
JOIN airlines AS a ON a.airline_code = f.airline_code
GROUP BY a.airline_code
ORDER BY on_time_pct, a.airline_name`,
    },
    {
      kind: "checkpoint", id: "causes", title: "Attribute delay minutes to causes",
      context: "Operations can only act on causes it controls. Split the delay minutes of late flights by cause.",
      investigation: "Across flights that arrived 15 or more minutes late, how many delay minutes does each of the five causes account for, and what share of the total?",
      tables: ["flights"],
      columns: ["cause", "minutes", "share_pct"],
      grain: "one row per cause, most minutes first", ordered: true,
      definitions: [
        "Use flights with arrival_delay >= 15. Causes and their labels: carrier_delay 'carrier', weather_delay 'weather', nas_delay 'national airspace system', security_delay 'security', late_aircraft_delay 'late-arriving aircraft'.",
        "minutes = sum of that column. share_pct = 100 × minutes / all cause minutes, 1 decimal.",
      ],
      hints: [
        "Each cause is a separate column; UNION ALL five one-row SELECTs to turn them into rows.",
        "Put the UNION in a CTE so the share can divide by the total of all causes.",
        "Order by minutes descending.",
      ],
      finding: "Which two causes dominate? How much of the delay is within the airlines' control?",
      sql: `
WITH causes AS (
  SELECT 'carrier' AS cause, SUM(carrier_delay) AS minutes FROM flights WHERE arrival_delay >= 15
  UNION ALL SELECT 'weather', SUM(weather_delay) FROM flights WHERE arrival_delay >= 15
  UNION ALL SELECT 'national airspace system', SUM(nas_delay) FROM flights WHERE arrival_delay >= 15
  UNION ALL SELECT 'security', SUM(security_delay) FROM flights WHERE arrival_delay >= 15
  UNION ALL SELECT 'late-arriving aircraft', SUM(late_aircraft_delay) FROM flights WHERE arrival_delay >= 15
)
SELECT cause, minutes, ROUND(100.0 * minutes / (SELECT SUM(minutes) FROM causes), 1) AS share_pct
FROM causes
ORDER BY minutes DESC`,
    },
    {
      kind: "checkpoint", id: "airports", title: "Find the airports that cancel most",
      context: "Cancellations at a hub ripple through the network. Look at busy origin airports only, so a handful of flights cannot dominate the list.",
      investigation: "Among origin airports with at least 1,000 departures, which ten have the highest cancellation rate?",
      tables: ["flights", "airports"],
      columns: ["origin", "airport_name", "departures", "cancelled", "cancellation_pct"],
      grain: "ten airports, highest cancellation rate first", ordered: true,
      definitions: [
        "departures = flights with that origin. Keep airports with at least 1,000 departures.",
        "cancellation_pct = 100 × cancelled / departures, 2 decimals. Order by cancellation_pct descending, then origin; return 10 rows.",
      ],
      hints: [
        "Join flights.origin to airports.airport_code.",
        "Filter groups with HAVING COUNT(*) >= 1000.",
        "Break ties by origin so the top ten is stable.",
      ],
      finding: "Which airport stands out, and how far above the network rate is it?",
      sql: `
SELECT f.origin,
       ap.airport_name,
       COUNT(*) AS departures,
       SUM(f.cancelled) AS cancelled,
       ROUND(100.0 * SUM(f.cancelled) / COUNT(*), 2) AS cancellation_pct
FROM flights AS f
JOIN airports AS ap ON ap.airport_code = f.origin
GROUP BY f.origin
HAVING COUNT(*) >= 1000
ORDER BY cancellation_pct DESC, f.origin
LIMIT 10`,
    },
  ],
  synthesis: {
    title: "Review the reliability picture",
    investigation: "Connect the network baseline, the airline comparison, the delay causes and the airport list.",
    reviewPrompt: "Where should operations act first, and why? Separate problems an airline controls (carrier, late aircraft) from those it does not (weather, airspace).",
  },
  report: {
    context: "Operations leadership will choose one focus area from your report.",
    investigation: "Deliver three findings and one operational recommendation.",
    summary: "Summarize network reliability and the weakest airline and airports with their rates.",
    recommendation: "Recommend one operational focus and the evidence behind it.",
    limitations: "Explain the limits: three winter months, a sample of aircraft rather than every flight, and that cause columns only cover flights 15+ minutes late.",
  },
});

const VALID_TRIP = "pickup_at >= '2025-01-01' AND pickup_at < '2025-04-01' AND trip_distance_miles > 0 AND trip_distance_miles <= 100 AND total_amount >= 0 AND dropoff_at > pickup_at";

export const urbanMobilityDemand = defineProject({
  id: "urban-mobility-demand",
  title: "Urban Mobility Demand",
  level: "beginner",
  role: "Transportation Planning Analyst",
  datasetId: "mobility",
  brief: {
    who: "You support a city transportation planning team.",
    situation: "The team is planning curb space and taxi stands for 2026 and needs to know when and where taxi demand peaks, and how airport trips differ, using trusted records only.",
    ask: "Which taxi records can be trusted, when and where does demand peak, and how do airport trips differ from the rest?",
    data: "Mobility: a 1-in-87 sample of New York City yellow taxi trips from January–March 2025 (NYC TLC), with pickup and drop-off zones, boroughs, distances, fares, tips and payment types. Raw vendor records include errors.",
    deliverable: "A demand profile with three findings and one planning recommendation.",
  },
  prerequisites: ["Filtering", "Aggregation", "Joins", "Dates and times"],
  placementAfter: ["joins", "dates"],
  relevantTables: ["trips", "zones", "boroughs", "payment_types"],
  understand: {
    title: "Understand the taxi trips",
    context: "trips has one row per trip as reported by the taxi vendor. pickup_zone_id and dropoff_zone_id join to zones, and zones.borough_id to boroughs. zones.is_airport marks JFK, LaGuardia and Newark zones. Vendors report odometer errors, zero-distance trips, negative totals (refunds and voids) and drop-off times before pickup. payment_types.tip_recorded is 1 only for card payments: cash tips are not recorded.",
    investigation: "Find a trip with zero distance and one with a negative total. Would you count them as demand?",
  },
  steps: [
    {
      kind: "checkpoint", id: "validate-trips", title: "Decide which trips to trust",
      context: "Planning on bad records overstates or distorts demand. Count each kind of problem before excluding anything.",
      investigation: "How many trips fall outside the quarter, have zero distance, an implausible distance, a negative total, or a drop-off not after pickup, and how many valid trips remain?",
      tables: ["trips"],
      columns: ["trips", "outside_quarter", "zero_distance", "over_100_miles", "negative_total", "dropoff_not_after_pickup", "valid_trips"],
      grain: "one summary row", ordered: false,
      definitions: [
        "outside_quarter: pickup before 2025-01-01 or on/after 2025-04-01. zero_distance: trip_distance_miles = 0. over_100_miles: trip_distance_miles > 100.",
        "negative_total: total_amount < 0. dropoff_not_after_pickup: dropoff_at <= pickup_at. A trip can have several problems.",
        "valid_trips: inside the quarter, distance above 0 and at most 100 miles, total_amount >= 0 and drop-off after pickup.",
      ],
      hints: [
        "In SQLite a comparison is 1 or 0, so SUM(condition) counts matching rows.",
        "Problem counts can overlap, so valid_trips is not trips minus their sum: write its own condition.",
        "Times are text in 'YYYY-MM-DD HH:MM:SS' form, so text comparison orders them correctly.",
      ],
      finding: "How many trips did you exclude, and which problem is most common? Why exclude distances over 100 miles inside New York City?",
      sql: `
SELECT COUNT(*) AS trips,
       SUM(pickup_at < '2025-01-01' OR pickup_at >= '2025-04-01') AS outside_quarter,
       SUM(trip_distance_miles = 0) AS zero_distance,
       SUM(trip_distance_miles > 100) AS over_100_miles,
       SUM(total_amount < 0) AS negative_total,
       SUM(dropoff_at <= pickup_at) AS dropoff_not_after_pickup,
       SUM(${VALID_TRIP}) AS valid_trips
FROM trips`,
    },
    {
      kind: "checkpoint", id: "demand-time", title: "Profile demand by hour",
      context: "Curb space is planned by time of day. Use valid trips only.",
      investigation: "For each pickup hour of the day, how many valid trips start, what share of all valid trips is that, and what is the average total fare?",
      tables: ["trips"],
      columns: ["pickup_hour", "trips", "share_pct", "avg_total"],
      grain: "one row per hour 0–23, in hour order", ordered: true,
      definitions: [
        "Valid trips use the definition from the previous step. pickup_hour = hour of pickup_at as an integer.",
        "share_pct = 100 × trips / all valid trips, 2 decimals. avg_total = average total_amount, 2 decimals.",
      ],
      hints: [
        "strftime('%H', pickup_at) returns the hour as text; CAST it to INTEGER.",
        "A CTE of valid trips keeps the filter in one place and gives the share's denominator.",
        "Order by pickup_hour.",
      ],
      finding: "When is the evening peak, and how much larger is it than the 4 a.m. low?",
      sql: `
WITH valid AS (SELECT * FROM trips WHERE ${VALID_TRIP})
SELECT CAST(strftime('%H', pickup_at) AS INTEGER) AS pickup_hour,
       COUNT(*) AS trips,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM valid), 2) AS share_pct,
       ROUND(AVG(total_amount), 2) AS avg_total
FROM valid
GROUP BY pickup_hour
ORDER BY pickup_hour`,
    },
    {
      kind: "checkpoint", id: "demand-location", title: "Profile demand by borough",
      context: "Taxi stands go where pickups happen. Compare boroughs by trips and revenue.",
      investigation: "For each pickup borough, how many valid trips start there, how much revenue do they bring, and how long is the average trip?",
      tables: ["trips", "zones", "boroughs"],
      columns: ["pickup_borough", "trips", "revenue", "avg_miles"],
      grain: "one row per borough, most trips first", ordered: true,
      definitions: [
        "pickup_borough = boroughs.borough_name of the pickup zone. revenue = sum of total_amount, 2 decimals.",
        "avg_miles = average trip_distance_miles, 2 decimals. Order by trips descending, then pickup_borough.",
      ],
      hints: [
        "Join trips → zones on pickup_zone_id, then zones → boroughs.",
        "Group by the borough id or name.",
        "Keep the valid-trip filter.",
      ],
      finding: "What share of trips start in Manhattan? Why are Queens trips so much longer?",
      sql: `
WITH valid AS (SELECT * FROM trips WHERE ${VALID_TRIP})
SELECT b.borough_name AS pickup_borough,
       COUNT(*) AS trips,
       ROUND(SUM(v.total_amount), 2) AS revenue,
       ROUND(AVG(v.trip_distance_miles), 2) AS avg_miles
FROM valid AS v
JOIN zones AS z ON z.zone_id = v.pickup_zone_id
JOIN boroughs AS b ON b.borough_id = z.borough_id
GROUP BY b.borough_id
ORDER BY trips DESC, pickup_borough`,
    },
    {
      kind: "checkpoint", id: "airports", title: "Compare airport and city pickups",
      context: "Airport trips need dedicated queues. Compare them with other pickups on fare, distance and tipping, using card trips where tips are recorded.",
      investigation: "For valid card-paid trips, how do airport pickups compare with other pickups on trip count, average total, average distance and tip as a share of fare?",
      tables: ["trips", "zones", "payment_types"],
      columns: ["pickup_type", "trips", "avg_total", "avg_miles", "tip_pct_of_fare"],
      grain: "two rows: 'airport pickup' and 'other pickup'", ordered: true,
      definitions: [
        "Use valid trips whose payment type has tip_recorded = 1. pickup_type = 'airport pickup' when the pickup zone is_airport = 1, else 'other pickup'.",
        "avg_total and avg_miles to 2 decimals. tip_pct_of_fare = 100 × sum of tip_amount / sum of fare_amount, 1 decimal. Order by pickup_type.",
      ],
      hints: [
        "Join payment_types and filter tip_recorded = 1: cash tips are not recorded, so they would look like zero tips.",
        "CASE on zones.is_airport gives the two groups.",
        "Divide the sums, not the average of per-trip percentages.",
      ],
      finding: "How much more is an airport trip worth? Do airport passengers tip more or less, relative to the fare?",
      sql: `
WITH valid AS (SELECT * FROM trips WHERE ${VALID_TRIP})
SELECT CASE WHEN z.is_airport = 1 THEN 'airport pickup' ELSE 'other pickup' END AS pickup_type,
       COUNT(*) AS trips,
       ROUND(AVG(v.total_amount), 2) AS avg_total,
       ROUND(AVG(v.trip_distance_miles), 2) AS avg_miles,
       ROUND(100.0 * SUM(v.tip_amount) / SUM(v.fare_amount), 1) AS tip_pct_of_fare
FROM valid AS v
JOIN zones AS z ON z.zone_id = v.pickup_zone_id
JOIN payment_types AS pt ON pt.payment_type_id = v.payment_type_id
WHERE pt.tip_recorded = 1
GROUP BY pickup_type
ORDER BY pickup_type`,
    },
  ],
  synthesis: {
    title: "Review the demand profile",
    investigation: "Connect data quality, timing, location and airport demand.",
    reviewPrompt: "Where and when should curb space be prioritized? How did excluding invalid trips change what you can claim?",
  },
  report: {
    context: "The planning team will use this to place taxi stands and plan curb space.",
    investigation: "Deliver three findings and one planning recommendation.",
    summary: "Summarize when and where taxi demand peaks, with numbers.",
    recommendation: "Recommend where and when to prioritize curb space, and why.",
    limitations: "Explain the limits: a 1-in-87 sample, one winter quarter, yellow taxis only (no ride-hail), and the records you excluded.",
  },
});

const PRIMARY = "s.is_primary = 1";

export const cityClimateRisk = defineProject({
  id: "city-climate-risk",
  title: "City Climate Risk Review",
  level: "beginner",
  role: "Facilities Risk Analyst",
  datasetId: "weather",
  brief: {
    who: "You work for a company that runs warehouses in U.S. cities.",
    situation: "Extreme heat and heavy rain have disrupted operations at several sites. The facilities team wants evidence on which cities face the most heat and which regions the most heavy rain before it budgets for cooling and flood protection.",
    ask: "How reliable is the weather record, which cities face the most extreme heat, and which regions get the most heavy-rain days?",
    data: "Weather: three years (2022–2024) of daily observations from 100 NOAA weather stations in 96 U.S. cities: maximum and minimum temperature, rain, snow and wind. Each city has one primary station.",
    deliverable: "A climate-risk brief with three findings and one budgeting recommendation.",
  },
  prerequisites: ["Aggregation", "Joins", "CASE expressions", "Dates"],
  placementAfter: ["joins", "aggregation"],
  relevantTables: ["daily_weather", "stations", "cities", "states", "calendar"],
  understand: {
    title: "Understand the weather records",
    context: "daily_weather has one row per station and day with at least one measurement. A day a station did not report has no row at all. stations.city_id joins to cities and cities.state_code to states, which carries the census region. is_primary marks the one station used to represent each city; a few cities have a second station. Temperatures are in °C and precipitation in millimetres; a NULL value means not measured.",
    investigation: "Pick one city and find its primary station. How many days did it report over the three years?",
  },
  steps: [
    {
      kind: "checkpoint", id: "coverage", title: "Check the record's coverage",
      context: "Missing days would understate extreme weather. Measure coverage before counting hot days.",
      investigation: "How many stations and primary stations are there, how many station-days were reported out of all possible, and how many days lack a maximum temperature?",
      tables: ["daily_weather", "stations", "calendar"],
      columns: ["stations", "primary_stations", "station_days", "possible_station_days", "coverage_pct", "days_missing_tmax"],
      grain: "one summary row", ordered: false,
      definitions: [
        "possible_station_days = stations × days in calendar. coverage_pct = 100 × station_days / possible_station_days, 2 decimals.",
        "days_missing_tmax = daily_weather rows where tmax_c is NULL.",
      ],
      hints: [
        "Scalar subqueries can count daily_weather and calendar inside a query over stations.",
        "SUM(is_primary) counts primary stations.",
        "Multiply before dividing, and use 100.0 to avoid integer division.",
      ],
      finding: "Is coverage good enough to compare cities? Name one way missing days could still bias the results.",
      sql: `
SELECT COUNT(*) AS stations,
       SUM(is_primary) AS primary_stations,
       (SELECT COUNT(*) FROM daily_weather) AS station_days,
       (SELECT COUNT(*) FROM calendar) * COUNT(*) AS possible_station_days,
       ROUND(100.0 * (SELECT COUNT(*) FROM daily_weather) / ((SELECT COUNT(*) FROM calendar) * COUNT(*)), 2) AS coverage_pct,
       (SELECT COUNT(*) FROM daily_weather WHERE tmax_c IS NULL) AS days_missing_tmax
FROM stations`,
    },
    {
      kind: "checkpoint", id: "heat-by-year", title: "Count extreme-heat days by year",
      context: "Use one station per city so cities with two stations are not double-counted. A day at or above 35 °C (95 °F) counts as extreme heat.",
      investigation: "For each year, how many primary-station days reached 35 °C, and how many cities had at least one such day?",
      tables: ["daily_weather", "stations", "calendar"],
      columns: ["year", "station_days", "hot_days", "cities_with_hot_days"],
      grain: "one row per year, in year order", ordered: true,
      definitions: [
        "Use primary stations only. hot day: tmax_c >= 35. year comes from calendar.year.",
        "station_days = reported days. cities_with_hot_days = distinct primary stations with at least one hot day that year.",
      ],
      hints: [
        "Join daily_weather → calendar on observation_date = date, and → stations to filter is_primary.",
        "COUNT(DISTINCT CASE WHEN tmax_c >= 35 THEN station_id END) counts stations with a hot day.",
        "Order by year.",
      ],
      finding: "Did extreme heat become more or less common across the three years? Is three years enough to call it a trend?",
      sql: `
SELECT c.year,
       COUNT(*) AS station_days,
       SUM(d.tmax_c >= 35) AS hot_days,
       COUNT(DISTINCT CASE WHEN d.tmax_c >= 35 THEN d.station_id END) AS cities_with_hot_days
FROM daily_weather AS d
JOIN calendar AS c ON c.date = d.observation_date
JOIN stations AS s ON s.station_id = d.station_id
WHERE ${PRIMARY}
GROUP BY c.year
ORDER BY c.year`,
    },
    {
      kind: "checkpoint", id: "hottest-cities", title: "Rank cities by heat exposure",
      context: "Cooling budgets go to the sites with the most hot days.",
      investigation: "Which ten cities averaged the most days at or above 35 °C per year, and what was the hottest reading at each?",
      tables: ["daily_weather", "stations", "cities"],
      columns: ["city_name", "state_code", "hot_days_per_year", "hottest_c"],
      grain: "ten cities, most hot days first", ordered: true,
      definitions: [
        "Use primary stations. hot_days_per_year = hot days over 2022–2024 / 3.0, 1 decimal. hottest_c = maximum tmax_c.",
        "Order by hot_days_per_year descending, then city_name; return 10 rows.",
      ],
      hints: [
        "Group by city through stations.city_id.",
        "Divide by 3.0, not 3, so the result keeps its decimals.",
        "LIMIT 10 after ordering.",
      ],
      finding: "Which cities face extreme heat for more than a third of the year? Which states dominate the list?",
      sql: `
SELECT ci.city_name,
       ci.state_code,
       ROUND(SUM(d.tmax_c >= 35) / 3.0, 1) AS hot_days_per_year,
       MAX(d.tmax_c) AS hottest_c
FROM daily_weather AS d
JOIN stations AS s ON s.station_id = d.station_id
JOIN cities AS ci ON ci.city_id = s.city_id
WHERE ${PRIMARY}
GROUP BY ci.city_id
ORDER BY hot_days_per_year DESC, ci.city_name
LIMIT 10`,
    },
    {
      kind: "checkpoint", id: "heavy-rain", title: "Compare heavy rain by region",
      context: "Flood protection is planned by region. A day with 50 mm or more of rain counts as heavy rain. Regions have different numbers of cities, so compare a rate.",
      investigation: "For each census region, how many primary-station days were there, how many had heavy rain, and how many heavy-rain days is that per 1,000 days with a rain measurement?",
      tables: ["daily_weather", "stations", "cities", "states"],
      columns: ["census_region", "station_days", "heavy_rain_days", "heavy_rain_per_1000_days"],
      grain: "one row per census region, highest rate first", ordered: true,
      definitions: [
        "Use primary stations. heavy rain: precipitation_mm >= 50.",
        "heavy_rain_per_1000_days = 1000 × heavy_rain_days / days with a non-NULL precipitation_mm, 2 decimals.",
      ],
      hints: [
        "Join stations → cities → states to reach census_region.",
        "COUNT(precipitation_mm) counts only days where rain was measured.",
        "Order by the rate descending.",
      ],
      finding: "How many times more often does the highest region get heavy rain than the lowest?",
      sql: `
SELECT st.census_region,
       COUNT(*) AS station_days,
       SUM(d.precipitation_mm >= 50) AS heavy_rain_days,
       ROUND(1000.0 * SUM(d.precipitation_mm >= 50) / COUNT(d.precipitation_mm), 2) AS heavy_rain_per_1000_days
FROM daily_weather AS d
JOIN stations AS s ON s.station_id = d.station_id
JOIN cities AS ci ON ci.city_id = s.city_id
JOIN states AS st ON st.state_code = ci.state_code
WHERE ${PRIMARY}
GROUP BY st.census_region
ORDER BY heavy_rain_per_1000_days DESC`,
    },
  ],
  synthesis: {
    title: "Review the climate risks",
    investigation: "Connect coverage, the heat trend, the hottest cities and regional heavy rain.",
    reviewPrompt: "Which sites need cooling investment and which need flood protection? How confident can you be with three years of records?",
  },
  report: {
    context: "The facilities team will split next year's budget between cooling and flood protection.",
    investigation: "Deliver three findings and one budgeting recommendation.",
    summary: "Summarize which cities face the most heat and which regions the most heavy rain, with numbers.",
    recommendation: "Recommend how to split the budget between cooling and flood protection, and where.",
    limitations: "Explain the limits: three years is weather, not climate; one airport station represents a whole city; and missing days.",
  },
});

const REGULAR = "game_type = 'regular'";

export const ballparkFanExperience = defineProject({
  id: "ballpark-fan-experience",
  title: "Ballpark Fan Experience Review",
  level: "beginner",
  role: "League Strategy Analyst",
  datasetId: "sports",
  brief: {
    who: "You support the strategy team of a professional baseball league.",
    situation: "The league is reviewing the past decade: home-field advantage, the empty stadiums of 2020, attendance recovery and the 2023 pitch clock. It wants evidence on what changed for fans, and a view of the 2025 season.",
    ask: "How did home advantage, attendance and game length change from 2016 to 2025, and who stood out in 2025?",
    data: "Sports: ten seasons of Major League Baseball results (2016–2025, from Retrosheet) with venues, attendance and game length, plus every 2025 player batting line.",
    deliverable: "A fan-experience review with three findings and one recommendation.",
  },
  prerequisites: ["Aggregation", "CASE expressions", "UNION ALL", "Joins"],
  placementAfter: ["aggregation", "joins"],
  relevantTables: ["games", "teams", "players", "player_game_stats"],
  understand: {
    title: "Understand the game records",
    context: "games has one row per completed game. game_type is 'regular' for the regular season; postseason games have other types. Each game names a home and an away team (team_id) and both scores. attendance is NULL when no attendance was recorded. 2020 was shortened to 60 games per team. player_game_stats has one batting line per player per 2025 game, including pitchers with no plate appearances.",
    investigation: "Find a 2020 game and a 2025 game. What differs in attendance and duration_minutes?",
  },
  steps: [
    {
      kind: "checkpoint", id: "home-advantage", title: "Measure home advantage by season",
      context: "Home advantage is often attributed to crowds. Measure it every season, including 2020 when stadiums were empty.",
      investigation: "For each season, how many regular-season games were played, how many did the home team win, and what was the home win percentage?",
      tables: ["games"],
      columns: ["season", "games", "home_wins", "home_win_pct"],
      grain: "one row per season, in order", ordered: true,
      definitions: ["Regular season only. home win: home_score > away_score. home_win_pct = 100 × home_wins / games, 1 decimal."],
      hints: ["SUM(home_score > away_score) counts home wins.", "Group by season.", "Baseball has no ties in completed games."],
      finding: "Did the home team keep its advantage in 2020 with no fans? What does that suggest about crowds?",
      sql: `
SELECT season,
       COUNT(*) AS games,
       SUM(home_score > away_score) AS home_wins,
       ROUND(100.0 * SUM(home_score > away_score) / COUNT(*), 1) AS home_win_pct
FROM games
WHERE ${REGULAR}
GROUP BY season
ORDER BY season`,
    },
    {
      kind: "checkpoint", id: "attendance-length", title: "Track attendance and game length",
      context: "Two big changes hit fans: no crowds in 2020 and the pitch clock in 2023. Track both by season.",
      investigation: "For each season, how many regular-season games recorded attendance, what was the average attendance, and how long was the average game?",
      tables: ["games"],
      columns: ["season", "games", "games_with_attendance", "avg_attendance", "avg_minutes"],
      grain: "one row per season, in order", ordered: true,
      definitions: [
        "Regular season only. games_with_attendance = games with a non-NULL attendance.",
        "avg_attendance = average of recorded attendance, rounded to a whole number (NULL when none). avg_minutes = average duration_minutes, 1 decimal.",
      ],
      hints: ["COUNT(attendance) skips NULLs, unlike COUNT(*).", "CAST(ROUND(AVG(attendance)) AS INTEGER) gives a whole number.", "AVG ignores NULLs, so 2020 returns NULL."],
      finding: "How long did attendance take to recover after 2020? How many minutes did the pitch clock save per game?",
      sql: `
SELECT season,
       COUNT(*) AS games,
       COUNT(attendance) AS games_with_attendance,
       CAST(ROUND(AVG(attendance)) AS INTEGER) AS avg_attendance,
       ROUND(AVG(duration_minutes), 1) AS avg_minutes
FROM games
WHERE ${REGULAR}
GROUP BY season
ORDER BY season`,
    },
    {
      kind: "checkpoint", id: "standings-2025", title: "Rebuild the 2025 standings",
      context: "Wins tell part of the story; run differential shows how dominant a team really was.",
      investigation: "For the 2025 regular season, what were each club's wins, losses, runs scored, runs allowed and run differential?",
      tables: ["games"],
      columns: ["team_id", "wins", "losses", "runs_scored", "runs_allowed", "run_differential"],
      grain: "one row per club, most wins first", ordered: true,
      definitions: [
        "Count each game once from the home side and once from the away side. A win is scoring more than the opponent.",
        "run_differential = runs_scored − runs_allowed. Order by wins descending, then run_differential descending, then team_id.",
      ],
      hints: ["UNION ALL a home-team view and an away-team view of each game.", "In the away view, the team's runs are away_score.", "Aggregate the combined rows by team."],
      finding: "Which club had the best record, and was its run differential also the best?",
      sql: `
WITH sides AS (
  SELECT home_team_id AS team_id, home_score AS scored, away_score AS allowed FROM games WHERE ${REGULAR} AND season = 2025
  UNION ALL
  SELECT away_team_id, away_score, home_score FROM games WHERE ${REGULAR} AND season = 2025
)
SELECT team_id,
       SUM(scored > allowed) AS wins,
       SUM(scored < allowed) AS losses,
       SUM(scored) AS runs_scored,
       SUM(allowed) AS runs_allowed,
       SUM(scored) - SUM(allowed) AS run_differential
FROM sides
GROUP BY team_id
ORDER BY wins DESC, run_differential DESC, team_id`,
    },
    {
      kind: "checkpoint", id: "hitters-2025", title: "Find the 2025 power hitters",
      context: "Star hitters drive attendance. Restrict to everyday players so a few hot weeks do not dominate.",
      investigation: "Among players with at least 500 plate appearances in 2025, who were the ten leading home-run hitters, with their batting average and on-base percentage?",
      tables: ["player_game_stats", "players"],
      columns: ["player_name", "plate_appearances", "home_runs", "batting_avg", "on_base_pct"],
      grain: "ten players, most home runs first", ordered: true,
      definitions: [
        "player_name = first_name || ' ' || last_name. Keep players with SUM(plate_appearances) >= 500.",
        "batting_avg = hits / at_bats, 3 decimals. on_base_pct = (hits + walks + hit_by_pitch) / (at_bats + walks + hit_by_pitch), 3 decimals (sacrifice flies are not recorded).",
        "Order by home_runs descending, then batting_avg descending, then player_id; return 10 rows.",
      ],
      hints: ["Sum each batting column per player before dividing.", "Use 1.0 * to avoid integer division.", "HAVING filters on the summed plate appearances."],
      finding: "Who led in home runs, and did the top power hitters also get on base well?",
      sql: `
SELECT p.first_name || ' ' || p.last_name AS player_name,
       SUM(s.plate_appearances) AS plate_appearances,
       SUM(s.home_runs) AS home_runs,
       ROUND(1.0 * SUM(s.hits) / SUM(s.at_bats), 3) AS batting_avg,
       ROUND(1.0 * (SUM(s.hits) + SUM(s.walks) + SUM(s.hit_by_pitch))
             / (SUM(s.at_bats) + SUM(s.walks) + SUM(s.hit_by_pitch)), 3) AS on_base_pct
FROM player_game_stats AS s
JOIN players AS p ON p.player_id = s.player_id
GROUP BY s.player_id
HAVING SUM(s.plate_appearances) >= 500
ORDER BY home_runs DESC, batting_avg DESC, s.player_id
LIMIT 10`,
    },
  ],
  synthesis: {
    title: "Review the fan experience",
    investigation: "Connect home advantage, attendance, game length and the 2025 season.",
    reviewPrompt: "What changed most for fans over the decade? Separate what the data shows (shorter games, attendance levels) from what it cannot (why fans came back).",
  },
  report: {
    context: "The strategy team will use this in its review of the decade.",
    investigation: "Deliver three findings and one recommendation.",
    summary: "Summarize the changes in home advantage, attendance and game length, with numbers.",
    recommendation: "Recommend one fan-experience priority and the evidence behind it.",
    limitations: "Explain the limits: attendance is recorded, not tickets sold; only 2025 has player data; and correlation is not cause.",
  },
});

export const beginnerCatalog = [retailPerformanceReview, airlineReliabilityReview, urbanMobilityDemand, cityClimateRisk, ballparkFanExperience];
