import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "../api/client";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>(
    "../api/client",
  );

  return {
    ...actual,
    apiClient: vi.fn(),
  };
});

const mockedApiClient = vi.mocked(apiClient);

function AuthState() {
  const { isAuthenticated, isLoading, login, logout, user } = useAuth();

  return (
    <div>
      <p data-testid="loading">{String(isLoading)}</p>
      <p data-testid="authenticated">{String(isAuthenticated)}</p>
      <p data-testid="user-name">{user?.name ?? "No user"}</p>

      <button
        onClick={() =>
          void login({
            email: "test.user@example.com",
            password: "TestPassword123!",
          })
        }
        type="button"
      >
        Log in
      </button>

      <button onClick={logout} type="button">
        Log out
      </button>
    </div>
  );
}

describe("AuthProvider", () => {
  it("restores a valid session from local storage", async () => {
    localStorage.setItem("ledgerly_access_token", "saved-token");

    mockedApiClient.mockResolvedValueOnce({
      user: {
        created_at: "2026-09-23T00:00:00+00:00",
        email: "test.user@example.com",
        id: 1,
        name: "Test User",
      },
    });

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("user-name")).toHaveTextContent("Test User");

    expect(mockedApiClient).toHaveBeenCalledWith("/auth/me", {
      method: "GET",
      token: "saved-token",
    });
  });

  it("clears an invalid stored session", async () => {
    localStorage.setItem("ledgerly_access_token", "expired-token");

    mockedApiClient.mockRejectedValueOnce(
      new ApiError("Invalid access token.", 401),
    );

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("user-name")).toHaveTextContent("No user");
    expect(localStorage.getItem("ledgerly_access_token")).toBeNull();

    expect(mockedApiClient).toHaveBeenCalledWith("/auth/me", {
      method: "GET",
      token: "expired-token",
    });
  });

  it("stores the token and user after login", async () => {
    const user = {
      created_at: "2026-09-23T00:00:00+00:00",
      email: "test.user@example.com",
      id: 1,
      name: "Test User",
    };

    mockedApiClient
      .mockResolvedValueOnce({
        access_token: "new-token",
        token_type: "Bearer",
        user,
      })
      .mockResolvedValueOnce({
        user,
      });

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Log in" }).click();
    });

    await waitFor(() => {
      expect(localStorage.getItem("ledgerly_access_token")).toBe(
        "new-token",
      );
    });

    expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    expect(screen.getByTestId("user-name")).toHaveTextContent("Test User");

    expect(mockedApiClient).toHaveBeenCalledWith("/auth/login", {
      body: {
        email: "test.user@example.com",
        password: "TestPassword123!",
      },
      method: "POST",
    });

    await waitFor(() => {
      expect(mockedApiClient).toHaveBeenCalledWith("/auth/me", {
        method: "GET",
        token: "new-token",
      });
    });
  });

  it("clears auth state when logging out", async () => {
    localStorage.setItem("ledgerly_access_token", "saved-token");

    mockedApiClient.mockResolvedValueOnce({
      user: {
        created_at: "2026-09-23T00:00:00+00:00",
        email: "test.user@example.com",
        id: 1,
        name: "Test User",
      },
    });

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("authenticated")).toHaveTextContent("true");
    });

    await act(async () => {
      screen.getByRole("button", { name: "Log out" }).click();
    });

    expect(localStorage.getItem("ledgerly_access_token")).toBeNull();
    expect(screen.getByTestId("authenticated")).toHaveTextContent("false");
    expect(screen.getByTestId("user-name")).toHaveTextContent("No user");
  });
});