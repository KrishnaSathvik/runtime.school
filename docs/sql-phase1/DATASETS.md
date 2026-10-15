# Canonical dataset inventory

Learn and Practice use exactly these 12 names, no edition selectors, and one committed SQLite seed per canonical domain. Build: `npm run learning:build`. Contracts use datasetId + datasetVersion. Operational modeled tables have independent keys; no cross-source join is implied by similar identifiers. Real-source observations coexist with clearly described synthetic operational extensions where needed. Full column types, meanings, nullability, keys and provenance are recorded in src/data/datasets/generated/learning.json.

## Retail

Historical UK gift retail invoices, cancellations, anonymous purchases and line-level prices. Preserve the original accounting signs when analyzing sales.

Status: **hybrid**. Source: Daqing Chen / UCI Machine Learning Repository; https://archive.ics.uci.edu/dataset/502/online+retail+ii. License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).

A contiguous historical sample is not a representative annual benchmark. Invoice is not a guaranteed unique header key. Join lines through orders.id. Net line value is quantity multiplied by unit_price_gbp; it is not a verified payment or refund ledger. First observed product description may be missing or differ from later descriptions. Timezone is unspecified in the source; do not interpret timestamps as UTC. Modeled operational and ingestion tables are synthetic. Join only along documented relationships; matching numeric identifiers across source groups do not imply identity.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| countries | 7 | One source country label; not a standardized geographic code. | name TEXT |  |
| customers | 38 | One nonmissing source customer identifier; anonymous transactions have no customer row. | id TEXT |  |
| products | 486 | One source stock code, including non-merchandise and adjustment codes. | stock_code TEXT, description TEXT nullable |  |
| orders | 47 | One distinct observed invoice header (invoice, timestamp, customer, country); source invoice numbers can have conflicting headers. | id INTEGER, invoice TEXT, invoice_at TEXT, customer_id TEXT nullable, country TEXT, cancelled INTEGER | customer_id → customers(id); country → countries(name) |
| order_items | 712 | One original worksheet row; repeated identical source rows are retained. | source_row INTEGER, order_id INTEGER, stock_code TEXT, description TEXT nullable, quantity INTEGER, unit_price_gbp REAL | order_id → orders(id); stock_code → products(stock_code) |
| store_customers | 8 | One simulated store customer, including customers with no purchases. | id INTEGER, name TEXT nullable, city TEXT nullable, joined_at TEXT nullable |  |
| store_products | 6 | One simulated store catalog item. | id INTEGER, name TEXT nullable, category TEXT nullable, price REAL nullable |  |
| store_orders | 12 | One simulated product purchase line, not an entire multi-item order. | id INTEGER, customer_id INTEGER nullable, product_id INTEGER nullable, quantity INTEGER nullable, status TEXT nullable, ordered_at TEXT nullable |  |
| bronze_customers | 7 | One raw customer extract row, including repeated or invalid keys. | raw_id TEXT nullable, name TEXT nullable, country TEXT nullable, updated_at TEXT nullable |  |
| bronze_products | 4 | One raw catalog extract row. | raw_id TEXT nullable, name TEXT nullable, category TEXT nullable, price TEXT nullable |  |
| bronze_sales | 13 | One raw sales-line extract, including rows requiring quarantine. | row_id INTEGER, customer_id TEXT nullable, product_id TEXT nullable, quantity TEXT nullable, sales TEXT nullable, order_date TEXT nullable |  |
| dim_customer | 5 | One curated customer dimension record. | customer_key INTEGER, customer_id TEXT nullable, name TEXT nullable, country TEXT nullable |  |
| dim_product | 4 | One curated product dimension record. | product_key INTEGER, product_id TEXT nullable, name TEXT nullable, category TEXT nullable, price REAL nullable |  |
| fact_sales | 9 | One validated sales fact line. | sale_key INTEGER, customer_key INTEGER nullable, product_key INTEGER nullable, quantity INTEGER nullable, sales REAL nullable, order_date TEXT nullable |  |
| crm_people | 6 | One raw CRM customer version. | source_row INTEGER, customer_id TEXT nullable, name TEXT nullable, gender TEXT nullable, updated_at TEXT nullable |  |
| erp_people | 5 | One raw ERP person row. | erp_id TEXT nullable, gender TEXT nullable, birth_date TEXT nullable |  |
| erp_locations | 4 | One raw ERP customer-location row. | erp_id TEXT nullable, country_code TEXT nullable |  |
| load_manifest | 2 | One expected source row-count contract. | source_name TEXT, expected_rows INTEGER nullable |  |
| product_versions | 4 | One effective product-cost version. | version_id INTEGER, product_id TEXT nullable, name TEXT nullable, cost REAL nullable, valid_from TEXT nullable |  |
| raw_dates | 8 | One unvalidated calendar-date input. | row_id INTEGER, raw_date TEXT nullable |  |
| dq_sales | 5 | One intentionally untrusted sales row for data-quality checks. | line_id INTEGER nullable, customer_key INTEGER nullable, product_key INTEGER nullable, quantity INTEGER nullable, sales REAL nullable |  |
| customer_history | 3 | One half-open customer-country history interval. | version_key INTEGER, customer_id TEXT nullable, country TEXT nullable, valid_from TEXT nullable, valid_to TEXT nullable |  |
| incoming_people | 3 | One incoming customer version; may be stale. | customer_id TEXT, name TEXT nullable, updated_at TEXT nullable |  |
| current_people | 2 | One current customer record with a durable surrogate key. | customer_key INTEGER, customer_id TEXT, name TEXT nullable, updated_at TEXT nullable |  |
| published_totals | 2 | One currently published customer total. | customer_id TEXT, total_sales REAL |  |
| refresh_stage | 2 | One staged replacement customer total. | customer_id TEXT nullable, total_sales REAL nullable |  |
| warehouse_catalog | 7 | One documented warehouse field. | object_name TEXT nullable, column_name TEXT nullable, meaning TEXT nullable, source_object TEXT nullable, rule TEXT nullable |  |
| shoppers | 17 | One identified customer in the simulated online shop. | id INTEGER, name TEXT, email TEXT nullable, region TEXT nullable, signup_date TEXT |  |
| catalog_items | 13 | One online-shop catalog item; prices are fictional USD. | id INTEGER, name TEXT, category TEXT, price REAL |  |
| sales_orders | 33 | One online-shop order header. | id INTEGER, shopper_id INTEGER, order_date TEXT, status TEXT, delivered_date TEXT nullable | shopper_id → shoppers(id) |
| order_lines | 48 | One item within one online-shop order. | order_id INTEGER, item_id INTEGER, quantity INTEGER, unit_price REAL | item_id → catalog_items(id); order_id → sales_orders(id) |
| order_payments | 29 | One posted payment; an order may have split payments. | id INTEGER, order_id INTEGER, paid_at TEXT, amount REAL, method TEXT |  |
| order_refunds | 6 | One refund movement; multiple refunds may belong to an order. | id INTEGER, order_id INTEGER, refunded_at TEXT, amount REAL |  |
| app_logins | 35 | One recorded customer login date, including duplicate deliveries. | shopper_id INTEGER, login_date TEXT |  |
| shopper_snapshots | 20 | One customer region observation at each monthly snapshot. | snapshot_date TEXT, shopper_id INTEGER, region TEXT nullable |  |
| market_query_log | 0 | One recorded query workload event for access-path comparisons. | id INTEGER, shopper_id INTEGER, event_kind TEXT, event_at TEXT, amount INTEGER |  |
| market_web_events | 38 | One delivered checkout event with session, cart and retry identifiers. | id INTEGER, event_key TEXT, shopper_id INTEGER, occurred_at TEXT, event_type TEXT, channel TEXT, cart_id TEXT nullable | shopper_id → shoppers(id) |
| market_raw_import | 19 | One raw import input requiring validation. | id INTEGER, raw_code TEXT nullable, raw_email TEXT nullable, raw_amount TEXT nullable |  |
| market_load_feed | 5 | One incoming item version. | id INTEGER, external_id TEXT, version INTEGER, amount INTEGER |  |
| market_ledger | 2 | One posted inventory allocation entry. | external_id TEXT, version INTEGER, amount INTEGER |  |
| market_reservation_feed | 11 | One requested stock reservation. | id INTEGER, shopper_id INTEGER nullable, item_id INTEGER nullable, quantity BLOB nullable |  |
| market_stock | 3 | One available stock balance by SKU. | item_id INTEGER, capacity INTEGER, available INTEGER, reserved INTEGER |  |
| market_allocation_feed | 4 | One incoming stock-allocation request. | batch TEXT, item_id INTEGER, quantity INTEGER |  |
| market_allocation_audit | 1 | One persisted allocation decision. | batch TEXT, units INTEGER |  |

