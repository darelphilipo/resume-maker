import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { parsePdfResume } from "@/lib/import/pdfResume";
import { serializeResume } from "@/lib/schema/serialize";
import { putResume, resumeDb } from "@/lib/store/db";
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

async function seedRecent(
  id: string,
  name: string,
  updatedAt = Date.UTC(2026, 10, 18),
): Promise<void> {
  const doc = createEmptyResume();
  doc.basics.name = name;
  await putResume({ id, updatedAt, doc });
}

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

function backupToggle() {
  return screen.getByRole("button", { name: /Backup & Restore/ });
}

async function openBackupMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(backupToggle());
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
  it("renders the three primary entry cards with the expected accessible names", () => {
    render(<Launcher />);

    const cards = screen.getAllByRole("region");
    expect(cards).toHaveLength(3);
    expect(
      screen.getByRole("region", { name: "Paste your resume" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Upload a PDF" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Start from scratch" }),
    ).toBeInTheDocument();
  });

  it("shows the free/local promises on one compact line above the upload card", () => {
    render(<Launcher />);

    const badge = screen.getByRole("list", {
      name: "Resume Maker promises",
    });
    const promises = within(badge).getAllByRole("listitem");
    expect(promises.map((promise) => promise.textContent)).toEqual([
      "100% Free",
      "No Sign-Up",
      "Works Offline in Your Browser",
    ]);
    expect(badge).not.toHaveTextContent("·");
    expect(badge.querySelectorAll("a, button")).toHaveLength(0);

    expect(badge).toHaveClass("flex-nowrap");
    expect(badge).not.toHaveClass("grid");

    for (const promise of promises) {
      expect(promise.querySelector(".whitespace-nowrap")).not.toBeNull();
      expect(promise).not.toHaveClass("rounded-xl");
      expect(promise).not.toHaveClass("border");
    }

    const uploadCard = screen.getByRole("region", {
      name: "Upload a PDF",
    });
    expect(
      badge.compareDocumentPosition(uploadCard) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("points users at the three entry options with a choose-one heading", () => {
    render(<Launcher />);

    expect(
      screen.getByRole("heading", { name: "Choose one way to start" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Pick the option that matches what you already have/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(3);
  });

  it("enables PDF upload from the primary card", () => {
    render(<Launcher />);

    const fileInput = screen.getByLabelText("Resume PDF");

    expect(fileInput).toHaveAttribute("accept", ".pdf,application/pdf");
  });

  it("keeps JSON restore in a secondary Backup & Restore menu", async () => {
    const user = userEvent.setup();
    render(<Launcher />);

    expect(backupToggle()).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByLabelText("Resume backup file"),
    ).not.toBeInTheDocument();

    await openBackupMenu(user);

    expect(backupToggle()).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/Download JSON backup/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Resume backup file")).toHaveAttribute(
      "accept",
      ".json,application/json",
    );

    await openBackupMenu(user);

    expect(backupToggle()).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByLabelText("Resume backup file"),
    ).not.toBeInTheDocument();
  });

  it("contains no AI wording", () => {
    const { container } = render(<Launcher />);
    const text = container.textContent ?? "";

    expect(text).not.toMatch(/\bAI\b/);
    expect(text).not.toMatch(/\b(assistant|refine|scorecard|rewrite)\b/i);
  });

  it("matches preset card heights and spans the odd last preset", () => {
    render(<Launcher />);

    const presets = within(
      screen.getByRole("region", { name: "Start from scratch" }),
    ).getAllByRole("listitem");

    expect(presets).toHaveLength(5);

    for (const preset of presets) {
      expect(preset).toHaveClass("h-full");
      expect(preset).toHaveClass("items-start");
      expect(within(preset).getByRole("button")).toHaveClass("h-full");
    }

    expect(presets.at(-1)).toHaveClass("sm:col-span-2");
    expect(presets[0]).not.toHaveClass("sm:col-span-2");
    expect(presets.at(-1)).toHaveTextContent("Fresh Graduate");
  });

  it("shows the creating state only on the chosen preset", async () => {
    vi.spyOn(useResumeStore.getState(), "createResume").mockImplementation(
      () => new Promise<string>(() => {}),
    );
    const user = userEvent.setup();
    render(<Launcher />);

    const clicked = screen.getByRole("button", { name: /Software Engineer/ });
    const sibling = screen.getByRole("button", { name: /Fresh Graduate/ });

    await user.click(clicked);

    expect(clicked).toHaveAttribute("aria-busy", "true");
    expect(clicked).toBeDisabled();
    expect(clicked).not.toHaveClass("pointer-events-none");
    expect(clicked).not.toHaveClass("opacity-60");
    expect(sibling).toHaveClass("pointer-events-none");
    expect(sibling).not.toHaveClass("opacity-60");
    expect(sibling).not.toHaveAttribute("aria-busy", "true");
  });

  it("keeps the disabled paste action readable instead of fading the whole button", () => {
    render(<Launcher />);

    const button = screen.getByRole("button", {
      name: "Create resume from text",
    });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:bg-[#e8e4dc]");
    expect(button).not.toHaveClass("disabled:opacity-60");
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

  it("starts a blank resume without sample content", async () => {
    const user = userEvent.setup();
    render(<Launcher />);

    await user.click(
      screen.getByRole("button", { name: "Start with a blank resume" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/editor\?id=/),
      );
    });

    const state = useResumeStore.getState();
    expect(state.resumeId).not.toBeNull();
    expect(state.doc.basics.name).toBe("");
    expect(state.doc.sections.experience.items).toEqual([]);
  });

  it("lists saved resumes under Recent resumes", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    render(<Launcher />);

    expect(
      screen.getByRole("heading", { name: "Recent resumes" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Open Grace Hopper" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Edited Nov 18, 2026")).toBeInTheDocument();
  });

  it("explains when no resume has been saved yet", async () => {
    render(<Launcher />);

    expect(
      await screen.findByText(/Nothing saved yet/),
    ).toBeInTheDocument();
  });

  it("opens a recent resume from the list", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    const user = userEvent.setup();
    render(<Launcher />);

    await user.click(
      await screen.findByRole("button", { name: "Open Grace Hopper" }),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/editor?id=recent-1");
    });
    expect(useResumeStore.getState().doc.basics.name).toBe("Grace Hopper");
  });

  it("renames a recent resume inline", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    const user = userEvent.setup();
    render(<Launcher />);

    await user.click(
      await screen.findByRole("button", { name: "Rename Grace Hopper" }),
    );
    fireEvent.change(screen.getByLabelText("Resume name"), {
      target: { value: "Admiral Grace" },
    });
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(
      await screen.findByRole("button", { name: "Open Admiral Grace" }),
    ).toBeInTheDocument();
    expect((await resumeDb.resumes.get("recent-1"))?.doc.basics.name).toBe(
      "Admiral Grace",
    );
  });

  it("deletes a recent resume after a confirmation step", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    const user = userEvent.setup();
    render(<Launcher />);

    await user.click(
      await screen.findByRole("button", { name: "Delete Grace Hopper" }),
    );

    expect(
      screen.getByText("Delete this resume? This cannot be undone."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Open Grace Hopper" }),
      ).not.toBeInTheDocument();
    });
    expect(await resumeDb.resumes.get("recent-1")).toBeUndefined();
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

    await openBackupMenu(user);
    await user.upload(
      screen.getByLabelText("Resume backup file"),
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

    await openBackupMenu(user);
    await user.upload(
      screen.getByLabelText("Resume backup file"),
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

    await user.upload(screen.getByLabelText("Resume PDF"), pdfFile());

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

    await user.upload(screen.getByLabelText("Resume PDF"), pdfFile());

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

    await user.upload(screen.getByLabelText("Resume PDF"), pdfFile());

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
