import { Link } from "react-router-dom";

export function RegisterPage() {
  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Start tracking today</p>
        <h1>Create your Ledgerly account</h1>
        <p className="page-description">
          Your registration form will be added in the next feature.
        </p>
        <p className="muted-text">
          Already have an account? <Link to="/login">Log in</Link>.
        </p>
      </div>
    </section>
  );
}