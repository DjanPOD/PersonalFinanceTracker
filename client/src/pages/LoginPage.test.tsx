import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { LoginPage } from "./LoginPage";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderLoginPage(initialEntry = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<LoginPage />} path="/login" />
        <Route element={<p>Dashboard page</p>} path="/" />
        <Route element={<p>Transactions page</p>} path="/transactions" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  it("submits trimmed credentials and navigates to the requested route", async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login,
      logout: vi.fn(),
      register: vi.fn(),
      user: null,
    });

    renderLoginPage({
      pathname: "/login",
      state: {
        from: {
          pathname: "/transactions",
        },
      },
    } as never);

    await user.type(
      screen.getByLabelText("Email address"),
      "  test.user@example.com  ",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "TestPassword123!",
    );
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(login).toHaveBeenCalledWith({
      email: "test.user@example.com",
      password: "TestPassword123!",
    });

    expect(await screen.findByText("Transactions page")).toBeInTheDocument();
  });

  it("shows a backend login error", async () => {
    const user = userEvent.setup();

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi
        .fn()
        .mockRejectedValue(
          new ApiError("Invalid email or password.", 401),
        ),
      logout: vi.fn(),
      register: vi.fn(),
      user: null,
    });

    renderLoginPage();

    await user.type(
      screen.getByLabelText("Email address"),
      "test.user@example.com",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "WrongPassword123!",
    );
    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Invalid email or password.");
  });

  it("redirects an already authenticated user to the dashboard", async () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      user: {
        created_at: "2026-09-23T00:00:00+00:00",
        email: "test.user@example.com",
        id: 1,
        name: "Test User",
      },
    });

    renderLoginPage();

    expect(await screen.findByText("Dashboard page")).toBeInTheDocument();
  });
});