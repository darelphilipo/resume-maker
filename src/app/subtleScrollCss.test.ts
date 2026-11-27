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

describe("globals.css subtle scrollbars", () => {
  it("defines a thin, low-contrast scrollbar for the editor columns", () => {
    const body = ruleBody(".subtle-scroll");

    expect(body).toContain("scrollbar-width: thin;");
    expect(body).toContain(
      "scrollbar-color: rgba(30, 58, 95, 0.18) transparent;",
    );
  });

  it("styles a 6px WebKit track and rounded thumb that darkens on hover", () => {
    const bar = ruleBody(".subtle-scroll::-webkit-scrollbar");
    const track = ruleBody(".subtle-scroll::-webkit-scrollbar-track");
    const thumb = ruleBody(".subtle-scroll::-webkit-scrollbar-thumb");
    const hover = ruleBody(".subtle-scroll::-webkit-scrollbar-thumb:hover");

    expect(bar).toContain("width: 6px;");
    expect(bar).toContain("height: 6px;");
    expect(track).toContain("background: transparent;");
    expect(thumb).toContain("background: rgba(30, 58, 95, 0.18);");
    expect(thumb).toContain("border-radius: 9999px;");
    expect(hover).toContain("background: rgba(30, 58, 95, 0.3);");
  });

  it("leaves the no-scrollbar pill-row utility hidden", () => {
    expect(ruleBody(".no-scrollbar")).toContain("scrollbar-width: none;");
    expect(ruleBody(".no-scrollbar::-webkit-scrollbar")).toContain(
      "display: none;",
    );
  });
});
