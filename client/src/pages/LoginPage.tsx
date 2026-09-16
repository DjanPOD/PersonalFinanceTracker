import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";

type LocationState = {
  from?: {
    pathname?: string;
  };
  message?: string;
};

export function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const state = location.state as LocationState | null;
  const destination = state?.from?.pathname ?? "/";
  const successMessage = state?.message ?? "";

  if (isAuthenticated) {
    return <Navigate replace to="/" />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setIsSubmitting(true);

    try {
      await login({
        email: email.trim(),
        password,
      });

      navigate(destination, { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to log in. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1>Log in to Ledgerly</h1>
        <p className="page-description">
          Access your transactions, spending categories, and monthly summary.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {formError ? (
            <p className="form-error" role="alert">
              {formError}
            </p>
          ) : null}

          {successMessage ? (
            <p className="form-success" role="status">
              {successMessage}
            </p>
          ) : null}

          <div className="form-field">
            <label htmlFor="email">Email address</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </div>

          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="muted-text auth-footer">
          Need an account? <Link to="/register">Create one</Link>.
        </p>
      </div>
    </section>
  );
}