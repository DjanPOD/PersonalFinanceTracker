import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { TransactionsPage } from "./TransactionsPage";

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

const transactionsResponse = {
  page: 1,
  per_page: 100,
  total: 2,
  transactions: [
    {
      amount: "2500.00",
      category: categoriesResponse.categories[0],
      created_at: "2026-09-01T12:00:00+00:00",
      description: "September salary",
      id: 1,
      transaction_date: "2026-09-01",
      type: "income",
    },
    {
      amount: "82.50",
      category: categoriesResponse.categories[1],
      created_at: "2026-09-02T12:00:00+00:00",
      description: "Weekly groceries",
      id: 2,
      transaction_date: "2026-09-02",
      type: "expense",
    },
  ],
};

function emptyTransactionsResponse() {
  return {
    page: 1,
    per_page: 100,
    total: 0,
    transactions: [],
  };
}

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
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

function renderTransactionsPage() {
  return render(<TransactionsPage />);
}

function mockInitialLoad(transactions = transactionsResponse) {
  mockedApiClient
    .mockResolvedValueOnce(categoriesResponse)
    .mockResolvedValueOnce(transactions);
}

function getTransactionFormCategory() {
  const [transactionCategory] = screen.getAllByLabelText("Category");
  return transactionCategory;
}

function getFilterType() {
  const [, filterType] = screen.getAllByLabelText("Type");
  return filterType;
}

function submitTransactionForm() {
  const addTransactionButton = screen.getByRole("button", {
    name: "Add transaction",
  });

  const form = addTransactionButton.closest("form");

  if (!form) {
    throw new Error("Unable to find the transaction form.");
  }

  fireEvent.submit(form, {
    preventDefault: vi.fn(),
  });
}

