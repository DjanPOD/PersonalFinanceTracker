export type Category = {
  id: number;
  name: string;
  type: "income" | "expense";
  color: string | null;
  created_at: string;
};

export type CategoriesResponse = {
  categories: Category[];
};

export type Transaction = {
  id: number;
  amount: string;
  type: "income" | "expense";
  description: string | null;
  transaction_date: string;
  created_at: string;
  category: Category | null;
};

export type Pagination = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_previous: boolean;
};

export type TransactionsResponse = {
  transactions: Transaction[];
  pagination: Pagination;
};

export type CreateTransactionPayload = {
  amount: string;
  type: "income" | "expense";
  description: string;
  transaction_date: string;
  category_id: number;
};

export type CreateTransactionResponse = {
  transaction: Transaction;
};