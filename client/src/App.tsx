import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RegisterPage } from "./pages/RegisterPage";
import { TransactionsPage } from "./pages/TransactionsPage";

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
          path="/"
        />
        <Route
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
          path="/transactions"
        />
        <Route element={<LoginPage />} path="/login" />
        <Route element={<RegisterPage />} path="/register" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </AppLayout>
  );
}

export default App;