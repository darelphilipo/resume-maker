/**
 * Action-verb chips insert plain text at the cursor. When the cursor follows
 * non-whitespace (for example `...merges.`), the verb would otherwise be glued
 * to the previous word (`...merges.Built `), so prepend a single space. At the
 * start of a line or after existing whitespace the verb inserts cleanly.
 */
export function actionVerbInsertion(
  verb: string,
  textBeforeCursor: string,
): string {
  const needsLeadingSpace =
    textBeforeCursor !== "" && !/\s$/.test(textBeforeCursor);

  return `${needsLeadingSpace ? " " : ""}${verb} `;
}
