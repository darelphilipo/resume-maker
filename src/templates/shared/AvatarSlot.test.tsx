import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import type { PictureConfig } from "@/lib/schema/resume.schema";

import { AvatarSlot } from "./AvatarSlot";
import { HeaderSlot } from "./HeaderSlot";

function makePicture(overrides: Partial<PictureConfig> = {}): PictureConfig {
  return { ...createEmptyResume().picture, ...overrides };
}

describe("AvatarSlot", () => {
  it("renders nothing when the picture is hidden", () => {
    const { container } = render(
      <AvatarSlot
        picture={makePicture({
          hidden: true,
          url: "data:image/png;base64,abc",
        })}
      />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when visible but the url is empty", () => {
    const { container } = render(
      <AvatarSlot picture={makePicture({ hidden: false, url: "   " })} />,
    );

    expect(container.querySelector("img")).toBeNull();
  });

  it("renders a decorative avatar with point-based sizing when visible", () => {
    const { container } = render(
      <AvatarSlot
        picture={makePicture({
          hidden: false,
          url: "data:image/png;base64,abc",
          size: 72,
          aspectRatio: 1.5,
          borderRadius: 8,
          fit: "contain",
        })}
      />,
    );

    const img = container.querySelector("img");

    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("loading", "eager");
    expect(img).toHaveAttribute("decoding", "sync");
    expect(img?.style.width).toBe("72pt");
    expect(img?.style.height).toBe("108pt");
    expect(img?.style.borderRadius).toBe("8pt");
    expect(img?.style.objectFit).toBe("contain");
  });
});

describe("HeaderSlot", () => {
  it("collapses the avatar column when the picture is hidden", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    doc.basics.headline = "Mathematician";

    const { container } = render(<HeaderSlot doc={doc} />);

    expect(container.querySelector("img")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Ada Lovelace" }),
    ).toBeInTheDocument();
  });

  it("drops a picture that fails to load and lets the name use both columns", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    doc.picture = {
      ...doc.picture,
      hidden: false,
      url: "https://example.com/missing.jpg",
    };

    const { container } = render(<HeaderSlot doc={doc} />);
    const avatar = container.querySelector("img");

    expect(avatar).not.toBeNull();

    fireEvent.error(avatar as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
    const name = screen.getByRole("heading", { level: 1, name: "Ada Lovelace" });
    expect(name.parentElement?.style.gridColumn).toBe("1 / -1");
  });

  it("shows contact metadata and suppresses icons when hideIcons is true", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada";
    doc.basics.email = "ada@example.com";
    doc.basics.phone = "+1 555 0100";
    doc.basics.location = "London";
    doc.basics.website.label = "ada.dev";
    doc.basics.customFields = [
      { id: "cf1", icon: "", text: "Pronouns: she/her" },
    ];
    doc.metadata.page.hideIcons = true;

    const { container } = render(<HeaderSlot doc={doc} />);

    expect(screen.getByText(/ada@example\.com/)).toBeInTheDocument();
    expect(screen.getByText(/Pronouns: she\/her/)).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });

  it("renders the optional work auth line as a header tag", () => {
    const doc = createEmptyResume();
    doc.basics.email = "ada@example.com";
    doc.basics.workAuth = "Authorized to work in US";

    const { container } = render(<HeaderSlot doc={doc} />);

    const tag = screen.getByText("Authorized to work in US");

    expect(tag).toBeInTheDocument();
    expect(tag.closest(".resume-work-auth")).not.toBeNull();
    expect(container.querySelectorAll(".resume-work-auth")).toHaveLength(1);
  });

  it("links a website from its URL when the label is blank", () => {
    const doc = createEmptyResume();
    doc.basics.website = { url: "https://example.com/portfolio", label: "" };

    render(<HeaderSlot doc={doc} />);

    const link = screen.getByRole("link", { name: "example.com/portfolio" });

    expect(link).toHaveAttribute("href", "https://example.com/portfolio");
  });

  it("links a website with its custom label", () => {
    const doc = createEmptyResume();
    doc.basics.website = { url: "example.com/portfolio", label: "Portfolio" };

    render(<HeaderSlot doc={doc} />);

    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute(
      "href",
      "https://example.com/portfolio",
    );
  });

  it("omits the work auth tag when it is empty", () => {
    const doc = createEmptyResume();
    doc.basics.email = "ada@example.com";
    doc.basics.workAuth = "   ";

    const { container } = render(<HeaderSlot doc={doc} />);

    expect(container.querySelectorAll(".resume-work-auth")).toHaveLength(0);
  });

  it("renders contact icons when hideIcons is false", () => {
    const doc = createEmptyResume();
    doc.basics.email = "ada@example.com";
    doc.metadata.page.hideIcons = false;

    const { container } = render(<HeaderSlot doc={doc} />);

    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);
  });

  it("promotes visible profiles into the header with clean links and icons", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    doc.sections.profiles.items = [
      {
        id: "github",
        hidden: false,
        network: "GitHub",
        username: "ada",
        url: "https://www.github.com/ada/",
        icon: "github",
      },
      {
        id: "linkedin",
        hidden: false,
        network: "LinkedIn",
        username: "ada",
        url: "https://linkedin.com/in/ada",
        icon: "",
      },
      {
        id: "portfolio",
        hidden: false,
        network: "",
        username: "",
        url: "ada.dev/portfolio",
        icon: "",
      },
    ];

    render(<HeaderSlot doc={doc} />);

    const github = screen.getByRole("link", { name: "github.com/ada" });
    const linkedin = screen.getByRole("link", { name: "linkedin.com/in/ada" });
    const portfolio = screen.getByRole("link", { name: "ada.dev/portfolio" });

    expect(github).toHaveAttribute("href", "https://www.github.com/ada/");
    expect(linkedin).toHaveAttribute("href", "https://linkedin.com/in/ada");
    expect(portfolio).toHaveAttribute("href", "https://ada.dev/portfolio");

    expect(github.closest("[data-profile-icon]")).toHaveAttribute(
      "data-profile-icon",
      "github",
    );
    expect(linkedin.closest("[data-profile-icon]")).toHaveAttribute(
      "data-profile-icon",
      "linkedin",
    );
    expect(portfolio.closest("[data-profile-icon]")).toHaveAttribute(
      "data-profile-icon",
      "globe",
    );
    expect(
      github.closest(".resume-contact-item")?.querySelector("svg"),
    ).not.toBeNull();
  });

  it("keeps hidden profiles, hidden sections, and network-only drafts out of the header", () => {
    const doc = createEmptyResume();
    doc.sections.profiles.items = [
      {
        id: "hidden-row",
        hidden: true,
        network: "GitHub",
        username: "ada",
        url: "github.com/ada",
        icon: "github",
      },
      {
        id: "network-only",
        hidden: false,
        network: "LinkedIn",
        username: "",
        url: "",
        icon: "linkedin",
      },
      {
        id: "visible",
        hidden: false,
        network: "GitLab",
        username: "ada",
        url: "gitlab.com/ada",
        icon: "gitlab",
      },
    ];

    const { rerender } = render(<HeaderSlot doc={doc} />);

    expect(
      screen.getByRole("link", { name: "gitlab.com/ada" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "github.com/ada" })).toBeNull();
    expect(
      screen.queryByRole("link", { name: "linkedin.com/in/ada" }),
    ).toBeNull();

    doc.sections.profiles.hidden = true;
    rerender(<HeaderSlot doc={doc} />);

    expect(screen.queryByRole("link", { name: "gitlab.com/ada" })).toBeNull();
  });

  it("derives a canonical header link when only Network and Username are filled", () => {
    const doc = createEmptyResume();
    doc.sections.profiles.items = [
      {
        id: "github",
        hidden: false,
        network: "GitHub",
        username: "ada",
        url: "",
        icon: "",
      },
      {
        id: "linkedin",
        hidden: false,
        network: "LinkedIn",
        username: "ada",
        url: "",
        icon: "",
      },
    ];

    render(<HeaderSlot doc={doc} />);

    expect(screen.getByRole("link", { name: "github.com/ada" })).toHaveAttribute(
      "href",
      "https://github.com/ada",
    );
    expect(
      screen.getByRole("link", { name: "linkedin.com/in/ada" }),
    ).toHaveAttribute("href", "https://linkedin.com/in/ada");
    expect(
      screen.getByRole("link", { name: "github.com/ada" }).closest(
        "[data-profile-icon]",
      ),
    ).toHaveAttribute("data-profile-icon", "github");
  });

  it("renders an unknown Network + Username as inline header text", () => {
    const doc = createEmptyResume();
    doc.sections.profiles.items = [
      {
        id: "portfolio",
        hidden: false,
        network: "Portfolio",
        username: "ada",
        url: "",
        icon: "",
      },
    ];

    const { container } = render(<HeaderSlot doc={doc} />);

    expect(screen.getByText("Portfolio: ada")).toBeInTheDocument();
    expect(container.querySelectorAll(".resume-contact-item a")).toHaveLength(
      0,
    );
  });

  it("keeps promoted profile links when header icons are hidden", () => {
    const doc = createEmptyResume();
    doc.basics.name = "Ada";
    doc.metadata.page.hideIcons = true;
    doc.sections.profiles.items = [
      {
        id: "github",
        hidden: false,
        network: "GitHub",
        username: "ada",
        url: "github.com/ada",
        icon: "github",
      },
    ];

    const { container } = render(<HeaderSlot doc={doc} />);

    expect(
      screen.getByRole("link", { name: "github.com/ada" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("svg")).toHaveLength(0);
  });
});
