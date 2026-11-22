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
    const keywords = extractJobKeywords("C++, C#, .NET, Node.js, PostgreSQL.");

    expect(keywords).toHaveLength(5);
    expect(keywords).toEqual(
      expect.arrayContaining([".net", "c#", "c++", "node.js", "postgresql"]),
    );
  });

  it("honours the keyword limit", () => {
    expect(extractJobKeywords("alpha beta gamma delta", 2)).toHaveLength(2);
    expect(extractJobKeywords("alpha beta gamma delta", 0)).toEqual([]);
  });

  it("returns an empty list for blank text", () => {
    expect(extractJobKeywords("   ")).toEqual([]);
  });

  it("drops filler and posting boilerplate words", () => {
    expect(
      extractJobKeywords(
        "We are looking for a Data Analyst for our team. " +
          "The ideal candidate is seeking a role and wants to join us.",
      ),
    ).toEqual(["analyst", "data"]);
  });

  it("drops hiring boilerplate without dropping real keywords", () => {
    expect(
      extractJobKeywords("We are hiring a Rust developer."),
    ).toEqual(["developer", "rust"]);
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

  it("does not treat a keyword as a substring of another word", () => {
    const result = matchJobKeywords(
      "Rust and React",
      "I trust reactive programming and hiring managers.",
    );

    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual(["react", "rust"]);
    expect(result.coverage).toBe(0);
  });

  it("matches dotted tech tokens and product-name suffixes", () => {
    const result = matchJobKeywords(
      ".NET, C++, C#, Node.js",
      "Built ASP.NET services with C++ and C# on Node.js.",
    );

    expect(result.matched).toHaveLength(4);
    expect(result.matched).toEqual(
      expect.arrayContaining([".net", "c#", "c++", "node.js"]),
    );
    expect(result.missing).toEqual([]);
    expect(result.coverage).toBe(1);
  });

  it("does not match .NET against a bare net word", () => {
    const result = matchJobKeywords(
      ".NET experience",
      "Net income reporting",
    );

    expect(result.matched).toEqual([]);
    expect(result.missing).toEqual([".net"]);
    expect(result.coverage).toBe(0);
  });

  it("reports zero coverage for an empty job description", () => {
    expect(matchJobKeywords("", "TypeScript")).toEqual({
      matched: [],
      missing: [],
      coverage: 0,
    });
  });

  it("ignores filler words when splitting matched from missing", () => {
    const result = matchJobKeywords(
      "Looking for TypeScript and React",
      "TypeScript developer",
    );

    expect(result.matched).toEqual(["typescript"]);
    expect(result.missing).toEqual(["react"]);
    expect(result.coverage).toBe(0.5);
  });
});
