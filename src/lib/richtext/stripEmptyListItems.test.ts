import { describe, expect, it } from "vitest";

import { stripEmptyListItems } from "./stripEmptyListItems";

describe("stripEmptyListItems", () => {
  it("removes the empty list item TipTap creates after Enter", () => {
    expect(
      stripEmptyListItems("<ul><li>Shipped APIs</li><li><p></p></li></ul>"),
    ).toBe("<ul><li>Shipped APIs</li></ul>");
  });

  it("removes whitespace-only and br-only list items", () => {
    expect(
      stripEmptyListItems(
        "<ul><li>  </li><li><p> &nbsp; </p></li><li><p><br></p></li><li>Kept</li></ul>",
      ),
    ).toBe("<ul><li>Kept</li></ul>");
  });

  it("keeps real list items, including nested content", () => {
    const html =
      "<ul><li><p>Parent</p><ul><li>Child</li><li></li></ul></li></ul>";

    expect(stripEmptyListItems(html)).toBe(
      "<ul><li><p>Parent</p><ul><li>Child</li></ul></li></ul>",
    );
  });

  it("removes an outer item that only wraps an empty nested list", () => {
    expect(
      stripEmptyListItems("<ul><li><ul><li><p></p></li></ul></li></ul>"),
    ).toBe("<ul></ul>");
  });

  it("leaves markup without list items untouched", () => {
    const html = "<p>No lists here.</p>";

    expect(stripEmptyListItems(html)).toBe(html);
    expect(stripEmptyListItems("")).toBe("");
  });

  it("is idempotent", () => {
    const once = stripEmptyListItems(
      "<ul><li>One</li><li><p></p></li><li>Two</li></ul>",
    );

    expect(stripEmptyListItems(once)).toBe(once);
  });
});
