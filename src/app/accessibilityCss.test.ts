import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const globalsCss = readFileSync(
  path.resolve(process.cwd(), "src/app/globals.css"),
  "utf8",
);

/** globals.css is flat, so a selector-to-first-block scan is enough. */
function ruleBody(selector: string): string {
  const start = globalsCss.indexOf(`${selector} {`);

  expect(start, `${selector} rule must exist`).toBeGreaterThanOrEqual(0);

  const open = globalsCss.indexOf("{", start);
  const close = globalsCss.indexOf("}", open);

  return globalsCss.slice(open + 1, close);
}

describe("globals.css accessibility defaults", () => {
  it("declares a light color scheme so native controls match the paper UI", () => {
    expect(ruleBody(":root")).toContain("color-scheme: light;");
  });

  it("disables transitions and animation for reduced-motion users", () => {
    const start = globalsCss.indexOf("@media (prefers-reduced-motion: reduce)");

    expect(start).toBeGreaterThanOrEqual(0);

    const block = globalsCss.slice(start);

    expect(block).toContain("animation-duration: 0.01ms !important;");
    expect(block).toContain("animation-iteration-count: 1 !important;");
    expect(block).toContain("transition-duration: 0.01ms !important;");
    expect(block).toContain("scroll-behavior: auto !important;");
  });
});
