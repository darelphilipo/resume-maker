import { render, screen, waitFor } from "@testing-library/react";
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
