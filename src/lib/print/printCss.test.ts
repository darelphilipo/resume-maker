import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(
  path.resolve(process.cwd(), "src/styles/print.css"),
  "utf8",
);

function printSection(): string {
  const start = css.indexOf("@media print");

  expect(start).toBeGreaterThanOrEqual(0);

  return css.slice(start);
}

describe("print.css page geometry", () => {
  it("keeps html and body out of the printable page box", () => {
    const htmlBody = printSection().match(/html,\s*body\s*\{([^}]*)\}/);

    expect(htmlBody, "the html/body print rule must exist").not.toBeNull();

    const body = htmlBody?.[1] ?? "";

    expect(body).toContain("height: auto !important;");
    expect(body).toContain("min-height: 0 !important;");
    expect(body).toContain("overflow: visible !important;");
    expect(body).toContain("margin: 0 !important;");
    expect(body).toContain("padding: 0 !important;");
  });

  it("leaves a 1mm safety margin so iOS Safari cannot add blank pages", () => {
    const page = printSection().match(/\.resume-page\s*\{([^}]*)\}/);

    expect(page, "the .resume-page print rule must exist").not.toBeNull();

    const body = page?.[1] ?? "";

    expect(body).toMatch(
      /height:\s*calc\(var\(--page-height[^)]*\)\s*-\s*1mm\)/,
    );
    expect(body).toMatch(
      /max-height:\s*calc\(var\(--page-height[^)]*\)\s*-\s*1mm\)/,
    );
    expect(body).toContain("overflow: hidden;");
    expect(body).toContain("box-sizing: border-box;");
  });

  it("breaks after every page except the last one", () => {
    const print = printSection();
    const base = print.match(/\.resume-page\s*\{([^}]*)\}/)?.[1] ?? "";
    const between = print.match(
      /\.resume-page:not\(:last-child\)\s*\{([^}]*)\}/,
    )?.[1];
    const last = print.match(/\.resume-page:last-child\s*\{([^}]*)\}/)?.[1];

    // A break on the last page is what leaves a trailing blank sheet.
    expect(base).not.toMatch(/break-after:\s*page/);
    expect(between).toContain("break-after: page;");
    expect(between).toContain("page-break-after: always;");
    expect(last).toContain("break-after: auto;");
    expect(last).toContain("page-break-after: auto;");
  });
});
