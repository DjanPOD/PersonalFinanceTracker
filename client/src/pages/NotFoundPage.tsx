import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="empty-state">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p className="page-description">
        The page you requested does not exist.
      </p>
      <Link className="button" to="/">
        Return to dashboard
      </Link>
    </section>
  );
}