import { Database, FlaskConical, Gauge, GitCompare } from "lucide-react";

/** The four exploratory tools, with plain-language purposes for first-time users. */
export const tools = [
  {
    href: "/sql/playground",
    label: "SQL Playground",
    icon: Database,
    purpose:
      "Explore any of Runtime's twelve datasets with SQL. No grades.",
  },
  {
    href: "/sql/lab",
    label: "Database Lab",
    icon: FlaskConical,
    purpose:
      "Create tables, change data, and test constraints and transactions on a disposable copy of a dataset.",
  },
  {
    href: "/sql/query-performance",
    label: "Query Performance",
    icon: Gauge,
    purpose:
      "Compare two ways of writing a query with real SQLite plans, side by side.",
  },
  {
    href: "/sql/syntax",
    label: "Compare Syntax",
    icon: GitCompare,
    purpose:
      "One concept, three SQL dialects.",
  },
] as const;
