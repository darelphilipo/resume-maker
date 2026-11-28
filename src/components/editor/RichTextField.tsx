"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretDown,
  Eraser,
  LinkSimple,
  ListBullets,
  ListNumbers,
  TextB,
  TextItalic,
} from "@phosphor-icons/react";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  BULLET_FORMULAS,
  bulletFormulaInsertion,
  shouldStartNewBullet,
  type BulletFormula,
} from "@/lib/richtext/bulletFormulas";
import { sanitizeRichText } from "@/lib/richtext/sanitize";

export type RichTextFieldProps = {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  /** Visible field label, matching the other form fields in a section. */
  label?: string;
  placeholder?: string;
  /** Show action-verb chips and the achievement-bullet prompt (for bullet lists). */
  actionHelpers?: boolean;
};

type ToolbarButtonProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  controls?: string;
  children: ReactNode;
};

function ToolbarButton({
  label,
  onClick,
  active,
  disabled,
  expanded,
  controls,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active ?? false}
      aria-expanded={expanded}
      aria-controls={controls}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-30 disabled:hover:bg-transparent aria-pressed:bg-black/10 pointer-coarse:h-10 pointer-coarse:w-10"
    >
      {children}
    </button>
  );
}

export function RichTextField({
  value,
  onChange,
  ariaLabel,
  label,
  placeholder,
  actionHelpers = false,
}: RichTextFieldProps) {
  const onChangeRef = useRef(onChange);
  const helperPanelId = useId();
  const linkPanelId = useId();
  const linkInputId = useId();
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const [helpersOpen, setHelpersOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkHasHref, setLinkHasHref] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (linkOpen) {
      linkInputRef.current?.focus({ preventScroll: true });
    }
  }, [linkOpen]);

  // `useEditor` compares its options by identity on every render and calls
  // `setOptions` (which rebinds the ProseMirror view) when anything changed.
  // Extensions and editorProps are object arrays, so building them inline made
  // every transaction — with `shouldRerenderOnTransaction` that is every
  // keystroke and every toolbar click — reconfigure every editor on the page.
  // Keep their identities stable so only a real placeholder/aria change does.
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        dropcursor: false,
        gapcursor: false,
        code: false,
        strike: false,
        underline: false,
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? "",
      }),
    ],
    [placeholder],
  );

  const editorProps = useMemo(
    () => ({
      attributes: {
        class:
          "tiptap min-h-24 w-full min-w-0 break-words bg-surface px-3 py-2 text-sm leading-relaxed text-text outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        role: "textbox",
      },
    }),
    [ariaLabel],
  );

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions,
    content: sanitizeRichText(value),
    editorProps,
    onUpdate: ({ editor: currentEditor }) => {
      onChangeRef.current(sanitizeRichText(currentEditor.getHTML()));
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const next = sanitizeRichText(value);
    const current = sanitizeRichText(editor.getHTML());

    if (next === current) {
      return;
    }

    editor.commands.setContent(next, { emitUpdate: false });
  }, [editor, value]);

  function insertAtCursor(build: (textBeforeCursor: string) => string): void {
    if (!editor) {
      return;
    }

    const { $from } = editor.state.selection;
    const textBeforeCursor =
      $from.parentOffset > 0
        ? $from.parent.textBetween(
            $from.parentOffset - 1,
            $from.parentOffset,
            undefined,
            "\uFFFC",
          )
        : "";

    editor.chain().focus().insertContent(build(textBeforeCursor)).run();
  }

  function insertBulletFormula(formula: BulletFormula): void {
    if (!editor) {
      return;
    }

    const { selection } = editor.state;
    const { $from } = selection;
    // Depth 3 is paragraph → listItem → bulletList → doc. Splitting the list
    // item is the same command Enter uses, so the formula lands in a real new
    // bullet instead of being glued to the end of the previous sentence.
    const inBulletList =
      $from.depth >= 3 &&
      $from.node(-1).type.name === "listItem" &&
      $from.node(-2).type.name === "bulletList";
    const atEndOfItem =
      selection.empty && $from.parentOffset === $from.parent.content.size;

    if (
      shouldStartNewBullet({
        inBulletList,
        atEndOfItem,
        itemText: $from.parent.textContent,
      })
    ) {
      editor
        .chain()
        .focus()
        .splitListItem("listItem")
        .insertContent(`${formula.template} `)
        .run();
      return;
    }

    insertAtCursor((beforeCursor) =>
      bulletFormulaInsertion(formula, beforeCursor),
    );
  }

  function toggleLink(): void {
    if (!editor) {
      return;
    }

    if (linkOpen) {
      setLinkOpen(false);
      return;
    }

    const attributes: Record<string, unknown> = editor.getAttributes("link");
    const previous =
      typeof attributes.href === "string" ? attributes.href : "";
    setLinkUrl(previous || "https://");
    setLinkHasHref(previous !== "");
    setLinkOpen(true);
  }

  function applyLink(): void {
    if (!editor) {
      return;
    }

    const href = linkUrl.trim();

    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }

    setLinkOpen(false);
  }

  function removeLink(): void {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      {label ? <span className="text-sm font-medium">{label}</span> : null}
      <div
        data-rich-text-field=""
        tabIndex={-1}
        className="overflow-hidden rounded-lg border border-line bg-surface text-text transition-shadow focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 data-[trim-focus=true]:ring-2 data-[trim-focus=true]:ring-primary data-[trim-focus=true]:ring-offset-2"
      >
        {/*
          * The 22rem Content column has ~270px of usable width. Eight 32px
          * targets with 2px gaps fit exactly on fine pointers; coarse pointers
          * keep 40px targets in one scrollable row, so Redo never wraps alone.
          */}
        <div
          role="toolbar"
          aria-label={`Formatting for ${ariaLabel}`}
          className="flex flex-nowrap items-center gap-0.5 overflow-x-auto border-b border-line bg-surface-muted p-0"
        >
          <ToolbarButton
            label="Bold"
            active={editor?.isActive("bold") ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <TextB size={18} aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor?.isActive("italic") ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <TextItalic size={18} aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Bullet list"
            active={editor?.isActive("bulletList") ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <ListBullets size={18} aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Ordered list"
            active={editor?.isActive("orderedList") ?? false}
            disabled={!editor}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListNumbers size={18} aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Link"
            active={editor?.isActive("link") ?? false}
            disabled={!editor}
            expanded={linkOpen}
            controls={linkOpen ? linkPanelId : undefined}
            onClick={toggleLink}
          >
            <LinkSimple size={18} aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Clear formatting"
            disabled={!editor}
            onClick={() =>
              editor?.chain().focus().unsetAllMarks().clearNodes().run()
            }
          >
            <Eraser size={18} aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Undo"
            disabled={!editor || !editor.can().undo()}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <ArrowCounterClockwise size={18} aria-hidden />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={!editor || !editor.can().redo()}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <ArrowClockwise size={18} aria-hidden />
          </ToolbarButton>
        </div>
        {linkOpen ? (
          <div
            id={linkPanelId}
            role="group"
            aria-label="Link URL"
            className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface-muted px-2 py-1.5"
          >
            <label htmlFor={linkInputId} className="sr-only">
              Link URL
            </label>
            <input
              ref={linkInputRef}
              id={linkInputId}
              type="url"
              inputMode="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLink();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setLinkOpen(false);
                }
              }}
              placeholder="https://example.com"
              className="min-h-9 min-w-0 flex-1 rounded-md border border-line bg-surface px-2 text-sm text-text caret-primary placeholder:text-muted placeholder:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-11"
            />
            <button
              type="button"
              disabled={linkUrl.trim() === ""}
              onClick={applyLink}
              className="min-h-9 shrink-0 rounded-md border border-line bg-surface px-2 text-xs font-medium hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30 pointer-coarse:min-h-11"
            >
              Apply
            </button>
            {linkHasHref ? (
              <button
                type="button"
                onClick={removeLink}
                className="min-h-9 shrink-0 rounded-md px-2 text-xs font-medium text-muted hover:bg-black/5 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary pointer-coarse:min-h-11"
              >
                Remove link
              </button>
            ) : null}
          </div>
        ) : null}
        {actionHelpers ? (
          <div className="flex flex-col border-b border-line bg-primary/[0.03]">
            {/* Keep the bullets in view: the strip starts tucked away. */}
            <button
              type="button"
              aria-expanded={helpersOpen}
              aria-controls={helperPanelId}
              onClick={() => setHelpersOpen((open) => !open)}
              className="flex min-h-9 items-center justify-between gap-2 px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            >
              <span>Writing helpers</span>
              <CaretDown
                size={14}
                aria-hidden
                data-helper-chevron
                className={`shrink-0 transition-transform ${helpersOpen ? "rotate-180" : ""}`}
              />
            </button>
            {helpersOpen ? (
              <div
                id={helperPanelId}
                className="flex flex-col gap-1.5 px-2 pb-1.5"
              >
                <div
                  role="group"
                  aria-label="Impact bullet formulas"
                  className="flex flex-col gap-1"
                >
                  {BULLET_FORMULAS.map((formula) => (
                    <button
                      key={formula.verb}
                      type="button"
                      aria-label={`Insert impact formula ${formula.template}`}
                      disabled={!editor}
                      onClick={() => insertBulletFormula(formula)}
                      className="block w-full min-h-9 max-w-full whitespace-normal rounded-md border border-line bg-surface px-2 py-1 text-left text-xs leading-snug text-muted transition-colors hover:border-black/30 hover:text-text active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-line pointer-coarse:min-h-11"
                    >
                      <span className="font-medium text-text">
                        {formula.verb}
                      </span>{" "}
                      <span>
                        {formula.template.slice(formula.verb.length).trimStart()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
