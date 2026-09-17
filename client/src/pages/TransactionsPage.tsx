import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  CategoriesResponse,
  Category,
  CreateTransactionPayload,
  CreateTransactionResponse,
  Transaction,
  TransactionsResponse,
} from "../types/transactions";
import { formatCurrency, formatDate } from "../utils/formatters";

const TODAY = new Date().toISOString().slice(0, 10);

type TransactionType = "income" | "expense";

type TransactionFormState = {
  amount: string;
  categoryId: string;
  description: string;
  transactionDate: string;
  type: TransactionType;
};

const initialFormState: TransactionFormState = {
  amount: "",
  categoryId: "",
  description: "",
  transactionDate: TODAY,
  type: "expense",
};

function getTokenOrLogout(logout: () => void): string | null {
  const token = localStorage.getItem("ledgerly_access_token");

  if (!token) {
    logout();
    return null;
  }

  return token;
}

export function TransactionsPage() {
  const { logout } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [formState, setFormState] =
    useState<TransactionFormState>(initialFormState);

  const [filterType, setFilterType] = useState<"" | TransactionType>("");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const availableCategories = useMemo(
    () => categories.filter((category) => category.type === formState.type),
    [categories, formState.type],
  );

  const filteredCategories = useMemo(
    () =>
      filterType
        ? categories.filter((category) => category.type === filterType)
        : categories,
    [categories, filterType],
  );

  const loadTransactions = useCallback(async () => {
    const token = getTokenOrLogout(logout);

    if (!token) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const params = new URLSearchParams({
        page: "1",
        per_page: "100",
      });

      if (filterType) {
        params.set("type", filterType);
      }

      if (filterCategoryId) {
        params.set("category_id", filterCategoryId);
      }

      if (startDate) {
        params.set("start_date", startDate);
      }

      if (endDate) {
        params.set("end_date", endDate);
      }

      const response = await apiClient<TransactionsResponse>(
        `/transactions?${params.toString()}`,
        {
          method: "GET",
          token,
        },
      );

      setTransactions(response.transactions);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load transactions. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    endDate,
    filterCategoryId,
    filterType,
    logout,
    startDate,
  ]);

  const loadCategories = useCallback(async () => {
    const token = getTokenOrLogout(logout);

    if (!token) {
      return;
    }

    try {
      const response = await apiClient<CategoriesResponse>("/categories", {
        method: "GET",
        token,
      });

      setCategories(response.categories);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setErrorMessage("Unable to load transaction categories.");
    }
  }, [logout]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  function updateForm(
    field: keyof TransactionFormState,
    value: string,
  ) {
    setFormState((current) => ({
      ...current,
      [field]: value,
      ...(field === "type" ? { categoryId: "" } : {}),
    }));
  }

  function clearFilters() {
    setFilterType("");
    setFilterCategoryId("");
    setStartDate("");
    setEndDate("");
  }

  async function handleCreateTransaction(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getTokenOrLogout(logout);

    if (!token) {
      return;
    }

    setFormError("");
    setSuccessMessage("");

    if (!formState.categoryId) {
      setFormError("Select a category before saving the transaction.");
      return;
    }

    setIsSubmitting(true);

    const payload: CreateTransactionPayload = {
      amount: formState.amount,
      type: formState.type,
      description: formState.description.trim(),
      transaction_date: formState.transactionDate,
      category_id: Number(formState.categoryId),
    };

    try {
      await apiClient<CreateTransactionResponse>("/transactions", {
        method: "POST",
        token,
        body: payload,
      });

      setFormState(initialFormState);
      setSuccessMessage("Transaction added successfully.");
      await loadTransactions();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      if (error instanceof ApiError) {
        const fieldErrors = error.errors
          ? Object.values(error.errors).join(" ")
          : "";

        setFormError(fieldErrors || error.message);
      } else {
        setFormError("Unable to add the transaction. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteTransaction(transactionId: number) {
    const confirmed = window.confirm(
      "Delete this transaction? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    const token = getTokenOrLogout(logout);

    if (!token) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    try {
      await apiClient<void>(`/transactions/${transactionId}`, {
        method: "DELETE",
        token,
      });

      setTransactions((current) =>
        current.filter((transaction) => transaction.id !== transactionId),
      );
      setSuccessMessage("Transaction deleted.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setErrorMessage("Unable to delete the transaction. Please try again.");
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your activity</p>
          <h1>Transactions</h1>
          <p className="page-description">
            Add, organize, filter, and review your income and expenses.
          </p>
        </div>
      </div>

      <section className="content-card transaction-form-card">
        <h2>Add a transaction</h2>
        <p className="muted-text">
          Record income or expenses to keep your dashboard up to date.
        </p>

        <form
          className="transaction-form"
          onSubmit={handleCreateTransaction}
        >
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="transaction-form-grid">
            <div className="form-field">
              <label htmlFor="transaction-type">Type</label>
              <select
                id="transaction-type"
                onChange={(event) => updateForm("type", event.target.value)}
                value={formState.type}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="transaction-amount">Amount</label>
              <input
                id="transaction-amount"
                inputMode="decimal"
                min="0.01"
                onChange={(event) => updateForm("amount", event.target.value)}
                placeholder="0.00"
                required
                step="0.01"
                type="number"
                value={formState.amount}
              />
            </div>

            <div className="form-field">
              <label htmlFor="transaction-category">Category</label>
              <select
                id="transaction-category"
                onChange={(event) =>
                  updateForm("categoryId", event.target.value)
                }
                required
                value={formState.categoryId}
              >
                <option value="">Select a category</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="transaction-date">Date</label>
              <input
                id="transaction-date"
                onChange={(event) =>
                  updateForm("transactionDate", event.target.value)
                }
                required
                type="date"
                value={formState.transactionDate}
              />
            </div>

            <div className="form-field transaction-description-field">
              <label htmlFor="transaction-description">
                Description <span className="optional-label">(optional)</span>
              </label>
              <input
                id="transaction-description"
                maxLength={255}
                onChange={(event) =>
                  updateForm("description", event.target.value)
                }
                placeholder="For example, weekly grocery shopping"
                type="text"
                value={formState.description}
              />
            </div>
          </div>

          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving…" : "Add transaction"}
          </button>
        </form>
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <h2>All transactions</h2>
            <p className="muted-text">
              Use filters to find specific income and expense records.
            </p>
          </div>
        </div>

        <div className="transaction-filters">
          <div className="form-field">
            <label htmlFor="filter-type">Type</label>
            <select
              id="filter-type"
              onChange={(event) => {
                setFilterType(event.target.value as "" | TransactionType);
                setFilterCategoryId("");
              }}
              value={filterType}
            >
              <option value="">All types</option>
              <option value="income">Income</option>
              <option value="expense">Expenses</option>
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              onChange={(event) => setFilterCategoryId(event.target.value)}
              value={filterCategoryId}
            >
              <option value="">All categories</option>
              {filteredCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="filter-start-date">From</label>
            <input
              id="filter-start-date"
              onChange={(event) => setStartDate(event.target.value)}
              type="date"
              value={startDate}
            />
          </div>

          <div className="form-field">
            <label htmlFor="filter-end-date">To</label>
            <input
              id="filter-end-date"
              onChange={(event) => setEndDate(event.target.value)}
              type="date"
              value={endDate}
            />
          </div>

          <button
            className="button button-secondary filter-clear-button"
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        </div>

        {successMessage ? (
          <p className="form-success transaction-feedback" role="status">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <div className="transaction-feedback">
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
            <button
              className="button button-secondary"
              onClick={loadTransactions}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <p className="transaction-loading">
            Loading transactions…
          </p>
        ) : null}

        {!isLoading && !errorMessage && transactions.length === 0 ? (
          <div className="dashboard-empty-state">
            <p className="muted-text">
              No transactions match your current filters.
            </p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && transactions.length > 0 ? (
          <div className="transactions-table-wrapper">
            <table className="transactions-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Description</th>
                  <th scope="col">Category</th>
                  <th scope="col">Type</th>
                  <th scope="col">Amount</th>
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.transaction_date)}</td>
                    <td>{transaction.description ?? "—"}</td>
                    <td>
                      <span className="category-table-label">
                        <span
                          className="category-color-dot"
                          style={{
                            backgroundColor:
                              transaction.category?.color ?? "#94A3B8",
                          }}
                        />
                        {transaction.category?.name ?? "Uncategorized"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          transaction.type === "income"
                            ? "transaction-type transaction-type-income"
                            : "transaction-type transaction-type-expense"
                        }
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td
                      className={
                        transaction.type === "income"
                          ? "amount-cell transaction-amount-income"
                          : "amount-cell transaction-amount-expense"
                      }
                    >
                      {transaction.type === "income" ? "+" : "-"}
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td>
                      <button
                        className="text-button danger-button"
                        onClick={() =>
                          void handleDeleteTransaction(transaction.id)
                        }
                        type="button"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </section>
  );
}