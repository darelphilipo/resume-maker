import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetResumeStore,
  useResumeStore,
} from "@/lib/store/useResumeStore";

import EditorPage from "./page";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams({ id: "missing-id" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

beforeEach(() => {
  resetResumeStore();
  useResumeStore.setState({
    loadResume: vi.fn().mockResolvedValue(false),
  });
});

describe("EditorPage", () => {
  it("renders the not-found state for an unknown resume id", async () => {
    render(<EditorPage />);

    expect(
      await screen.findByRole("heading", { name: "Resume not found" }),
    ).toBeInTheDocument();
  });
});
