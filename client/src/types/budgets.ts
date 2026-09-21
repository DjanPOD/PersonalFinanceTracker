import type { Category } from "./transactions";

export type Budget = {
  id: number;
  month: string;
  amount: string;
  spent: string;
  remaining: string;
  progress_percentage: number;
  category: Category | null;
  created_at: string;
};

export type BudgetsResponse = {
  budgets: Budget[];
};

export type CreateBudgetPayload = {
  category_id: number;
  amount: string;
  month: string;
};

export type CreateBudgetResponse = {
  budget: Budget;
};