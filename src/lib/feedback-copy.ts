/** Presentation only: the SQL checker retains its original results and diagnostics. */
export function checkLabel(label: string): string {
  if (label.startsWith("Required index:")) return "Required index";
  if (label === "Access strategy: search") return "Find matching rows with an index";
  if (label === "Access strategy: covering-search") return "Read matching rows directly from the index";
  if (label === "Access strategy: index-scan") return "Read rows in index order";
  return label;
}

export function importFailureMessage(): string {
  return "This backup could not be restored. Choose a SQL Studio progress backup (.json). Your existing progress was not changed.";
}
