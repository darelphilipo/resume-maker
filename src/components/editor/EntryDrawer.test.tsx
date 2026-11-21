import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { EntryDrawer } from "./EntryDrawer";

const originalVisualViewport = Object.getOwnPropertyDescriptor(
  window,
  "visualViewport",
);

afterEach(() => {
  if (originalVisualViewport) {
    Object.defineProperty(window, "visualViewport", originalVisualViewport);
  } else {
    Reflect.deleteProperty(window, "visualViewport");
  }
});

function installVisualViewport(height: number, offsetTop = 0): void {
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: {
      height,
      offsetTop,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  });
}

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

  it("keeps a tap on the X out of vaul's drag and snap handler", async () => {
    const onOpenChange = vi.fn();
    const onPointerDown = vi.fn();

    render(
      <div onPointerDown={onPointerDown}>
        <EntryDrawer open onOpenChange={onOpenChange} title="Experience">
          <p>Drawer body</p>
        </EntryDrawer>
      </div>,
    );

    const close = await screen.findByRole("button", { name: "Close drawer" });

    // vaul opts controls out of dragging through this attribute; the pointer
    // stop keeps a tap on X from being claimed as the first drag step, which
    // made the sheet snap to a shorter snap point instead of closing.
    expect(close).toHaveAttribute("data-vaul-no-drag");

    fireEvent.pointerDown(close);

    expect(onPointerDown).not.toHaveBeenCalled();

    fireEvent.click(close);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("opens from an optional trigger rendered through the dialog primitive", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <EntryDrawer
        open={false}
        onOpenChange={onOpenChange}
        title="Experience"
        trigger={<button type="button">Open drawer</button>}
      >
        <p>Drawer body</p>
      </EntryDrawer>,
    );

    const trigger = screen.getByRole("button", { name: "Open drawer" });

    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);

    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("uses snap points for tall drawers but not for compact dialogs", async () => {
    const { unmount } = render(
      <EntryDrawer open onOpenChange={vi.fn()} title="Experience">
        <p>Drawer body</p>
      </EntryDrawer>,
    );

    expect(await screen.findByRole("dialog")).toHaveAttribute(
      "data-vaul-snap-points",
      "true",
    );
    unmount();

    render(
      <EntryDrawer
        open
        onOpenChange={vi.fn()}
        title="Job description keywords"
        snapPoints={false}
      >
        <p>Drawer body</p>
      </EntryDrawer>,
    );

    const compactDialog = await screen.findByRole("dialog");

    // vaul parks snap-point sheets ~40% of the viewport below the fold; a short
    // dialog must sit at its natural height instead of looking unopened.
    expect(compactDialog).toHaveAttribute("data-vaul-snap-points", "false");
    expect(compactDialog.style.getPropertyValue("--snap-point-height")).toBe(
      "",
    );
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

  it("shrinks above the mobile keyboard so the header stays on screen", async () => {
    const keyboardHeight = 320;
    installVisualViewport(window.innerHeight - keyboardHeight);

    render(
      <EntryDrawer open onOpenChange={vi.fn()} title="Experience">
        <p>Drawer body</p>
      </EntryDrawer>,
    );

    const dialog = await screen.findByRole("dialog");

    await waitFor(() => {
      expect(dialog.style.maxHeight).toBe(
        `calc(95dvh - ${keyboardHeight}px)`,
      );
      expect(dialog.style.bottom).toBe(`${keyboardHeight}px`);
    });
  });

  it("never scrolls sideways when a field overflows", async () => {
    render(
      <EntryDrawer open onOpenChange={vi.fn()} title="Experience">
        <p>Drawer body</p>
      </EntryDrawer>,
    );

    const dialog = await screen.findByRole("dialog");
    const body = screen.getByText("Drawer body").parentElement;
    const scrollRegion = body?.parentElement;

    expect(scrollRegion).toHaveClass(
      "min-w-0",
      "overflow-x-hidden",
      "overflow-y-auto",
    );
    expect(body).toHaveClass("min-w-0", "overflow-x-hidden");
    expect(dialog).toHaveClass("max-h-[95dvh]");
  });
});
