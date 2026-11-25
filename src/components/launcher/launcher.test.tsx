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
import { putResume, resumeDb, type ResumeRow } from "@/lib/store/db";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { Launcher } from "./Launcher";

const { pushMock, copyTextMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  copyTextMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/lib/clipboard/copyText", () => ({
  copyText: copyTextMock,
}));

vi.mock("@/lib/import/pdfResume", () => ({
  parsePdfResume: vi.fn(),
}));

async function seedRecent(
  id: string,
  name: string,
  updatedAt = Date.UTC(2026, 10, 18),
  meta: Partial<Pick<ResumeRow, "status" | "targetCompany">> = {},
): Promise<void> {
  const doc = createEmptyResume();
  doc.basics.name = name;
  await putResume({ id, updatedAt, doc, ...meta });
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

function pasteToggle() {
  return screen.getByRole("button", { name: "Paste resume text" });
}

function aiToggle() {
  return screen.getByRole("button", {
    name: "Import via AI prompt",
  });
}

async function openPasteMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(pasteToggle());
}

async function openAiMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(aiToggle());
}

beforeEach(async () => {
  pushMock.mockReset();
  copyTextMock.mockReset();
  copyTextMock.mockResolvedValue(true);
  vi.mocked(parsePdfResume).mockReset();
  resetResumeStore();
  await resumeDb.resumes.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Launcher", () => {
  it("leads with Upload a PDF and puts Start from scratch below it", () => {
    render(<Launcher />);

    const upload = screen.getByRole("region", { name: "Upload a PDF" });
    const scratch = screen.getByRole("region", { name: "Start from scratch" });

    expect(screen.getAllByRole("region")).toEqual([upload, scratch]);
    expect(
      upload.compareDocumentPosition(scratch) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(within(upload).getByText("Recommended")).toBeInTheDocument();
    expect(
      within(upload).getByLabelText("Resume PDF").closest("label"),
    ).toHaveClass("min-h-44");
    expect(
      screen.queryByRole("region", { name: "Paste your resume" }),
    ).not.toBeInTheDocument();
  });

  it("keeps paste, AI prompt, and JSON restore in a quiet secondary strip", () => {
    render(<Launcher />);

    const utilities = screen.getByRole("group", {
      name: "Other ways to import",
    });

    expect(within(utilities).getAllByRole("button").map((button) => button.textContent)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Paste resume text"),
        expect.stringContaining("Import via AI prompt"),
        expect.stringContaining("Backup & Restore"),
      ]),
    );
    expect(screen.queryByLabelText("Resume text")).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Assistant's JSON reply"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Resume backup file"),
    ).not.toBeInTheDocument();
    expect(pasteToggle()).toHaveAttribute("aria-expanded", "false");
    expect(aiToggle()).toHaveAttribute("aria-expanded", "false");
    expect(backupToggle()).toHaveAttribute("aria-expanded", "false");
  });

  it("shows Recent resumes above the primary cards once a resume is saved", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    render(<Launcher />);

    const recent = await screen.findByRole("region", { name: "Recent resumes" });
    const upload = screen.getByRole("region", { name: "Upload a PDF" });

    expect(
      recent.compareDocumentPosition(upload) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getAllByRole("region")).toHaveLength(3);
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
    expect(badge).toHaveClass("justify-start");
    expect(badge).not.toHaveClass("grid");
    expect(badge).not.toHaveClass("justify-center");

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

  it("points users at the two primary options with a choose-one heading", () => {
    render(<Launcher />);

    expect(
      screen.getByRole("heading", { name: "Choose one way to start" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Upload the resume you already have, or build a fresh one/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(2);
  });

  it("enables PDF upload from the primary card", () => {
    render(<Launcher />);

    const fileInput = screen.getByLabelText("Resume PDF");

    expect(fileInput).toHaveAttribute("accept", ".pdf,application/pdf");
    // The clipped input stays anchored to its dropzone, so focusing it cannot
    // scroll the page on mobile.
    expect(fileInput.closest("label")).toHaveClass("relative");
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
      screen.getByText(/open a resume and choose/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Resume backup file")).toHaveAttribute(
      "accept",
      ".json,application/json",
    );
    expect(
      screen.getByLabelText("Resume backup file").closest("label"),
    ).toHaveClass("relative");

    await openBackupMenu(user);

    expect(backupToggle()).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByLabelText("Resume backup file"),
    ).not.toBeInTheDocument();
  });

  it("keeps the AI prompt import manual: copy a prompt, paste a reply, no network call", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new Error("no network calls"),
    );
    render(<Launcher />);

    await openAiMenu(user);

    expect(aiToggle()).toHaveAttribute("aria-expanded", "true");
    // The long "for scanned/Canva PDFs" suffix moved into the panel so the
    // accordion label cannot truncate mid-word on a 390px phone.
    expect(aiToggle()).toHaveTextContent(/^Import via AI prompt$/);
    expect(
      screen.getByText("For scanned or Canva PDFs."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not send your resume to any AI/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Assistant's JSON reply")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("copies the rescue prompt with one tap and a short Copied confirmation", async () => {
    const user = userEvent.setup();
    render(<Launcher />);

    await openAiMenu(user);
    const copy = screen.getByRole("button", { name: "Copy prompt" });
    await user.click(copy);

    expect(copyTextMock).toHaveBeenCalledWith(
      expect.stringContaining("JSON Resume format"),
    );
    expect(
      await screen.findByRole("button", { name: "Copied" }),
    ).toBeInTheDocument();
  });

  it("gives every preset card the same width and keeps Fresh Graduate", () => {
    render(<Launcher />);

    const presets = within(
      screen.getByRole("region", { name: "Start from scratch" }),
    ).getAllByRole("listitem");

    // Six cards fill the two-column grid evenly, so Fresh Graduate always has
    // a sibling instead of sitting beside an empty slot.
    expect(presets).toHaveLength(6);

    for (const preset of presets) {
      expect(preset).toHaveClass("h-full");
      expect(preset).toHaveClass("items-start");
      expect(preset).not.toHaveClass("sm:col-span-2");
      expect(within(preset).getByRole("button")).toHaveClass("h-full");
    }

    expect(presets.at(-1)).toHaveTextContent("Fresh Graduate");
    expect(
      screen.getByRole("button", { name: /Data Analyst/ }),
    ).toBeInTheDocument();
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

  it("keeps the disabled paste action readable instead of fading the whole button", async () => {
    const user = userEvent.setup();
    render(<Launcher />);
    await openPasteMenu(user);

    const button = screen.getByRole("button", {
      name: "Create resume from text",
    });

    expect(button).toBeDisabled();
    expect(button).toHaveClass("disabled:bg-[#e8e4dc]");
    expect(button).not.toHaveClass("disabled:opacity-60");
  });

  it("enables the paste action immediately on change and paste", async () => {
    const user = userEvent.setup();
    render(<Launcher />);
    await openPasteMenu(user);

    const textarea = screen.getByLabelText("Resume text");
    const button = screen.getByRole("button", {
      name: "Create resume from text",
    });

    expect(button).toBeDisabled();
    expect(textarea).toHaveClass("resize-none");
    expect(textarea).not.toHaveClass("resize-y");

    fireEvent.change(textarea, { target: { value: "Grace Hopper" } });
    expect(button).toBeEnabled();

    fireEvent.change(textarea, { target: { value: "" } });
    expect(button).toBeDisabled();

    fireEvent.paste(textarea, {
      clipboardData: {
        getData: () => "Ada Lovelace\nSoftware Engineer",
      },
    });

    expect(button).toBeEnabled();
    expect(textarea).toHaveValue("Ada Lovelace\nSoftware Engineer");
  });

  it("explains that a single line is enough before pasting", async () => {
    const user = userEvent.setup();
    render(<Launcher />);
    await openPasteMenu(user);

    const textarea = screen.getByLabelText("Resume text");
    const hint = document.getElementById("resume-paste-hint");

    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent("One line is enough");
    expect(textarea).toHaveAttribute("aria-describedby", "resume-paste-hint");
  });

  it("styles the blank-resume action as a secondary call to action", () => {
    render(<Launcher />);

    const blank = screen.getByRole("button", {
      name: "Start with a blank resume",
    });

    expect(blank).toHaveAttribute("data-cta", "secondary");
    expect(blank).toHaveClass("border-[#d8d2c6]");
    expect(blank).not.toHaveClass("border-[#1b3a57]");
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
      await screen.findByRole("heading", { name: "Recent resumes" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Open Grace Hopper" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Edited Nov 18, 2026")).toBeInTheDocument();
  });

  it("renders saved resumes as a standalone section outside the start cards", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    render(<Launcher />);

    const heading = await screen.findByRole("heading", {
      name: "Recent resumes",
    });
    const section = heading.closest("section");

    expect(section).not.toBeNull();
    expect(section).toHaveAttribute(
      "aria-labelledby",
      "launcher-recent-heading",
    );
    expect(
      screen.getByRole("region", { name: "Recent resumes" }),
    ).toBe(section);
    expect(
      within(
        screen.getByRole("region", { name: "Start from scratch" }),
      ).queryByRole("heading", { name: "Recent resumes" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(3);
  });

  it("hides the Recent resumes section until a resume has been saved", () => {
    render(<Launcher />);

    expect(
      screen.queryByRole("heading", { name: "Recent resumes" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Nothing saved yet/),
    ).not.toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(2);
  });

  it("shows editable tracking tags on a recent resume", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    render(<Launcher />);

    expect(
      await screen.findByLabelText("Application status for Grace Hopper"),
    ).toHaveValue("master");
    expect(
      screen.getByLabelText("Target company for Grace Hopper"),
    ).toHaveValue("");
    expect(
      screen.queryByRole("group", {
        name: "Filter recent resumes by status",
      }),
    ).not.toBeInTheDocument();
  });

  it("saves a status change without opening the resume", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    render(<Launcher />);

    const status = await screen.findByLabelText(
      "Application status for Grace Hopper",
    );
    fireEvent.change(status, { target: { value: "applied" } });

    await waitFor(async () => {
      expect((await resumeDb.resumes.get("recent-1"))?.status).toBe("applied");
    });
    expect(
      await screen.findByLabelText("Application status for Grace Hopper"),
    ).toHaveValue("applied");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("saves a target company tag on blur without opening the resume", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    render(<Launcher />);

    const company = await screen.findByLabelText(
      "Target company for Grace Hopper",
    );
    fireEvent.change(company, { target: { value: "  Acme   Corp " } });
    fireEvent.blur(company);

    await waitFor(async () => {
      expect((await resumeDb.resumes.get("recent-1"))?.targetCompany).toBe(
        "Acme Corp",
      );
    });
    expect(
      await screen.findByLabelText("Target company for Grace Hopper"),
    ).toHaveValue("Acme Corp");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("filters recent resumes by status when more than one is saved", async () => {
    await seedRecent(
      "recent-1",
      "Applied Person",
      Date.UTC(2026, 10, 18, 12, 2),
      { status: "applied" },
    );
    await seedRecent(
      "recent-2",
      "Offer Person",
      Date.UTC(2026, 10, 18, 12, 1),
      { status: "offer", targetCompany: "North Star" },
    );
    const user = userEvent.setup();
    render(<Launcher />);

    const filters = await screen.findByRole("group", {
      name: "Filter recent resumes by status",
    });
    expect(
      within(filters).getByRole("button", { name: "All (2)" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(filters).queryByRole("button", { name: "Draft (0)" }),
    ).not.toBeInTheDocument();

    await user.click(
      within(filters).getByRole("button", { name: "Applied (1)" }),
    );

    expect(
      screen.getByRole("button", { name: "Open Applied Person" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open Offer Person" }),
    ).not.toBeInTheDocument();
    expect(
      within(filters).getByRole("button", { name: "Applied (1)" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("shows a saved target company tag", async () => {
    await seedRecent(
      "recent-1",
      "Grace Hopper",
      Date.UTC(2026, 10, 18),
      { status: "interview", targetCompany: "North Star" },
    );
    render(<Launcher />);

    expect(
      await screen.findByLabelText("Target company for Grace Hopper"),
    ).toHaveValue("North Star");
    expect(
      screen.getByLabelText("Application status for Grace Hopper"),
    ).toHaveValue("interview");
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

  it("opens a recent resume when the whole row is clicked", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    render(<Launcher />);

    const open = await screen.findByRole("button", {
      name: "Open Grace Hopper",
    });
    const row = open.closest("li");

    expect(row).not.toBeNull();
    fireEvent.click(row as HTMLLIElement);

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/editor?id=recent-1");
    });
    expect(useResumeStore.getState().doc.basics.name).toBe("Grace Hopper");
  });

  it("does not open the resume when a row action is clicked", async () => {
    await seedRecent("recent-1", "Grace Hopper");
    const user = userEvent.setup();
    render(<Launcher />);

    await user.click(
      await screen.findByRole("button", { name: "Rename Grace Hopper" }),
    );

    expect(screen.getByLabelText("Resume name")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("paginates recent resumes five at a time", async () => {
    for (let index = 0; index < 7; index += 1) {
      await seedRecent(
        `recent-${index}`,
        `Person ${index}`,
        Date.UTC(2026, 10, 18, 12, index),
      );
    }

    const user = userEvent.setup();
    render(<Launcher />);

    await screen.findByRole("button", { name: "Open Person 6" });
    expect(
      screen.getAllByRole("button", { name: /^Open / }),
    ).toHaveLength(5);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(
      screen.getAllByRole("button", { name: /^Open / }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Open Person 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Person 0" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Prev" }));

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /^Open / }),
    ).toHaveLength(5);
  });

  it("resets to the first page when the status filter changes", async () => {
    for (let index = 0; index < 7; index += 1) {
      await seedRecent(
        `applied-${index}`,
        `Applied ${index}`,
        Date.UTC(2026, 10, 18, 12, index),
        { status: "applied" },
      );
    }
    await seedRecent(
      "offer-1",
      "Offer Person",
      Date.UTC(2026, 10, 18, 13),
      { status: "offer" },
    );

    const user = userEvent.setup();
    render(<Launcher />);

    await screen.findByText("Page 1 of 2");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Applied (7)" }));

    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open Applied 6" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open Offer Person" }),
    ).not.toBeInTheDocument();
  });

  it("wraps the Backup & Restore disclosure in a solid border", () => {
    render(<Launcher />);

    const shell = backupToggle().parentElement;

    expect(shell).not.toBeNull();
    expect(shell).not.toHaveClass("border-dashed");
    expect(shell).toHaveClass("border-[#e3ddd2]");
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

  it("duplicates a recent resume without opening it", async () => {
    const savedAt = Date.UTC(2026, 10, 18);
    await seedRecent("recent-1", "Grace Hopper", savedAt);
    const user = userEvent.setup();
    render(<Launcher />);

    await user.click(
      await screen.findByRole("button", { name: "Duplicate Grace Hopper" }),
    );

    expect(
      await screen.findByRole("button", { name: "Open Grace Hopper (Copy)" }),
    ).toBeInTheDocument();

    const rows = await resumeDb.resumes.toArray();
    const copy = rows.find((row) => row.id !== "recent-1");

    expect(rows).toHaveLength(2);
    expect(copy?.doc.basics.name).toBe("Grace Hopper (Copy)");
    expect(copy?.updatedAt).toBeGreaterThan(savedAt);
    expect((await resumeDb.resumes.get("recent-1"))?.doc.basics.name).toBe(
      "Grace Hopper",
    );
    expect(pushMock).not.toHaveBeenCalled();
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

  it("imports an open JSON Resume file through the same restore picker", async () => {
    const user = userEvent.setup();
    render(<Launcher />);

    await openBackupMenu(user);
    await user.upload(
      screen.getByLabelText("Resume backup file"),
      jsonFile(
        JSON.stringify({
          $schema:
            "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
          basics: {
            name: "Grace Hopper",
            label: "Computer Scientist",
          },
          work: [
            {
              name: "US Navy",
              position: "Rear Admiral",
              startDate: "1944-01-01",
              endDate: "1986-01-01",
              highlights: ["Built the first compiler"],
            },
          ],
          skills: [{ name: "Languages", keywords: ["COBOL"] }],
        }),
      ),
    );

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/editor\?id=/),
      );
    });

    const state = useResumeStore.getState();
    expect(state.doc.basics.name).toBe("Grace Hopper");
    expect(state.doc.basics.headline).toBe("Computer Scientist");
    expect(state.doc.sections.experience.items[0]).toMatchObject({
      company: "US Navy",
      position: "Rear Admiral",
      startDate: "1944-01",
      endDate: "1986-01",
    });
    expect(state.doc.sections.experience.items[0].summary).toContain(
      "Built the first compiler",
    );
    expect(state.doc.sections.skills.items[0].keywords).toEqual(["COBOL"]);
  });

  it("reads a PDF locally, parses it, and navigates to the editor", async () => {
    const user = userEvent.setup();
    const doc = createEmptyResume();
    doc.basics.name = "Ada Lovelace";
    vi.mocked(parsePdfResume).mockResolvedValue({
      text: "Ada Lovelace",
      lines: [],
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
    vi.mocked(parsePdfResume).mockResolvedValue({
      text: "  ",
      lines: [],
      doc: null,
    });
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

  it("disables the paste action until text is entered", async () => {
    const user = userEvent.setup();
    render(<Launcher />);
    await openPasteMenu(user);

    expect(pasteToggle()).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: "Create resume from text" }),
    ).toBeDisabled();
    await user.click(pasteToggle());
    expect(screen.queryByLabelText("Resume text")).not.toBeInTheDocument();
  });

  it("parses pasted resume text and navigates to the editor", async () => {
    const user = userEvent.setup();
    render(<Launcher />);
    await openPasteMenu(user);

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
    await openPasteMenu(user);

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

  it("imports a fenced AI reply into the editor without a JSON file", async () => {
    const user = userEvent.setup();
    render(<Launcher />);
    await openAiMenu(user);

    fireEvent.change(screen.getByLabelText("Assistant's JSON reply"), {
      target: {
        value: [
          "Here you go!",
          "```json",
          '{"$schema":"https://jsonresume.org/schema/",',
          '"basics":{"name":"Ada Lovelace","label":"Mathematician",},',
          '"work":[{"name":"Analytical Engine","position":"Programmer",}],}',
          "```",
        ].join("\n"),
      },
    });
    await user.click(screen.getByRole("button", { name: "Import resume" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        expect.stringMatching(/^\/editor\?id=/),
      );
    });

    const state = useResumeStore.getState();
    expect(state.doc.basics.name).toBe("Ada Lovelace");
    expect(state.doc.sections.experience.items[0].company).toBe(
      "Analytical Engine",
    );
    expect(state.resumeId).not.toBeNull();
  });

  it("shows a friendly error when the AI reply is incomplete", async () => {
    const user = userEvent.setup();
    render(<Launcher />);
    await openAiMenu(user);

    fireEvent.change(screen.getByLabelText("Assistant's JSON reply"), {
      target: { value: "Sure! {\"basics\":{\"name\":\"Ada\"" },
    });
    await user.click(screen.getByRole("button", { name: "Import resume" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "didn't contain a complete JSON resume",
    );
    expect(pushMock).not.toHaveBeenCalled();
    expect(useResumeStore.getState().resumeId).toBeNull();
  });

  it("links a scanned PDF straight to the AI prompt import", async () => {
    const user = userEvent.setup();
    vi.mocked(parsePdfResume).mockResolvedValue({
      text: "  ",
      lines: [],
      doc: null,
    });
    render(<Launcher />);

    await user.upload(screen.getByLabelText("Resume PDF"), pdfFile());

    const link = await screen.findByRole("button", {
      name: "Import via AI prompt instead",
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "That PDF has no selectable text.",
    );
    await user.click(link);

    expect(aiToggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Assistant's JSON reply")).toBeInTheDocument();
  });
});
