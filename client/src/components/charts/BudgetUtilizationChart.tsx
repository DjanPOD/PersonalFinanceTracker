import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Budget } from "../../types/budgets";
import { formatCurrency } from "../../utils/formatters";

type BudgetUtilizationChartProps = {
  budgets: Budget[];
};

type ChartDatum = {
  budget: number;
  category: string;
  color: string;
  percentUsed: number;
  spent: number;
};

type TooltipPayload = {
  payload?: ChartDatum;
};

function BudgetTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.[0]?.payload) {
    return null;
  }

  const item = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{item.category}</p>
      <p className="chart-tooltip-value">
        {formatCurrency(String(item.spent))} spent of{" "}
        {formatCurrency(String(item.budget))}
      </p>
      <p className="chart-tooltip-value">
        {item.percentUsed.toFixed(2)}% used
      </p>
    </div>
  );
}

export function BudgetUtilizationChart({
  budgets,
}: BudgetUtilizationChartProps) {
  const data: ChartDatum[] = budgets.map((budget) => ({
    budget: Number(budget.amount),
    category: budget.category?.name ?? "Uncategorized",
    color: budget.category?.color ?? "#94A3B8",
    percentUsed: budget.progress_percentage,
    spent: Number(budget.spent),
  }));

  if (data.length === 0) {
    return (
      <div className="chart-empty-state">
        <p className="muted-text">
          Create a budget to see your spending progress chart.
        </p>
      </div>
    );
  }

  return (
    <div className="budget-chart">
      <ResponsiveContainer height={Math.max(240, data.length * 58)} width="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{
            bottom: 8,
            left: 12,
            right: 24,
            top: 8,
          }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            type="number"
          />
          <YAxis
            dataKey="category"
            tickLine={false}
            type="category"
            width={96}
          />
          <Tooltip content={<BudgetTooltip />} cursor={{ fill: "#F8FAFC" }} />
          <Bar dataKey="percentUsed" maxBarSize={26} radius={[0, 5, 5, 0]}>
            {data.map((entry) => (
              <Cell
                fill={
                  entry.percentUsed >= 100
                    ? "#DC2626"
                    : entry.percentUsed >= 75
                      ? "#F59E0B"
                      : entry.color
                }
                key={entry.category}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}