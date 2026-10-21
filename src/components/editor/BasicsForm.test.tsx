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
});
