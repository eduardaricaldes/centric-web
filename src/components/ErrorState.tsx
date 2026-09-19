import { Button } from "./Button";
import { getErrorMessage } from "../lib/errors";

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Estado obrigatório de erro: mensagem em português com saída (tentar de novo). */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-red/20 bg-red-tint px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-red">Algo deu errado</p>
      <p className="max-w-sm text-sm text-ink">{getErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar de novo
        </Button>
      )}
    </div>
  );
}

/** Estado obrigatório de "sem permissão": a API respondeu 403 de verdade. */
export function ForbiddenState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-ivory px-6 py-10 text-center">
      <p className="font-display text-lg font-semibold text-ink">Sem permissão</p>
      <p className="max-w-sm text-sm text-muted">
        {message ?? "Você não tem acesso para ver ou fazer isso."}
      </p>
    </div>
  );
}
