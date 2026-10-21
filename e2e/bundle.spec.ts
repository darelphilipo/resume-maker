import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

const OUT_DIR = path.join(process.cwd(), "out");
const CHUNKS_DIR = path.join(OUT_DIR, "_next", "static", "chunks");
const EDITOR_HTML = path.join(OUT_DIR, "editor.html");
const JS_BUDGET_BYTES = 1.5 * 1024 * 1024;
const FORBIDDEN_MARKERS = ["@ai-sdk", "ai/react", "generateText"];

function listJavaScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return listJavaScriptFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".js") ? [entryPath] : [];
  });
}

test.beforeAll(() => {
  if (!existsSync(EDITOR_HTML) || !existsSync(CHUNKS_DIR)) {
    throw new Error(
      "Missing static export. Run `npm run build` before `npx playwright test`.",
    );
  }
});

test("ships no AI SDK code in the static chunks", () => {
  const offenders = listJavaScriptFiles(CHUNKS_DIR).flatMap((file) => {
    const contents = readFileSync(file, "utf8");
    const found = FORBIDDEN_MARKERS.filter((marker) =>
      contents.includes(marker),
    );

    return found.length > 0
      ? [`${path.relative(OUT_DIR, file)}: ${found.join(", ")}`]
      : [];
  });

  expect(offenders).toEqual([]);
});

test("keeps the editor route JavaScript within budget", () => {
  const html = readFileSync(EDITOR_HTML, "utf8");
  const scriptSources = Array.from(
    html.matchAll(/<script[^>]+src="([^"]+\.js)"/g),
    (match) => match[1],
  );
  const uniqueSources = Array.from(new Set(scriptSources));
  const files = uniqueSources.map((source) =>
    path.join(OUT_DIR, source.replace(/^\//, "")),
  );

  expect(files.length).toBeGreaterThan(0);

  for (const file of files) {
    expect(existsSync(file), `Missing chunk ${file}`).toBe(true);
  }

  const totalBytes = files.reduce(
    (total, file) => total + statSync(file).size,
    0,
  );

  test
    .info()
    .annotations.push({
      type: "editor-js-bytes",
      description: String(totalBytes),
    });

  console.log(
    `/editor JavaScript: ${totalBytes} bytes (${(
      totalBytes /
      1024 /
      1024
    ).toFixed(3)} MiB, budget ${(JS_BUDGET_BYTES / 1024 / 1024).toFixed(
      1,
    )} MiB) across ${files.length} chunks`,
  );

  expect(totalBytes).toBeLessThan(JS_BUDGET_BYTES);
});
