/**
 * Matches the innermost `<li>` so nested lists can be cleaned from the inside
 * out without swallowing a parent item that still contains real content.
 */
const INNERMOST_LIST_ITEM = /<li\b[^>]*>((?:(?!<li\b)[\s\S])*?)<\/li>/gi;

const WHITESPACE_ENTITIES = /&nbsp;|&#160;|&#xa0;/gi;

function isEmptyListItem(inner: string): boolean {
  const withoutMarkup = inner
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\b[^>]*>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(WHITESPACE_ENTITIES, " ");

  return withoutMarkup.replace(/\s+/g, "") === "";
}

/**
 * Removes empty list items such as `<li><p></p></li>` or a whitespace-only
 * `<li>` before rich text is rendered. TipTap creates one when the user presses
 * Enter at the end of a bullet list, and printing it would leave a stray `•`
 * with no text. The helper is pure and only touches list markup, so callers can
 * use it for both the preview and the print/ATS renderers without mutating the
 * saved document.
 */
export function stripEmptyListItems(html: string): string {
  if (!/<li\b/i.test(html)) {
    return html;
  }

  let current = html;

  // Nested empty items become removable only after their children are gone.
  for (let pass = 0; pass < 20; pass += 1) {
    let changed = false;
    const next = current.replace(INNERMOST_LIST_ITEM, (match, inner: string) => {
      if (!isEmptyListItem(inner)) {
        return match;
      }

      changed = true;
      return "";
    });

    if (!changed) {
      return next;
    }

    current = next;
  }

  return current;
}
