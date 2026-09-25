import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { NotFoundPage } from "./NotFoundPage";

function renderNotFoundPage() {
  return render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("shows the 404 status and missing-page message", () => {
    renderNotFoundPage();

    expect(screen.getByText("404")).toBeInTheDocument();

    expect(
      screen.getByRole("heading", {
        name: "Page not found",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "The page you requested does not exist.",
      ),
    ).toBeInTheDocument();
  });

  it("provides a link back to the dashboard", () => {
    renderNotFoundPage();

    expect(
      screen.getByRole("link", {
        name: "Return to dashboard",
      }),
    ).toHaveAttribute("href", "/");
  });
});