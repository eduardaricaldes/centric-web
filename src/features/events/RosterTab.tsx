import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createAssignment, deleteAssignment } from "../../api/assignments";
import type { AssignmentDetail, EventDetail as EventDetailType, User } from "../../api/types";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { AssignmentStatusPill } from "../../components/StatusPill";
import { IconMic, IconTrash } from "../../components/icons";
import { getErrorMessage } from "../../lib/errors";
import { canManage } from "../../lib/permissions";
import { useMinistries, useMinistryMembers } from "./useMinistries";

function groupByMinistry(assignments: AssignmentDetail[]): Map<string, AssignmentDetail[]> {
  const groups = new Map<string, AssignmentDetail[]>();
  for (const assignment of assignments) {
    const key = assignment.ministry.name;
    const list = groups.get(key) ?? [];
    list.push(assignment);
    groups.set(key, list);
  }
  return groups;
}

function AssignPersonPanel({ eventId }: { eventId: number }) {
  const queryClient = useQueryClient();
  const [ministryId, setMinistryId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState("");
  const [notes, setNotes] = useState("");

  const ministriesQuery = useMinistries(true);
  const membersQuery = useMinistryMembers(ministryId);

  const assignMutation = useMutation({
    mutationFn: () =>
      createAssignment(eventId, {
        user_id: userId as number,
        ministry_id: ministryId as number,
        function: role,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      setUserId(null);
      setRole("");
      setNotes("");
    },
  });

  const canSubmit = ministryId !== null && userId !== null && role.trim().length > 0;

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h3 className="mb-3 font-display text-base font-semibold text-ink">Escalar alguém</h3>

      <div className="flex flex-col gap-3">
        <Select
          label="Ministério"
          value={ministryId ?? ""}
          onChange={(event) => {
            setMinistryId(event.target.value ? Number(event.target.value) : null);
            setUserId(null);
          }}
        >
          <option value="">Selecione...</option>
          {ministriesQuery.data?.items.map((ministry) => (
            <option key={ministry.id} value={ministry.id}>
              {ministry.name}
            </option>
          ))}
        </Select>

        <Select
          label="Pessoa"
          value={userId ?? ""}
          onChange={(event) => setUserId(event.target.value ? Number(event.target.value) : null)}
          disabled={ministryId === null}
        >
          <option value="">
            {ministryId === null
              ? "Escolha um ministério primeiro"
              : membersQuery.isLoading
                ? "Carregando..."
                : "Selecione..."}
          </option>
          {membersQuery.data?.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.name}
            </option>
          ))}
        </Select>

        <Input label="Função" placeholder="Ex.: Vocal, Baixo, Datashow" value={role} onChange={(e) => setRole(e.target.value)} />
        <Input label="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {assignMutation.isError && (
          <p className="text-sm text-red">{getErrorMessage(assignMutation.error)}</p>
        )}

        <Button
          size="sm"
          disabled={!canSubmit}
          loading={assignMutation.isPending}
          onClick={() => assignMutation.mutate()}
        >
          Escalar
        </Button>
      </div>
    </div>
  );
}

export function RosterTab({
  eventId,
  event,
  user,
}: {
  eventId: number;
  event: EventDetailType;
  user: User | null;
}) {
  const queryClient = useQueryClient();
  const canEdit = canManage(user);

  const removeMutation = useMutation({
    mutationFn: (assignmentId: number) => deleteAssignment(assignmentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
  });

  const groups = groupByMinistry(event.assignments);

  return (
    <div className={`grid gap-6 ${canEdit ? "xl:grid-cols-[1fr_320px]" : ""}`}>
      <div className="flex flex-col gap-5">
        {groups.size === 0 ? (
          <EmptyState
            icon={<IconMic width={28} height={28} />}
            title="Ninguém escalado ainda"
            description={canEdit ? "Use o painel para escalar a primeira pessoa." : "As pessoas aparecem aqui quando forem escaladas."}
          />
        ) : (
          Array.from(groups.entries()).map(([ministryName, assignments]) => (
            <div key={ministryName}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
                {ministryName}
              </h3>
              <div className="flex flex-col gap-2">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className="flex items-center gap-3 rounded-field border border-line bg-surface px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{assignment.user.name}</p>
                      <p className="truncate text-xs text-muted">{assignment.function}</p>
                    </div>
                    <AssignmentStatusPill status={assignment.status} />
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeMutation.mutate(assignment.id)}
                        disabled={removeMutation.isPending && removeMutation.variables === assignment.id}
                        aria-label={`Remover ${assignment.user.name} da escala`}
                        className="text-muted hover:text-red disabled:opacity-40"
                      >
                        <IconTrash width={16} height={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        {removeMutation.isError && (
          <p className="text-sm text-red">{getErrorMessage(removeMutation.error)}</p>
        )}
      </div>

      {canEdit && <AssignPersonPanel eventId={eventId} />}
    </div>
  );
}
