import { describe, expect, it } from "vitest";

import {
  BULLET_FORMULAS,
  bulletFormulaInsertion,
} from "./bulletFormulas";

describe("BULLET_FORMULAS", () => {
  it("offers four fill-in impact formulas that start with their verb", () => {
    expect(BULLET_FORMULAS).toHaveLength(4);

    for (const formula of BULLET_FORMULAS) {
      expect(formula.template.startsWith(formula.verb)).toBe(true);
      expect(formula.template).toMatch(/\[[^\]]+\]/);
    }

    expect(BULLET_FORMULAS.map((formula) => formula.template)).toEqual([
      "Reduced [metric] by [X%] by [action]",
      "Built [feature/system] for [N] users, improving [outcome]",
      "Led [team/project] to deliver [result]",
      "Automated [workflow], saving [N] hrs/wk",
    ]);
  });
});

describe("bulletFormulaInsertion", () => {
  it("inserts the formula followed by a trailing space", () => {
    expect(bulletFormulaInsertion(BULLET_FORMULAS[0], "")).toBe(
      "Reduced [metric] by [X%] by [action] ",
    );
  });

  it("prepends a space when the cursor follows non-whitespace", () => {
    expect(bulletFormulaInsertion(BULLET_FORMULAS[2], ".")).toBe(
      " Led [team/project] to deliver [result] ",
    );
  });

  it("does not double spaces after existing whitespace", () => {
    expect(bulletFormulaInsertion(BULLET_FORMULAS[3], " ")).toBe(
      "Automated [workflow], saving [N] hrs/wk ",
    );
  });
});
