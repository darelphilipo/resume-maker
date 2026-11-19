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
});
