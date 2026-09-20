import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { listMyAssignments, respondToAssignment } from "../../api/assignments";
import { getEvent, listEvents } from "../../api/events";
import type { EventDetail } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { Skeleton, SkeletonLines } from "../../components/Skeleton";
import { AssignmentStatusPill } from "../../components/StatusPill";
import { IconCalendar, IconMic, IconMusic } from "../../components/icons";
import { formatDate, formatDateLong, formatDateTime } from "../../lib/dates";
import { getErrorMessage } from "../../lib/errors";
import { EVENT_TYPE_LABEL } from "../events/eventLabels";

const todayIso = () => new Date().toISOString().slice(0, 10);

function useNextEvent() {
  const listQuery = useQuery({
    queryKey: ["next-event"],
    queryFn: () => listEvents({ from: todayIso(), limit: 1 }),
  });

  const nextId = listQuery.data?.items[0]?.id;

  const eventQuery = useQuery({
    queryKey: ["event", nextId],
    queryFn: () => getEvent(nextId as number),
    enabled: nextId !== undefined,
  });

  return {
    isLoading: listQuery.isLoading || (nextId !== undefined && eventQuery.isLoading),
    isError: listQuery.isError || eventQuery.isError,
    error: listQuery.error ?? eventQuery.error,
    refetch: () => {
      listQuery.refetch();
      eventQuery.refetch();
    },
    hasNext: nextId !== undefined,
    event: eventQuery.data,
  };
}

function NextEventCard({
  isLoading,
  isError,
  error,
  refetch,
  hasNext,
  event,
}: ReturnType<typeof useNextEvent>) {
  const navigate = useNavigate();

  if (isLoading) return <Skeleton className="h-44 w-full rounded-card" />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;

  if (!hasNext || !event) {
    return (
      <div className="rounded-card border border-line bg-surface p-8">
        <EmptyState
          icon={<IconCalendar width={32} height={32} />}
          title="Nenhum evento futuro"
          description="Quando um evento for criado, ele aparece aqui."
        />
      </div>
    );
  }

  const songCount = event.playlist?.songs.length ?? 0;
  const confirmedCount = event.assignments.filter((a) => a.status === "CONFIRMADO").length;

  return (
    <div className="rounded-card bg-navy p-6 text-white sm:p-8">
      <p className="text-sm text-white/60">Próximo evento</p>
      <h2 className="mt-1 font-display text-2xl font-semibold">{event.title}</h2>
      <p className="mt-1 text-white/70">
        {formatDateTime(event.date, event.time)} — {EVENT_TYPE_LABEL[event.type]}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Badge tone={event.status === "PUBLICADO" ? "amber" : "neutral"}>
          {event.status === "PUBLICADO" ? "Publicado" : "Rascunho"}
        </Badge>
        <span className="text-sm text-white/70">
          {songCount} música{songCount === 1 ? "" : "s"}
        </span>
        <span className="text-sm text-white/70">
          {confirmedCount} de {event.assignments.length} confirmados
        </span>
      </div>
      <div className="mt-5 flex gap-2">
        <Link to={`/events/${event.id}`}>
          <Button variant="secondary">Abrir evento</Button>
        </Link>
        <Button onClick={() => navigate(`/events/${event.id}/stage`)}>Modo palco</Button>
      </div>
    </div>
  );
}

function RepertoireColumn({ event }: { event: EventDetail | undefined }) {
  const songs = event?.playlist?.songs ?? [];

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-ink">
        <IconMusic width={18} height={18} />
        Repertório do próximo evento
      </h3>
      {songs.length === 0 ? (
        <p className="text-sm text-muted">
          {event ? "Nenhuma música no repertório ainda." : "Sem evento futuro."}
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {songs.map((item) => (
            <li key={item.id} className="flex items-baseline gap-2 text-sm">
              <span className="w-5 text-muted">{item.position}.</span>
              <span className="text-ink">{item.song.title}</span>
              {item.song.artist && <span className="text-muted">— {item.song.artist}</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function MyAssignmentsCard() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: listMyAssignments,
  });

  const respondMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "CONFIRMADO" | "RECUSADO" }) =>
      respondToAssignment(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-assignments"] }),
  });

  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h3 className="mb-3 font-display text-lg font-semibold text-ink">Minha escala</h3>

      {isLoading ? (
        <SkeletonLines count={4} />
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : data && data.length === 0 ? (
        <EmptyState
          icon={<IconMic width={24} height={24} />}
          title="Você não está escalado"
          description="Quando alguém te escalar, aparece aqui."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {data?.map((assignment) => (
            <div key={assignment.id} className="rounded-field border border-line px-3 py-2.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{assignment.event_title}</p>
                  <p className="text-xs text-muted">
                    {formatDate(assignment.event_date)} — {assignment.function}
                  </p>
                </div>
                <AssignmentStatusPill status={assignment.status} />
              </div>
              {assignment.status === "CONVIDADO" && (
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    loading={
                      respondMutation.isPending &&
                      respondMutation.variables?.id === assignment.id &&
                      respondMutation.variables.status === "CONFIRMADO"
                    }
                    onClick={() => respondMutation.mutate({ id: assignment.id, status: "CONFIRMADO" })}
                  >
                    Confirmar
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={
                      respondMutation.isPending &&
                      respondMutation.variables?.id === assignment.id &&
                      respondMutation.variables.status === "RECUSADO"
                    }
                    onClick={() => respondMutation.mutate({ id: assignment.id, status: "RECUSADO" })}
                  >
                    Não posso
                  </Button>
                </div>
              )}
            </div>
          ))}
          {respondMutation.isError && (
            <p className="text-sm text-red">{getErrorMessage(respondMutation.error)}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function Home() {
  const nextEvent = useNextEvent();

  return (
    <div>
      <p className="mb-1 text-sm capitalize text-muted">{formatDateLong(todayIso())}</p>
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight text-ink">Início</h1>

      <div className="mb-6">
        <NextEventCard {...nextEvent} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RepertoireColumn event={nextEvent.event} />
        <MyAssignmentsCard />
      </div>
    </div>
  );
}
