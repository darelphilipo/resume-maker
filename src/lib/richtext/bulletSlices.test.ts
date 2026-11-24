import { describe, expect, it } from "vitest";

import {
  countEntryBullets,
  parseEntryBulletSlices,
  sliceEntryBullets,
} from "./bulletSlices";

const THREE_BULLETS =
  "<p>Intro</p><ul><li><p>First</p></li><li><p>Second</p></li><li><p>Third</p></li></ul><p>Outro</p>";

describe("parseEntryBulletSlices", () => {
  it("parses one list and keeps the surrounding prose", () => {
    const slices = parseEntryBulletSlices(THREE_BULLETS);

    expect(slices).not.toBeNull();
    expect(slices?.prefix).toBe("<p>Intro</p>");
    expect(slices?.suffix).toBe("<p>Outro</p>");
    expect(slices?.openTag).toBe("<ul>");
    expect(slices?.closeTag).toBe("</ul>");
    expect(slices?.bullets).toHaveLength(3);
  });

  it("ignores empty bullets and nested children stay with their parent", () => {
    const slices = parseEntryBulletSlices(
      "<ul><li>One<ul><li>Nested</li></ul></li><li>   </li><li>Two</li></ul>",
    );

    expect(slices?.bullets).toHaveLength(2);
    expect(slices?.bullets[0]).toContain("Nested");
    expect(countEntryBullets("<ul><li>One</li><li>Two</li></ul>")).toBe(2);
  });

  it("stays atomic for prose, one bullet or several lists", () => {
    expect(parseEntryBulletSlices("<p>Just prose.</p>")).toBeNull();
    expect(parseEntryBulletSlices("<ul><li>Only one</li></ul>")).toBeNull();
    expect(
      parseEntryBulletSlices(
        "<ul><li>One</li><li>Two</li></ul><p>Between</p><ul><li>Three</li><li>Four</li></ul>",
      ),
    ).toBeNull();
    expect(parseEntryBulletSlices("<ul><li>One</li><li>Two</ul>")).toBeNull();
    expect(countEntryBullets("")).toBe(0);
  });
});

describe("sliceEntryBullets", () => {
  it("keeps the prefix on the first fragment and the suffix on the last", () => {
    const slices = parseEntryBulletSlices(THREE_BULLETS)!;

    const first = sliceEntryBullets(slices, 0, 0);
    const middle = sliceEntryBullets(slices, 1, 1);
    const last = sliceEntryBullets(slices, 2, 2);

    expect(first).toContain("<p>Intro</p>");
    expect(first).toContain("First");
    expect(first).not.toContain("Second");
    expect(first).not.toContain("<p>Outro</p>");

    expect(middle).not.toContain("<p>Intro</p>");
    expect(middle).toContain("Second");
    expect(middle).not.toContain("<p>Outro</p>");

    expect(last).not.toContain("<p>Intro</p>");
    expect(last).toContain("Third");
    expect(last).toContain("<p>Outro</p>");
  });

  it("renders an inclusive multi-bullet range and clamps bad bounds", () => {
    const slices = parseEntryBulletSlices(THREE_BULLETS)!;
    const range = sliceEntryBullets(slices, 0, 1);

    expect(range).toContain("First");
    expect(range).toContain("Second");
    expect(range).not.toContain("Third");
    expect(range).not.toContain("<p>Outro</p>");

    expect(sliceEntryBullets(slices, -1, 99)).toContain("Third");
    expect(sliceEntryBullets(slices, 2, 1)).toContain("Third");
    expect(sliceEntryBullets(slices, 2, 1)).not.toContain("First");
  });
});
