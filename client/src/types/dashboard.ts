export type DashboardCategoryTotal = {
  category_id: number;
  category_name: string;
  category_color: string | null;
  amount: string;
};

export type DashboardTransactionCategory = {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string | null;
  created_at: string;
};

export type DashboardTransaction = {
  id: number;
  amount: string;
  type: "income" | "expense";
  description: string | null;
  transaction_date: string;
  created_at: string;
  category: DashboardTransactionCategory | null;
};

export type DashboardSummaryResponse = {
  period: {
    month: string;
    start_date: string;
    end_date: string;
  };
  summary: {
    total_income: string;
    total_expenses: string;
    balance: string;
  };
  expenses_by_category: DashboardCategoryTotal[];
  recent_transactions: DashboardTransaction[];
};