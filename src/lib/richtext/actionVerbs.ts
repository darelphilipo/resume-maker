/**
 * Insert plain text at the cursor. When the cursor follows non-whitespace
 * (for example `...merges.`), the text would otherwise be glued to the
 * previous word (`...merges.Built `), so prepend a single space. At the start
 * of a line or after existing whitespace the text inserts cleanly.
 */
export function textInsertion(text: string, textBeforeCursor: string): string {
  const needsLeadingSpace =
    textBeforeCursor !== "" && !/\s$/.test(textBeforeCursor);

  return `${needsLeadingSpace ? " " : ""}${text}`;
}

/**
 * Action-verb chips insert the verb plus a trailing space so the user can keep
 * typing the rest of the bullet.
 */
export function actionVerbInsertion(
  verb: string,
  textBeforeCursor: string,
): string {
  return textInsertion(`${verb} `, textBeforeCursor);
}
