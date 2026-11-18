import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { usePreservedScroll } from "./usePreservedScroll";

function Harness({ paused }: { paused: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);

  usePreservedScroll(hostRef, paused);

  return (
    <div data-testid="panel" style={{ overflowY: "auto" }}>
      <div ref={hostRef} data-testid="host">
        {paused ? (
          <div data-testid="placeholder" />
        ) : (
          <div data-testid="pages" />
        )}
      </div>
    </div>
  );
}

const clientHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientHeight",
);
const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollHeight",
);

function stubScrollMetrics(): void {
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 320,
  });
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => 1600,
  });
}

function restoreScrollMetrics(): void {
  if (clientHeightDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientHeight",
      clientHeightDescriptor,
    );
  } else {
    delete (HTMLElement.prototype as { clientHeight?: number }).clientHeight;
  }

  if (scrollHeightDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollHeight",
      scrollHeightDescriptor,
    );
  } else {
    delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
  }
}

function setPanelMetrics(
  panel: HTMLElement,
  scrollHeight: number,
  clientHeight = 320,
): void {
  Object.defineProperty(panel, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
  Object.defineProperty(panel, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
}

describe("usePreservedScroll", () => {
  beforeEach(() => {
    stubScrollMetrics();
  });

  afterEach(() => {
    restoreScrollMetrics();
  });

  it("restores the last offset after a re-measure clamps the scroller", () => {
    const { rerender } = render(<Harness paused={false} />);
    const panel = screen.getByTestId("panel");

    setPanelMetrics(panel, 1600);
    panel.scrollTop = 420;
    fireEvent.scroll(panel);

    // Re-pagination swaps the pages for a short placeholder: the panel no
    // longer overflows, so the browser clamps its scrollTop to 0.
    rerender(<Harness paused />);
    setPanelMetrics(panel, 320);
    panel.scrollTop = 0;
    fireEvent.scroll(panel);

    setPanelMetrics(panel, 1600);
    rerender(<Harness paused={false} />);

    expect(panel.scrollTop).toBe(420);
  });

  it("does nothing when the host has no scrollable ancestor", () => {
    function Bare() {
      const hostRef = useRef<HTMLDivElement>(null);

      usePreservedScroll(hostRef, false);

      return <div ref={hostRef} data-testid="bare" />;
    }

    render(<Bare />);

    expect(screen.getByTestId("bare")).toBeInTheDocument();
  });
});
