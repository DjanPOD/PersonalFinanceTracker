import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  Budget,
  BudgetsResponse,
  CreateBudgetPayload,
  CreateBudgetResponse,
} from "../types/budgets";
import type { CategoriesResponse, Category } from "../types/transactions";
import { formatCurrency, formatMonth, getCurrentMonth } from "../utils/formatters";

type BudgetFormState = {
  amount: string;
  categoryId: string;
};

const initialFormState: BudgetFormState = {
  amount: "",
  categoryId: "",
};

function getTokenOrLogout(logout: () => void): string | null {
  const token = localStorage.getItem("ledgerly_access_token");

  if (!token) {
    logout();
    return null;
  }

  return token;
}

function getProgressClass(budget: Budget): string {
  if (budget.progress_percentage >= 100) {
    return "budget-progress-fill budget-progress-over";
  }

  if (budget.progress_percentage >= 75) {
    return "budget-progress-fill budget-progress-warning";
  }

  return "budget-progress-fill";
}

function getBudgetStatus(budget: Budget): string {
  if (budget.progress_percentage > 100) {
    return `${formatCurrency(String(Math.abs(Number(budget.remaining))))} over budget`;
  }

  if (budget.progress_percentage === 100) {
    return "Budget limit reached";
  }

  return `${formatCurrency(budget.remaining)} remaining`;
}

export function BudgetsPage() {
  const { logout } = useAuth();

  const [month, setMonth] = useState(getCurrentMonth);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [formState, setFormState] =
    useState<BudgetFormState>(initialFormState);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const budgetedCategoryIds = useMemo(
    () =>
      new Set(
        budgets
          .map((budget) => budget.category?.id)
          .filter((categoryId): categoryId is number => categoryId !== undefined && categoryId !== null),
      ),
    [budgets],
  );

  const availableExpenseCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.type === "expense" &&
          !budgetedCategoryIds.has(category.id),
      ),
    [budgetedCategoryIds, categories],
  );

  const loadCategories = useCallback(async () => {
    const token = getTokenOrLogout(logout);

    if (!token) {
      return;
    }

    try {
      const response = await apiClient<CategoriesResponse>("/categories?type=expense", {
        method: "GET",
        token,
      });

      setCategories(response.categories);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setErrorMessage("Unable to load expense categories.");
    }
  }, [logout]);

  const loadBudgets = useCallback(async () => {
    const token = getTokenOrLogout(logout);

    if (!token) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient<BudgetsResponse>(
        `/budgets?month=${month}`,
        {
          method: "GET",
          token,
        },
      );

      setBudgets(response.budgets);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load budgets. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout, month]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadBudgets();
  }, [loadBudgets]);

  function updateForm(
    field: keyof BudgetFormState,
    value: string,
  ) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateBudget(
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
      setFormError("Select an expense category before saving the budget.");
      return;
    }

    setIsSubmitting(true);

    const payload: CreateBudgetPayload = {
      category_id: Number(formState.categoryId),
      amount: formState.amount,
      month,
    };

    try {
      await apiClient<CreateBudgetResponse>("/budgets", {
        method: "POST",
        token,
        body: payload,
      });

      setFormState(initialFormState);
      setSuccessMessage("Budget created successfully.");
      await loadBudgets();
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
        setFormError("Unable to create the budget. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteBudget(budgetId: number) {
    const confirmed = window.confirm(
      "Delete this budget? This cannot be undone.",
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
      await apiClient<void>(`/budgets/${budgetId}`, {
        method: "DELETE",
        token,
      });

      setBudgets((current) =>
        current.filter((budget) => budget.id !== budgetId),
      );
      setSuccessMessage("Budget deleted.");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setErrorMessage("Unable to delete the budget. Please try again.");
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Plan with purpose</p>
          <h1>Budgets</h1>
          <p className="page-description">
            Set monthly spending limits and follow your progress by category.
          </p>
        </div>

        <label className="month-picker">
          <span>Month</span>
          <input
            aria-label="Select budget month"
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
        </label>
      </div>

      <section className="content-card budget-form-card">
        <h2>Create a budget</h2>
        <p className="muted-text">
          Choose an expense category and set its spending limit for {formatMonth(month)}.
        </p>

        <form className="budget-form" onSubmit={handleCreateBudget}>
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          <div className="budget-form-grid">
            <div className="form-field">
              <label htmlFor="budget-category">Expense category</label>
              <select
                id="budget-category"
                onChange={(event) =>
                  updateForm("categoryId", event.target.value)
                }
                required
                value={formState.categoryId}
              >
                <option value="">Select a category</option>
                {availableExpenseCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="budget-amount">Monthly limit</label>
              <input
                id="budget-amount"
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
          </div>

          <button
            className="button"
            disabled={
              isSubmitting || availableExpenseCategories.length === 0
            }
            type="submit"
          >
            {isSubmitting ? "Saving…" : "Create budget"}
          </button>

          {availableExpenseCategories.length === 0 ? (
            <p className="muted-text budget-form-note">
              All of your expense categories already have a budget for this month,
              or you need to create an expense category first.
            </p>
          ) : null}
        </form>
      </section>

      <section className="content-card">
        <div className="section-heading">
          <div>
            <h2>Budget progress</h2>
            <p className="muted-text">
              Spending progress for {formatMonth(month)}.
            </p>
          </div>
        </div>

        {successMessage ? (
          <p className="form-success budget-feedback" role="status">
            {successMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <div className="budget-feedback">
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
            <button
              className="button button-secondary"
              onClick={loadBudgets}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : null}

        {isLoading ? (
          <p className="budget-loading">Loading budgets…</p>
        ) : null}

        {!isLoading && !errorMessage && budgets.length === 0 ? (
          <div className="dashboard-empty-state">
            <p className="muted-text">
              No budgets have been created for {formatMonth(month)} yet.
            </p>
          </div>
        ) : null}

        {!isLoading && !errorMessage && budgets.length > 0 ? (
          <div className="budget-grid">
            {budgets.map((budget) => {
              const progressWidth = Math.min(
                budget.progress_percentage,
                100,
              );

              return (
                <article className="budget-card" key={budget.id}>
                  <div className="budget-card-heading">
                    <div className="budget-category-name">
                      <span
                        className="category-color-dot"
                        style={{
                          backgroundColor:
                            budget.category?.color ?? "#94A3B8",
                        }}
                      />
                      <h3>{budget.category?.name ?? "Uncategorized"}</h3>
                    </div>

                    <button
                      className="text-button danger-button"
                      onClick={() => void handleDeleteBudget(budget.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="budget-amounts">
                    <span>
                      {formatCurrency(budget.spent)} spent
                    </span>
                    <span>
                      {formatCurrency(budget.amount)} limit
                    </span>
                  </div>

                  <div
                    aria-label={`${budget.category?.name ?? "Budget"}: ${budget.progress_percentage}% used`}
                    className="budget-progress-track"
                  >
                    <div
                      className={getProgressClass(budget)}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>

                  <div className="budget-card-footer">
                    <span>{budget.progress_percentage.toFixed(2)}% used</span>
                    <span
                      className={
                        budget.progress_percentage >= 100
                          ? "budget-status budget-status-over"
                          : "budget-status"
                      }
                    >
                      {getBudgetStatus(budget)}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </section>
  );
}