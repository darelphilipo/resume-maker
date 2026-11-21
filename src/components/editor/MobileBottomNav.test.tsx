import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MobileBottomNav } from "./MobileBottomNav";

describe("MobileBottomNav", () => {
  it("renders three tabs and marks the active one selected", () => {
    render(<MobileBottomNav activeTab="content" onChange={vi.fn()} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Design" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("reports tab changes without owning state", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<MobileBottomNav activeTab="content" onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: "Design" }));

    expect(onChange).toHaveBeenCalledWith("design");
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("renders in normal flow instead of anchoring to the viewport", () => {
    render(<MobileBottomNav activeTab="content" onChange={vi.fn()} />);

    const nav = screen.getByRole("navigation", { name: "Editor panels" });

    expect(nav).not.toHaveClass("fixed");
    expect(nav).not.toHaveClass("absolute");
    expect(nav).toHaveClass("shrink-0");
    // Cap the home-indicator inset so a tall/tablet viewport cannot leave a
    // blank strip below the tab labels.
    expect(nav).toHaveClass("pb-[min(env(safe-area-inset-bottom),20px)]");
    expect(nav).not.toHaveClass("pb-[env(safe-area-inset-bottom)]");
  });

  it("reflects a controlled active tab", () => {
    const { rerender } = render(
      <MobileBottomNav activeTab="content" onChange={vi.fn()} />,
    );

    rerender(<MobileBottomNav activeTab="preview" onChange={vi.fn()} />);

    expect(screen.getByRole("tab", { name: "Preview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("highlights only the tab the user is currently on", () => {
    const { rerender } = render(
      <MobileBottomNav activeTab="content" onChange={vi.fn()} />,
    );

    const content = screen.getByRole("tab", { name: "Content" });
    const design = screen.getByRole("tab", { name: "Design" });

    expect(content).toHaveClass("bg-primary/10", "text-primary");
    expect(content.querySelector("[data-active-indicator]")).not.toBeNull();
    expect(design).not.toHaveClass("bg-primary/10");
    expect(design.querySelector("[data-active-indicator]")).toBeNull();

    rerender(<MobileBottomNav activeTab="design" onChange={vi.fn()} />);

    expect(design).toHaveClass("bg-primary/10", "text-primary");
    expect(design.querySelector("[data-active-indicator]")).not.toBeNull();
    expect(content.querySelector("[data-active-indicator]")).toBeNull();
  });
});
