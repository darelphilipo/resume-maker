import { describe, expect, it } from "vitest";

import {
  detectProfileLink,
  externalLinkHref,
  headerProfileIcon,
  profileHeaderLink,
  websiteLabelFromUrl,
} from "./contactLinks";

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

describe("profileHeaderLink", () => {
  it("builds a clean link with the derived icon", () => {
    expect(
      profileHeaderLink({
        id: "profile-1",
        url: "https://www.linkedin.com/in/ada/",
        icon: "",
      }),
    ).toEqual({
      id: "profile-1",
      label: "linkedin.com/in/ada",
      href: "https://www.linkedin.com/in/ada/",
      icon: "linkedin",
    });
  });

  it("upgrades a bare host and keeps a saved icon", () => {
    expect(
      profileHeaderLink({ url: "github.com/ada", icon: "github" }, 3),
    ).toEqual({
      id: "profile-3",
      label: "github.com/ada",
      href: "https://github.com/ada",
      icon: "github",
    });
  });

  it("falls back to a globe for unknown and non-resume hosts", () => {
    expect(
      profileHeaderLink({ url: "https://ada.dev/portfolio", icon: "" }),
    ).toMatchObject({ label: "ada.dev/portfolio", icon: "globe" });
    expect(
      profileHeaderLink({ url: "https://facebook.com/ada", icon: "" }),
    ).toMatchObject({ icon: "globe" });
    expect(
      profileHeaderLink({ url: "https://example.com", icon: "facebook" }),
    ).toMatchObject({ icon: "globe" });
  });

  it("drops rows without a usable http(s) URL", () => {
    expect(profileHeaderLink({ url: "" })).toBeNull();
    expect(profileHeaderLink({ url: "   " })).toBeNull();
    expect(profileHeaderLink({ url: "javascript:alert(1)" })).toBeNull();
    expect(profileHeaderLink({ url: "data:text/html,hello" })).toBeNull();
  });
});

describe("headerProfileIcon", () => {
  it("prefers a supported stored icon over the URL heuristic", () => {
    expect(headerProfileIcon("stack-overflow", "https://github.com/ada")).toBe(
      "stack-overflow",
    );
    expect(headerProfileIcon(" GitHub ", "")).toBe("github");
  });

  it("derives the icon from the URL and defaults to globe", () => {
    expect(headerProfileIcon("", "https://x.com/ada")).toBe("x");
    expect(headerProfileIcon("", "https://gitlab.com/ada")).toBe("gitlab");
    expect(headerProfileIcon("", "https://ada.dev")).toBe("globe");
    expect(headerProfileIcon(undefined, undefined)).toBe("globe");
  });
});

describe("externalLinkHref", () => {
  it("keeps absolute http(s) links and upgrades bare hosts", () => {
    expect(externalLinkHref("https://example.com/ada")).toBe(
      "https://example.com/ada",
    );
    expect(externalLinkHref("http://example.com")).toBe("http://example.com");
    expect(externalLinkHref("example.com/ada")).toBe("https://example.com/ada");
    expect(externalLinkHref("  github.com/ada  ")).toBe(
      "https://github.com/ada",
    );
  });

  it("rejects blank input and non-http schemes", () => {
    expect(externalLinkHref("")).toBe("");
    expect(externalLinkHref("   ")).toBe("");
    expect(externalLinkHref("javascript:alert(1)")).toBe("");
    expect(externalLinkHref("data:text/html,hello")).toBe("");
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