## Product / SaaS Analytics

Workspace signup, activation, team adoption, subscription history and retried events. Compare free and pro cohorts while separating event time from ingestion time.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Fictional behavioral model, not representative market statistics. Deduplicate logical events before counting activity. Subscription list price is not payment revenue. Timestamps are UTC; windows end exclusively unless the task specifies otherwise. Modeled operational and ingestion tables are synthetic. Join only along documented relationships; matching numeric identifiers across source groups do not imply identity.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| accounts | 24 | One customer workspace, including workspaces that never activate. | id INTEGER, name TEXT, plan TEXT, signed_up_at TEXT |  |
| users | 48 | One identified person in one workspace. | id INTEGER, account_id INTEGER, role TEXT, joined_at TEXT | account_id → accounts(id) |
| projects | 46 | One project created after workspace signup. | id INTEGER, account_id INTEGER, created_at TEXT | account_id → accounts(id) |
| subscriptions | 35 | One subscription state interval per workspace; half-open [valid_from, valid_to). | id INTEGER, account_id INTEGER, plan TEXT, valid_from TEXT, valid_to TEXT nullable, monthly_cents INTEGER | account_id → accounts(id) |
| events | 1127 | One ingested event delivery; event_key identifies the logical event and may repeat. | delivery_id INTEGER, event_key TEXT, account_id INTEGER, user_id INTEGER nullable, anonymous_id TEXT, event_type TEXT, occurred_at TEXT, ingested_at TEXT | account_id → accounts(id); user_id → users(id) |
| viewers | 8 | One registered media-product viewer. | id INTEGER, country TEXT nullable, signup_at TEXT nullable, referred_by INTEGER nullable |  |
| videos | 6 | One media asset with a creator. | id INTEGER, creator_id INTEGER nullable, title TEXT nullable, duration_seconds INTEGER nullable |  |
| watch_events | 26 | One watch event; repeat watches are distinct activity. | id INTEGER, viewer_id INTEGER nullable, video_id INTEGER nullable, watched_at TEXT nullable, watch_seconds INTEGER nullable |  |
| daily_metrics | 5 | One observed daily media activity total; some calendar dates are absent. | day TEXT, watch_minutes INTEGER nullable |  |
| members | 8 | One product member with optional referral identity. | id INTEGER, email TEXT nullable, country TEXT nullable, joined_at TEXT nullable, referrer_id INTEGER nullable |  |
| social_events | 22 | One delivered product event version; event_key identifies retries. | id INTEGER, event_key TEXT nullable, member_id INTEGER nullable, event_type TEXT nullable, event_at TEXT nullable, ingested_at TEXT nullable |  |
| experiment_assignments | 8 | One member assignment to a product experiment. | member_id INTEGER, variant TEXT nullable, assigned_at TEXT nullable |  |
| ai_accounts | 6 | One ai accounts source record. | id INTEGER, plan TEXT nullable, region TEXT nullable, signed_up_at TEXT nullable |  |
| ai_requests | 12 | One API request attempt. | id INTEGER, account_id INTEGER nullable, model TEXT nullable, requested_at TEXT nullable, input_tokens INTEGER nullable, output_tokens INTEGER nullable, status TEXT nullable |  |
| model_rates | 2 | One fictional model price schedule. | model TEXT, input_per_million REAL nullable, output_per_million REAL nullable |  |
| invoices | 6 | One API-account invoice. | id INTEGER, account_id INTEGER nullable, period TEXT nullable, billed_amount REAL nullable |  |
| invoice_payments | 7 | One invoice payment movement; unmatched imported references are possible. | id INTEGER, invoice_id INTEGER nullable, amount REAL nullable |  |
| invoice_refunds | 4 | One refund against an imported payment. | id INTEGER, invoice_id INTEGER nullable, amount REAL nullable |  |

