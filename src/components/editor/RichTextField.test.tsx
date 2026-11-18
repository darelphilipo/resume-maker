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
    commands: {
      setContent: vi.fn(),
    },
  };

  return {
    editor,
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

  it("lays out every formatting control without clipping", () => {
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

    // The 22rem Content column cannot fit eight targets on one line, so the
    // row wraps instead of hiding Undo/Redo behind a horizontal scroll strip.
    expect(toolbar).toHaveClass("flex-wrap", "gap-0.5");
    expect(toolbar).not.toHaveClass("flex-nowrap");
    expect(toolbar).not.toHaveClass("overflow-x-auto");
    expect(toolbar).toContainElement(bold);
    expect(toolbar).toContainElement(redo);
    expect(bold).toHaveClass(
      "min-h-9",
      "min-w-9",
      "shrink-0",
      "pointer-coarse:min-h-11",
      "pointer-coarse:min-w-11",
    );
    expect(bold).not.toHaveClass("min-h-11");
  });

  it("keeps the achievement hint readable on the helper strip", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    const hint = screen.getByText(
      "e.g. Built a checkout flow that reduced drop-off by 18%.",
    );

    expect(hint.closest("p")).toHaveClass("text-muted");
    expect(hint.closest("p")).not.toHaveClass("text-black/50");
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
      screen.queryByRole("group", { name: "Action verb helpers" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("[Action] + [What] + [Result by X%]"),
    ).not.toBeInTheDocument();
  });

  it("shows action verb chips and the achievement prompt when enabled", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    const group = screen.getByRole("group", { name: "Action verb helpers" });
    const prompt = screen.getByText("[Action] + [What] + [Result by X%]");

    expect(prompt).toBeInTheDocument();
    expect(group).toHaveAttribute("aria-describedby", prompt.closest("p")?.id);

    for (const verb of ["Built", "Reduced", "Led", "Automated"]) {
      expect(
        screen.getByRole("button", { name: `Insert action verb ${verb}` }),
      ).toBeInTheDocument();
    }
  });

  it("renders the action verbs as a compact, organized group", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    const group = screen.getByRole("group", { name: "Action verb helpers" });
    const built = screen.getByRole("button", {
      name: "Insert action verb Built",
    });

    expect(group).toHaveClass("flex", "flex-wrap", "items-center", "gap-1");
    expect(built).toHaveClass("min-h-9", "px-2.5", "py-1");
    expect(built).not.toHaveClass("min-h-11");
  });

  it("inserts the chosen action verb followed by a space", () => {
    render(
      <RichTextField
        value=""
        onChange={vi.fn()}
        ariaLabel="Description for entry 1"
        actionHelpers
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Insert action verb Reduced" }),
    );

    expect(tiptapMock.editor.chain).toHaveBeenCalledTimes(1);
    expect(tiptapMock.insertedContent).toEqual(["Reduced "]);
  });
});
