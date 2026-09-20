import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { updateMe } from "../../api/auth";
import { Badge } from "../../components/Badge";
import { PageHeader } from "../../components/PageHeader";
import { getErrorMessage } from "../../lib/errors";
import { useAuth } from "../auth/AuthContext";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  LEADER: "Líder",
  MEMBER: "Membro",
};

export function Profile() {
  const { user, refetchUser } = useAuth();
  const [error, setError] = useState<unknown>(null);

  const mutation = useMutation({
    mutationFn: (prefersChords: boolean) => updateMe({ prefers_chords: prefersChords }),
    onSuccess: () => {
      setError(null);
      refetchUser();
    },
    onError: (err) => setError(err),
  });

  if (!user) return null;

  return (
    <div className="max-w-md">
      <PageHeader title="Perfil" />

      <div className="rounded-card border border-line bg-surface p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-north-tint text-lg font-semibold text-north">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-ink">{user.name}</p>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2">
          <span className="text-sm text-muted">Papel:</span>
          <Badge tone="north">{ROLE_LABEL[user.role] ?? user.role}</Badge>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-field border border-line px-3 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Sou músico, quero ver a cifra</p>
            <p className="text-xs text-muted">
              Decide se as músicas abrem em cifra ou em letra limpa por padrão.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 shrink-0 accent-north"
            checked={user.prefers_chords}
            disabled={mutation.isPending}
            onChange={(event) => mutation.mutate(event.target.checked)}
          />
        </label>

        {error !== null && <p className="mt-3 text-sm text-red">{getErrorMessage(error)}</p>}
      </div>
    </div>
  );
}
