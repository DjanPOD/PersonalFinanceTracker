import { NavLink } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const navigationItems = [
  { label: "Dashboard", to: "/" },
  { label: "Transactions", to: "/transactions" },
  { label: "Categories", to: "/categories" },
];

export function Navigation() {
  const { isAuthenticated, logout, user } = useAuth();

  return (
    <header className="site-header">
      <nav className="site-navigation" aria-label="Main navigation">
        <NavLink className="brand" to="/">
          Ledgerly
        </NavLink>

        {isAuthenticated ? (
          <>
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
              <span className="user-greeting">Hi, {user?.name}</span>
              <button
                className="nav-link nav-button"
                onClick={logout}
                type="button"
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <div className="navigation-links">
            <NavLink className="nav-link" to="/login">
              Log in
            </NavLink>
            <NavLink className="button button-small" to="/register">
              Create account
            </NavLink>
          </div>
        )}
      </nav>
    </header>
  );
}