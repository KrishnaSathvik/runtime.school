import { describe, expect, it } from "vitest";
import { datasetEditions, psDatasets } from "@/content/pyspark/content";
import { DOMAIN_EXAMPLES, domainProgram } from "@/content/pyspark/tool-examples";
import catalog from "@/content/pyspark/tool-catalog.json";

describe("PySpark tools data contracts", () => {
  it("offers only editions backed by every table", () => {
    const markets = psDatasets.find((d) => d.id === "PS-D10")!;
    expect(datasetEditions(markets)).toEqual(["lesson", "practice"]);
    for (const d of psDatasets) for (const e of datasetEditions(d))
      expect(Object.values(d.built!.tables).every((t) => t.rows[e] !== undefined)).toBe(true);
  });
  it("anchors every domain example in actual tables and columns", () => {
    expect(Object.keys(DOMAIN_EXAMPLES)).toHaveLength(15);
    for (const [id, e] of Object.entries(DOMAIN_EXAMPLES)) {
      const d = psDatasets.find((d) => d.id === id)!;
      expect(d.built!.tables[e.table].columns.map((c) => c.name)).toContain(e.group);
      expect(domainProgram(id)).toContain(`display(result`);
    }
  });
  it("pins each authored scenario to a real dataset and streaming batch", () => {
    for (const entries of Object.values(catalog)) for (const e of entries)
      expect(psDatasets.some((d) => d.id === e.dataset && d.built)).toBe(true);
    for (const e of catalog.stream) {
      const table = psDatasets.find((d) => d.id === e.dataset)!.built!.tables[e.table];
      expect(table.columns.map((c) => c.name)).toContain("batch");
      expect(e.stages).toHaveLength(5);
    }
  });
});
