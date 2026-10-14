import type { PyTrack } from "./types";

const q = (...slugs: string[]) => slugs.map((slug) => `python:bank:${slug}`);

/**
 * Practice Tracks are ordered selections of the canonical bank questions. They own no questions of their own:
 * progress is stored per question ref, so a question solved in one track shows as solved in every track.
 */
export const pythonTracks: PyTrack[] = [
  {
    id: "python:track:from-zero",
    slug: "from-zero",
    title: "Python from Zero",
    audience: "First-time coders",
    goal: "Use variables, text, decisions and loops independently.",
    summary: "Start with arithmetic on named values, then clean and format text, make decisions, and finish by looping over lists of real-looking data.",
    questions: q(
      "py01-01", "py01-02", "py01-03", "py01-05", "py01-07", "py01-08", "py01-09",
      "py02-01", "py02-02", "py02-03", "py02-06", "py02-07", "py02-08",
      "py03-01", "py03-02", "py03-03", "py03-04", "py03-06", "py03-08",
      "py04-01", "py04-02", "py04-04", "py04-06", "py04-09",
    ),
  },
  {
    id: "python:track:collections",
    slug: "collections",
    title: "Collections and Everyday Logic",
    audience: "Beginner to intermediate",
    goal: "Transform records and write reusable functions.",
    summary: "Loop over records, then use lists, sets and dictionaries to group, merge and deduplicate them, and wrap the logic in functions with clear contracts.",
    questions: q(
      "py04-03", "py04-07", "py04-08",
      "py05-01", "py05-02", "py05-03", "py05-04", "py05-05", "py05-06", "py05-07", "py05-08", "py05-09", "py05-10",
      "py06-01", "py06-03", "py06-04", "py06-05", "py06-06", "py06-07", "py06-09",
    ),
  },
  {
    id: "python:track:debugging",
    slug: "debugging",
    title: "Debug Python",
    audience: "All learners",
    goal: "Reason about failures and repair code reliably.",
    summary: "Predict what code really does, then find and fix bugs: text handling, conditions, loops, function contracts, shared state, files and dates.",
    questions: q(
      "py02-08", "py03-02", "py03-05", "py03-08", "py04-02", "py04-05", "py04-08",
      "py06-02", "py06-05", "py06-08",
      "py07-01", "py07-02", "py07-03", "py07-04", "py07-05", "py07-06", "py07-07", "py07-08", "py07-09", "py07-10",
    ),
  },
  {
    id: "python:track:interviews",
    slug: "interviews",
    title: "Python Interview Essentials",
    audience: "Job preparation",
    goal: "Solve common reasoning and implementation tasks, edge cases included.",
    summary: "The classic shapes of interview problems (string handling, scanning, counting, deduplication, sorting, contracts, shared state, classes and generators) with hidden edge cases.",
    questions: q(
      "py02-04", "py02-06", "py02-10",
      "py04-03", "py04-07", "py04-09",
      "py05-01", "py05-03", "py05-05", "py05-07", "py05-08", "py05-10",
      "py06-03", "py06-05", "py06-06", "py06-07", "py06-10",
      "py07-01", "py07-02", "py07-04", "py07-06", "py07-07",
      "py09-01", "py09-03", "py09-04", "py09-05", "py09-07", "py09-08",
    ),
  },
  {
    id: "python:track:data-analysis",
    slug: "data-analysis",
    title: "Python for Data Analysis",
    audience: "Analysts",
    goal: "Load, clean, group and explain tabular data.",
    summary: "Group plain records, read CSV and JSON files, summarise arrays with NumPy, and inspect, clean, join and aggregate DataFrames with pandas.",
    questions: q(
      "py05-03", "py05-06", "py05-07",
      "py06-09",
      "py08-01", "py08-02", "py08-03", "py08-07",
      "py10-01", "py10-02", "py10-04", "py10-06", "py10-09", "py10-10",
      "py11-01", "py11-02", "py11-03", "py11-04", "py11-05", "py11-06", "py11-07", "py11-08", "py11-09", "py11-10",
    ),
  },
  {
    id: "python:track:data-engineering",
    slug: "data-engineering",
    title: "Python for Data Engineers",
    audience: "Data and platform engineers",
    goal: "Build validated, deterministic data transformations.",
    summary: "Contracts and validation, safe file handling, serialization, generators and context managers, joins that don't multiply rows, then watermarks, upserts, retries, reconciliation and reproducible reports.",
    questions: q(
      "py06-08", "py06-09",
      "py07-05", "py07-08", "py07-10",
      "py08-04", "py08-05", "py08-06", "py08-08", "py08-10",
      "py09-02", "py09-04", "py09-06",
      "py11-03", "py11-07", "py11-08",
      "py12-01", "py12-02", "py12-03", "py12-04", "py12-05", "py12-06", "py12-07", "py12-08", "py12-09", "py12-10",
    ),
  },
];

export function getPythonTrack(slug: string): PyTrack | undefined {
  return pythonTracks.find((t) => t.slug === slug);
}

export const pythonTrackHref = (slug: string) => `/python/practice/tracks/${slug}`;
