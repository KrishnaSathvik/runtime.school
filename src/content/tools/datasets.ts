import { learningDatasets, type LearningAsset } from "@/data/datasets/learning";
import { canonicalNames, type CanonicalDatasetId } from "@/data/datasets/learning-map";

/**
 * The twelve canonical datasets are the only data the SQL tools offer. Playground, Database Lab and
 * Query Performance pick one of them; Compare Syntax examples are written against their tables.
 */
export const TOOL_DATASETS = Object.keys(canonicalNames) as CanonicalDatasetId[];

export const isToolDataset = (id: string | null | undefined): id is CanonicalDatasetId =>
  !!id && (TOOL_DATASETS as string[]).includes(id);

export const toolDataset = (id: CanonicalDatasetId): LearningAsset => learningDatasets[id];
export const datasetName = (id: CanonicalDatasetId) => canonicalNames[id];

/** The central fact table of each dataset: the first thing a learner sees after choosing it. */
export const CENTRAL_TABLE: Record<CanonicalDatasetId, string> = {
  retail: "orders",
  flights: "flights",
  saas: "events",
  mobility: "trips",
  weather: "daily_weather",
  energy: "hourly_demand",
  payments: "transactions",
  healthcare: "encounters",
  iot: "sensor_readings",
  logistics: "shipments",
  developer: "pull_requests",
  sports: "games",
};

/** A recognisable first query per dataset: the newest rows of its central table, with the columns that explain a row. */
export const STARTER_QUERY: Record<CanonicalDatasetId, string> = {
  retail: "SELECT\n  order_id,\n  invoice_no,\n  customer_id,\n  ordered_at,\n  order_type\nFROM orders\nORDER BY ordered_at DESC\nLIMIT 20;",
  flights: "SELECT\n  flight_date,\n  airline_code,\n  flight_number,\n  origin,\n  destination,\n  departure_delay,\n  arrival_delay\nFROM flights\nORDER BY flight_date DESC, scheduled_departure DESC\nLIMIT 20;",
  saas: "SELECT\n  occurred_at,\n  event_name,\n  account_id,\n  user_id\nFROM events\nORDER BY occurred_at DESC\nLIMIT 20;",
  mobility: "SELECT\n  pickup_at,\n  pickup_zone_id,\n  dropoff_zone_id,\n  trip_distance_miles,\n  total_amount\nFROM trips\nORDER BY pickup_at DESC\nLIMIT 20;",
  weather: "SELECT\n  station_id,\n  observation_date,\n  tmax_c,\n  tmin_c,\n  precipitation_mm\nFROM daily_weather\nORDER BY observation_date DESC, station_id\nLIMIT 20;",
  energy: "SELECT\n  ba_code,\n  hour_ending_utc,\n  demand_mw,\n  forecast_mw\nFROM hourly_demand\nORDER BY hour_ending_utc DESC, ba_code\nLIMIT 20;",
  payments: "SELECT\n  transaction_id,\n  account_id,\n  transaction_type,\n  status,\n  amount_cents,\n  initiated_at\nFROM transactions\nORDER BY initiated_at DESC\nLIMIT 20;",
  healthcare: "SELECT\n  encounter_id,\n  patient_id,\n  provider_id,\n  encounter_class,\n  start_at,\n  total_cost\nFROM encounters\nORDER BY start_at DESC\nLIMIT 20;",
  iot: "SELECT\n  device_id,\n  recorded_at,\n  value,\n  quality_flag\nFROM sensor_readings\nORDER BY recorded_at DESC\nLIMIT 20;",
  logistics: "SELECT\n  shipment_id,\n  order_reference,\n  carrier_id,\n  created_at,\n  promised_delivery_date\nFROM shipments\nORDER BY created_at DESC\nLIMIT 20;",
  developer: "SELECT\n  pull_request_id,\n  repository_id,\n  title,\n  state,\n  created_at,\n  merged_at\nFROM pull_requests\nORDER BY created_at DESC\nLIMIT 20;",
  sports: "SELECT\n  game_date,\n  home_team_id,\n  away_team_id,\n  home_score,\n  away_score,\n  attendance\nFROM games\nORDER BY game_date DESC, game_id\nLIMIT 20;",
};

export const tableQuery = (table: string) => `SELECT *\nFROM ${table}\nLIMIT 20;`;

/** Tables of a dataset named in a script, in the dataset's own table order. */
export function tablesIn(id: CanonicalDatasetId, sql: string): string[] {
  const clean = sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, "").replace(/'(?:''|[^'])*'/g, "''");
  return toolDataset(id).metadata.tables.map((t) => t.name).filter((name) => new RegExp(`\\b${name}\\b`, "i").test(clean));
}

/** Every declared foreign key as one join line: child.column → parent.column. */
export function relationships(id: CanonicalDatasetId) {
  return toolDataset(id).metadata.tables.flatMap((t) =>
    t.foreignKeys.map((fk) => ({
      fromTable: t.name,
      fromColumns: fk.columns,
      toTable: fk.table,
      toColumns: fk.references,
      self: fk.table === t.name,
    })),
  );
}

export const formatCount = (n: number) => n.toLocaleString("en-US");
