export function TransactionsPage() {
  return (
    <section>
      <p className="eyebrow">Your activity</p>
      <h1>Transactions</h1>
      <p className="page-description">
        Add, organize, and review every income and expense transaction.
      </p>

      <section className="content-card">
        <h2>No transactions yet</h2>
        <p className="muted-text">
          Once you add transactions, they will appear here.
        </p>
      </section>
    </section>
  );
}