import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { BudgetsPage } from "./BudgetsPage";

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

vi.mock("../components/charts/BudgetUtilizationChart", () => ({
  BudgetUtilizationChart: ({
    budgets,
  }: {
    budgets: unknown[];
  }) => <p>Budget chart with {budgets.length} budgets</p>,
}));

const mockedApiClient = vi.mocked(apiClient);
const mockedUseAuth = vi.mocked(useAuth);

const expenseCategoriesResponse = {
  categories: [
    {
      color: "#22C55E",
      created_at: "2026-09-01T00:00:00+00:00",
      id: 1,
      name: "Groceries",
      type: "expense",
    },
    {
      color: "#0EA5E9",
      created_at: "2026-09-01T00:00:00+00:00",
      id: 2,
      name: "Transportation",
      type: "expense",
    },
  ],
};

const budgetResponse = {
  budgets: [
    {
      amount: "500.00",
      category: {
        color: "#22C55E",
        created_at: "2026-09-01T00:00:00+00:00",
        id: 1,
        name: "Groceries",
        type: "expense",
      },
      created_at: "2026-09-01T00:00:00+00:00",
      id: 1,
      month: "2026-09",
      progress_percentage: 125.25,
      remaining: "-126.25",
      spent: "626.25",
    },
  ],
};

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

function renderBudgetsPage() {
  return render(
    <MemoryRouter>
      <BudgetsPage />
    </MemoryRouter>,
  );
}

describe("BudgetsPage", () => {
  it("shows budget progress, an overspending status, and chart data", async () => {
    setAuthenticatedUser();

    mockedApiClient
      .mockResolvedValueOnce(expenseCategoriesResponse)
      .mockResolvedValueOnce(budgetResponse);

    renderBudgetsPage();

    expect(
      await screen.findByText("Groceries"),
    ).toBeInTheDocument();

    expect(screen.getByText("$626.25 spent")).toBeInTheDocument();
    expect(screen.getByText("$500.00 limit")).toBeInTheDocument();
    expect(screen.getByText("125.25% used")).toBeInTheDocument();
    expect(screen.getByText("$126.25 over budget")).toBeInTheDocument();
    expect(
      screen.getByText("Budget chart with 1 budgets"),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("option", { name: "Groceries" }),
    ).not.toBeInTheDocument();

    expect(
      screen.getByRole("option", { name: "Transportation" }),
    ).toBeInTheDocument();

    expect(mockedApiClient).toHaveBeenCalledWith("/categories?type=expense", {
      method: "GET",
      token: "test-token",
    });

    expect(mockedApiClient).toHaveBeenCalledWith(
      "/budgets?month=2026-09",
      {
        method: "GET",
        token: "test-token",
      },
    );
  });

  it("shows an empty state when no budgets exist", async () => {
    setAuthenticatedUser();

    mockedApiClient
      .mockResolvedValueOnce(expenseCategoriesResponse)
      .mockResolvedValueOnce({ budgets: [] });

    renderBudgetsPage();

    expect(
      await screen.findByText(
        "No budgets have been created for September 2026 yet.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Budget chart with 0 budgets"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", { name: "Groceries" }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("option", { name: "Transportation" }),
    ).toBeInTheDocument();
  });

  it("creates a budget and reloads the budget list", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();

    mockedApiClient
      .mockResolvedValueOnce(expenseCategoriesResponse)
      .mockResolvedValueOnce({ budgets: [] })
      .mockResolvedValueOnce({
        budget: {
          ...budgetResponse.budgets[0],
          amount: "250.00",
          progress_percentage: 0,
          remaining: "250.00",
          spent: "0.00",
        },
      })
      .mockResolvedValueOnce({
        budgets: [
          {
            ...budgetResponse.budgets[0],
            amount: "250.00",
            progress_percentage: 0,
            remaining: "250.00",
            spent: "0.00",
          },
        ],
      });

    renderBudgetsPage();

    await screen.findByText(
      "No budgets have been created for September 2026 yet.",
    );

    await user.selectOptions(
      screen.getByLabelText("Expense category"),
      "1",
    );
    await user.type(screen.getByLabelText("Monthly limit"), "250");
    await user.click(
      screen.getByRole("button", { name: "Create budget" }),
    );

    await waitFor(() => {
      expect(mockedApiClient).toHaveBeenCalledWith("/budgets", {
        body: {
          amount: "250",
          category_id: 1,
          month: "2026-09",
        },
        method: "POST",
        token: "test-token",
      });
    });

    expect(
      await screen.findByText("Budget created successfully."),
    ).toBeInTheDocument();

    expect(mockedApiClient).toHaveBeenCalledWith(
      "/budgets?month=2026-09",
      {
        method: "GET",
        token: "test-token",
      },
    );
  });

  it("logs out when loading budgets returns 401", async () => {
    const logout = setAuthenticatedUser();

    mockedApiClient
      .mockResolvedValueOnce(expenseCategoriesResponse)
      .mockRejectedValueOnce(
        new ApiError("Access token has expired.", 401),
      );

    renderBudgetsPage();

    await waitFor(() => {
      expect(logout).toHaveBeenCalledOnce();
    });
  });
});