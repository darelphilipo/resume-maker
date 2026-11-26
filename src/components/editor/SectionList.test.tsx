import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
import {
  CustomSectionSchema,
  ExperienceItemSchema,
} from "@/lib/schema/resume.schema";
import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import { SectionList } from "./SectionList";

const LONG_TITLE = "Professional Summary and Career Objectives";

function setup() {
  const doc = createEmptyResume();

  doc.summary.title = LONG_TITLE;
  doc.metadata.layout.pages = [
    {
      fullWidth: false,
      main: ["summary", "experience", "education"],
      sidebar: [],
    },
  ];

  resetResumeStore();
  useResumeStore.setState({ doc });

  return doc;
}

function sectionToggle(id: string): HTMLElement {
  const button = document.querySelector<HTMLElement>(
    `[data-section-toggle="${id}"]`,
  );

  if (!button) {
    throw new Error(`Missing section toggle for ${id}`);
  }

  return button;
}

function sectionAction(
  id: string,
  action: "hide" | "grip",
): HTMLElement {
  const row = sectionToggle(id).closest("li");
  const button = row?.querySelector<HTMLElement>(`[data-section-action="${action}"]`);

  if (!button) {
    throw new Error(`Missing ${action} action for ${id}`);
  }

  return button;
}

async function expandRow(user: UserEvent, id: string): Promise<void> {
  await user.click(sectionToggle(id));
}

