import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BudgetUtilizationChart } from "./BudgetUtilizationChart";

vi.mock("recharts", () => ({
  Bar: ({
    children,
  }: {
    children?: React.ReactNode;
  }) => <div data-testid="bar">{children}</div>,

  BarChart: ({
    children,
    data,
  }: {
    children?: React.ReactNode;
    data?: unknown[];
  }) => (
    <div
      data-testid="bar-chart"
      data-item-count={data?.length ?? 0}
    >
      {children}
    </div>
  ),

  CartesianGrid: () => <div data-testid="cartesian-grid" />,

  Cell: ({
    fill,
  }: {
    fill?: string;
  }) => <div data-testid="chart-cell" data-fill={fill} />,

  ResponsiveContainer: ({
    children,
  }: {
    children?: React.ReactNode;
  }) => <div data-testid="responsive-container">{children}</div>,

  Tooltip: () => <div data-testid="tooltip" />,

  XAxis: () => <div data-testid="x-axis" />,

  YAxis: () => <div data-testid="y-axis" />,
}));

const budget = {
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
  progress_percentage: 50,
  remaining: "250.00",
  spent: "250.00",
};

describe("BudgetUtilizationChart", () => {
  it("shows an empty state when there are no budgets", () => {
    render(<BudgetUtilizationChart budgets={[]} />);

    expect(
      screen.getByText(
        "Create a budget to see your spending progress chart.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId("bar-chart"),
    ).not.toBeInTheDocument();
  });

  it("renders a chart with budget data", () => {
    render(<BudgetUtilizationChart budgets={[budget]} />);

    expect(
      screen.getByTestId("responsive-container"),
    ).toBeInTheDocument();

    expect(screen.getByTestId("bar-chart")).toHaveAttribute(
      "data-item-count",
      "1",
    );

    expect(screen.getAllByTestId("chart-cell")).toHaveLength(1);

    expect(
      screen.queryByText(
        "Create a budget to see your spending progress chart.",
      ),
    ).not.toBeInTheDocument();
  });

  it("uses the category color below 75 percent utilization", () => {
    render(<BudgetUtilizationChart budgets={[budget]} />);

    expect(screen.getByTestId("chart-cell")).toHaveAttribute(
      "data-fill",
      "#22C55E",
    );
  });

  it("uses amber at 75 percent utilization or higher", () => {
    render(
      <BudgetUtilizationChart
        budgets={[
          {
            ...budget,
            progress_percentage: 75,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("chart-cell")).toHaveAttribute(
      "data-fill",
      "#F59E0B",
    );
  });

  it("uses red when a budget is at or over 100 percent", () => {
    render(
      <BudgetUtilizationChart
        budgets={[
          {
            ...budget,
            progress_percentage: 100,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("chart-cell")).toHaveAttribute(
      "data-fill",
      "#DC2626",
    );
  });

  it("uses fallback category data when a budget has no category", () => {
    render(
      <BudgetUtilizationChart
        budgets={[
          {
            ...budget,
            category: undefined,
          },
        ]}
      />,
    );

    expect(screen.getByTestId("chart-cell")).toHaveAttribute(
      "data-fill",
      "#94A3B8",
    );
  });
});