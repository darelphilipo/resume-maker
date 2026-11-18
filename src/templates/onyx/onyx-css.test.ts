import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const onyxCss = readFileSync(
  path.resolve(process.cwd(), "src/templates/onyx/onyx.css"),
  "utf8",
);

type CssRule = { selector: string; body: string };

/** onyx.css is flat (no at-rules), so a simple block scan is enough. */
function cssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];

  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    rules.push({ selector: match[1].trim(), body: match[2] });
  }

  return rules;
}

/** True when a selector list targets an anchor (the only URLs/links here). */
function isLinkSelector(selector: string): boolean {
  return /(^|[\s,])a([\s,.:#]|$)/.test(selector);
}

describe("onyx.css text wrapping", () => {
  it("wraps prose and bullets at word boundaries on the .onyx root", () => {
    const root = cssRules(onyxCss).find((rule) => rule.selector === ".onyx");

    expect(root, "the .onyx root rule must exist").toBeDefined();
    expect(root?.body).toContain("overflow-wrap: break-word;");
    expect(root?.body).toContain("word-break: normal;");
    expect(root?.body).not.toContain("overflow-wrap: anywhere");
  });

  it("reserves overflow-wrap: anywhere for links/URLs only", () => {
    const withAnywhere = cssRules(onyxCss).filter((rule) =>
      /overflow-wrap:\s*anywhere/.test(rule.body),
    );

    expect(
      withAnywhere.length,
      "keep a link rule so long URLs can still break",
    ).toBeGreaterThan(0);

    const nonLinkSelectors = withAnywhere
      .map((rule) => rule.selector)
      .filter((selector) => !isLinkSelector(selector));

    expect(
      nonLinkSelectors,
      "overflow-wrap: anywhere must only appear on link/URL rules",
    ).toEqual([]);
  });
});
