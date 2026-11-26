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
  setLink: (attributes: { href: string }) => Chain;
  unsetLink: () => Chain;
  splitListItem: (type: string) => Chain;
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
  const splitItems: string[] = [];
  const linkedUrls: string[] = [];
  const unlinkCalls: string[] = [];
  const cursor = {
    before: "",
    itemText: "",
    inBullet: false,
    atEnd: true,
    selectionEmpty: true,
  };
  const linkAttributes: { href?: string } = {};

  Object.assign(chain, {
    focus: () => chain,
    toggleBold: () => chain,
    toggleItalic: () => chain,
    toggleBulletList: () => chain,
    toggleOrderedList: () => chain,
    extendMarkRange: () => chain,
    setLink: (attributes: { href: string }) => {
      linkedUrls.push(attributes.href);
      return chain;
    },
    unsetLink: () => {
      unlinkCalls.push("unset");
      return chain;
    },
    splitListItem: (type: string) => {
      splitItems.push(type);
      return chain;
    },
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
    getAttributes: vi.fn(() => linkAttributes),
    chain: vi.fn(() => chain),
    can: vi.fn(() => ({ undo: () => true, redo: () => true })),
    state: {
      selection: {
        get empty() {
          return cursor.selectionEmpty;
        },
        $from: {
          get depth() {
            return cursor.inBullet ? 3 : 1;
          },
          get parentOffset() {
            return cursor.before.length;
          },
          node: (index: number) => ({
            type: {
              name: index === -1 ? "listItem" : "bulletList",
            },
          }),
          parent: {
            textBetween: () => cursor.before,
            get content() {
              return { size: cursor.itemText.length };
            },
            get textContent() {
              return cursor.itemText;
            },
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
    linkAttributes,
    insertedContent,
    splitItems,
    linkedUrls,
    unlinkCalls,
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

function openHelpers(): void {
  fireEvent.click(screen.getByRole("button", { name: "Writing helpers" }));
}

describe("RichTextField", () => {
  beforeEach(() => {
    tiptapMock.insertedContent.length = 0;
    tiptapMock.splitItems.length = 0;
    tiptapMock.linkedUrls.length = 0;
    tiptapMock.unlinkCalls.length = 0;
    tiptapMock.cursor.before = "";
    tiptapMock.cursor.itemText = "";
    tiptapMock.cursor.inBullet = false;
    tiptapMock.cursor.atEnd = true;
    tiptapMock.cursor.selectionEmpty = true;
    delete tiptapMock.linkAttributes.href;
    tiptapMock.editor.chain.mockClear();
    tiptapMock.editor.getAttributes.mockClear();
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

  it("keeps all eight controls on one row, scrolling on touch instead of wrapping", () => {
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

    expect(toolbar).toHaveClass(
      "flex-nowrap",
      "gap-0.5",
      "overflow-x-auto",
      "p-0",
    );
    expect(toolbar).not.toHaveClass("flex-wrap");
    expect(toolbar).toContainElement(bold);
    expect(toolbar).toContainElement(redo);
    for (const button of toolbar.querySelectorAll("button")) {
      // 32px on fine pointers (8 × 32 + gaps fit the 22rem column); 40px on
      // touch, where the row scrolls rather than leaving Redo on a second row.
      expect(button).toHaveClass("h-8", "w-8", "shrink-0");
      expect(button).toHaveClass("pointer-coarse:h-10", "pointer-coarse:w-10");
      expect(button).not.toHaveClass("min-h-9", "min-w-7");
    }
  });

  it("shows an optional visible label above the field", () => {
    const { rerender } = render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Highlights for entry 1"
        label="Highlights"
      />,
    );

    expect(screen.getByText("Highlights")).toHaveClass(
      "text-sm",
      "font-medium",
    );
    expect(screen.getByText("Highlights").tagName).toBe("SPAN");

    rerender(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    expect(screen.queryByText("Highlights")).not.toBeInTheDocument();
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
    openHelpers();

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
    openHelpers();

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
    openHelpers();

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

  it("starts with Writing helpers collapsed and toggles them open", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    const toggle = screen.getByRole("button", { name: "Writing helpers" });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("group", { name: "Impact bullet formulas" }),
    ).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const formulaGroup = screen.getByRole("group", {
      name: "Impact bullet formulas",
    });
    expect(toggle).toHaveAttribute("aria-controls", formulaGroup.parentElement?.id);

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("group", { name: "Impact bullet formulas" }),
    ).not.toBeInTheDocument();
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
    openHelpers();

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
    openHelpers();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert impact formula Led [team/project] to deliver [result]",
      }),
    );

    expect(tiptapMock.insertedContent).toEqual([
      " Led [team/project] to deliver [result] ",
    ]);
  });

  it("splits into a new bullet when a formula follows a finished bullet", () => {
    tiptapMock.cursor.inBullet = true;
    tiptapMock.cursor.before = "Shipped the payments API";
    tiptapMock.cursor.itemText = "Shipped the payments API";

    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );
    openHelpers();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert impact formula Led [team/project] to deliver [result]",
      }),
    );

    expect(tiptapMock.splitItems).toEqual(["listItem"]);
    expect(tiptapMock.insertedContent).toEqual([
      "Led [team/project] to deliver [result] ",
    ]);
  });

  it("inserts inline when the cursor is mid-bullet or the bullet is empty", () => {
    tiptapMock.cursor.inBullet = true;
    tiptapMock.cursor.before = ".";
    tiptapMock.cursor.itemText = "Half written bullet";

    const { unmount } = render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );
    openHelpers();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert impact formula Led [team/project] to deliver [result]",
      }),
    );

    expect(tiptapMock.splitItems).toEqual([]);
    expect(tiptapMock.insertedContent).toEqual([
      " Led [team/project] to deliver [result] ",
    ]);
    unmount();

    tiptapMock.insertedContent.length = 0;
    tiptapMock.cursor.before = "";
    tiptapMock.cursor.itemText = "";

    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );
    openHelpers();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Insert impact formula Led [team/project] to deliver [result]",
      }),
    );

    expect(tiptapMock.splitItems).toEqual([]);
    expect(tiptapMock.insertedContent).toEqual([
      "Led [team/project] to deliver [result] ",
    ]);
  });

  it("opens an inline Link bar instead of a browser prompt", () => {
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue(null);

    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    const linkButton = screen.getByRole("button", { name: "Link" });
    fireEvent.click(linkButton);

    const panel = screen.getByRole("group", { name: "Link URL" });
    const input = screen.getByRole("textbox", { name: "Link URL" });

    expect(promptSpy).not.toHaveBeenCalled();
    expect(linkButton).toHaveAttribute("aria-expanded", "true");
    expect(linkButton).toHaveAttribute("aria-controls", panel.id);
    expect(input).toHaveValue("https://");
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: "Remove link" }),
    ).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "https://example.com/cv" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(tiptapMock.linkedUrls).toEqual(["https://example.com/cv"]);
    expect(screen.queryByRole("group", { name: "Link URL" })).not.toBeInTheDocument();
    promptSpy.mockRestore();
  });

  it("offers Remove link when editing an existing link and closes on Escape", () => {
    tiptapMock.linkAttributes.href = "https://example.com/old";

    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Link" }));

    expect(screen.getByRole("textbox", { name: "Link URL" })).toHaveValue(
      "https://example.com/old",
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove link" }));

    expect(tiptapMock.unlinkCalls).toEqual(["unset"]);
    expect(screen.queryByRole("group", { name: "Link URL" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Link URL" }), { key: "Escape" });

    expect(screen.queryByRole("group", { name: "Link URL" })).not.toBeInTheDocument();
    expect(tiptapMock.unlinkCalls).toHaveLength(1);
  });

  it("applies the link on Enter and removes it when the URL is cleared", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    const input = screen.getByRole("textbox", { name: "Link URL" });
    fireEvent.change(input, { target: { value: "mailto:ada@example.com" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(tiptapMock.linkedUrls).toEqual(["mailto:ada@example.com"]);

    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Link URL" }), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Link URL" }), { key: "Enter" });

    expect(tiptapMock.unlinkCalls).toEqual(["unset"]);
    expect(screen.queryByRole("group", { name: "Link URL" })).not.toBeInTheDocument();
  });
});
