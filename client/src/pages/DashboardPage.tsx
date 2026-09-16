export function DashboardPage() {
  return (
    <section>
      <p className="eyebrow">Personal finance, made clear</p>
      <h1>Dashboard</h1>
      <p className="page-description">
        Track your income, spending, and monthly financial progress in one
        place.
      </p>

      <div className="summary-grid">
        <article className="summary-card">
          <p className="summary-label">Income</p>
          <p className="summary-value">$0.00</p>
        </article>
        <article className="summary-card">
          <p className="summary-label">Expenses</p>
          <p className="summary-value">$0.00</p>
        </article>
        <article className="summary-card">
          <p className="summary-label">Balance</p>
          <p className="summary-value">$0.00</p>
        </article>
      </div>

      <section className="content-card">
        <h2>Recent transactions</h2>
        <p className="muted-text">
          Your most recent income and expenses will appear here.
        </p>
      </section>
    </section>
  );
}