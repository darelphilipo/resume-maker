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