describe("TransactionsPage", () => {
  it("loads and displays income and expense transactions", async () => {
    setAuthenticatedUser();
    mockInitialLoad();

    renderTransactionsPage();

    expect(
      await screen.findByText("September salary"),
    ).toBeInTheDocument();

    expect(screen.getAllByText("Salary")).toHaveLength(2);
    expect(screen.getAllByText("Groceries")).toHaveLength(3);

    expect(screen.getByText("+$2,500.00")).toBeInTheDocument();
    expect(screen.getByText("-$82.50")).toBeInTheDocument();

    expect(mockedApiClient).toHaveBeenCalledWith("/categories", {
      method: "GET",
      token: "test-token",
    });

    expect(mockedApiClient).toHaveBeenCalledWith(
      "/transactions?page=1&per_page=100",
      {
        method: "GET",
        token: "test-token",
      },
    );
  });

  it("shows an empty state when no transactions match the filters", async () => {
    setAuthenticatedUser();
    mockInitialLoad(emptyTransactionsResponse());

    renderTransactionsPage();

    expect(
      await screen.findByText(
        "No transactions match your current filters.",
      ),
    ).toBeInTheDocument();
  });

  it("shows a validation message when no category is selected", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();
    mockInitialLoad();

    renderTransactionsPage();

    await screen.findByText("September salary");

    await user.type(screen.getByLabelText("Amount"), "25");

    submitTransactionForm();

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Select a category before saving the transaction.",
    );

    expect(mockedApiClient).toHaveBeenCalledTimes(2);
  });

  it("creates an expense transaction and reloads transactions", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();

    const createdTransaction = {
      amount: "45.25",
      category: categoriesResponse.categories[1],
      created_at: "2026-09-24T12:00:00+00:00",
      description: "Farmers market",
      id: 3,
      transaction_date: "2026-09-24",
      type: "expense",
    };

    mockedApiClient
      .mockResolvedValueOnce(categoriesResponse)
      .mockResolvedValueOnce(emptyTransactionsResponse())
      .mockResolvedValueOnce({
        transaction: createdTransaction,
      })
      .mockResolvedValueOnce({
        page: 1,
        per_page: 100,
        total: 1,
        transactions: [createdTransaction],
      });

    renderTransactionsPage();

    await screen.findByText(
      "No transactions match your current filters.",
    );

    await user.type(screen.getByLabelText("Amount"), "45.25");

    await user.selectOptions(
      getTransactionFormCategory(),
      "2",
    );

    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2026-09-24" },
    });

    await user.type(
      screen.getByLabelText(/Description/),
      "  Farmers market  ",
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction",
      }),
    );

    await waitFor(() => {
      expect(mockedApiClient).toHaveBeenCalledWith("/transactions", {
        body: {
          amount: "45.25",
          category_id: 2,
          description: "Farmers market",
          transaction_date: "2026-09-24",
          type: "expense",
        },
        method: "POST",
        token: "test-token",
      });
    });

    const successMessage = await screen.findByRole("status");

    expect(successMessage).toHaveTextContent(
      "Transaction added successfully.",
    );

    expect(
      await screen.findByText("Farmers market"),
    ).toBeInTheDocument();

    expect(screen.getByText("-$45.25")).toBeInTheDocument();
  });

  it("shows a backend validation error when creation fails", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();

    mockedApiClient
      .mockResolvedValueOnce(categoriesResponse)
      .mockResolvedValueOnce(emptyTransactionsResponse())
      .mockRejectedValueOnce(
        new ApiError("Validation failed.", 400, {
          amount: ["Amount must be greater than zero."],
        }),
      );

    renderTransactionsPage();

    await screen.findByText(
      "No transactions match your current filters.",
    );

    await user.type(screen.getByLabelText("Amount"), "0");

    await user.selectOptions(
      getTransactionFormCategory(),
      "2",
    );

    submitTransactionForm();

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Amount must be greater than zero.");
  });

  it("reloads transactions when a type filter changes", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();
    mockInitialLoad();

    mockedApiClient.mockResolvedValueOnce({
      page: 1,
      per_page: 100,
      total: 1,
      transactions: [transactionsResponse.transactions[1]],
    });

    renderTransactionsPage();

    await screen.findByText("September salary");

    await user.selectOptions(getFilterType(), "expense");

    await waitFor(() => {
      expect(mockedApiClient).toHaveBeenCalledWith(
        "/transactions?page=1&per_page=100&type=expense",
        {
          method: "GET",
          token: "test-token",
        },
      );
    });

    expect(
      await screen.findByText("Weekly groceries"),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("September salary"),
    ).not.toBeInTheDocument();
  });

  it("deletes a transaction after confirmation", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();
    mockInitialLoad();

    vi.spyOn(window, "confirm").mockReturnValue(true);

    mockedApiClient.mockResolvedValueOnce(undefined);

    renderTransactionsPage();

    await screen.findByText("Weekly groceries");

    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete",
    });

    await user.click(deleteButtons[1]);

    await waitFor(() => {
      expect(mockedApiClient).toHaveBeenCalledWith(
        "/transactions/2",
        {
          method: "DELETE",
          token: "test-token",
        },
      );
    });

    expect(
      await screen.findByRole("status"),
    ).toHaveTextContent("Transaction deleted.");

    expect(
      screen.queryByText("Weekly groceries"),
    ).not.toBeInTheDocument();

    expect(screen.getByText("September salary")).toBeInTheDocument();
  });

  it("does not delete a transaction when confirmation is cancelled", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();
    mockInitialLoad();

    vi.spyOn(window, "confirm").mockReturnValue(false);

    renderTransactionsPage();

    await screen.findByText("Weekly groceries");

    const deleteButtons = screen.getAllByRole("button", {
      name: "Delete",
    });

    await user.click(deleteButtons[1]);

    expect(mockedApiClient).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Weekly groceries")).toBeInTheDocument();
  });

  it("shows an error and retries after transaction loading fails", async () => {
    const user = userEvent.setup();

    setAuthenticatedUser();

    mockedApiClient
      .mockResolvedValueOnce(categoriesResponse)
      .mockRejectedValueOnce(new Error("Network failure"))
      .mockResolvedValueOnce(transactionsResponse);

    renderTransactionsPage();

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(
      "Unable to load transactions. Please try again.",
    );

    await user.click(
      screen.getByRole("button", { name: "Try again" }),
    );

    expect(
      await screen.findByText("September salary"),
    ).toBeInTheDocument();

    expect(mockedApiClient).toHaveBeenCalledWith(
      "/transactions?page=1&per_page=100",
      {
        method: "GET",
        token: "test-token",
      },
    );
  });

  it("logs out when either initial request returns 401", async () => {
    const logout = setAuthenticatedUser();

    mockedApiClient.mockRejectedValue(
      new ApiError("Access token has expired.", 401),
    );

    renderTransactionsPage();

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });

    expect(logout.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(mockedApiClient).toHaveBeenCalled();
  });
});