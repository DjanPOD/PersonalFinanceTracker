import { Link } from "react-router-dom";

export function LoginPage() {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in to Ledgerly</h1>
        <p className="page-description">
          Your login form will be added in the next feature.
        </p>
        <p className="muted-text">
          Need an account? <Link to="/register">Create one</Link>.
        </p>
      </div>
    </section>
  );
}