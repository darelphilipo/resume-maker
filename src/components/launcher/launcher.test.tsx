import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { serializeResume } from "@/lib/schema/serialize";
import { resumeDb } from "@/lib/store/db";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { Launcher } from "./Launcher";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function jsonFile(content: string, name = "resume.json"): File {
  const file = new File([content], name, { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(content),
  });
  return file;
}

beforeEach(async () => {
  pushMock.mockReset();
  resetResumeStore();
  await resumeDb.resumes.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Launcher", () => {
  it("renders exactly two cards with the expected accessible names", () => {
    render(<Launcher />);

    const cards = screen.getAllByRole("region");
    expect(cards).toHaveLength(2);
    expect(
      screen.getByRole("region", { name: "Import existing resume" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Start from scratch" }),
    ).toBeInTheDocument();
  });

  it("does not render a PDF option while PDF_IMPORT_ENABLED is false", () => {
    render(<Launcher />);

    expect(screen.queryByText(/pdf/i)).not.toBeInTheDocument();
    expect(
      screen.getByLabelText("Resume JSON file"),
    ).toHaveAttribute("accept", ".json,application/json");
  });

  it("contains no AI wording", () => {
    const { container } = render(<Launcher />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/\bAI\b/);
    expect(text).not.toMatch(/\b(assistant|refine|scorecard|rewrite)\b/i);
  });

  it("opens the editor from the Software Engineer preset", async () => {
    const user = userEvent.setup();
    render(<Launcher />);

    await user.click(
      screen.getByRole("button", { name: /Software Engineer/ }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/editor\?id=/),
      );
    });
    expect(useResumeStore.getState().resumeId).not.toBeNull();
  });

  it("shows an error and does not navigate when createResume fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(useResumeStore.getState(), "createResume").mockRejectedValue(
      new Error("storage blocked"),
    );
    render(<Launcher />);

    await user.click(
      screen.getByRole("button", { name: /Software Engineer/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not create the resume. Your browser may be blocking local storage.",
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Software Engineer/ }),
    ).toBeEnabled();
  });

  it("shows an error and does not navigate when saveNow fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(useResumeStore.getState(), "saveNow").mockRejectedValue(
      new Error("quota exceeded"),
    );
    render(<Launcher />);

    await user.click(
      screen.getByRole("button", { name: /Software Engineer/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not create the resume. Your browser may be blocking local storage.",
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: /Software Engineer/ }),
    ).toBeEnabled();
  });

  it("shows an inline error for invalid JSON and does not navigate", async () => {
    const user = userEvent.setup();
    render(<Launcher />);

    await user.upload(
      screen.getByLabelText("Resume JSON file"),
      jsonFile("{not valid json"),
    );

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(useResumeStore.getState().resumeId).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("imports a valid JSON backup and navigates to the editor", async () => {
    const user = userEvent.setup();
    const doc = createEmptyResume();
    doc.basics.name = "Grace Hopper";
    render(<Launcher />);

    await user.upload(
      screen.getByLabelText("Resume JSON file"),
      jsonFile(serializeResume(doc)),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/editor\?id=/),
      );
    });

    const state = useResumeStore.getState();
    expect(state.doc.basics.name).toBe("Grace Hopper");
    expect(state.resumeId).not.toBeNull();
  });
});
