import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "../context/AuthContext";
import { ProtectedRoute } from "./ProtectedRoute";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedUseAuth = vi.mocked(useAuth);

function renderProtectedRoute(initialPath = "/transactions") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <p>Protected content</p>
            </ProtectedRoute>
          }
          path="/transactions"
        />
        <Route element={<p>Login page</p>} path="/login" />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading state while authentication is being restored", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      user: null,
    });

    renderProtectedRoute();

    expect(screen.getByText("Loading your account…")).toBeInTheDocument();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated user to login", () => {
    mockedUseAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      user: null,
    });

    renderProtectedRoute();

    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(
      screen.queryByText("Protected content"),
    ).not.toBeInTheDocument();
  });

  it("renders protected content for an authenticated user", () => {
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

    renderProtectedRoute();

    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});