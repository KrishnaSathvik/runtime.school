import type { PyPackage } from "@/engine/python/client";
import { COMPARISONS_DATA } from "./compare-data";

/**
 * T05 Syntax & API Comparator: authored comparisons, never generated. Every approach runs on the same input.
 * `outputs: "same"` means every approach must print exactly the same lines (tests/python-compare.test.ts checks it in
 * real Pyodide); `"differ"` means the approaches look interchangeable but behave differently, and the outputs show
 * how — the test checks they really do differ.
 */
export type CompareCategory = "Fundamentals" | "Collections" | "Functions and classes" | "Files and structured data" | "Data manipulation" | "Advanced Python";
export const COMPARE_CATEGORIES: CompareCategory[] = ["Fundamentals", "Collections", "Functions and classes", "Files and structured data", "Data manipulation", "Advanced Python"];

export type PyApproach = { label: string; code: string; /** When to choose it. */ when: string };
export type PyComparison = {
  id: string;
  title: string;
  category: CompareCategory;
  /** The problem every approach solves. */
  problem: string;
  approaches: PyApproach[];
  outputs: "same" | "differ";
  /** How they are written and how they behave. */
  differences: string;
  /** Inputs where they part ways, or traps when switching. */
  edgeCases?: string;
  /** Ideas to look up next. */
  concepts: string[];
  packages: PyPackage[];
  /** Dataset files mounted under data/ (Small size unless given). */
  data?: { dataset: string; size?: string; files: string[] };
  /** Lesson IDs (PY-Lxx-yy) that teach these ideas. */
  lessons: string[];
  /** Comparison IDs worth looking at next. */
  related: string[];
};

export const COMPARISONS: PyComparison[] = COMPARISONS_DATA;

export const comparisonById = (id: string | null | undefined) => COMPARISONS.find((c) => c.id === id);
