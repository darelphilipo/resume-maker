import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { BasicsForm } from "./BasicsForm";

describe("BasicsForm live name publication", () => {
  it("publishes every keystroke immediately, ahead of the debounced store commit", () => {
    resetResumeStore();
    useResumeStore.setState({ doc: createEmptyResume() });

    const onLiveNameChange = vi.fn();

    render(<BasicsForm onLiveNameChange={onLiveNameChange} />);
    const input = screen.getByLabelText("Name");

    fireEvent.change(input, { target: { value: "Ada" } });

    // No timers advanced: the header/preview must not wait for the 50 ms
    // debounce (which a fast typist keeps resetting until they pause/blur).
    expect(onLiveNameChange).toHaveBeenCalledWith("Ada");
    expect(useResumeStore.getState().doc.basics.name).toBe("");
  });
});
