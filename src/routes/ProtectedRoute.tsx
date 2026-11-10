import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Button } from "../components/Button";
import { ErrorState, ForbiddenState } from "../components/ErrorState";
import { Sidebar } from "../components/Sidebar";
import { IconFlame, IconMenu } from "../components/icons";
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

/**
 * Layout padrão: menu lateral fixo + conteúdo, a partir de 1024px. Abaixo disso (celular,
 * tablet em pé) o menu vira gaveta aberta por um botão na barra do topo.
 */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <div className="flex h-screen flex-col bg-ivory lg:flex-row">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          aria-controls="menu-principal"
          className="flex h-10 w-10 items-center justify-center rounded-field text-ink hover:bg-ivory"
        >
          <IconMenu width={22} height={22} />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-north text-white">
          <IconFlame width={18} height={18} />
        </div>
        <span className="font-display text-base font-semibold text-ink">Centric</span>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden
        />
      )}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <Outlet />
      </main>
    </div>
  );
}
