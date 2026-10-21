import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SkillLevelIndicator } from "./SkillLevelIndicator";

describe("SkillLevelIndicator", () => {
  it("renders an accessible progress bar at the requested level", () => {
    const { container } = render(
      <SkillLevelIndicator level={3} type="progress-bar" />,
    );

    expect(container.querySelector('[role="img"]')).toHaveAttribute(
      "aria-label",
      "Proficiency 3 of 5",
    );
    expect(
      (container.querySelector(".skill-level-progress-bar") as HTMLElement).style
        .width,
    ).toBe("60%");
  });

  it("renders nothing when hidden", () => {
    const { container } = render(
      <SkillLevelIndicator level={3} type="hidden" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("renders five circle dots with the filled ones marked", () => {
    const { container } = render(
      <SkillLevelIndicator level={3} type="circle" />,
    );

    expect(container.querySelectorAll(".skill-level-dot")).toHaveLength(5);
    expect(container.querySelectorAll(".skill-level-dot.filled")).toHaveLength(
      3,
    );
  });

  it("renders five rectangle bars with the filled ones marked", () => {
    const { container } = render(
      <SkillLevelIndicator level={2} type="rectangle" />,
    );

    expect(container.querySelectorAll(".skill-level-bar")).toHaveLength(5);
    expect(container.querySelectorAll(".skill-level-bar.filled")).toHaveLength(
      2,
    );
  });
});
