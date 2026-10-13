import { Database, FlaskConical, Gauge, GitCompare } from "lucide-react";

/** The four exploratory tools, with plain-language purposes for first-time users. */
export const tools = [
  {
    href: "/playground",
    label: "SQL Playground",
    icon: Database,
    purpose:
      "Explore data. Try ideas. No grades.",
  },
  {
    href: "/database-lab",
    label: "Database Lab",
    icon: FlaskConical,
    purpose:
      "Create tables, change data, and test constraints and transactions in a temporary database.",
  },
  {
    href: "/query-performance",
    label: "Query Performance",
    icon: Gauge,
    purpose:
      "Why some queries are faster: real query plans, side by side.",
  },
  {
    href: "/sql-syntax",
    label: "Compare SQL Syntax",
    icon: GitCompare,
    purpose:
      "One concept, three SQL dialects.",
  },
] as const;
