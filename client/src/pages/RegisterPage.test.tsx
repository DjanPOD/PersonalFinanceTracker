import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { RegisterPage } from "./RegisterPage";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route element={<RegisterPage />} path="/register" />
        <Route element={<p>Login page</p>} path="/login" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  it("submits trimmed name and email, then navigates to login", async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register,
      user: null,
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText("Name"), "  Test User  ");
    await user.type(
      screen.getByLabelText("Email address"),
      "  test.user@example.com  ",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "TestPassword123!",
    );
    await user.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(register).toHaveBeenCalledWith({
      name: "Test User",
      email: "test.user@example.com",
      password: "TestPassword123!",
    });

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  it("shows backend field validation errors", async () => {
    const user = userEvent.setup();

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn().mockRejectedValue(
        new ApiError(
          "Something went wrong. Please try again.",
          400,
          {
            email: "An account with that email already exists.",
            password: "Password does not meet the server requirements.",
          },
        ),
      ),
      user: null,
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText("Name"), "Test User");
    await user.type(
      screen.getByLabelText("Email address"),
      "test.user@example.com",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "TestPassword123!",
    );
    await user.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(
      await screen.findByText(
        "An account with that email already exists.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Password does not meet the server requirements.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a fallback message for an unexpected registration failure", async () => {
    const user = userEvent.setup();

    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn().mockRejectedValue(new Error("Network failure")),
      user: null,
    });

    renderRegisterPage();

    await user.type(screen.getByLabelText("Name"), "Test User");
    await user.type(
      screen.getByLabelText("Email address"),
      "test.user@example.com",
    );
    await user.type(
      screen.getByLabelText("Password"),
      "TestPassword123!",
    );
    await user.click(
      screen.getByRole("button", { name: "Create account" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to create your account. Please try again.",
    );
  });
});