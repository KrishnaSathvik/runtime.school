export type ShownComparison<T> = { choice: number; value: T };

/** A result belongs to the example that produced it. A new choice shows nothing until its own run finishes. */
export function shownForChoice<T>(
  choice: number,
  shown: ShownComparison<T> | null,
): T | null {
  if (!shown || shown.choice !== choice) return null;
  return shown.value;
}