describe("SectionList", () => {
  beforeEach(() => {
    setup();
  });

  it("keeps long titles on one line without overlapping the count pill", () => {
    render(<SectionList />);

    const title = screen.getByText(LONG_TITLE);
    const toggle = sectionToggle("summary");
    const row = toggle.closest("li");
    const count = row?.querySelector("span.shrink-0.whitespace-nowrap");

    expect(title).toHaveClass("min-w-0", "flex-1", "truncate");
    expect(title).toHaveAttribute("title", LONG_TITLE);
    expect(count).toHaveClass("shrink-0", "whitespace-nowrap");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("points the section caret up when expanded", () => {
    render(<SectionList />);

    const toggle = sectionToggle("summary");

    expect(toggle.querySelector('[data-chevron="down"]')).not.toBeNull();
    expect(toggle.querySelector('[data-chevron="up"]')).toBeNull();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle.querySelector('[data-chevron="up"]')).not.toBeNull();
  });

  it("keeps the expanded body and its cards from widening the section", () => {
    render(<SectionList />);

    fireEvent.click(sectionToggle("summary"));

    const body = document.getElementById("section-body-summary");
    const row = body?.closest("li");

    expect(body).toHaveClass("flex", "min-w-0", "flex-col");
    expect(row).toHaveClass("min-w-0", "overflow-hidden");
  });

  it("keeps a drag handle and hide icon on a uniform 44px header", () => {
    render(<SectionList />);

    const grip = sectionAction("summary", "grip");
    const hide = sectionAction("summary", "hide");
    const group = hide.parentElement;
    const header = sectionToggle("summary").parentElement;

    expect(sectionToggle("summary")).toHaveAttribute("aria-expanded", "false");
    expect(grip).toHaveAttribute("aria-label", `Reorder ${LONG_TITLE}`);
    expect(grip).toHaveAttribute("aria-keyshortcuts", "ArrowUp ArrowDown");
    expect(grip).toHaveClass(
      "touch-none",
      "cursor-grab",
      "min-h-9",
      "pointer-coarse:min-h-11",
    );
    expect(grip.querySelector("svg")).not.toBeNull();
    expect(hide).toHaveAttribute("aria-label", `Hide ${LONG_TITLE}`);
    expect(hide).toHaveAttribute("title", `Hide ${LONG_TITLE}`);
    expect(hide).toHaveAttribute("aria-pressed", "true");
    expect(group).toHaveAttribute("aria-label", `${LONG_TITLE} section actions`);
    expect(
      Array.from(group?.children ?? []).map((button) =>
        button.getAttribute("data-section-action"),
      ),
    ).toEqual(["hide"]);
    // The grip is a sibling of the title toggle, not a nested button, and the
    // row keeps the same 44px height as the Basics card header.
    expect(grip.closest("[data-section-toggle]")).toBeNull();
    expect(header).toHaveClass("min-h-11");
    expect(header).not.toHaveClass("py-1.5");
    expect(grip.closest("#section-body-summary")).toBeNull();
  });

  it("does not toggle expansion when the grip or a header icon is tapped", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await user.click(sectionAction("summary", "grip"));
    await user.click(sectionAction("summary", "hide"));

    expect(sectionToggle("summary")).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the expanded footer to a two-column grid for labelled actions", async () => {
    const user = userEvent.setup();

    render(<SectionList onOpenSection={vi.fn()} />);

    await expandRow(user, "summary");

    const open = screen.getByRole("button", { name: "Open section editor" });
    const grid = open.parentElement;

    expect(grid).toHaveClass("grid", "grid-cols-2", "min-w-0");
    expect(grid).not.toHaveClass("lg:grid-cols-3");
    expect(Array.from(grid?.children ?? [])).toEqual([open]);
  });

  it("toggles visibility from the header", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await user.click(sectionAction("summary", "hide"));

    expect(useResumeStore.getState().doc.summary.hidden).toBe(true);
    expect(sectionAction("summary", "hide")).toHaveAttribute(
      "aria-label",
      `Show ${LONG_TITLE}`,
    );
    expect(sectionAction("summary", "hide")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(sectionToggle("summary")).toHaveAttribute("aria-expanded", "false");
  });

  it("reorders a section with ArrowDown on the focused drag handle", () => {
    render(<SectionList />);

    const grip = sectionAction("summary", "grip");

    grip.focus();
    expect(grip).toHaveFocus();

    fireEvent.keyDown(grip, { key: "ArrowDown" });

    expect(
      useResumeStore.getState().doc.metadata.layout.pages[0].main.slice(0, 2),
    ).toEqual(["experience", "summary"]);
    expect(sectionToggle("summary")).toHaveAttribute("aria-expanded", "false");
  });

  it("reorders a section by dragging the handle onto another row", () => {
    render(<SectionList />);

    const rows = Array.from(
      document.querySelectorAll<HTMLElement>("li[id^='section-row-']"),
    );
    const ids = rows.map((row) => row.id.replace("section-row-", ""));

    // jsdom has no layout, so fake a 44px row every 48px.
    rows.forEach((row, index) => {
      vi.spyOn(row, "getBoundingClientRect").mockReturnValue({
        top: index * 48,
        bottom: index * 48 + 44,
      } as DOMRect);
    });

    const grip = sectionAction(ids[0], "grip");
    const targetY = 2 * 48 + 10;

    fireEvent.pointerDown(grip, { pointerId: 1, clientY: 4 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: targetY });

    expect(document.getElementById(`section-row-${ids[0]}`)).toHaveAttribute(
      "data-dragging",
      "true",
    );
    expect(document.getElementById(`section-row-${ids[2]}`)).toHaveAttribute(
      "data-drop-target",
      "true",
    );

    fireEvent.pointerUp(grip, { pointerId: 1, clientY: targetY });

    const main = useResumeStore.getState().doc.metadata.layout.pages[0].main;

    expect(main.indexOf(ids[0])).toBe(
      main.indexOf(ids[2]) + 1,
    );
    expect(main.indexOf(ids[1])).toBeLessThan(main.indexOf(ids[2]));
    expect(document.getElementById(`section-row-${ids[0]}`)).not.toHaveAttribute(
      "data-dragging",
    );
  });

  it("tucks empty optional sections behind Add optional section", () => {
    render(<SectionList />);

    expect(screen.queryByRole("button", { name: /^Awards/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Languages/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^References/ })).toBeNull();
    expect(sectionToggle("experience")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Add optional section/ }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("reveals and expands an optional section from the add menu", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await user.click(
      screen.getByRole("button", { name: /Add optional section/ }),
    );
    await user.click(screen.getByRole("button", { name: "Awards" }));

    expect(
      screen.getByRole("button", { name: /Awards0 items/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Add entry/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Awards" })).toBeNull();
  });

  it("keeps optional sections with items in the main list", () => {
    const doc = useResumeStore.getState().doc;

    useResumeStore.setState({
      doc: {
        ...doc,
        sections: {
          ...doc.sections,
          awards: {
            ...doc.sections.awards,
            items: [
              {
                id: "award-1",
                hidden: false,
                title: "Engineer of the year",
                awarder: "",
                date: "",
                summary: "",
              },
            ],
          },
        },
      },
    });

    render(<SectionList />);

    expect(
      screen.getByRole("button", { name: /Awards1 item/ }),
    ).toBeInTheDocument();
  });

  it("reorders visible rows without letting tucked sections absorb moves", () => {
    render(<SectionList />);

    fireEvent.keyDown(sectionAction("skills", "grip"), { key: "ArrowDown" });

    const main = useResumeStore.getState().doc.metadata.layout.pages[0].main;

    expect(main.indexOf("skills")).toBeGreaterThan(main.indexOf("certifications"));
    expect(main.indexOf("awards")).toBeGreaterThan(main.indexOf("skills"));
  });

  it("renames a standard section heading from the expanded body", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await expandRow(user, "experience");
    const heading = screen.getByLabelText("Section heading");

    await user.clear(heading);
    await user.type(heading, "Work History");

    await waitFor(() => {
      expect(useResumeStore.getState().doc.sections.experience.title).toBe(
        "Work History",
      );
    });

    expect(
      screen.getByRole("button", { name: /^Work History/ }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("does not offer a section heading for Profiles", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await expandRow(user, "profiles");

    expect(screen.queryByLabelText("Section heading")).toBeNull();
    expect(screen.getByRole("form", { name: "profiles" })).toBeInTheDocument();
  });

  it("unmounts the inline form while the same section is open in the drawer", async () => {
    const user = userEvent.setup();
    const onOpenSection = vi.fn();

    render(
      <SectionList onOpenSection={onOpenSection} openSectionId="summary" />,
    );

    await expandRow(user, "summary");

    // The drawer owns the editor, so the inline copy must not mount a second
    // form (and a second TipTap editor) behind the overlay.
    expect(screen.queryByRole("form", { name: "Summary" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Open section editor" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open section editor" }));
    expect(onOpenSection).toHaveBeenCalledWith({
      id: "summary",
      title: LONG_TITLE,
    });
  });

  it("keeps the inline form for a section that is not open in the drawer", async () => {
    const user = userEvent.setup();

    render(<SectionList onOpenSection={vi.fn()} openSectionId="summary" />);

    await expandRow(user, "experience");

    expect(screen.getByRole("form", { name: "Experience" })).toBeInTheDocument();
  });

  it("adds a custom section and appends it to the page layout", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await user.click(
      screen.getByRole("button", { name: "Add custom section" }),
    );

    expect(screen.getByRole("button", { name: "Add section" })).toBeDisabled();

    await user.type(screen.getByLabelText("Section name"), "Speaking");
    await user.click(screen.getByRole("button", { name: "Add section" }));

    const doc = useResumeStore.getState().doc;
    const section = doc.customSections[0];

    expect(section.title).toBe("Speaking");
    expect(doc.metadata.layout.pages[0].main).toContain(section.id);
    expect(
      screen.getByRole("button", { name: /^Speaking/ }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Section title")).toHaveValue("Speaking");
  });

  it("deletes a custom section and removes it from every layout page", async () => {
    const doc = useResumeStore.getState().doc;
    const custom = CustomSectionSchema.parse({
      id: "custom-speaking",
      title: "Speaking",
    });
    const firstPage = doc.metadata.layout.pages[0];

    useResumeStore.setState({
      doc: {
        ...doc,
        customSections: [custom],
        metadata: {
          ...doc.metadata,
          layout: {
            ...doc.metadata.layout,
            pages: [
              { ...firstPage, main: [...firstPage.main, custom.id] },
              ...doc.metadata.layout.pages.slice(1),
            ],
          },
        },
      },
    });

    const user = userEvent.setup();

    render(<SectionList />);

    await expandRow(user, "custom-speaking");
    const deleteButton = screen.getByRole("button", {
      name: "Delete Speaking section",
    });
    expect(deleteButton.parentElement).toHaveClass("grid");
    expect(deleteButton).toHaveClass("col-span-2");
    expect(deleteButton).not.toHaveClass("lg:col-span-3");

    await user.click(deleteButton);
    expect(
      screen.getByText(/Delete .*Speaking.* and all its entries\?/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Confirm delete section" }),
    );

    expect(useResumeStore.getState().doc.customSections).toHaveLength(0);
    expect(
      useResumeStore.getState().doc.metadata.layout.pages[0].main,
    ).not.toContain(custom.id);
    expect(screen.queryByRole("button", { name: /Speaking/ })).toBeNull();
  });

  it("expands a focused section and scrolls to the requested entry", () => {
    const doc = useResumeStore.getState().doc;
    const item = ExperienceItemSchema.parse({
      id: "exp-trim",
      company: "Acme",
      position: "Engineer",
    });
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

    useResumeStore.setState({
      doc: {
        ...doc,
        sections: {
          ...doc.sections,
          experience: { ...doc.sections.experience, items: [item] },
        },
      },
    });

    render(
      <SectionList
        focusSection={{ id: "experience", entryId: "exp-trim", nonce: 1 }}
      />,
    );

    expect(sectionToggle("experience")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(document.getElementById("editor-entry-exp-trim")).not.toBeNull();
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    scrollIntoView.mockRestore();
  });

  it("keeps several sections open and collapses them all in one click", () => {
    render(<SectionList />);

    const summaryToggle = () =>
      screen.getByRole("button", { name: /^Professional Summary/ });
    const experienceToggle = () =>
      screen.getByRole("button", { name: /^Experience/ });

    expect(screen.queryByRole("button", { name: "Collapse all" })).toBeNull();

    fireEvent.click(summaryToggle());
    expect(summaryToggle()).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("button", { name: "Collapse all" })).toBeNull();

    fireEvent.click(experienceToggle());
    expect(experienceToggle()).toHaveAttribute("aria-expanded", "true");
    expect(summaryToggle()).toHaveAttribute("aria-expanded", "true");

    const collapseAll = screen.getByRole("button", { name: "Collapse all" });
    expect(collapseAll).toHaveAttribute("data-collapse-all");

    fireEvent.click(collapseAll);

    expect(summaryToggle()).toHaveAttribute("aria-expanded", "false");
    expect(experienceToggle()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Collapse all" })).toBeNull();
  });

  it("counts an open Basics accordion in Collapse all and closes it too", () => {
    const onCollapseBasics = vi.fn();

    render(<SectionList basicsOpen onCollapseBasics={onCollapseBasics} />);

    // Basics alone is one open card, so the affordance stays hidden until a
    // section is expanded as well.
    expect(screen.queryByRole("button", { name: "Collapse all" })).toBeNull();

    fireEvent.click(sectionToggle("summary"));
    const collapseAll = screen.getByRole("button", { name: "Collapse all" });

    fireEvent.click(collapseAll);

    expect(onCollapseBasics).toHaveBeenCalledTimes(1);
    expect(sectionToggle("summary")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Collapse all" })).toBeNull();
  });
});
