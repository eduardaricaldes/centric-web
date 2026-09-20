import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listMinistries, addMinistryMember, removeMinistryMember, updateMinistryMember } from "../../api/ministries";
import { listUsers } from "../../api/users";
import type { MinistryMember, MinistryRole } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { ConfirmDialog, Dialog } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Select } from "../../components/Select";
import { SkeletonLines } from "../../components/Skeleton";
import { IconChevronLeft, IconEdit, IconTrash, IconUsers } from "../../components/icons";
import { getErrorMessage, isForbidden } from "../../lib/errors";
import { canManage, isAdmin } from "../../lib/permissions";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { useAuth } from "../auth/AuthContext";
import { useMinistryMembers } from "../events/useMinistries";
import { MINISTRY_ROLE_LABEL } from "./labels";

function AddMemberPanel({
  ministryId,
  existingIds,
  canSetLeader,
}: {
  ministryId: number;
  existingIds: Set<number>;
  canSetLeader: boolean;
}) {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [selected, setSelected] = useState<{ id: number; name: string } | null>(null);
  const [role, setRole] = useState<MinistryRole>("MEMBER");
  const [instrument, setInstrument] = useState("");

  const searchQuery = useQuery({
    queryKey: ["users-search", debouncedSearch],
    queryFn: () => listUsers({ search: debouncedSearch || undefined, limit: 8 }),
    enabled: debouncedSearch.length > 0,
  });

  const addMutation = useMutation({
    mutationFn: () =>
      addMinistryMember(ministryId, {
        user_id: selected!.id,
        role,
        instrument: instrument.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-members", ministryId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelected(null);
      setSearchInput("");
      setRole("MEMBER");
      setInstrument("");
    },
  });

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h3 className="mb-3 font-display text-base font-semibold text-ink">Adicionar membro</h3>

      {!selected ? (
        <div className="flex flex-col gap-2">
          <Input
            label="Buscar pessoa"
            placeholder="Nome ou e-mail"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          {debouncedSearch && (
            <div className="flex flex-col gap-1">
              {searchQuery.isLoading ? (
                <SkeletonLines count={3} />
              ) : searchQuery.data && searchQuery.data.items.length === 0 ? (
                <p className="text-sm text-muted">Ninguém encontrado.</p>
              ) : (
                searchQuery.data?.items.map((person) => {
                  const already = existingIds.has(person.id);
                  return (
                    <button
                      key={person.id}
                      type="button"
                      disabled={already}
                      onClick={() => setSelected({ id: person.id, name: person.name })}
                      className="flex items-center justify-between rounded-field border border-line px-3 py-2 text-left text-sm hover:bg-ivory disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>
                        {person.name}{" "}
                        <span className="text-muted">— {person.email}</span>
                      </span>
                      {already && <span className="text-xs text-muted">Já é membro</span>}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-field border border-line bg-ivory px-3 py-2 text-sm">
            <span className="font-medium text-ink">{selected.name}</span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-north hover:text-north-deep"
            >
              Trocar
            </button>
          </div>

          <Select
            label="Papel no ministério"
            value={role}
            onChange={(event) => setRole(event.target.value as MinistryRole)}
          >
            <option value="MEMBER">Membro</option>
            {canSetLeader && <option value="LEADER">Líder</option>}
          </Select>

          <Input
            label="Instrumento (opcional)"
            value={instrument}
            onChange={(event) => setInstrument(event.target.value)}
          />

          {addMutation.isError && (
            <p className="text-sm text-red">{getErrorMessage(addMutation.error)}</p>
          )}

          <Button size="sm" loading={addMutation.isPending} onClick={() => addMutation.mutate()}>
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}

function EditMemberDialog({
  ministryId,
  member,
  canSetLeader,
  onClose,
}: {
  ministryId: number;
  member: MinistryMember;
  canSetLeader: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<MinistryRole>(member.role);
  const [instrument, setInstrument] = useState(member.instrument ?? "");

  const mutation = useMutation({
    mutationFn: () =>
      updateMinistryMember(ministryId, member.user_id, {
        role,
        instrument: instrument.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-members", ministryId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onClose();
    },
  });

  return (
    <Dialog title={`Editar ${member.name}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Select label="Papel no ministério" value={role} onChange={(e) => setRole(e.target.value as MinistryRole)}>
          <option value="MEMBER">Membro</option>
          {canSetLeader && <option value="LEADER">Líder</option>}
        </Select>
        <Input
          label="Instrumento (opcional)"
          value={instrument}
          onChange={(event) => setInstrument(event.target.value)}
        />
        {mutation.isError && <p className="text-sm text-red">{getErrorMessage(mutation.error)}</p>}
        <Button size="sm" loading={mutation.isPending} onClick={() => mutation.mutate()} className="self-start">
          Salvar
        </Button>
      </div>
    </Dialog>
  );
}

export function MinistryMembersPage() {
  const { id } = useParams<{ id: string }>();
  const ministryId = Number(id);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = canManage(user);
  const canSetLeader = isAdmin(user);

  const [editingMember, setEditingMember] = useState<MinistryMember | null>(null);
  const [removingMember, setRemovingMember] = useState<MinistryMember | null>(null);

  const ministriesQuery = useQuery({ queryKey: ["ministries"], queryFn: () => listMinistries() });
  const membersQuery = useMinistryMembers(ministryId);

  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeMinistryMember(ministryId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ministry-members", ministryId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setRemovingMember(null);
    },
  });

  const ministryName = ministriesQuery.data?.items.find((m) => m.id === ministryId)?.name;

  if (membersQuery.isError) {
    return isForbidden(membersQuery.error) ? (
      <ForbiddenState />
    ) : (
      <ErrorState error={membersQuery.error} onRetry={() => membersQuery.refetch()} />
    );
  }

  return (
    <div>
      <PageHeader
        title={ministryName ?? "Ministério"}
        description="Quem faz parte, com papel e instrumento."
        actions={
          <Link to="/admin/ministries" className="inline-flex">
            <Button variant="secondary" size="sm" icon={<IconChevronLeft width={16} height={16} />}>
              Ministérios
            </Button>
          </Link>
        }
      />

      <div className={`grid gap-6 ${canEdit ? "xl:grid-cols-[1fr_320px]" : ""}`}>
        <div>
          {membersQuery.isLoading ? (
            <SkeletonLines count={5} />
          ) : membersQuery.data && membersQuery.data.length === 0 ? (
            <EmptyState
              icon={<IconUsers width={28} height={28} />}
              title="Ninguém neste ministério ainda"
              description={canEdit ? "Use o painel ao lado para adicionar a primeira pessoa." : undefined}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {membersQuery.data?.map((member) => (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 rounded-field border border-line bg-surface px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{member.name}</p>
                    {member.instrument && (
                      <p className="truncate text-xs text-muted">{member.instrument}</p>
                    )}
                  </div>
                  <Badge tone={member.role === "LEADER" ? "amber" : "neutral"}>
                    {MINISTRY_ROLE_LABEL[member.role]}
                  </Badge>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingMember(member)}
                        aria-label={`Editar ${member.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-field text-muted hover:bg-ivory hover:text-north"
                      >
                        <IconEdit width={15} height={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRemovingMember(member)}
                        aria-label={`Remover ${member.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-field text-muted hover:bg-ivory hover:text-red"
                      >
                        <IconTrash width={15} height={15} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {canEdit && (
          <AddMemberPanel
            ministryId={ministryId}
            existingIds={new Set(membersQuery.data?.map((m) => m.user_id) ?? [])}
            canSetLeader={canSetLeader}
          />
        )}
      </div>

      {editingMember && (
        <EditMemberDialog
          ministryId={ministryId}
          member={editingMember}
          canSetLeader={canSetLeader}
          onClose={() => setEditingMember(null)}
        />
      )}

      {removingMember && (
        <ConfirmDialog
          title={`Remover ${removingMember.name}`}
          description="A pessoa sai deste ministério. A escala passada dela não se apaga."
          confirmLabel="Remover"
          danger
          loading={removeMutation.isPending}
          error={removeMutation.error}
          onCancel={() => setRemovingMember(null)}
          onConfirm={() => removeMutation.mutate(removingMember.user_id)}
        />
      )}
    </div>
  );
}
