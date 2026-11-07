import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "../components/Button";
import { ErrorState, ForbiddenState } from "../components/ErrorState";
import { Sidebar } from "../components/Sidebar";
import { useAuth } from "../features/auth/AuthContext";
import { canAdminister } from "../lib/permissions";
import { getToken, setStoredRedirect } from "../lib/storage";

/** Só garante a sessão — sem menu lateral. Usado direto pelo modo palco, que ocupa a janela inteira. */
export function RequireAuth() {
  const { isLoading, isAuthenticated, error, refetchUser, logout } = useAuth();
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

  // O token continua salvo: 401 já foi tratado no client, aqui é rede ou servidor fora do ar.
  if (!isAuthenticated && error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ivory p-6">
        <ErrorState error={error} onRetry={refetchUser} />
        <Button variant="ghost" size="sm" onClick={logout}>
          Sair da conta
        </Button>
      </div>
    );
  }

  if (!isAuthenticated) {
    setStoredRedirect(location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Protege /admin/* de verdade — digitar a URL direto não abre a tela mesmo com o
 * menu escondido para quem não é ADMIN/LEADER (regra 5 do BRIEFING-ADMIN).
 */
export function RequireAdministration() {
  const { user } = useAuth();
  if (!canAdminister(user)) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <ForbiddenState message="Esta área é só para administração (ADMIN ou LEADER)." />
      </div>
    );
  }
  return <Outlet />;
}

/** Layout padrão: menu lateral fixo + conteúdo. Fica dentro de RequireAuth. */
export function AppLayout() {
  return (
    <div className="flex h-screen bg-ivory">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
