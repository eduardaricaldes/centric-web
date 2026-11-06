import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { createMinistry, listMinistries, updateMinistry } from "../../api/ministries";
import type { MinistryItem } from "../../api/types";
import { Button } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input, Textarea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonTable } from "../../components/Skeleton";
import { IconEdit, IconPlus } from "../../components/icons";
import { getErrorMessage, isForbidden } from "../../lib/errors";
import { isAdmin } from "../../lib/permissions";
import { useAuth } from "../auth/AuthContext";

interface MinistryFormValue {
  name: string;
  description: string;
}

function MinistryFormDialog({
  title,
  initial,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  title: string;
  initial: MinistryFormValue;
  onClose: () => void;
  onSubmit: (value: MinistryFormValue) => void;
  submitting: boolean;
  error: unknown;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);

  return (
    <Dialog title={title} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ name, description });
        }}
        className="flex flex-col gap-4"
      >
        <Input
          label="Nome"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
        <Textarea
          label="Descrição (opcional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          hint={
            initial.description === "" && initial.name !== ""
              ? "Deixe em branco para manter a descrição atual."
              : undefined
          }
        />
        {error !== undefined && error !== null && (
          <p className="text-sm text-red">{getErrorMessage(error)}</p>
        )}
        <Button type="submit" loading={submitting} className="self-start" disabled={!name.trim()}>
          Salvar
        </Button>
      </form>
    </Dialog>
  );
}

export function MinistriesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const admin = isAdmin(user);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MinistryItem | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["ministries"],
    queryFn: () => listMinistries(),
  });

  const createMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) => createMinistry(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      setCreating(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { name: string; description: string | null } }) =>
      updateMinistry(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministries"] });
      setEditing(null);
    },
  });

  return (
    <div>
      <PageHeader
        title="Ministérios"
        description="Louvor, Mídia, Pregação — os times que organizam o culto."
        actions={
          admin ? (
            <Button icon={<IconPlus width={18} height={18} />} onClick={() => setCreating(true)}>
              Novo ministério
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <SkeletonTable rows={4} cols={2} />
      ) : isError ? (
        isForbidden(error) ? <ForbiddenState /> : <ErrorState error={error} onRetry={() => refetch()} />
      ) : data && data.items.length === 0 ? (
        <p className="rounded-card border border-dashed border-line px-6 py-12 text-center text-sm text-muted">
          Nenhum ministério cadastrado ainda.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <tbody>
              {data?.items.map((ministry) => (
                <tr key={ministry.id} className="border-b border-line last:border-0 hover:bg-ivory">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/ministries/${ministry.id}`}
                      className="font-medium text-ink hover:text-north"
                    >
                      {ministry.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {admin && (
                      <button
                        type="button"
                        onClick={() => setEditing(ministry)}
                        aria-label={`Editar ${ministry.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-field text-muted hover:bg-ivory hover:text-north"
                      >
                        <IconEdit width={16} height={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <MinistryFormDialog
          title="Novo ministério"
          initial={{ name: "", description: "" }}
          onClose={() => setCreating(false)}
          submitting={createMutation.isPending}
          error={createMutation.error}
          onSubmit={(value) =>
            createMutation.mutate({
              name: value.name.trim(),
              description: value.description.trim() || undefined,
            })
          }
        />
      )}

      {editing && (
        <MinistryFormDialog
          title={`Editar ${editing.name}`}
          initial={{ name: editing.name, description: editing.description ?? "" }}
          onClose={() => setEditing(null)}
          submitting={updateMutation.isPending}
          error={updateMutation.error}
          onSubmit={(value) =>
            updateMutation.mutate({
              id: editing.id,
              payload: {
                name: value.name.trim(),
                description: value.description.trim() || null,
              },
            })
          }
        />
      )}
    </div>
  );
}
