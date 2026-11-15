import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { createEmptyResume } from "@/lib/schema/defaults";
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

async function expandRow(user: UserEvent, title: string): Promise<void> {
  await user.click(
    screen.getByRole("button", { name: new RegExp(title) }),
  );
}

describe("SectionList", () => {
  beforeEach(() => {
    setup();
  });

  it("shows long titles in full without truncating", () => {
    render(<SectionList />);

    const title = screen.getByText(LONG_TITLE);
    const row = screen.getByRole("button", { name: new RegExp(LONG_TITLE) });

    expect(title).not.toHaveClass("truncate");
    expect(title).toHaveClass("flex-1");
    expect(row).toHaveAttribute("aria-expanded", "false");
  });

  it("relocates hide and move actions into the expanded body", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    expect(
      screen.queryByRole("button", { name: `Hide ${LONG_TITLE}` }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: `Move ${LONG_TITLE} up` }),
    ).toBeNull();

    await expandRow(user, LONG_TITLE);

    const hide = screen.getByRole("button", { name: `Hide ${LONG_TITLE}` });
    const moveUp = screen.getByRole("button", {
      name: `Move ${LONG_TITLE} up`,
    });
    const moveDown = screen.getByRole("button", {
      name: `Move ${LONG_TITLE} down`,
    });

    expect(hide).toHaveAttribute("aria-pressed", "true");
    expect(moveUp).toBeDisabled();
    expect(moveDown).toBeEnabled();
  });

  it("toggles visibility from the expanded body", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await expandRow(user, LONG_TITLE);
    await user.click(screen.getByRole("button", { name: `Hide ${LONG_TITLE}` }));

    expect(useResumeStore.getState().doc.summary.hidden).toBe(true);
    expect(
      screen.getByRole("button", { name: `Show ${LONG_TITLE}` }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("moves a section down from the expanded body", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await expandRow(user, LONG_TITLE);
    await user.click(
      screen.getByRole("button", { name: `Move ${LONG_TITLE} down` }),
    );

    expect(
      useResumeStore.getState().doc.metadata.layout.pages[0].main.slice(0, 2),
    ).toEqual(["experience", "summary"]);
  });

  it("tucks empty optional sections behind Add optional section", () => {
    render(<SectionList />);

    expect(screen.queryByRole("button", { name: /^Awards/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Languages/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^References/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Experience/ }),
    ).toBeInTheDocument();
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

  it("reorders visible rows without letting tucked sections absorb moves", async () => {
    const user = userEvent.setup();

    render(<SectionList />);

    await expandRow(user, "Certifications");
    expect(
      screen.getByRole("button", { name: "Move Certifications down" }),
    ).toBeDisabled();

    await expandRow(user, "Skills");
    await user.click(screen.getByRole("button", { name: "Move Skills down" }));

    const main = useResumeStore.getState().doc.metadata.layout.pages[0].main;

    expect(main.indexOf("skills")).toBeGreaterThan(main.indexOf("certifications"));
    expect(main.indexOf("awards")).toBeGreaterThan(main.indexOf("skills"));
  });
});
