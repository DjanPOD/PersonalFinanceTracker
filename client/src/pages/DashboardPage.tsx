import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ApiError, apiClient } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type {
  DashboardSummaryResponse,
  DashboardTransaction,
} from "../types/dashboard";
import {
  formatCurrency,
  formatDate,
  formatMonth,
  getCurrentMonth,
} from "../utils/formatters";
import { ExpenseBreakdownChart } from "../components/charts/ExpenseBreakdownChart";

type SummaryCardProps = {
  label: string;
  value: string;
  variant?: "default" | "income" | "expense";
};

function SummaryCard({
  label,
  value,
  variant = "default",
}: SummaryCardProps) {
  return (
    <article className={`summary-card summary-card-${variant}`}>
      <p className="summary-label">{label}</p>
      <p className="summary-value">{value}</p>
    </article>
  );
}

type RecentTransactionRowProps = {
  transaction: DashboardTransaction;
};

function RecentTransactionRow({
  transaction,
}: RecentTransactionRowProps) {
  const description = transaction.description ?? "No description";
  const categoryName = transaction.category?.name ?? "Uncategorized";
  const amountPrefix = transaction.type === "expense" ? "-" : "+";

  return (
    <li className="transaction-row">
      <div className="transaction-row-main">
        <p className="transaction-description">{description}</p>
        <p className="transaction-meta">
          {categoryName} · {formatDate(transaction.transaction_date)}
        </p>
      </div>

      <p
        className={
          transaction.type === "expense"
            ? "transaction-amount transaction-amount-expense"
            : "transaction-amount transaction-amount-income"
        }
      >
        {amountPrefix}
        {formatCurrency(transaction.amount)}
      </p>
    </li>
  );
}

export function DashboardPage() {
  const { logout } = useAuth();

  const [month, setMonth] = useState(getCurrentMonth);
  const [dashboardData, setDashboardData] =
    useState<DashboardSummaryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const token = localStorage.getItem("ledgerly_access_token");

      if (!token) {
        logout();
        return;
      }

      const response = await apiClient<DashboardSummaryResponse>(
        `/dashboard/summary?month=${month}`,
        {
          method: "GET",
          token,
        },
      );

      setDashboardData(response);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout();
        return;
      }

      setErrorMessage(
        "Unable to load your dashboard. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [logout, month]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const expenses = dashboardData?.expenses_by_category ?? [];
  const recentTransactions = dashboardData?.recent_transactions ?? [];
  const maxCategoryAmount = Math.max(
    ...expenses.map((category) => Number(category.amount)),
    0,
  );

  return (
    <section>
      <div className="page-heading">
        <div>
          <p className="eyebrow">Personal finance, made clear</p>
          <h1>Dashboard</h1>
          <p className="page-description">
            See your income, expenses, and financial progress for the month.
          </p>
        </div>

        <label className="month-picker">
          <span>Month</span>
          <input
            aria-label="Select dashboard month"
            onChange={(event) => setMonth(event.target.value)}
            type="month"
            value={month}
          />
        </label>
      </div>

      {errorMessage ? (
        <section className="content-card dashboard-error">
          <h2>Dashboard unavailable</h2>
          <p className="muted-text">{errorMessage}</p>
          <button className="button" onClick={loadDashboard} type="button">
            Try again
          </button>
        </section>
      ) : null}

      {isLoading ? (
        <section className="content-card dashboard-loading">
          <p>Loading your financial summary…</p>
        </section>
      ) : null}

      {!isLoading && !errorMessage && dashboardData ? (
        <>
          <p className="dashboard-period">
            Summary for {formatMonth(dashboardData.period.month)}
          </p>

          <div className="summary-grid">
            <SummaryCard
              label="Income"
              value={formatCurrency(
                dashboardData.summary.total_income,
              )}
              variant="income"
            />
            <SummaryCard
              label="Expenses"
              value={formatCurrency(
                dashboardData.summary.total_expenses,
              )}
              variant="expense"
            />
            <SummaryCard
              label="Balance"
              value={formatCurrency(dashboardData.summary.balance)}
            />
          </div>
          
          <section className="content-card chart-card">
            <div className="section-heading">
              <div>
                <h2>Expense breakdown</h2>
                <p className="muted-text">
                  Where your spending went in {formatMonth(dashboardData.period.month)}.
                </p>
              </div>
            </div>

            <ExpenseBreakdownChart expenses={expenses} />
          </section>

          <div className="dashboard-grid">
            <section className="content-card">
              <div className="section-heading">
                <div>
                  <h2>Spending by category</h2>
                  <p className="muted-text">
                    Expense totals for {formatMonth(dashboardData.period.month)}.
                  </p>
                </div>
              </div>

              {expenses.length > 0 ? (
                <ul className="category-breakdown">
                  {expenses.map((category) => {
                    const width =
                      maxCategoryAmount > 0
                        ? (Number(category.amount) / maxCategoryAmount) * 100
                        : 0;

                    return (
                      <li className="category-breakdown-item" key={category.category_id}>
                        <div className="category-breakdown-label">
                          <span className="category-name">
                            <span
                              className="category-color-dot"
                              style={{
                                backgroundColor:
                                  category.category_color ?? "#94A3B8",
                              }}
                            />
                            {category.category_name}
                          </span>
                          <span>{formatCurrency(category.amount)}</span>
                        </div>

                        <div
                          aria-label={`${category.category_name}: ${formatCurrency(
                            category.amount,
                          )}`}
                          className="category-progress-track"
                        >
                          <div
                            className="category-progress-fill"
                            style={{
                              backgroundColor:
                                category.category_color ?? "#94A3B8",
                              width: `${width}%`,
                            }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="dashboard-empty-state">
                  <p className="muted-text">
                    No expenses recorded for this month yet.
                  </p>
                  <Link className="button button-secondary" to="/transactions">
                    View transactions
                  </Link>
                </div>
              )}
            </section>

            <section className="content-card">
              <div className="section-heading">
                <div>
                  <h2>Recent transactions</h2>
                  <p className="muted-text">
                    Your five most recent transactions this month.
                  </p>
                </div>
                <Link className="text-link" to="/transactions">
                  View all
                </Link>
              </div>

              {recentTransactions.length > 0 ? (
                <ul className="transaction-list">
                  {recentTransactions.map((transaction) => (
                    <RecentTransactionRow
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))}
                </ul>
              ) : (
                <div className="dashboard-empty-state">
                  <p className="muted-text">
                    No transactions recorded for this month yet.
                  </p>
                  <Link className="button button-secondary" to="/transactions">
                    Add transactions
                  </Link>
                </div>
              )}
            </section>
          </div>
        </>
      ) : null}
    </section>
  );
}