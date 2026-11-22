import { describe, expect, it } from "vitest";

import { decodeBlock, encodeEntryBlock, encodeEntryGroup } from "./blockIds";
import { HEADER_BLOCK_ID } from "./constants";

describe("entry block ids", () => {
  it("round-trips a section id, entry id and heading flag", () => {
    const id = encodeEntryBlock("experience", "exp-1", true);

    expect(decodeBlock(id)).toEqual({
      kind: "section",
      sectionId: "experience",
      entryIds: ["exp-1"],
      withHeading: true,
    });
  });

  it("round-trips several entries that must stay in one packing block", () => {
    const id = encodeEntryGroup("experience", ["exp-1", "exp-2"], false);

    expect(decodeBlock(id)).toEqual({
      kind: "section",
      sectionId: "experience",
      entryIds: ["exp-1", "exp-2"],
      withHeading: false,
    });
  });

  it("escapes commas inside grouped entry ids", () => {
    const id = encodeEntryGroup("experience", ["role,1", "role,2"], true);

    expect(decodeBlock(id)).toEqual({
      kind: "section",
      sectionId: "experience",
      entryIds: ["role,1", "role,2"],
      withHeading: true,
    });
  });

  it("escapes reserved characters in ids", () => {
    const id = encodeEntryBlock("custom:a:b", "entry:1", false);

    expect(decodeBlock(id)).toEqual({
      kind: "section",
      sectionId: "custom:a:b",
      entryIds: ["entry:1"],
      withHeading: false,
    });
  });

  it("treats a plain section id as an atomic block with a heading", () => {
    expect(decodeBlock("skills")).toEqual({
      kind: "section",
      sectionId: "skills",
      entryIds: null,
      withHeading: true,
    });
  });

  it("recognises the header sentinel", () => {
    expect(decodeBlock(HEADER_BLOCK_ID)).toEqual({ kind: "header" });
  });

  it("rejects malformed entry ids instead of guessing", () => {
    expect(decodeBlock("__entry:experience")).toEqual({ kind: "unknown" });
    expect(decodeBlock("__entry:experience:e1:maybe")).toEqual({
      kind: "unknown",
    });
    expect(decodeBlock("__entry::e1:1")).toEqual({ kind: "unknown" });
  });
});
