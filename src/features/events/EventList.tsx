import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { listEvents } from "../../api/events";
import type { EventStatus, EventType } from "../../api/types";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Select } from "../../components/Select";
import { EventStatusPill } from "../../components/StatusPill";
import { SkeletonTable } from "../../components/Skeleton";
import { IconCalendar, IconPlus } from "../../components/icons";
import { useAuth } from "../auth/AuthContext";
import { formatDateTime } from "../../lib/dates";
import { isForbidden } from "../../lib/errors";
import { isEventCollaborator } from "../../lib/permissions";
import { EVENT_TYPE_LABEL } from "./eventLabels";

const LIMIT = 20;

const todayIso = () => new Date().toISOString().slice(0, 10);

export function EventList() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const type = (searchParams.get("type") as EventType | null) ?? "";
  const status = (searchParams.get("status") as EventStatus | null) ?? "";
  const onlyUpcoming = !searchParams.has("from") && !searchParams.has("all");

  const updateParam = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "all") next.delete("all");
      return next;
    });
  };

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["events", { from, to, type, status, onlyUpcoming }],
    queryFn: () =>
      listEvents({
        from: from || (onlyUpcoming ? todayIso() : undefined),
        to: to || undefined,
        type: type || undefined,
        status: status || undefined,
        limit: LIMIT,
      }),
  });

  return (
    <div>
      <PageHeader
        title="Eventos"
        description="Cultos, ensaios e outros encontros da comunidade."
        actions={
          isEventCollaborator(user) ? (
            <Link to="/events/new">
              <Button icon={<IconPlus width={18} height={18} />}>Novo evento</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Input
          label="De"
          type="date"
          value={from}
          onChange={(event) => updateParam("from", event.target.value)}
          className="w-40"
        />
        <Input
          label="Até"
          type="date"
          value={to}
          onChange={(event) => updateParam("to", event.target.value)}
          className="w-40"
        />
        <Select
          label="Tipo"
          value={type}
          onChange={(event) => updateParam("type", event.target.value)}
          className="w-48"
        >
          <option value="">Todos</option>
          {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Status"
          value={status}
          onChange={(event) => updateParam("status", event.target.value)}
          className="w-40"
        >
          <option value="">Todos</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="PUBLICADO">Publicado</option>
        </Select>
        {(from || to || type || status) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchParams(new URLSearchParams({ all: "1" }))}
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {isLoading ? (
        <SkeletonTable rows={6} cols={3} />
      ) : isError ? (
        isForbidden(error) ? (
          <ForbiddenState />
        ) : (
          <ErrorState error={error} onRetry={() => refetch()} />
        )
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={<IconCalendar width={32} height={32} />}
          title="Nenhum evento encontrado"
          description={
            onlyUpcoming
              ? "Não há eventos futuros. Veja todos ou cadastre um novo."
              : "Tente outros filtros."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {data?.items.map((event) => (
            <Link
              key={event.id}
              to={`/events/${event.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4 hover:border-north/40"
            >
              <div>
                <p className="font-display text-base font-semibold text-ink">{event.title}</p>
                <p className="text-sm text-muted">
                  {formatDateTime(event.date, event.time)} — {EVENT_TYPE_LABEL[event.type]}
                </p>
              </div>
              <EventStatusPill status={event.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
