import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RichTextField } from "./RichTextField";

type Chain = {
  focus: () => Chain;
  toggleBold: () => Chain;
  toggleItalic: () => Chain;
  toggleBulletList: () => Chain;
  toggleOrderedList: () => Chain;
  extendMarkRange: () => Chain;
  setLink: () => Chain;
  unsetLink: () => Chain;
  unsetAllMarks: () => Chain;
  clearNodes: () => Chain;
  undo: () => Chain;
  redo: () => Chain;
  insertContent: (content: string) => Chain;
  run: () => boolean;
};

const tiptapMock = vi.hoisted(() => {
  const chain = {} as Chain;
  const insertedContent: string[] = [];
  const cursor = { before: "" };

  Object.assign(chain, {
    focus: () => chain,
    toggleBold: () => chain,
    toggleItalic: () => chain,
    toggleBulletList: () => chain,
    toggleOrderedList: () => chain,
    extendMarkRange: () => chain,
    setLink: () => chain,
    unsetLink: () => chain,
    unsetAllMarks: () => chain,
    clearNodes: () => chain,
    undo: () => chain,
    redo: () => chain,
    insertContent: (content: string) => {
      insertedContent.push(content);
      return chain;
    },
    run: () => true,
  });

  const editor = {
    isActive: vi.fn(() => false),
    getHTML: vi.fn(() => "<p><b>Bold</b></p>"),
    getAttributes: vi.fn(() => ({})),
    chain: vi.fn(() => chain),
    can: vi.fn(() => ({ undo: () => true, redo: () => true })),
    state: {
      selection: {
        $from: {
          parentOffset: 1,
          parent: {
            textBetween: () => cursor.before,
          },
        },
      },
    },
    commands: {
      setContent: vi.fn(),
    },
  };

  return {
    editor,
    cursor,
    insertedContent,
    options: {
      current: null as null | {
        onUpdate?: (props: { editor: typeof editor }) => void;
      },
    },
  };
});

vi.mock("@tiptap/react", () => ({
  useEditor: (options: {
    onUpdate?: (props: { editor: typeof tiptapMock.editor }) => void;
  }) => {
    tiptapMock.options.current = options;

    return tiptapMock.editor;
  },
  EditorContent: () => <div data-testid="tiptap-editor" />,
}));

