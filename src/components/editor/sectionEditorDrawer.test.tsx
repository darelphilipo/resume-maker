import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import { putResume } from "@/lib/store/db";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { EditorWorkspace } from "./EditorWorkspace";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ id: "resume-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/components/preview/LiveCanvasViewport", () => ({
  LiveCanvasViewport: () => <div data-testid="preview-canvas" />,
}));

const RESUME_ID = "resume-1";

function makeDoc() {
  const doc = createEmptyResume();

  doc.summary.content = "<p>A concise professional summary.</p>";
  doc.sections.profiles.items = [
    {
      id: "profile-1",
      network: "GitHub",
      username: "ada",
      icon: "github",
      url: "https://github.com/ada",
      hidden: false,
    },
  ];
  doc.sections.experience.items = [
    {
      id: "exp-1",
      hidden: false,
      company: "Acme",
      position: "Engineer",
      location: "Remote",
      startDate: "2020-01",
      endDate: "2023-12",
      current: false,
      summary: "<p>Built a checkout flow.</p>",
    },
    {
      id: "exp-2",
      hidden: false,
      company: "Globex",
      position: "Lead",
      location: "Remote",
      startDate: "2024-01",
      endDate: "",
      current: true,
      summary: "<p>Led a team.</p>",
    },
  ];

  return doc;
}

let doc = makeDoc();

beforeEach(async () => {
  resetResumeStore();
  doc = makeDoc();
  useResumeStore.setState({ doc });
  await putResume({ id: RESUME_ID, updatedAt: Date.now(), doc });
});

async function openSectionEditor(rowName: RegExp) {
  const user = userEvent.setup();

  render(<EditorWorkspace />);
  await screen.findByRole("heading", { name: "Untitled resume" });
  await user.click(screen.getByRole("button", { name: rowName }));
  await user.click(
    screen.getByRole("button", { name: "Open section editor" }),
  );

  const dialog = await screen.findByRole("dialog");

  return { user, dialog };
}

describe("section editor drawer", () => {
  it("opens the summary editor with a single inline-free form", async () => {
    const { dialog } = await openSectionEditor(/^Summary/);

    expect(
      within(dialog).getByRole("form", { name: "Summary" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("form", { name: "Summary" })).toHaveLength(1);
    expect(document.querySelectorAll(".tiptap")).toHaveLength(1);
  });

  it("opens the profiles editor without mounting a duplicate form", async () => {
    const { dialog } = await openSectionEditor(/^Profiles/);

    expect(
      within(dialog).getByRole("form", { name: "profiles" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("form", { name: "profiles" })).toHaveLength(1);
  });

  it("opens the experience editor with one editor per entry, not two", async () => {
    const { dialog } = await openSectionEditor(/^Experience/);

    expect(
      within(dialog).getByRole("form", { name: "Experience" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("form", { name: "Experience" })).toHaveLength(1);
    expect(document.querySelectorAll(".tiptap")).toHaveLength(2);
  });

  it("opens the profiles editor from the Basics shortcut", async () => {
    const user = userEvent.setup();

    render(<EditorWorkspace />);
    await screen.findByRole("heading", { name: "Untitled resume" });
    await user.click(screen.getByRole("button", { name: "Manage profiles" }));

    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByRole("form", { name: "profiles" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("form", { name: "profiles" })).toHaveLength(1);
  });

  it("restores the inline form when the drawer closes", async () => {
    const { dialog } = await openSectionEditor(/^Summary/);

    expect(screen.getAllByRole("form", { name: "Summary" })).toHaveLength(1);

    await userEvent.setup().keyboard("{Escape}");

    await vi.waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
    expect(screen.getByRole("form", { name: "Summary" })).toBeInTheDocument();
  });
});
