import { NavLink } from "react-router-dom";

const navigationItems = [
  { label: "Dashboard", to: "/" },
  { label: "Transactions", to: "/transactions" },
];

export function Navigation() {
  return (
    <header className="site-header">
      <nav className="site-navigation" aria-label="Main navigation">
        <NavLink className="brand" to="/">
          Ledgerly
        </NavLink>

        <div className="navigation-links">
          {navigationItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
              end={item.to === "/"}
              key={item.to}
              to={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="navigation-links">
          <NavLink className="nav-link" to="/login">
            Log in
          </NavLink>
          <NavLink className="button button-small" to="/register">
            Create account
          </NavLink>
        </div>
      </nav>
    </header>
  );
}