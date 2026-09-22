import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { DashboardCategoryTotal } from "../../types/dashboard";
import { formatCurrency } from "../../utils/formatters";

type ExpenseBreakdownChartProps = {
  expenses: DashboardCategoryTotal[];
};

type ChartDatum = {
  color: string;
  name: string;
  value: number;
};

type TooltipPayload = {
  payload?: ChartDatum;
  value?: number;
};

function ExpenseTooltip({
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
      <p className="chart-tooltip-title">{item.name}</p>
      <p className="chart-tooltip-value">
        {formatCurrency(String(item.value))}
      </p>
    </div>
  );
}

export function ExpenseBreakdownChart({
  expenses,
}: ExpenseBreakdownChartProps) {
  const data: ChartDatum[] = expenses.map((category) => ({
    color: category.category_color ?? "#94A3B8",
    name: category.category_name,
    value: Number(category.amount),
  }));

  if (data.length === 0) {
    return (
      <div className="chart-empty-state">
        <p className="muted-text">
          Add expense transactions to see your spending breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="expense-chart">
      <ResponsiveContainer height={300} width="100%">
        <PieChart>
          <Pie
            cx="50%"
            cy="45%"
            data={data}
            dataKey="value"
            innerRadius={64}
            nameKey="name"
            outerRadius={104}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell fill={entry.color} key={entry.name} />
            ))}
          </Pie>

          <Tooltip content={<ExpenseTooltip />} />
          <Legend
            formatter={(value: string) => value}
            iconType="circle"
            verticalAlign="bottom"
            wrapperStyle={{
              fontSize: "0.875rem",
              paddingTop: "0.5rem",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}