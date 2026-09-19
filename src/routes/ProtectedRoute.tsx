import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../features/auth/AuthContext";
import { getToken, setStoredRedirect } from "../lib/storage";

export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!getToken()) {
    setStoredRedirect(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-ivory">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-north border-t-transparent"
          aria-label="Carregando"
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    setStoredRedirect(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-ivory">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
