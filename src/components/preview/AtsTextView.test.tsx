import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { buildAtsText } from "@/lib/ats/atsText";
import { createEmptyResume } from "@/lib/schema/defaults";
import { ExperienceItemSchema } from "@/lib/schema/resume.schema";

import { AtsTextView } from "./AtsTextView";

function stubClipboard(writeText = vi.fn().mockResolvedValue(undefined)) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });

  return writeText;
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard");
  vi.useRealTimers();
});

describe("AtsTextView", () => {
  it("renders the extracted resume text in a labelled plain-text block", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.basics.headline = "Software Engineer";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Senior Engineer",
      }),
    ];

    render(<AtsTextView doc={doc} />);

    const preview = screen.getByLabelText("ATS plain text preview");

    expect(preview.tagName).toBe("DIV");
    expect(preview).toHaveTextContent("Ada Lovelace");
    expect(preview).toHaveTextContent("Senior Engineer");
    expect(preview).toHaveTextContent("Acme");
  });

  it("keeps copy button widths fixed so labels cannot shift on click", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Senior Engineer",
      }),
    ];

    render(<AtsTextView doc={doc} />);

    const all = screen.getByRole("button", { name: "Copy all plain text" });
    const compact = screen.getByRole("button", {
      name: "Copy contact details",
    });

    expect(all).toHaveClass("min-w-[11.5rem]", "justify-center");
    expect(compact).toHaveClass("min-w-[5.5rem]", "justify-center");
  });

  it("explains how to populate an empty view and disables copy all", () => {
    render(<AtsTextView doc={createEmptyResume()} />);

    expect(
      screen.getByLabelText("ATS plain text preview"),
    ).toHaveTextContent(
      "Nothing to extract yet. Add your name and at least one section.",
    );
    expect(
      screen.getByRole("button", { name: "Copy all plain text" }),
    ).toBeDisabled();
  });

  it("leaves scrolling to the Preview panel instead of nesting its own", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";

    render(<AtsTextView doc={doc} />);

    const preview = screen.getByLabelText("ATS plain text preview");

    // The copy bar and every section share the Preview panel's single scroller;
    // a `max-h`/`overflow-auto` box here caused the old double scroll.
    expect(preview).toHaveClass("overflow-hidden");
    expect(preview).not.toHaveClass("overflow-auto", "overflow-y-auto");
    expect(preview.className).not.toContain("max-h");
    expect(
      preview.compareDocumentPosition(
        screen.getByRole("button", { name: "Copy all plain text" }),
      ) & Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
  });

  it("keeps the intro caption clear of the scroller's top edge", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";

    render(<AtsTextView doc={doc} />);

    const caption = screen.getByText(
      /Plain text in the order an ATS parser reads it/,
    );
    const root = caption.parentElement?.parentElement as HTMLElement;

    // The root adds its own top breathing room on top of the scroller's `py-3`
    // so the first line is never clipped at 390px.
    expect(root).toHaveClass("pt-1");
    expect(caption).toHaveClass("leading-relaxed");
  });

  it("copies the full plain text and resets the Copied label after 1.5s", async () => {
    vi.useFakeTimers();

    const writeText = stubClipboard();
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Senior Engineer",
      }),
    ];

    render(<AtsTextView doc={doc} />);

    const button = screen.getByRole("button", {
      name: "Copy all plain text",
    });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(writeText).toHaveBeenCalledWith(buildAtsText(doc));
    expect(button).toHaveTextContent("Copied");

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(button).toHaveTextContent("Copy all plain text");
  });

  it("omits the per-entry Copy when a headingless single block duplicates the section copy", async () => {
    const writeText = stubClipboard();
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.summary.content = "<p>Product-minded engineer.</p>";
    doc.summary.showHeading = false;

    render(<AtsTextView doc={doc} />);

    expect(
      screen.getByRole("button", { name: "Copy Summary section" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Copy Summary" }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Copy Summary section" }),
    );
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("Product-minded engineer."),
    );
  });

  it("omits the per-entry Copy on a single-block Summary even with its heading", async () => {
    const writeText = stubClipboard();
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.summary.content = "<p>Product-minded engineer.</p>";

    render(<AtsTextView doc={doc} />);

    const sectionCopy = screen.getByRole("button", {
      name: "Copy Summary section",
    });

    expect(sectionCopy).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Copy Summary" }),
    ).not.toBeInTheDocument();

    fireEvent.click(sectionCopy);
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "Summary\nProduct-minded engineer.",
      ),
    );
  });

  it("keeps per-entry Copy buttons on a headingless multi-entry section", () => {
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.sections.experience.showHeading = false;
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Engineer",
      }),
      ExperienceItemSchema.parse({
        id: "exp-2",
        company: "Globex",
        position: "Lead",
      }),
    ];

    render(<AtsTextView doc={doc} />);

    expect(
      screen.getByRole("button", { name: "Copy Experience section" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy Engineer" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Copy Lead" })).toBeVisible();
  });

  it("copies a single section and a single entry as clean plain text", async () => {
    const writeText = stubClipboard();
    const doc = createEmptyResume();

    doc.basics.name = "Ada Lovelace";
    doc.sections.experience.items = [
      ExperienceItemSchema.parse({
        id: "exp-1",
        company: "Acme",
        position: "Senior Engineer",
        summary: "<ul><li>Shipped APIs</li></ul>",
      }),
    ];

    render(<AtsTextView doc={doc} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Copy Experience section" }),
    );

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(
        "Experience\nSenior Engineer\nAcme\n- Shipped APIs",
      ),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Copy Senior Engineer" }),
    );

    await waitFor(() =>
      expect(writeText).toHaveBeenLastCalledWith(
        "Senior Engineer\nAcme\n- Shipped APIs",
      ),
    );
  });
});
