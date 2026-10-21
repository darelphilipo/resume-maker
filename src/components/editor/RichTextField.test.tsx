import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  run: () => boolean;
};

const tiptapMock = vi.hoisted(() => {
  const chain = {} as Chain;

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
});
