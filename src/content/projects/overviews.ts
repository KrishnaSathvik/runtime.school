/**
 * Each SQL project's overview (overviews/<id>.json): the task, what the learner produces, a short bar label and a
 * one-line summary per stage, what's wrong with the data and the lessons that help. The shared project frame shows it,
 * as in Python and PySpark. Every problem line was checked against the project's database.
 */
import o_airline_reliability_review from "./overviews/airline-reliability-review.json";
import o_ballpark_fan_experience from "./overviews/ballpark-fan-experience.json";
import o_city_climate_risk from "./overviews/city-climate-risk.json";
import o_cold_chain_monitoring from "./overviews/cold-chain-monitoring.json";
import o_delivery_network_reliability from "./overviews/delivery-network-reliability.json";
import o_engineering_delivery_performance from "./overviews/engineering-delivery-performance.json";
import o_grid_demand_generation from "./overviews/grid-demand-generation.json";
import o_healthcare_operations from "./overviews/healthcare-operations.json";
import o_payment_reconciliation from "./overviews/payment-reconciliation.json";
import o_retail_performance_review from "./overviews/retail-performance-review.json";
import o_saas_activation_retention from "./overviews/saas-activation-retention.json";
import o_trusted_retail_warehouse from "./overviews/trusted-retail-warehouse.json";
import o_urban_mobility_demand from "./overviews/urban-mobility-demand.json";
import outline from "../course-outline.json";
import { lessonIdForSlug, seoLessonPath } from "@/platform/sql-slugs";

export type SqlOverview = {
  id: string;
  task: string;
  produce: { name: string; about: string }[];
  labels: Record<string, string>;
  summaries: Record<string, string>;
  problems: string[];
  preparation: string[];
};

const FILES: SqlOverview[] = [o_airline_reliability_review, o_ballpark_fan_experience, o_city_climate_risk, o_cold_chain_monitoring, o_delivery_network_reliability, o_engineering_delivery_performance, o_grid_demand_generation, o_healthcare_operations, o_payment_reconciliation, o_retail_performance_review, o_saas_activation_retention, o_trusted_retail_warehouse, o_urban_mobility_demand];

export const sqlOverview = (id: string): SqlOverview | undefined => FILES.find((o) => o.id === id);

/** A lesson slug as a link: its page and title. */
export function sqlLessonLink(slug: string): { href: string; label: string } | null {
  const id = lessonIdForSlug(slug);
  const path = id === undefined ? undefined : seoLessonPath(id);
  const title = (outline.lessons as { id: number; title: string }[]).find((l) => l.id === id)?.title;
  return path && title ? { href: path, label: title } : null;
}
