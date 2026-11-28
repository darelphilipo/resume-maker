import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Home page", () => {
  it("renders the Resume Maker heading and primary launcher cards", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Resume Maker" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Upload a PDF" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Start from scratch" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Other ways to import" }),
    ).toBeInTheDocument();
  });

  it("leads with one value-prop heading over the entry options", () => {
    render(<Home />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", {
        name: "A professional resume, built in your browser.",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Choose one way to start" }),
    ).toBeInTheDocument();
  });

  it("states the free/private promise once above the start options", () => {
    render(<Home />);

    expect(screen.queryByText("Private by default")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/No account, no AI, no cost/),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("list", { name: "Resume Maker promises" }),
    ).toHaveLength(1);
  });

  it("only promises click counts when the build opts in", () => {
    const previous = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;

    try {
      delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;

      const { unmount } = render(<Home />);

      expect(
        screen.getByText(/Your resume stays 100% on this device/),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/anonymous button clicks/),
      ).not.toBeInTheDocument();

      unmount();

      process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = "1";
      render(<Home />);

      expect(
        screen.getByText(/anonymous button clicks/),
      ).toBeInTheDocument();
    } finally {
      if (previous === undefined) {
        delete process.env.NEXT_PUBLIC_ANALYTICS_ENABLED;
      } else {
        process.env.NEXT_PUBLIC_ANALYTICS_ENABLED = previous;
      }
    }
  });
});
