import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../context/AuthContext";
import { AppLayout } from "./AppLayout";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

afterEach(() => {
  vi.resetAllMocks();
});

function setAuthenticatedUser() {
  mockedUseAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    user: {
      created_at: "2026-09-01T00:00:00+00:00",
      email: "test.user@example.com",
      id: 1,
      name: "Test User",
    },
  });
}

function renderAppLayout(children: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AppLayout>{children}</AppLayout>
    </MemoryRouter>,
  );
}

describe("AppLayout", () => {
  it("renders the shared navigation shell", () => {
    setAuthenticatedUser();

    renderAppLayout(<p>Page content</p>);

    expect(
      screen.getByRole("navigation", {
        name: "Main navigation",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: "Ledgerly" }),
    ).toHaveAttribute("href", "/");

    expect(
      screen.getByRole("link", { name: "Dashboard" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Log out" }),
    ).toBeInTheDocument();
  });

  it("renders provided page content inside the main landmark", () => {
    setAuthenticatedUser();

    renderAppLayout(
      <section>
        <h1>Dashboard content</h1>
        <p>Monthly financial summary</p>
      </section>,
    );

    const main = screen.getByRole("main");

    expect(main).toHaveClass("page-content");

    expect(
      screen.getByRole("heading", {
        name: "Dashboard content",
      }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Monthly financial summary"),
    ).toBeInTheDocument();

    expect(main).toContainElement(
      screen.getByRole("heading", {
        name: "Dashboard content",
      }),
    );
  });

  it("renders guest navigation when the user is not authenticated", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      user: null,
    });

    renderAppLayout(<p>Public content</p>);

    expect(
      screen.getByRole("link", { name: "Log in" }),
    ).toHaveAttribute("href", "/login");

    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/register");

    expect(
      screen.queryByRole("button", { name: "Log out" }),
    ).not.toBeInTheDocument();

    expect(screen.getByText("Public content")).toBeInTheDocument();
  });
});