import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

function findCssFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...findCssFiles(entryPath));
    } else if (entry.name.endsWith(".css")) {
      files.push(entryPath);
    }
  }

  return files;
}

describe("stylesheets", () => {
  it("does not use CSS Modules", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const offenders = findCssFiles(srcDir)
      .filter((file) => file.endsWith(".module.css"))
      .map((file) => path.relative(process.cwd(), file));

    expect(
      offenders,
      'next.config.ts applies @tailwindcss/turbopack to every "*.css" file. That rule also matches "*.module.css" and reclassifies those files as plain CSS, so their class-name exports are empty (components render class="undefined"). Use a global stylesheet with prefixed class names instead.',
    ).toEqual([]);
  });

  it("does not use :global() selectors", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const offenders = findCssFiles(srcDir)
      .filter((file) => readFileSync(file, "utf8").includes(":global("))
      .map((file) => path.relative(process.cwd(), file));

    expect(
      offenders,
      "Turbopack's CSS pipeline emits :global() selector text as-is, so those rules never match in the browser. Write plain descendant selectors instead.",
    ).toEqual([]);
  });
});
