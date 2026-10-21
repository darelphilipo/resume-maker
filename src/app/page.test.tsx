import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import Home from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Home page", () => {
  it("renders the Resume Maker heading and both launcher cards", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: "Resume Maker" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Import existing resume" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Start from scratch" }),
    ).toBeInTheDocument();
  });
});
