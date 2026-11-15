import { describe, expect, it } from "vitest";

import { detectProfileLink, websiteLabelFromUrl } from "./contactLinks";

describe("detectProfileLink", () => {
  it("detects the network, icon, and username from a bare host", () => {
    expect(detectProfileLink("github.com/ada")).toEqual({
      network: "GitHub",
      icon: "github",
      username: "ada",
    });
  });

  it("handles protocol, www, subdomains, and trailing slashes", () => {
    expect(
      detectProfileLink("https://www.gist.github.com/ada/"),
    ).toEqual({
      network: "GitHub",
      icon: "github",
      username: "ada",
    });
    expect(detectProfileLink("https://de.linkedin.com/in/ada")).toEqual({
      network: "LinkedIn",
      icon: "linkedin",
      username: "ada",
    });
  });

  it("skips route prefixes and leading username marks", () => {
    expect(
      detectProfileLink("https://stackoverflow.com/users/123/ada"),
    ).toEqual({
      network: "Stack Overflow",
      icon: "stack-overflow",
      username: "123",
    });
    expect(detectProfileLink("https://medium.com/@ada")).toEqual({
      network: "Medium",
      icon: "medium",
      username: "ada",
    });
    expect(detectProfileLink("https://npmjs.com/~ada")).toMatchObject({
      username: "ada",
    });
  });

  it("ignores query strings and returns an empty username without a path", () => {
    expect(
      detectProfileLink("https://github.com/ada?tab=repositories"),
    ).toMatchObject({ username: "ada" });
    expect(detectProfileLink("https://github.com")).toMatchObject({
      username: "",
    });
  });

  it("returns null for unknown hosts, empty input, and plain words", () => {
    expect(detectProfileLink("https://ada.dev")).toBeNull();
    expect(detectProfileLink("")).toBeNull();
    expect(detectProfileLink("   ")).toBeNull();
    expect(detectProfileLink("not a url")).toBeNull();
  });
});

describe("websiteLabelFromUrl", () => {
  it("strips the protocol and www", () => {
    expect(websiteLabelFromUrl("https://www.example.com/")).toBe(
      "example.com",
    );
    expect(websiteLabelFromUrl("http://example.com")).toBe("example.com");
  });

  it("keeps a readable path and drops query and hash", () => {
    expect(
      websiteLabelFromUrl(
        "https://www.linkedin.com/in/ada/?trk=public_profile#about",
      ),
    ).toBe("linkedin.com/in/ada");
    expect(websiteLabelFromUrl("ada.dev/portfolio/")).toBe(
      "ada.dev/portfolio",
    );
  });

  it("accepts bare domains and rejects nothing it can display", () => {
    expect(websiteLabelFromUrl("ada.dev")).toBe("ada.dev");
    expect(websiteLabelFromUrl("  my site  ")).toBe("my site");
    expect(websiteLabelFromUrl("example.com//")).toBe("example.com");
  });

  it("returns an empty label for empty input", () => {
    expect(websiteLabelFromUrl("")).toBe("");
    expect(websiteLabelFromUrl("   ")).toBe("");
  });
});
