import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExpenseBreakdownChart } from "./ExpenseBreakdownChart";

vi.mock("recharts", () => ({
  Cell: ({
    fill,
  }: {
    fill?: string;
  }) => <div data-testid="chart-cell" data-fill={fill} />,

  Legend: () => <div data-testid="legend" />,

  Pie: ({
    children,
    data,
  }: {
    children?: ReactNode;
    data?: unknown[];
  }) => (
    <div
      data-testid="pie"
      data-item-count={data?.length ?? 0}
    >
      {children}
    </div>
  ),

  PieChart: ({
    children,
  }: {
    children?: ReactNode;
  }) => <div data-testid="pie-chart">{children}</div>,

  ResponsiveContainer: ({
    children,
  }: {
    children?: ReactNode;
  }) => (
    <div data-testid="responsive-container">
      {children}
    </div>
  ),

  Tooltip: () => <div data-testid="tooltip" />,
}));

const expenses = [
  {
    amount: "120.50",
    category_color: "#22C55E",
    category_id: 1,
    category_name: "Groceries",
  },
  {
    amount: "75.25",
    category_color: "#F97316",
    category_id: 2,
    category_name: "Dining",
  },
];

describe("ExpenseBreakdownChart", () => {
  it("shows an empty state when there are no expenses", () => {
    render(<ExpenseBreakdownChart expenses={[]} />);

    expect(
      screen.getByText(
        "Add expense transactions to see your spending breakdown.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.queryByTestId("pie-chart"),
    ).not.toBeInTheDocument();
  });

  it("renders a pie chart with expense data", () => {
    render(<ExpenseBreakdownChart expenses={expenses} />);

    expect(
      screen.getByTestId("responsive-container"),
    ).toBeInTheDocument();

    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();

    expect(screen.getByTestId("pie")).toHaveAttribute(
      "data-item-count",
      "2",
    );

    expect(screen.getAllByTestId("chart-cell")).toHaveLength(2);

    expect(
      screen.queryByText(
        "Add expense transactions to see your spending breakdown.",
      ),
    ).not.toBeInTheDocument();
  });

  it("uses each category color for its pie cell", () => {
    render(<ExpenseBreakdownChart expenses={expenses} />);

    const cells = screen.getAllByTestId("chart-cell");

    expect(cells[0]).toHaveAttribute(
      "data-fill",
      "#22C55E",
    );

    expect(cells[1]).toHaveAttribute(
      "data-fill",
      "#F97316",
    );
  });

  it("uses the fallback color when a category has no color", () => {
    render(
      <ExpenseBreakdownChart
        expenses={[
          {
            amount: "25.00",
            category_color: null,
            category_id: 3,
            category_name: "Other",
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