import { describe, expect, it } from "vitest";

import { extractJobKeywords, matchJobKeywords } from "./jdMatch";

describe("extractJobKeywords", () => {
  it("ranks repeated tokens first and filters boilerplate words", () => {
    expect(
      extractJobKeywords(
        "We need TypeScript and React. React experience required. " +
          "TypeScript, Node.js, TypeScript. The team is strong.",
      ),
    ).toEqual(["typescript", "react", "node.js"]);
  });

  it("lowercases, strips trailing punctuation, and keeps tech tokens", () => {
    expect(
      extractJobKeywords("C++, C#, .NET, Node.js, PostgreSQL."),
    ).toEqual(["c#", "c++", "net", "node.js", "postgresql"]);
  });

  it("honours the keyword limit", () => {
    expect(extractJobKeywords("alpha beta gamma delta", 2)).toHaveLength(2);
    expect(extractJobKeywords("alpha beta gamma delta", 0)).toEqual([]);
  });

  it("returns an empty list for blank text", () => {
    expect(extractJobKeywords("   ")).toEqual([]);
  });
});

describe("matchJobKeywords", () => {
  it("splits job keywords into matched and missing lists", () => {
    const result = matchJobKeywords(
      "We need TypeScript, React, and Kubernetes experience.",
      "TypeScript React developer. Built APIs with Node.js.",
    );

    expect(result.matched).toEqual(["react", "typescript"]);
    expect(result.missing).toEqual(["kubernetes"]);
    expect(result.coverage).toBeCloseTo(2 / 3);
  });

  it("matches case-insensitively and tolerates dotted and plural forms", () => {
    const result = matchJobKeywords(
      "APIs in Node.js and SQL",
      "api development with nodejs and sql",
    );

    expect(result.matched).toEqual(["apis", "node.js", "sql"]);
    expect(result.missing).toEqual([]);
    expect(result.coverage).toBe(1);
  });

  it("does not match a keyword inside a longer word", () => {
    const result = matchJobKeywords(
      "React experience",
      "Reactive programming in the browser",
    );

    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(["react"]);
    expect(result.coverage).toBe(0);
  });

  it("reports zero coverage for an empty job description", () => {
    expect(matchJobKeywords("", "TypeScript")).toEqual({
      matched: [],
      missing: [],
      coverage: 0,
    });
  });
});
