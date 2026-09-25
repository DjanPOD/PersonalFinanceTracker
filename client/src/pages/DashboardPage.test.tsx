import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { DashboardPage } from "./DashboardPage";

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

vi.mock("../components/charts/ExpenseBreakdownChart", () => ({
  ExpenseBreakdownChart: ({
    expenses,
  }: {
    expenses: unknown[];
  }) => <p>Expense chart with {expenses.length} categories</p>,
}));

const mockedApiClient = vi.mocked(apiClient);
const mockedUseAuth = vi.mocked(useAuth);

const dashboardResponse = {
  expenses_by_category: [
    {
      amount: "120.50",
      category_color: "#22C55E",
      category_id: 1,
      category_name: "Groceries",
    },
    {
      amount: "60.00",
      category_color: "#F97316",
      category_id: 2,
      category_name: "Dining",
    },
  ],
  period: {
    end_date: "2026-09-30",
    month: "2026-09",
    start_date: "2026-09-01",
  },
  recent_transactions: [
    {
      amount: "120.50",
      category: {
        color: "#22C55E",
        created_at: "2026-09-01T00:00:00+00:00",
        id: 1,
        name: "Groceries",
        type: "expense",
      },
      created_at: "2026-09-15T00:00:00+00:00",
      description: "Weekly groceries",
      id: 1,
      transaction_date: "2026-09-15",
      type: "expense",
    },
  ],
  summary: {
    balance: "1819.50",
    total_expenses: "180.50",
    total_income: "2000.00",
  },
};

function setAuthenticatedUser() {
  localStorage.setItem("ledgerly_access_token", "test-token");

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

function renderDashboardPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  it("shows dashboard totals, transactions, and chart data", async () => {
    setAuthenticatedUser();
    mockedApiClient.mockResolvedValueOnce(dashboardResponse);

    renderDashboardPage();

    expect(
      screen.getByText("Loading your financial summary…"),
    ).toBeInTheDocument();

    expect(await screen.findByText("$2,000.00")).toBeInTheDocument();
    expect(screen.getByText("$180.50")).toBeInTheDocument();
    expect(screen.getByText("$1,819.50")).toBeInTheDocument();

    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();

    expect(
      screen.getByText("Expense chart with 2 categories"),
    ).toBeInTheDocument();

    expect(mockedApiClient).toHaveBeenCalledWith(
      "/dashboard/summary?month=2026-09",
      {
        method: "GET",
        token: "test-token",
      },
    );
  });

  it("shows empty states when the selected month has no transactions", async () => {
    setAuthenticatedUser();

    mockedApiClient.mockResolvedValueOnce({
      ...dashboardResponse,
      expenses_by_category: [],
      recent_transactions: [],
      summary: {
        balance: "0.00",
        total_expenses: "0.00",
        total_income: "0.00",
      },
    });

    renderDashboardPage();

    expect(
    await screen.findByText(
        "No expenses recorded for this month yet.",
    ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "No expenses recorded for this month yet.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "No transactions recorded for this month yet.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Expense chart with 0 categories"),
    ).toBeInTheDocument();
  });

  it("shows an error and retries loading the dashboard", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();

    mockedApiClient
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockResolvedValueOnce(dashboardResponse);

    renderDashboardPage();

    expect(
      await screen.findByText(
        "Unable to load your dashboard. Please try again.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("$2,000.00")).toBeInTheDocument();

    expect(mockedApiClient).toHaveBeenCalledTimes(2);
  });

  it("logs out when the dashboard request returns 401", async () => {
    const logout = vi.fn();

    localStorage.setItem("ledgerly_access_token", "expired-token");

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

    mockedApiClient.mockRejectedValueOnce(
      new ApiError("Access token has expired.", 401),
    );

    renderDashboardPage();

    await waitFor(() => {
      expect(logout).toHaveBeenCalledOnce();
    });

    expect(mockedApiClient).toHaveBeenCalledWith(
      "/dashboard/summary?month=2026-09",
      {
        method: "GET",
        token: "expired-token",
      },
    );
  });
});