import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { CategoriesPage } from "./CategoriesPage";

vi.mock("../api/client", async () => {
  const actual = await vi.importActual<typeof import("../api/client")>(
    "../api/client",
  );

  return {
    ...actual,
    apiClient: vi.fn(),
  };
});

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const mockedApiClient = vi.mocked(apiClient);
const mockedUseAuth = vi.mocked(useAuth);

const categoriesResponse = {
  categories: [
    {
      color: "#22C55E",
      created_at: "2026-09-01T00:00:00+00:00",
      id: 1,
      name: "Salary",
      type: "income",
    },
    {
      color: "#EF4444",
      created_at: "2026-09-01T00:00:00+00:00",
      id: 2,
      name: "Groceries",
      type: "expense",
    },
  ],
};

afterEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

function setAuthenticatedUser(logout = vi.fn()) {
  localStorage.setItem("ledgerly_access_token", "test-token");

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

function renderCategoriesPage() {
  return render(
    <MemoryRouter>
      <CategoriesPage />
    </MemoryRouter>,
  );
}

describe("CategoriesPage", () => {
  it("loads and displays income and expense categories", async () => {
    setAuthenticatedUser();

    mockedApiClient.mockResolvedValueOnce(categoriesResponse);

    renderCategoriesPage();

    expect(await screen.findByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();

    expect(screen.getByText("Income categories")).toBeInTheDocument();
    expect(screen.getByText("Expense categories")).toBeInTheDocument();

    expect(mockedApiClient).toHaveBeenCalledWith("/categories", {
      method: "GET",
      token: "test-token",
    });
  });

  it("shows empty states when no categories exist", async () => {
    setAuthenticatedUser();

    mockedApiClient.mockResolvedValueOnce({ categories: [] });

    renderCategoriesPage();

    expect(
      await screen.findByText(
        "No expense categories yet. Add one above to organize your spending.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "No income categories yet. Add one above to organize your income.",
      ),
    ).toBeInTheDocument();
  });

  it("creates a new expense category", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();

    const transportationCategory = {
      color: "#3B82F6",
      created_at: "2026-09-24T00:00:00+00:00",
      id: 3,
      name: "Transportation",
      type: "expense",
    };

    mockedApiClient
      .mockResolvedValueOnce(categoriesResponse)
      .mockResolvedValueOnce({
        category: transportationCategory,
      })
      .mockResolvedValueOnce({
        categories: [
          ...categoriesResponse.categories,
          transportationCategory,
        ],
      });

    renderCategoriesPage();

    await screen.findByText("Salary");

    await user.type(
      screen.getByLabelText("Category name"),
      "Transportation",
    );

    await user.selectOptions(
      screen.getByLabelText("Type"),
      "expense",
    );

    await user.click(
      screen.getByRole("button", { name: "Add category" }),
    );

    await waitFor(() => {
      expect(mockedApiClient).toHaveBeenCalledWith("/categories", {
        body: {
          color: "#2563EB",
          name: "Transportation",
          type: "expense",
        },
        method: "POST",
        token: "test-token",
      });
    });

    const successMessage = await screen.findByRole("status");

    expect(successMessage).toHaveTextContent(
    "Transportation was added successfully.",
    );

    expect(
      await screen.findByText("Transportation"),
    ).toBeInTheDocument();
  });

  it("shows an API error when category creation fails", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();

    mockedApiClient
      .mockResolvedValueOnce(categoriesResponse)
      .mockRejectedValueOnce(
        new ApiError("A category with that name already exists.", 400),
      );

    renderCategoriesPage();

    await screen.findByText("Salary");

    await user.type(
      screen.getByLabelText("Category name"),
      "Groceries",
    );

    await user.click(
      screen.getByRole("button", { name: "Add category" }),
    );

    expect(
      await screen.findByText(
        "A category with that name already exists.",
      ),
    ).toBeInTheDocument();
  });

  it("logs out when category loading returns 401", async () => {
    const logout = setAuthenticatedUser();

    mockedApiClient.mockRejectedValue(
      new ApiError("Access token has expired.", 401),
    );

    renderCategoriesPage();

    await waitFor(() => {
      expect(logout).toHaveBeenCalledOnce();
    });

    expect(mockedApiClient).toHaveBeenCalledWith("/categories", {
      method: "GET",
      token: "test-token",
    });
  });
});