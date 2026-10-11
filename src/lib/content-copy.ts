/** Clarify a legacy implementation note when displayed; canonical curriculum stays intact. */
export function learnerExplanation(text: string): string {
  return text.replace(
    "In this app each worker creates an in-memory SQLite database.",
    "In SQL Studio, each run starts with the original sample data.",
  );
}
