import { describe, expect, it } from "vitest";
import { highlightSql } from "@/features/rt/sql-highlight";

const kinds = (source: string) => highlightSql(source).map((part) => `${part.kind}:${part.text}`);

describe("highlightSql", () => {
  it("keeps identifiers neutral and paints keywords, strings, numbers, and comments", () => {
    expect(kinds("SELECT name FROM shoppers WHERE city = 'Austin'; -- west")).toEqual([
      "kw:SELECT",
      "text: ",
      "text:name",
      "text: ",
      "kw:FROM",
      "text: ",
      "text:shoppers",
      "text: ",
      "kw:WHERE",
      "text: ",
      "text:city",
      "text: ",
      "text:=",
      "text: ",
      "str:'Austin'",
      "text:;",
      "text: ",
      "com:-- west",
    ]);
  });

  it("paints NULL with the number color, matching the editor", () => {
    expect(kinds("WHERE city IS NULL")).toContain("num:NULL");
    expect(kinds("WHERE city IS NULL")).toContain("kw:IS");
  });

  it("distinguishes function calls, quoted names, parameters, and dollar quotes", () => {
    const parts = kinds(`SELECT COUNT(*), COALESCE(city, 'Austin') FROM "shoppers" WHERE id = $1; -- note`);
    expect(parts).toContain("fn:COUNT");
    expect(parts).toContain("fn:COALESCE");
    expect(parts).toContain("kw:SELECT");
    expect(parts).toContain("text:city");
    expect(parts).toContain(`text:"shoppers"`);
    expect(parts).toContain("str:'Austin'");
    expect(parts).toContain("text:$1");
    expect(parts).toContain("com:-- note");
    expect(kinds("SELECT $$raw$$")).toContain("str:$$raw$$");
  });
});