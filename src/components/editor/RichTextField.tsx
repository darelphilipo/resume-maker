"use client";

import {
  ArrowClockwise,
  ArrowCounterClockwise,
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
import { useEffect, useId, useMemo, useRef, type ReactNode } from "react";

import { sanitizeRichText } from "@/lib/richtext/sanitize";

export const ACTION_VERBS = ["Built", "Reduced", "Led", "Automated"] as const;

export type RichTextFieldProps = {
  value: string;
  onChange: (html: string) => void;
  ariaLabel: string;
  placeholder?: string;
  /** Show action-verb chips and the achievement-bullet prompt (for bullet lists). */
  actionHelpers?: boolean;
};

type ToolbarButtonProps = {
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

function ToolbarButton({
  label,
  onClick,
  active,
  disabled,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active ?? false}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-11 min-w-11 items-center justify-center rounded-md transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:opacity-30 disabled:hover:bg-transparent aria-pressed:bg-black/10"
    >
      {children}
    </button>
  );
}

export function RichTextField({
  value,
  onChange,
  ariaLabel,
  placeholder,
  actionHelpers = false,
}: RichTextFieldProps) {
  const onChangeRef = useRef(onChange);
  const actionHintId = useId();

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

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
          "tiptap min-h-24 w-full bg-surface px-3 py-2 text-sm leading-relaxed text-text outline-none",
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

  function insertActionVerb(verb: string): void {
    editor?.chain().focus().insertContent(`${verb} `).run();
  }

  function toggleLink(): void {
    if (!editor) {
      return;
    }

    const attributes: Record<string, unknown> = editor.getAttributes("link");
    const previous =
      typeof attributes.href === "string" ? attributes.href : "";
    const input = window.prompt("Link URL", previous || "https://");

    if (input === null) {
      return;
    }

    const href = input.trim();

    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface text-text transition-shadow focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
      <div
        role="toolbar"
        aria-label={`Formatting for ${ariaLabel}`}
        className="flex flex-wrap items-center gap-0.5 border-b border-line bg-surface-muted p-1"
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
      {actionHelpers ? (
        <div className="flex flex-col gap-1.5 border-b border-line bg-primary/[0.03] px-2 py-2">
          <p id={actionHintId} className="text-xs text-muted">
            <span className="font-medium text-text">
              [Action] + [What] + [Result by X%]
            </span>{" "}
            <span>e.g. Built a checkout flow that reduced drop-off by 18%.</span>
          </p>
          <div
            role="group"
            aria-label="Action verb helpers"
            aria-describedby={actionHintId}
            className="flex flex-wrap gap-1.5"
          >
            {ACTION_VERBS.map((verb) => (
              <button
                key={verb}
                type="button"
                aria-label={`Insert action verb ${verb}`}
                disabled={!editor}
                onClick={() => insertActionVerb(verb)}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-3 py-2 text-xs font-medium transition-colors hover:border-black/30 active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-30 disabled:hover:border-line"
              >
                {verb}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <EditorContent editor={editor} />
    </div>
  );
}
