import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { parsePdfResume } from "@/lib/import/pdfResume";
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

vi.mock("@/lib/import/pdfResume", () => ({
  parsePdfResume: vi.fn(),
}));

function jsonFile(content: string, name = "resume.json"): File {
  const file = new File([content], name, { type: "application/json" });
  Object.defineProperty(file, "text", {
    value: () => Promise.resolve(content),
  });
  return file;
}

function pdfFile(content = "%PDF-1.4", name = "resume.pdf"): File {
  const file = new File([content], name, { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", {
    value: () => Promise.resolve(new ArrayBuffer(content.length)),
  });
  return file;
}

beforeEach(async () => {
  pushMock.mockReset();
  vi.mocked(parsePdfResume).mockReset();
  resetResumeStore();
  await resumeDb.resumes.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Launcher", () => {
  it("renders the three entry cards with the expected accessible names", () => {
    render(<Launcher />);

    const cards = screen.getAllByRole("region");
    expect(cards).toHaveLength(3);
    expect(
      screen.getByRole("region", { name: "Paste your resume" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Import existing resume" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Start from scratch" }),
    ).toBeInTheDocument();
  });

  it("shows the free/local trust badge above the import card", () => {
    render(<Launcher />);

    const badge = screen.getByRole("list", {
      name: "Resume Maker promises",
    });
    expect(badge).toHaveTextContent("100% Free");
    expect(badge).toHaveTextContent("No Sign-Up");
    expect(badge).toHaveTextContent("Works Offline in Your Browser");
    expect(badge.querySelectorAll("a, button")).toHaveLength(0);

    const importCard = screen.getByRole("region", {
      name: "Import existing resume",
    });
    expect(
      badge.compareDocumentPosition(importCard) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("enables PDF and JSON file import", () => {
    render(<Launcher />);

    const fileInput = screen.getByLabelText("Resume file");

    expect(fileInput).toHaveAttribute(
      "accept",
      ".pdf,.json,application/pdf,application/json",
    );
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
      screen.getByLabelText("Resume file"),
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
      screen.getByLabelText("Resume file"),
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

  it("reads a PDF locally, parses it, and navigates to the editor", async () => {
    const user = userEvent.setup();
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    vi.mocked(parsePdfResume).mockResolvedValue({
      text: "Ada Lovelace",
      doc,
    });
    render(<Launcher />);

    await user.upload(screen.getByLabelText("Resume file"), pdfFile());

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/editor\?id=/),
      );
    });

    expect(parsePdfResume).toHaveBeenCalledWith(expect.any(ArrayBuffer));
    const state = useResumeStore.getState();
    expect(state.doc.basics.name).toBe("Ada Lovelace");
    expect(state.resumeId).not.toBeNull();
  });

  it("explains when a PDF has no selectable text", async () => {
    const user = userEvent.setup();
    vi.mocked(parsePdfResume).mockResolvedValue({ text: "  ", doc: null });
    render(<Launcher />);

    await user.upload(screen.getByLabelText("Resume file"), pdfFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That PDF has no selectable text.",
    );
    expect(useResumeStore.getState().resumeId).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows an inline error when a PDF cannot be read", async () => {
    const user = userEvent.setup();
    vi.mocked(parsePdfResume).mockRejectedValue(new Error("corrupt pdf"));
    render(<Launcher />);

    await user.upload(screen.getByLabelText("Resume file"), pdfFile());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not read that PDF.",
    );
    expect(useResumeStore.getState().resumeId).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("disables the paste action until text is entered", () => {
    render(<Launcher />);

    expect(
      screen.getByRole("button", { name: "Create resume from text" }),
    ).toBeDisabled();
  });

  it("parses pasted resume text and navigates to the editor", async () => {
    const user = userEvent.setup();
    render(<Launcher />);

    fireEvent.change(screen.getByLabelText("Resume text"), {
      target: {
        value: `Jordan Blake
Product Manager
jordan@example.com

EXPERIENCE
Senior Product Manager
Acme Corp | Jan 2020 - Present
- Grew activation by 20%.

SKILLS
Product: Roadmapping, Discovery`,
      },
    });
    await user.click(
      screen.getByRole("button", { name: "Create resume from text" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/editor\?id=/),
      );
    });

    const state = useResumeStore.getState();
    expect(state.doc.basics.name).toBe("Jordan Blake");
    expect(state.doc.basics.headline).toBe("Product Manager");
    expect(state.doc.sections.experience.items[0]?.company).toBe("Acme Corp");
    expect(state.doc.sections.skills.items[0]?.keywords).toEqual([
      "Roadmapping",
      "Discovery",
    ]);
    expect(state.resumeId).not.toBeNull();
  });

  it("shows an inline error when pasted text cannot be parsed", async () => {
    const user = userEvent.setup();
    render(<Launcher />);

    fireEvent.change(screen.getByLabelText("Resume text"), {
      target: { value: "just some notes about my weekend" },
    });
    await user.click(
      screen.getByRole("button", { name: "Create resume from text" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That text did not look like a resume.",
    );
    expect(useResumeStore.getState().resumeId).toBeNull();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
