import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "../context/AuthContext";
import { Navigation } from "./Navigation";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

afterEach(() => {
  vi.resetAllMocks();
});

function setAuthenticatedUser(logout = vi.fn()) {
  mockedUseAuth.mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    logout,
    register: vi.fn(),
    user: {
      created_at: "2026-09-01T00:00:00+00:00",
      email: "test.user@example.com",
      id: 1,
      name: "Test User",
    },
  });

  return logout;
}

function setUnauthenticatedUser() {
  mockedUseAuth.mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    user: null,
  });
}

function renderNavigation(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navigation />
    </MemoryRouter>,
  );
}

describe("Navigation", () => {
  it("always renders the Ledgerly brand link", () => {
    setUnauthenticatedUser();

    renderNavigation();

    expect(
      screen.getByRole("link", { name: "Ledgerly" }),
    ).toHaveAttribute("href", "/");
  });

  it("shows login and registration links for a guest", () => {
    setUnauthenticatedUser();

    renderNavigation();

    expect(
      screen.getByRole("link", { name: "Log in" }),
    ).toHaveAttribute("href", "/login");

    expect(
      screen.getByRole("link", { name: "Create account" }),
    ).toHaveAttribute("href", "/register");

    expect(
      screen.queryByRole("link", { name: "Dashboard" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("button", { name: "Log out" }),
    ).not.toBeInTheDocument();
  });

  it("shows authenticated navigation links and the user greeting", () => {
    setAuthenticatedUser();

    renderNavigation();

    expect(
      screen.getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("href", "/");

    expect(
      screen.getByRole("link", { name: "Transactions" }),
    ).toHaveAttribute("href", "/transactions");

    expect(
      screen.getByRole("link", { name: "Categories" }),
    ).toHaveAttribute("href", "/categories");

    expect(
      screen.getByRole("link", { name: "Budget" }),
    ).toHaveAttribute("href", "/budgets");

    expect(screen.getByText("Hi, Test User")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Log out" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: "Log in" }),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByRole("link", { name: "Create account" }),
    ).not.toBeInTheDocument();
  });

  it("marks Dashboard active only on the root route", () => {
    setAuthenticatedUser();

    renderNavigation("/");

    expect(
      screen.getByRole("link", { name: "Dashboard" }),
    ).toHaveClass("nav-link-active");

    expect(
      screen.getByRole("link", { name: "Transactions" }),
    ).not.toHaveClass("nav-link-active");
  });

  it("marks the matching section link active", () => {
    setAuthenticatedUser();

    renderNavigation("/transactions");

    expect(
      screen.getByRole("link", { name: "Transactions" }),
    ).toHaveClass("nav-link-active");

    expect(
      screen.getByRole("link", { name: "Dashboard" }),
    ).not.toHaveClass("nav-link-active");
  });

  it("calls logout when the user clicks Log out", async () => {
    const user = userEvent.setup();
    const logout = setAuthenticatedUser();

    renderNavigation();

    await user.click(
      screen.getByRole("button", { name: "Log out" }),
    );

    expect(logout).toHaveBeenCalledOnce();
  });
});