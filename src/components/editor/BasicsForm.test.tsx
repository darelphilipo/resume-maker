import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { BasicsForm } from "./BasicsForm";

function setup(): void {
  resetResumeStore();
  useResumeStore.setState({ doc: createEmptyResume() });
}

describe("BasicsForm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setup();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has no redundant name-preview box and still commits the typed name", () => {
    render(<BasicsForm />);

    // The header and center canvas are the previews now; a second copy above
    // the input only pushed the real fields down the narrow Content column.
    expect(screen.queryByText("Name preview")).toBeNull();

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada Lovelace" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(useResumeStore.getState().doc.basics.name).toBe("Ada Lovelace");
  });

  it("replaces a picture that cannot load with a readable fallback", () => {
    render(<BasicsForm />);

    fireEvent.click(screen.getByLabelText("Hide picture"));
    fireEvent.change(screen.getByLabelText("Picture URL"), {
      target: { value: "https://example.com/missing.jpg" },
    });

    const preview = screen.getByRole("img", { name: "Picture preview" });

    fireEvent.error(preview);

    expect(screen.queryByRole("img", { name: "Picture preview" })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      /That picture could not load/,
    );

    act(() => {
      vi.advanceTimersByTime(50);
    });
  });

  it("commits typed values after 50ms with one patchDoc call", () => {
    const patchSpy = vi.spyOn(useResumeStore.getState(), "patchDoc");

    render(<BasicsForm />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByLabelText("Headline"), {
      target: { value: "Mathematician" },
    });

    expect(useResumeStore.getState().doc.basics.name).toBe("");

    act(() => {
      vi.advanceTimersByTime(49);
    });

    expect(useResumeStore.getState().doc.basics.name).toBe("");

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const state = useResumeStore.getState();

    expect(state.doc.basics.name).toBe("Ada Lovelace");
    expect(state.doc.basics.headline).toBe("Mathematician");
    expect(patchSpy).toHaveBeenCalledTimes(1);
    expect(patchSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        basics: expect.objectContaining({ name: "Ada Lovelace" }),
      }),
    );
  });

  it("commits picture visibility and url in the same patch", () => {
    render(<BasicsForm />);

    fireEvent.change(screen.getByLabelText("Picture URL"), {
      target: { value: "https://example.com/photo.jpg" },
    });
    fireEvent.click(screen.getByLabelText("Hide picture"));

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const picture = useResumeStore.getState().doc.picture;

    expect(picture.url).toBe("https://example.com/photo.jpg");
    expect(picture.hidden).toBe(false);
  });

  it("commits the optional work auth line with the rest of the basics", () => {
    render(<BasicsForm />);

    fireEvent.change(screen.getByLabelText("Work auth / notice period"), {
      target: { value: "Authorized to work in US" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(useResumeStore.getState().doc.basics.workAuth).toBe(
      "Authorized to work in US",
    );
  });

  it("fills and clears the work auth line from its preset chips", () => {
    render(<BasicsForm />);

    const preset = screen.getByRole("button", { name: "Immediate Joiner" });

    fireEvent.click(preset);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(useResumeStore.getState().doc.basics.workAuth).toBe(
      "Immediate Joiner",
    );
    expect(preset).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(preset);

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(useResumeStore.getState().doc.basics.workAuth).toBe("");
    expect(preset).toHaveAttribute("aria-pressed", "false");
  });

  it("derives the website label from the URL instead of asking for one", () => {
    render(<BasicsForm />);

    expect(screen.queryByLabelText("Website label")).toBeNull();

    fireEvent.change(screen.getByLabelText("Website URL"), {
      target: { value: "https://www.ada.dev/portfolio/" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    const website = useResumeStore.getState().doc.basics.website;

    expect(website.url).toBe("https://www.ada.dev/portfolio/");
    expect(website.label).toBe("ada.dev/portfolio");
  });

  it("previews the derived website label while typing", () => {
    render(<BasicsForm />);

    fireEvent.change(screen.getByLabelText("Website URL"), {
      target: { value: "https://example.com/" },
    });

    expect(screen.getByText("Shown as example.com")).toBeInTheDocument();
  });

  it("offers a shortcut to manage the profile links shown in the header", () => {
    const onManageProfiles = vi.fn();

    render(<BasicsForm onManageProfiles={onManageProfiles} />);

    expect(screen.getByText("Profile links")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Manage profiles" }));

    expect(onManageProfiles).toHaveBeenCalledTimes(1);
  });

  it("keeps an imported website label until the URL changes", () => {
    const doc = createEmptyResume();
    doc.basics.website = { url: "https://ada.dev", label: "Ada's portfolio" };
    useResumeStore.setState({ doc });

    render(<BasicsForm />);

    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Ada Lovelace" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(useResumeStore.getState().doc.basics.website.label).toBe(
      "Ada's portfolio",
    );

    fireEvent.change(screen.getByLabelText("Website URL"), {
      target: { value: "https://ada.dev/work" },
    });

    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(useResumeStore.getState().doc.basics.website.label).toBe(
      "ada.dev/work",
    );
  });
});
