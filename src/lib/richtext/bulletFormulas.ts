import { textInsertion } from "./actionVerbs";

export type BulletFormula = {
  /** Verb shown first in the chip and inserted at the cursor. */
  verb: string;
  /** Fill-in template; every placeholder stays in square brackets. */
  template: string;
};

/**
 * Zero-AI impact-bullet skeletons. Each chip inserts the full template at the
 * cursor so the user only has to replace the bracketed placeholders; nothing
 * is generated, sent anywhere, or saved until the normal editor update runs.
 */
export const BULLET_FORMULAS: readonly BulletFormula[] = [
  {
    verb: "Reduced",
    template: "Reduced [metric] by [X%] by [action]",
  },
  {
    verb: "Built",
    template: "Built [feature/system] for [N] users, improving [outcome]",
  },
  {
    verb: "Led",
    template: "Led [team/project] to deliver [result]",
  },
  {
    verb: "Automated",
    template: "Automated [workflow], saving [N] hrs/wk",
  },
] as const;

/**
 * Insert a formula at the cursor with the shared spacing rule, plus a trailing
 * space so the user can continue the sentence.
 */
export function bulletFormulaInsertion(
  formula: BulletFormula,
  textBeforeCursor: string,
): string {
  return textInsertion(`${formula.template} `, textBeforeCursor);
}

/**
 * At the end of a non-empty bullet there is nothing left to finish: a formula
 * tapped there should start the next bullet, not extend the previous sentence.
 * Anywhere else (mid-bullet, in prose, or in an empty item) it inserts at the
 * cursor with the normal spacing rule.
 */
export function shouldStartNewBullet(input: {
  inBulletList: boolean;
  atEndOfItem: boolean;
  itemText: string;
}): boolean {
  return (
    input.inBulletList &&
    input.atEndOfItem &&
    input.itemText.trim().length > 0
  );
}
