import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { upsertPreaching } from "../../api/events";
import type { EventDetail as EventDetailType, User } from "../../api/types";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { Input, Textarea } from "../../components/Input";
import { Select } from "../../components/Select";
import { IconEdit, IconMic } from "../../components/icons";
import { getErrorMessage } from "../../lib/errors";
import { isEventCollaborator } from "../../lib/permissions";
import { useMinistries, useMinistryMembers } from "./useMinistries";

function PreachingForm({
  eventId,
  onDone,
}: {
  eventId: number;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [ministryId, setMinistryId] = useState<number | null>(null);
  const [preacherId, setPreacherId] = useState<number | null>(null);
  const [theme, setTheme] = useState("");
  const [bibleReference, setBibleReference] = useState("");
  const [notes, setNotes] = useState("");

  const ministriesQuery = useMinistries(true);
  const membersQuery = useMinistryMembers(ministryId);

  const saveMutation = useMutation({
    mutationFn: () =>
      upsertPreaching(eventId, {
        preacher_id: preacherId as number,
        theme,
        bible_reference: bibleReference || undefined,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      onDone();
    },
  });

  const canSubmit = preacherId !== null && theme.trim().length > 0;

  return (
    <div className="max-w-md rounded-card border border-line bg-surface p-4">
      <div className="flex flex-col gap-3">
        <Select
          label="Ministério do pregador"
          value={ministryId ?? ""}
          onChange={(event) => {
            setMinistryId(event.target.value ? Number(event.target.value) : null);
            setPreacherId(null);
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
          label="Pregador"
          value={preacherId ?? ""}
          onChange={(event) => setPreacherId(event.target.value ? Number(event.target.value) : null)}
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

        <Input label="Tema" value={theme} onChange={(e) => setTheme(e.target.value)} />
        <Input
          label="Referência bíblica (opcional)"
          value={bibleReference}
          onChange={(e) => setBibleReference(e.target.value)}
        />
        <Textarea
          label="Observações (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />

        {saveMutation.isError && (
          <p className="text-sm text-red">{getErrorMessage(saveMutation.error)}</p>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!canSubmit}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Salvar
          </Button>
          <Button size="sm" variant="secondary" onClick={onDone}>
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PreachingTab({
  eventId,
  event,
  user,
}: {
  eventId: number;
  event: EventDetailType;
  user: User | null;
}) {
  const [editing, setEditing] = useState(false);
  const canEdit = isEventCollaborator(user);

  if (editing || (!event.preaching && canEdit)) {
    return <PreachingForm eventId={eventId} onDone={() => setEditing(false)} />;
  }

  if (!event.preaching) {
    return (
      <EmptyState
        icon={<IconMic width={28} height={28} />}
        title="Nenhuma pregação definida"
        description="Só quem gerencia o evento pode definir tema e pregador."
      />
    );
  }

  return (
    <div className="max-w-md rounded-card border border-line bg-surface p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{event.preaching.theme}</p>
          <p className="text-sm text-muted">{event.preaching.preacher.name}</p>
        </div>
        {canEdit && (
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)} icon={<IconEdit width={14} height={14} />}>
            Editar
          </Button>
        )}
      </div>
      {event.preaching.bible_reference && (
        <p className="mb-2 text-sm text-ink">{event.preaching.bible_reference}</p>
      )}
      {event.preaching.notes && <p className="text-sm text-muted">{event.preaching.notes}</p>}
    </div>
  );
}
