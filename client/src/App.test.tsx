import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "./context/AuthContext";
import App from "./App";

vi.mock("./context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("./pages/DashboardPage", () => ({
  DashboardPage: () => <h1>Mock Dashboard Page</h1>,
}));

vi.mock("./pages/CategoriesPage", () => ({
  CategoriesPage: () => <h1>Mock Categories Page</h1>,
}));

vi.mock("./pages/TransactionsPage", () => ({
  TransactionsPage: () => <h1>Mock Transactions Page</h1>,
}));

vi.mock("./pages/BudgetsPage", () => ({
  BudgetsPage: () => <h1>Mock Budgets Page</h1>,
}));

vi.mock("./pages/LoginPage", () => ({
  LoginPage: () => <h1>Mock Login Page</h1>,
}));

vi.mock("./pages/RegisterPage", () => ({
  RegisterPage: () => <h1>Mock Register Page</h1>,
}));

vi.mock("./pages/NotFoundPage", () => ({
  NotFoundPage: () => <h1>Mock Not Found Page</h1>,
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

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("renders the login route", () => {
    setUnauthenticatedUser();

    renderApp("/login");

    expect(
      screen.getByRole("heading", {
        name: "Mock Login Page",
      }),
    ).toBeInTheDocument();
  });

  it("renders the registration route", () => {
    setUnauthenticatedUser();

    renderApp("/register");

    expect(
      screen.getByRole("heading", {
        name: "Mock Register Page",
      }),
    ).toBeInTheDocument();
  });

  it("redirects a guest from a protected route to login", () => {
    setUnauthenticatedUser();

    renderApp("/transactions");

    expect(
      screen.getByRole("heading", {
        name: "Mock Login Page",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", {
        name: "Mock Transactions Page",
      }),
    ).not.toBeInTheDocument();
  });

  it("renders protected routes for authenticated users", () => {
    setAuthenticatedUser();

    renderApp("/transactions");

    expect(
      screen.getByRole("heading", {
        name: "Mock Transactions Page",
      }),
    ).toBeInTheDocument();
  });

  it("renders the dashboard at the root route for authenticated users", () => {
    setAuthenticatedUser();

    renderApp("/");

    expect(
      screen.getByRole("heading", {
        name: "Mock Dashboard Page",
      }),
    ).toBeInTheDocument();
  });

  it("renders the category route for authenticated users", () => {
    setAuthenticatedUser();

    renderApp("/categories");

    expect(
      screen.getByRole("heading", {
        name: "Mock Categories Page",
      }),
    ).toBeInTheDocument();
  });

  it("renders the budget route for authenticated users", () => {
    setAuthenticatedUser();

    renderApp("/budgets");

    expect(
      screen.getByRole("heading", {
        name: "Mock Budgets Page",
      }),
    ).toBeInTheDocument();
  });

  it("renders the not-found route for an unknown path", () => {
    setUnauthenticatedUser();

    renderApp("/not-a-real-page");

    expect(
      screen.getByRole("heading", {
        name: "Mock Not Found Page",
      }),
    ).toBeInTheDocument();
  });
});