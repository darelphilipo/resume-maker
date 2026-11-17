import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EntryDrawer } from "./EntryDrawer";

describe("EntryDrawer", () => {
  it("mounts the drawer content while open", async () => {
    render(
      <EntryDrawer
        open
        onOpenChange={vi.fn()}
        title="Experience"
        description="Edit an experience entry"
      >
        <p>Drawer body</p>
      </EntryDrawer>,
    );

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Experience")).toBeInTheDocument();
    expect(screen.getByText("Edit an experience entry")).toBeInTheDocument();
    expect(screen.getByText("Drawer body")).toBeInTheDocument();
  });

  it("closes from the top-right X button as well as the drag gesture", async () => {
    const onOpenChange = vi.fn();

    render(
      <EntryDrawer open onOpenChange={onOpenChange} title="Experience">
        <p>Drawer body</p>
      </EntryDrawer>,
    );

    const dialog = await screen.findByRole("dialog");
    const close = screen.getByRole("button", { name: "Close drawer" });

    expect(within(dialog).getByRole("button", { name: "Close drawer" })).toBe(
      close,
    );
    expect(close).toHaveClass("min-h-11", "min-w-11");
    expect(close.parentElement).toContainElement(
      screen.getByRole("heading", { name: "Experience" }),
    );

    // fireEvent avoids vaul's jsdom-only setPointerCapture error that a
    // full userEvent pointer sequence triggers on a drawer child.
    fireEvent.click(close);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("reports close requests through onOpenChange", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <EntryDrawer open onOpenChange={onOpenChange} title="Skills">
        <p>Drawer body</p>
      </EntryDrawer>,
    );

    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