describe("RichTextField", () => {
  beforeEach(() => {
    tiptapMock.insertedContent.length = 0;
    tiptapMock.cursor.before = "";
    tiptapMock.editor.chain.mockClear();
  });

  it("renders the formatting toolbar", () => {
    render(
      <RichTextField
        value="<p>Hello</p>"
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    const toolbar = screen.getByRole("toolbar", {
      name: "Formatting for Description",
    });

    expect(toolbar).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bold" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Italic" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Bullet list" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Ordered list" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Link" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear formatting" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Redo" })).toBeInTheDocument();
    expect(screen.getByTestId("tiptap-editor")).toBeInTheDocument();
  });

  it("emits sanitized HTML from editor updates", () => {
    const onChange = vi.fn();

    render(
      <RichTextField
        value=""
        onChange={onChange}
        ariaLabel="Description"
      />,
    );

    act(() => {
      tiptapMock.options.current?.onUpdate?.({
        editor: tiptapMock.editor,
      });
    });

    expect(onChange).toHaveBeenCalledWith("<p><strong>Bold</strong></p>");
  });

  it("re-syncs the editor when the external value changes", () => {
    const { rerender } = render(
      <RichTextField
        value="<p>One</p>"
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    tiptapMock.editor.commands.setContent.mockClear();

    rerender(
      <RichTextField
        value="<p>Two</p>"
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    expect(tiptapMock.editor.commands.setContent).toHaveBeenCalledWith(
      "<p>Two</p>",
      { emitUpdate: false },
    );
  });

  it("renders a white editable surface with a subtle toolbar strip", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    const toolbar = screen.getByRole("toolbar", {
      name: "Formatting for Description",
    });
    const shell = toolbar.parentElement;

    expect(toolbar).toHaveClass("bg-surface-muted", "border-line");
    expect(shell).toHaveClass("bg-surface", "border-line", "text-text");
  });

  it("lays out every formatting control on one row in the narrow sidebar", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    const toolbar = screen.getByRole("toolbar", {
      name: "Formatting for Description",
    });
    const bold = screen.getByRole("button", { name: "Bold" });
    const redo = screen.getByRole("button", { name: "Redo" });

    // Eight compact 28px targets plus 2px gaps fit the ~270px usable width of
    // the 22rem Content column. Coarse pointers keep 44px targets and wrap;
    // wrapping is a safety net, never a hidden horizontal scroll strip.
    expect(toolbar).toHaveClass("flex-wrap", "gap-0.5", "p-0.5");
    expect(toolbar).not.toHaveClass("flex-nowrap");
    expect(toolbar).not.toHaveClass("overflow-x-auto");
    expect(toolbar).toContainElement(bold);
    expect(toolbar).toContainElement(redo);
    for (const button of toolbar.querySelectorAll("button")) {
      expect(button).toHaveClass("min-h-9", "min-w-7", "shrink-0");
      expect(button).toHaveClass(
        "pointer-coarse:min-h-11",
        "pointer-coarse:min-w-11",
      );
      expect(button).not.toHaveClass("min-h-11", "min-w-9");
    }
  });

  it("renders tappable impact formulas in the helper strip", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    const group = screen.getByRole("group", {
      name: "Impact bullet formulas",
    });

    expect(group).toHaveClass("flex", "flex-col", "gap-1");
    expect(
      screen.queryByText("[Action] + [What] + [Result by X%]"),
    ).not.toBeInTheDocument();

    const formulas = [
      "Reduced [metric] by [X%] by [action]",
      "Built [feature/system] for [N] users, improving [outcome]",
      "Led [team/project] to deliver [result]",
      "Automated [workflow], saving [N] hrs/wk",
    ];

    for (const formula of formulas) {
      const chip = screen.getByRole("button", {
        name: `Insert impact formula ${formula}`,
      });

      expect(chip).toHaveTextContent(formula);
      expect(chip).toHaveClass(
        "block",
        "w-full",
        "min-h-9",
        "text-left",
        "text-xs",
        "whitespace-normal",
        "pointer-coarse:min-h-11",
      );
      expect(chip).not.toHaveClass("inline-flex", "items-start", "gap-1");
      expect(chip).not.toHaveClass("min-h-11");
    }

    // The single-word verb pills were duplicates of these formula verbs and
    // used to stack a second row below the scaffolds.
    expect(
      screen.queryByRole("group", { name: "Action verb helpers" }),
    ).not.toBeInTheDocument();
  });

  it("does not show action helpers unless requested", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Summary"
      />,
    );

    expect(
      screen.queryByRole("group", { name: "Impact bullet formulas" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Writing helpers" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("[Action] + [What] + [Result by X%]"),
    ).not.toBeInTheDocument();
  });

  it("shows only the four impact formula chips when enabled", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    const formulas = screen.getByRole("group", {
      name: "Impact bullet formulas",
    });

    expect(formulas.querySelectorAll("button")).toHaveLength(4);
    expect(
      screen.queryByRole("group", { name: "Action verb helpers" }),
    ).not.toBeInTheDocument();
    for (const verb of ["Built", "Reduced", "Led", "Automated"]) {
      expect(
        screen.queryByRole("button", { name: `Insert action verb ${verb}` }),
      ).not.toBeInTheDocument();
    }
  });

  it("renders each formula as one full-width, left-aligned chip", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    const group = screen.getByRole("group", {
      name: "Impact bullet formulas",
    });
    const built = screen.getByRole("button", {
      name: "Insert impact formula Built [feature/system] for [N] users, improving [outcome]",
    });

    expect(group).toHaveClass("flex", "flex-col", "gap-1");
    expect(group).not.toHaveClass("flex-row", "items-stretch");
    // A block button wraps every line at the chip's own left edge instead of
    // indenting continuation lines behind the bold verb.
    expect(built).toHaveClass("block", "w-full", "text-left");
    expect(built).not.toHaveClass("inline-flex");
  });

  it("tucks the writing helpers away so the bullets stay visible", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    const toggle = screen.getByRole("button", { name: "Writing helpers" });
    const formulaGroup = screen.getByRole("group", {
      name: "Impact bullet formulas",
    });

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute(
      "aria-controls",
      formulaGroup.parentElement?.id,
    );

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("group", { name: "Impact bullet formulas" }),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("group", { name: "Impact bullet formulas" }),
    ).toBeInTheDocument();
  });

  it("inserts the chosen impact formula followed by a space", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert impact formula Automated [workflow], saving [N] hrs/wk",
      }),
    );

    expect(tiptapMock.editor.chain).toHaveBeenCalledTimes(1);
    expect(tiptapMock.insertedContent).toEqual([
      "Automated [workflow], saving [N] hrs/wk ",
    ]);
  });

  it("leads with a space when an impact formula follows non-whitespace text", () => {
    tiptapMock.cursor.before = ".";

    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert impact formula Led [team/project] to deliver [result]",
      }),
    );

    expect(tiptapMock.insertedContent).toEqual([
      " Led [team/project] to deliver [result] ",
    ]);
  });
});
