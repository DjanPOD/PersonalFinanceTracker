const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatCurrency(amount: string | number): string {
  return currencyFormatter.format(amount);
}

export function formatDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`);
  return dateFormatter.format(date);
}

export function getCurrentMonth(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

export function formatMonth(monthValue: string): string {
  const [year, month] = monthValue.split("-").map(Number);
  const date = new Date(year, month - 1, 1);

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}