## Weather

Daily temperature, precipitation and snow at Central Park, Chicago O'Hare and Los Angeles airport. Compare station coverage, calendar windows and observed extremes.

Status: **real**. Source: NOAA National Centers for Environmental Information; https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily. License: U.S. public domain (NOAA/NCEI open data) (https://www.ncei.noaa.gov/sites/default/files/2023-12/NCEI%20PD-10-2-02%20-%20Open%20Data%20Policy%20Signed.pdf).

Exclude or investigate non-NULL quality flags before analytical aggregation. NULL is missing, not zero; a trace flag is not the same as no precipitation. Observation dates do not imply identical UTC observation windows. Three stations do not represent national climate. This is not a climate trend attribution dataset.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| stations | 3 | One NOAA GHCN station; station summaries are not citywide measurements. | id TEXT, name TEXT, latitude REAL, longitude REAL, elevation_m REAL, state TEXT |  |
| elements | 4 | One GHCN measurement element and its storage units. | code TEXT, description TEXT, unit TEXT, scale REAL |  |
| calendar | 31 | One calendar date within the edition interval. | date TEXT |  |
| daily_weather | 341 | One station/date/element observation slot in a source monthly record, including missing values. | station_id TEXT, date TEXT, element TEXT, raw_value INTEGER nullable, measurement_flag TEXT nullable, quality_flag TEXT nullable, source_flag TEXT nullable | station_id → stations(id); element → elements(code); date → calendar(date) |

## Finance / Payments

Authorization retries, declined payments, delayed settlements and partial refunds. Reconcile posted ledger movements without confusing attempts with money movement.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Synthetic learning scenarios, not representative statistics or predictions. All amounts are integer USD cents. Only settlements and refunds affect posted balances; authorizations are not ledger entries. A chargeback is represented once as a refund credit, not in a second ledger.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| accounts | 12 | One fictional USD payment account. | id INTEGER, opened_at TEXT, opening_cents INTEGER |  |
| merchants | 12 | One fictional merchant. | id INTEGER, name TEXT, category TEXT |  |
| authorizations | 432 | One authorization delivery; retries share request_key and preserve the logical request. | id INTEGER, request_key TEXT, account_id INTEGER, merchant_id INTEGER, requested_at TEXT, ingested_at TEXT, amount_cents INTEGER, status TEXT | account_id → accounts(id); merchant_id → merchants(id) |
| settlements | 314 | One posted debit per settled logical request, referencing its original authorization. | id INTEGER, authorization_id INTEGER, posted_at TEXT, amount_cents INTEGER | authorization_id → authorizations(id) |
| refunds | 88 | One posted credit against a settled debit; a settlement can have multiple partial credits. | id INTEGER, settlement_id INTEGER, posted_at TEXT, amount_cents INTEGER, reason TEXT | settlement_id → settlements(id) |

## Logistics

Multi-package shipments and scans across a delivery network. Separate ingestion order from physical state and assess shipment completion across every package.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Synthetic learning scenarios, not representative statistics or predictions. Shipment delivery requires every package to have a delivered scan. Physical state follows occurred_at; ingested_at describes when information became available. A missing scan is not proof that the physical event never happened. Modeled operational and ingestion tables are synthetic. Join only along documented relationships; matching numeric identifiers across source groups do not imply identity.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| warehouses | 6 | One origin or destination hub. | id INTEGER, name TEXT, region TEXT |  |
| carriers | 3 | One carrier service. | id INTEGER, name TEXT |  |
| shipments | 60 | One shipment, potentially containing multiple packages. | id INTEGER, origin_id INTEGER, destination_id INTEGER, carrier_id INTEGER, created_at TEXT, promised_at TEXT | origin_id → warehouses(id); destination_id → warehouses(id); carrier_id → carriers(id) |
| packages | 120 | One physical package within a shipment. | id INTEGER, shipment_id INTEGER, weight_grams INTEGER | shipment_id → shipments(id) |
| tracking_events | 416 | One received scan; scan_key repeats for duplicate deliveries. | id INTEGER, scan_key TEXT, package_id INTEGER, warehouse_id INTEGER, status TEXT, occurred_at TEXT, ingested_at TEXT | package_id → packages(id); warehouse_id → warehouses(id) |
| inventory_items | 3 | One logistics inventory SKU with a nullable unit price. | id INTEGER, name TEXT, price REAL |  |
| inventory_audit | 0 | One recorded inventory price change. | item_id INTEGER nullable, old_price REAL nullable, new_price REAL nullable |  |

## Developer Platform

Changes, reviews, deployment retries and incidents across engineering teams. Investigate review relationships and delivery reliability at the correct grain.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Synthetic learning scenarios, not representative statistics or predictions. Deployment attempts and successfully delivered changes are different denominators. Review actions are not unique reviewers. Incident attribution is explicit synthetic ground truth; real incident causality is more complex. Modeled operational and ingestion tables are synthetic. Join only along documented relationships; matching numeric identifiers across source groups do not imply identity.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| teams | 9 | One engineering team; some teams have no repositories. | id INTEGER, name TEXT |  |
| developers | 40 | One developer with an optional manager. | id INTEGER, team_id INTEGER, manager_id INTEGER nullable, name TEXT | team_id → teams(id); manager_id → developers(id) |
| repositories | 16 | One repository owned by one team. | id INTEGER, team_id INTEGER, name TEXT | team_id → teams(id) |
| pull_requests | 100 | One proposed change, including unmerged changes. | id INTEGER, repository_id INTEGER, author_id INTEGER, opened_at TEXT, merged_at TEXT nullable | repository_id → repositories(id); author_id → developers(id) |
| reviews | 120 | One review action; repeated reviewers can act on the same change. | id INTEGER, pull_request_id INTEGER, reviewer_id INTEGER, reviewed_at TEXT, decision TEXT | pull_request_id → pull_requests(id); reviewer_id → developers(id) |
| deployments | 97 | One deployment attempt; retries can deploy the same pull request again. | id INTEGER, pull_request_id INTEGER, deployed_at TEXT, status TEXT | pull_request_id → pull_requests(id) |
| incidents | 10 | One incident attributed to a successful deployment. | id INTEGER, deployment_id INTEGER, opened_at TEXT, resolved_at TEXT nullable | deployment_id → deployments(id) |
| departments | 6 | One company department; an empty department is retained. | id INTEGER, name TEXT, location TEXT, budget REAL |  |
| employees | 20 | One company employee with optional manager and department. | id INTEGER, name TEXT, manager_id INTEGER nullable, department_id INTEGER nullable, title TEXT, salary REAL, hired_at TEXT | department_id → departments(id); manager_id → employees(id) |
| salary_history | 21 | One effective salary interval; overlapping source intervals are intentional. | employee_id INTEGER, salary REAL, valid_from TEXT, valid_to TEXT nullable |  |
| performance_reviews | 13 | One dated employee review. | id INTEGER, employee_id INTEGER, review_date TEXT, rating INTEGER |  |

## IoT / Sensors

Ten-minute temperature, humidity and energy observations from a Belgian low-energy building. Compare room behavior and aggregate sensor data without multiplying building-level energy.

Status: **real**. Source: Luis Candanedo / UCI Machine Learning Repository; https://archive.ics.uci.edu/dataset/374/appliances+energy+prediction. License: CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/).

Source has no missing values; do not claim it contains natural missing telemetry. Devices are logical source column pairs, not verified hardware identifiers. Joining energy to all nine sensors multiplies energy totals unless aggregated at the intended grain. Local timestamps have no timezone annotation; do not invent UTC or DST semantics. Observational correlations do not establish that a room's temperature caused energy consumption.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| locations | 9 | One sensor location in the studied building, including the north exterior. | id INTEGER, name TEXT |  |
| devices | 9 | One logical temperature/humidity node corresponding to a Tn/RH_n pair. | id INTEGER, location_id INTEGER | location_id → locations(id) |
| energy_readings | 144 | One building energy observation per ten-minute source timestamp. | observed_at TEXT, appliances_wh REAL, lights_wh REAL |  |
| sensor_readings | 1296 | One logical node's temperature and humidity at a ten-minute source timestamp. | device_id INTEGER, observed_at TEXT, temperature_c REAL, humidity_pct REAL | device_id → devices(id); observed_at → energy_readings(observed_at) |

## Healthcare

Fictional patient journeys, appointments, cancellations and operational waiting times. Analyze repeat encounters without using private patient data.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Synthetic learning scenarios, not representative statistics or predictions. Runtime-generated operational data; not Synthea output and not a clinical simulation. No diagnoses, treatment recommendations or real patient identifiers are included. An appointment cancellation is not a completed encounter. Encounter counts must not be multiplied by observation rows.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| providers | 12 | One fictional care provider. | id INTEGER, clinic TEXT |  |
| patients | 60 | One simulated patient; identifiers do not refer to real people. | id INTEGER, enrolled_at TEXT, age_band TEXT |  |
| encounters | 166 | One scheduled encounter, including cancelled appointments. | id INTEGER, patient_id INTEGER, provider_id INTEGER, scheduled_at TEXT, ended_at TEXT nullable, status TEXT, previous_encounter_id INTEGER nullable | patient_id → patients(id); provider_id → providers(id); previous_encounter_id → encounters(id) |
| observations | 302 | One operational observation during a completed encounter. | id INTEGER, encounter_id INTEGER, kind TEXT, value REAL | encounter_id → encounters(id) |

## Energy

A fictional hourly grid with demand, forecasts, renewable generation and directional transfers. Reconcile each region's energy balance and compare time-varying renewable shares.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Synthetic learning scenarios, not representative statistics or predictions. This is Runtime synthetic data, not EIA observations. Hourly average MW can be converted to MWh for these one-hour intervals; do not confuse power with energy. Generation plus imports minus exports equals demand in the base fixture; losses and storage are omitted. The hidden fixture introduces an explicit imbalance for reconciliation exercises. Modeled operational and ingestion tables are synthetic. Join only along documented relationships; matching numeric identifiers across source groups do not imply identity.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| regions | 3 | One fictional balancing region. | id INTEGER, name TEXT |  |
| hourly_demand | 504 | One region-hour of average demand and the prior-day forecast. | region_id INTEGER, hour TEXT, demand_mw INTEGER, forecast_mw INTEGER | region_id → regions(id) |
| generation | 1512 | One region-hour-fuel generation output. | region_id INTEGER, hour TEXT, fuel TEXT, output_mw INTEGER | region_id → regions(id) |
| interchange | 168 | One directed transfer between region 1 and region 2 each hour. | hour TEXT, from_region INTEGER, to_region INTEGER, flow_mw INTEGER | from_region → regions(id); to_region → regions(id) |
| capacity_regions | 3 | One generation-capacity planning region. | id INTEGER, name TEXT |  |
| capacity_sites | 4 | One generation site; its region may be unassigned. | id INTEGER, region_id INTEGER nullable, name TEXT | region_id → capacity_regions(id) |
| current_capacity | 5 | One site capacity interval, measured in MW. | id INTEGER, site_id INTEGER nullable, units INTEGER, valid_from TEXT, valid_to TEXT nullable | site_id → capacity_sites(id) |
| future_supply | 6 | One expected delivery of generation capacity, measured in MW. | id INTEGER, site_id INTEGER nullable, units INTEGER, delivery_date TEXT | site_id → capacity_sites(id) |

## U.S. Flights

Fictional flight schedules with region-wide delay episodes, early departures, cancellations and overnight arrivals. Compare reliability while keeping cancelled flights out of delay averages and in cancellation denominators.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Synthetic learning scenarios, not representative statistics or predictions. This is a Runtime-owned simulation, not BTS data or a claim about real airlines. All timestamps are UTC; this edition does not model airport local time or daylight saving. Delay is undefined for a cancelled leg, not zero. The schedule contains one leg per route per day; do not extrapolate to real network operations.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| airlines | 3 | One fictional operating airline. | id INTEGER, name TEXT |  |
| airports | 8 | One fictional airport; all schedule timestamps in this model use UTC. | id INTEGER, code TEXT, region TEXT |  |
| routes | 56 | One directed origin/destination pair. | id INTEGER, origin_id INTEGER, destination_id INTEGER, scheduled_minutes INTEGER | origin_id → airports(id); destination_id → airports(id) |
| flights | 392 | One scheduled flight leg, including cancellations. | id INTEGER, route_id INTEGER, airline_id INTEGER, aircraft_id TEXT, scheduled_departure TEXT, actual_departure TEXT nullable, actual_arrival TEXT nullable, departure_delay_minutes INTEGER nullable, cancelled INTEGER | route_id → routes(id); airline_id → airlines(id) |

## Mobility

Fictional city trips with rush-hour demand, congestion-sensitive duration, zone relationships and payment-dependent tip coverage.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Synthetic learning scenarios, not representative statistics or predictions. Runtime synthetic city data; not NYC TLC observations. NULL tip means unobserved, not zero. Comparing cash and card average tips is not valid. All timestamps are UTC and zone labels are fictional. Fares are generated from distance and duration; they do not represent any regulated taxi tariff.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| districts | 4 | One fictional city district. | id INTEGER, name TEXT |  |
| zones | 12 | One pickup/dropoff zone. | id INTEGER, district_id INTEGER, kind TEXT | district_id → districts(id) |
| payment_types | 3 | One payment classification. | id INTEGER, label TEXT |  |
| trips | 648 | One completed trip; tip amount is observed only for card payments. | id INTEGER, pickup_zone INTEGER, dropoff_zone INTEGER, picked_up_at TEXT, dropped_off_at TEXT, distance_m INTEGER, fare_cents INTEGER, tip_cents INTEGER nullable, payment_type INTEGER | pickup_zone → zones(id); dropoff_zone → zones(id); payment_type → payment_types(id) |

## Sports

A fictional league with scheduled games, team scores, player appearances, cancelled fixtures and unused squad members. Compare team and player performance at their different grains.

Status: **synthetic**. Source: Runtime.school; https://github.com/KrishnaSathvik/runtime.school. License: Runtime-owned synthetic data (https://github.com/KrishnaSathvik/runtime.school).

Synthetic learning scenarios, not representative statistics or predictions. All athletes, clubs and matches are fictional. This is not historical league data. Count completed games in performance denominators. A cancelled game is not a scoreless draw. Player goal totals reconcile to team scores; joining both teams to appearances can multiply games. Modeled operational and ingestion tables are synthetic. Join only along documented relationships; matching numeric identifiers across source groups do not imply identity.

| Table | Rows | Grain | Columns | Relationships |
| --- | --- | --- | --- | --- |
| teams | 6 | One fictional league team. | id INTEGER, name TEXT, region TEXT |  |
| players | 48 | One registered athlete, including athletes with no appearances. | id INTEGER, team_id INTEGER, name TEXT, position TEXT | team_id → teams(id) |
| games | 120 | One scheduled game; cancelled games have no score. | id INTEGER, season INTEGER, played_at TEXT, home_team_id INTEGER, away_team_id INTEGER, status TEXT, home_score INTEGER nullable, away_score INTEGER nullable | home_team_id → teams(id); away_team_id → teams(id) |
| appearances | 1596 | One player appearance in a completed game. Bench players have no appearance row. | game_id INTEGER, player_id INTEGER, minutes INTEGER, goals INTEGER | game_id → games(id); player_id → players(id) |
| club_members | 4 | One sports-club member with nullable training credits. | id INTEGER, name TEXT, team TEXT nullable, credits INTEGER nullable |  |
| club_bookings | 4 | One training booking; a missing member_id is an anonymous booking. | id INTEGER, member_id INTEGER nullable, fee INTEGER nullable, booked_at TEXT nullable | member_id → club_members(id) |
