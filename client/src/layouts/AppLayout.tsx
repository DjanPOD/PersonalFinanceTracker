import type { ReactNode } from "react";

import { Navigation } from "../components/Navigation";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <Navigation />
      <main className="page-content">{children}</main>
    </div>
  );
}