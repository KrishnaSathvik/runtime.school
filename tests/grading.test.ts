import { describe, expect, it } from "vitest";
import { compareResults } from "@/engine/grading";

const base = {
  columns: ["name", "city"],
  values: [
    ["Alice", "Chicago"],
    ["Ben", "Austin"],
  ],
};

describe("compareResults", () => {
  it("accepts exact matches", () => {
    expect(compareResults(base, base).ok).toBe(true);
  });

  it("accepts unordered row matches by default", () => {
    const actual = {
      columns: ["name", "city"],
      values: [
        ["Ben", "Austin"],
        ["Alice", "Chicago"],
      ],
    };
    expect(compareResults(actual, base).ok).toBe(true);
  });

  it("rejects wrong column order/names", () => {
    const actual = {
      columns: ["city", "name"],
      values: base.values,
    };
    expect(compareResults(actual, base).ok).toBe(false);
  });

  it("rejects duplicate inflation", () => {
    const actual = {
      columns: base.columns,
      values: [...base.values, ...base.values],
    };
    expect(compareResults(actual, base).ok).toBe(false);
  });

  it("enforces ordering when required", () => {
    const actual = {
      columns: base.columns,
      values: [
        ["Ben", "Austin"],
        ["Alice", "Chicago"],
      ],
    };
    expect(compareResults(actual, base, true).ok).toBe(false);
  });

  it("uses float epsilon for numeric values", () => {
    expect(
      compareResults(
        { columns: ["x"], values: [[1.0000000001]] },
        { columns: ["x"], values: [[1]] },
      ).ok,
    ).toBe(true);
  });

  it("does not treat NULL and string NULL as equal", () => {
    expect(
      compareResults(
        { columns: ["x"], values: [[null]] },
        { columns: ["x"], values: [["NULL"]] },
      ).ok,
    ).toBe(false);
  });
});
