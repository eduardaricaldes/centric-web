import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { listUsers, resetUserPassword, updateUserRole } from "../../api/users";
import type { User } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { ConfirmDialog, Dialog } from "../../components/Dialog";
import { CopyableLink } from "../../components/CopyableLink";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonTable } from "../../components/Skeleton";
import { IconChevronLeft, IconChevronRight, IconKey } from "../../components/icons";
import { formatTimestamp } from "../../lib/dates";
import { getErrorMessage, isForbidden } from "../../lib/errors";
import { canResetPassword, isAdmin } from "../../lib/permissions";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABEL, ROLE_TONE } from "./labels";

const LIMIT = 10;
const DEBOUNCE_MS = 400;

function ResetPasswordDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const mutation = useMutation({ mutationFn: () => resetUserPassword(user.id) });

  useEffect(() => {
    mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dispara uma vez ao abrir
  }, []);

  const link = mutation.data
    ? `${window.location.origin}/reset-password?token=${mutation.data.token}`
    : null;

  return (
    <Dialog title={`Link de nova senha para ${user.name}`} onClose={onClose}>
      {mutation.isPending && <p className="text-sm text-muted">Gerando link...</p>}
      {mutation.isError && <p className="text-sm text-red">{getErrorMessage(mutation.error)}</p>}
      {link && mutation.data && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-amber-ink">
            Este link aparece só nesta tela. Copie e envie agora.
          </p>
          <CopyableLink url={link} />
          <p className="text-xs text-muted">
            Expira em {formatTimestamp(mutation.data.expires_at)}.
          </p>
        </div>
      )}
    </Dialog>
  );
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebouncedValue(searchInput, DEBOUNCE_MS);

  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [roleTarget, setRoleTarget] = useState<{ user: User; nextRole: "ADMIN" | "MEMBER" } | null>(
    null,
  );

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set("search", debouncedSearch);
      else next.delete("search");
      next.delete("page");
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reagimos ao valor com debounce
  }, [debouncedSearch]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["users", { search, page }],
    queryFn: () => listUsers({ search: search || undefined, page, limit: LIMIT }),
    placeholderData: (previous) => previous,
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: "ADMIN" | "MEMBER" }) =>
      updateUserRole(id, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setRoleTarget(null);
    },
  });

  const goToPage = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;
  const admin = isAdmin(currentUser);

  return (
    <div>
      <PageHeader title="Pessoas" description="Quem tem conta no Centric." />

      <Input
        placeholder="Buscar por nome ou e-mail"
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        className="mb-5 w-full max-w-xs"
        aria-label="Buscar por nome ou e-mail"
      />

      {isLoading ? (
        <SkeletonTable rows={LIMIT} cols={4} />
      ) : isError ? (
        isForbidden(error) ? (
          <ForbiddenState />
        ) : (
          <ErrorState error={error} onRetry={() => refetch()} />
        )
      ) : data && data.items.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          {search ? "Nenhuma pessoa encontrada." : "Nenhuma pessoa cadastrada ainda."}
        </p>
      ) : (
        <div className={`overflow-x-auto rounded-card border border-line bg-surface ${isFetching ? "opacity-70" : ""}`}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {data?.items.map((item) => (
                <tr key={item.id} className="border-b border-line last:border-0 hover:bg-ivory">
                  <td className="px-4 py-3 font-medium text-ink">{item.name}</td>
                  <td className="px-4 py-3 text-muted">{item.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={ROLE_TONE[item.role]}>{ROLE_LABEL[item.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canResetPassword(currentUser, item) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<IconKey width={15} height={15} />}
                          onClick={() => setResetTarget(item)}
                        >
                          Gerar link
                        </Button>
                      )}
                      {admin && item.role !== "ADMIN" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRoleTarget({ user: item, nextRole: "ADMIN" })}
                        >
                          Promover a admin
                        </Button>
                      )}
                      {admin && item.role === "ADMIN" && item.id !== currentUser?.id && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRoleTarget({ user: item, nextRole: "MEMBER" })}
                        >
                          Rebaixar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            {data.total} pessoa{data.total === 1 ? "" : "s"} — página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              icon={<IconChevronLeft width={16} height={16} />}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Próxima
              <IconChevronRight width={16} height={16} />
            </Button>
          </div>
        </div>
      )}

      {resetTarget && (
        <ResetPasswordDialog user={resetTarget} onClose={() => setResetTarget(null)} />
      )}

      {roleTarget && (
        <ConfirmDialog
          title={roleTarget.nextRole === "ADMIN" ? "Promover a administrador" : "Rebaixar administrador"}
          description={
            roleTarget.nextRole === "ADMIN" ? (
              <>
                <strong>{roleTarget.user.name}</strong> vai poder administrar todo o sistema:
                pessoas, ministérios e convites.
              </>
            ) : (
              <>
                <strong>{roleTarget.user.name}</strong> deixa de ser administrador e volta a
                membro.
              </>
            )
          }
          confirmLabel={roleTarget.nextRole === "ADMIN" ? "Promover" : "Rebaixar"}
          danger={roleTarget.nextRole === "MEMBER"}
          loading={roleMutation.isPending}
          error={roleMutation.error}
          onCancel={() => setRoleTarget(null)}
          onConfirm={() =>
            roleMutation.mutate({ id: roleTarget.user.id, role: roleTarget.nextRole })
          }
        />
      )}
    </div>
  );
}
