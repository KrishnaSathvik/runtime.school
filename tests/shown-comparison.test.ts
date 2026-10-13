import { expect, it } from "vitest";
import { shownForChoice } from "@/lib/shown-comparison";

it("hides a plan until it belongs to the selected example", () => {
  const previous = { choice: 0, value: { plan: "SCAN orders" } };
  expect(shownForChoice(0, previous)?.plan).toBe("SCAN orders");
  expect(shownForChoice(1, previous)).toBeNull();
  expect(shownForChoice(1, null)).toBeNull();
  expect(shownForChoice(1, { choice: 1, value: { plan: "SEARCH idx_customer" } })?.plan).toBe("SEARCH idx_customer");
});
