function legacyCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-10000px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;

  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }

  textarea.remove();
  return copied;
}

/**
 * Copy plain text with the async Clipboard API, falling back to the legacy
 * `execCommand("copy")` path when the API is unavailable or denied.
 *
 * Returns `false` for empty input or when both paths fail, so callers only show
 * a "Copied" confirmation after a real success.
 */
export async function copyText(text: string): Promise<boolean> {
  if (text.trim() === "") {
    return false;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy path; some browsers expose the API but reject
    // it without a secure context or user gesture.
  }

  return legacyCopy(text);
}
