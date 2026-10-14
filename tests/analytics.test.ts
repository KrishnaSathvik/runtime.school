import { describe, expect, it } from "vitest";
import { attemptContext, errorKind } from "@/lib/analytics";

describe("analytics helpers", () => {
  it("parses lesson and project attempt keys", () => {
    expect(attemptContext("lesson:3:0")).toEqual({
      subject: "sql",
      lessonId: 3,
      challenge: 1,
      projectId: null,
    });
    expect(attemptContext("project-2:5:1")).toEqual({
      subject: "sql",
      lessonId: 5,
      challenge: 2,
      projectId: 2,
    });
    expect(attemptContext("bogus")).toBeNull();
  });

  it("classifies coarse SQL error kinds without leaking messages", () => {
    expect(errorKind("no such column: foo")).toBe("unknown_column");
    expect(errorKind("no such table: bar")).toBe("unknown_table");
    expect(errorKind("near \"SELCT\": syntax error")).toBe("syntax");
    expect(errorKind("ambiguous column name: id")).toBe("ambiguous_column");
    expect(errorKind("UNIQUE constraint failed")).toBe("constraint");
    expect(errorKind("The SQL engine timed out while starting. Press Retry to try again.")).toBe("engine_boot");
    expect(errorKind("Query timed out after 3 seconds.")).toBe("query_timeout");
    expect(errorKind("something else")).toBe("runtime");
    expect(errorKind(null)).toBe("unknown");
  });
});
