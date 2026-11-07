import { Link } from "react-router-dom";
import { Button } from "../components/Button";

/** Endereço que não existe, dentro do layout com menu lateral. */
export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-3 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">Página não encontrada</h1>
      <p className="text-sm text-muted">Este endereço não existe ou foi alterado.</p>
      <Link to="/" className="font-medium text-north hover:text-north-deep">
        Voltar para o início
      </Link>
    </div>
  );
}

/** Erro inesperado ao renderizar uma tela: substitui a tela padrão do React Router. */
export function RouteErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ivory p-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink">Algo deu errado</h1>
      <p className="max-w-sm text-sm text-muted">
        Esta tela teve um problema inesperado. Recarregue a página para tentar de novo.
      </p>
      <Button onClick={() => window.location.reload()}>Recarregar</Button>
    </div>
  );
}
