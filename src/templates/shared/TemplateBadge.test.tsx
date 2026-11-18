import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { getTemplate } from "../registry";
import { TemplateBadge } from "./TemplateBadge";

describe("TemplateBadge", () => {
  it("shows the ATS-Safe badge on single-column options", () => {
    for (const id of ["onyx", "persian", "bronzor", "chikorita", "azurill"] as const) {
      const { unmount } = render(
        <TemplateBadge template={getTemplate(id)} />,
      );

      expect(screen.getByText("ATS-Safe")).toBeInTheDocument();
      unmount();
    }
  });

  it("shows the human-review label instead on the two-column option", () => {
    render(<TemplateBadge template={getTemplate("gengar")} />);

    expect(screen.getByText("Best for direct/human review")).toBeInTheDocument();
    expect(screen.queryByText("ATS-Safe")).toBeNull();
  });

  it("renders nothing when there is no badge to show", () => {
    const { container } = render(
      <TemplateBadge
        template={{
          ...getTemplate("onyx"),
          atsSafe: false,
          badge: undefined,
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
