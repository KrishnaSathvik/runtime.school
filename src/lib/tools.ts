import { Database, FlaskConical, Gauge, GitCompare } from "lucide-react";

/** The four exploratory tools, with plain-language purposes for first-time users. */
export const tools = [
  {
    href: "/playground",
    label: "SQL Playground",
    icon: Database,
    purpose:
      "Try your own SQL on sample databases without grading.",
  },
  {
    href: "/database-lab",
    label: "Database Lab",
    icon: FlaskConical,
    purpose:
      "Create tables, change rows, and try constraints and transactions. Each run starts with the original sample data.",
  },
  {
    href: "/query-performance",
    label: "Query Performance",
    icon: Gauge,
    purpose:
      "See how SQLite reads tables and uses indexes to find rows.",
  },
  {
    href: "/sql-syntax",
    label: "Compare SQL Syntax",
    icon: GitCompare,
    purpose:
      "The same idea written for SQLite, SQL Server and PostgreSQL, side by side.",
  },
] as const;
