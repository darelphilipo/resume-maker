import { render, screen } from "@testing-library/react";
import Home from "./page";

describe("Home page", () => {
  it("renders the Resume Maker heading", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { name: "Resume Maker" }),
    ).toBeInTheDocument();
  });
});
