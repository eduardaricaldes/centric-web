import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteEvent, getEvent } from "../../api/events";
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  removeSongFromPlaylist,
  reorderPlaylistSongs,
} from "../../api/playlists";
import { listSongs } from "../../api/songs";
import type { EventDetail as EventDetailType, PlaylistSong } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { ConfirmDialog } from "../../components/Dialog";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input } from "../../components/Input";
import { EventStatusPill } from "../../components/StatusPill";
import { SkeletonLines } from "../../components/Skeleton";
import {
  IconAlertTriangle,
  IconCalendar,
  IconEdit,
  IconGrip,
  IconMusic,
  IconTrash,
} from "../../components/icons";
import { useAuth } from "../auth/AuthContext";
import { ShareButton } from "../share/ShareButton";
import { formatDateTime } from "../../lib/dates";
import { getErrorMessage, isForbidden, isNotFound } from "../../lib/errors";
import { isEventCollaborator, isEventOwner } from "../../lib/permissions";
import { useDebouncedValue } from "../../lib/useDebouncedValue";
import { listItemHasChords } from "../../api/songs";
import { EVENT_TYPE_LABEL, warningLabel } from "./eventLabels";
import { PreachingTab } from "./PreachingTab";
import { RosterTab } from "./RosterTab";

type Tab = "repertoire" | "roster" | "preaching";

// ---------------------------------------------------------------------------
// Linha do repertório
// ---------------------------------------------------------------------------

function RepertoireRow({
  item,
  position,
  canEdit,
  onRemove,
  removing,
  dragHandleProps,
  setNodeRef,
  style,
}: {
  item: PlaylistSong;
  position: number;
  canEdit: boolean;
  onRemove: () => void;
  removing: boolean;
  dragHandleProps?: Record<string, unknown>;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 rounded-field border border-line bg-surface px-3 py-2.5"
    >
      {canEdit && (
        <button
          type="button"
          {...dragHandleProps}
          style={{ touchAction: "none" }}
          className="cursor-grab text-muted hover:text-ink"
          aria-label={`Arrastar ${item.song.title} para reordenar`}
        >
          <IconGrip width={16} height={16} />
        </button>
      )}
      <span className="w-6 shrink-0 text-center text-sm font-medium text-muted">{position}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{item.song.title}</p>
        {item.song.artist && <p className="truncate text-xs text-muted">{item.song.artist}</p>}
      </div>
      {item.song.tone && <Badge tone="neutral">{item.song.tone}</Badge>}
      {listItemHasChords(item.song) && <Badge tone="amber">Cifra</Badge>}
      {canEdit && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Remover ${item.song.title}`}
          className="text-muted hover:text-red disabled:opacity-40"
        >
          <IconTrash width={16} height={16} />
        </button>
      )}
    </div>
  );
}

function SortableRepertoireRow({
  item,
  position,
  onRemove,
  removing,
}: {
  item: PlaylistSong;
  position: number;
  onRemove: () => void;
  removing: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    attributes: { roleDescription: "item reordenável" },
  });

  return (
    <RepertoireRow
      item={item}
      position={position}
      canEdit
      onRemove={onRemove}
      removing={removing}
      dragHandleProps={{ ...attributes, ...listeners }}
      setNodeRef={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging ? "0 8px 20px rgba(11,18,38,0.18)" : undefined,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Painel de busca para adicionar música
// ---------------------------------------------------------------------------

function AddSongPanel({ playlistId, alreadyAddedIds }: { playlistId: number; alreadyAddedIds: Set<number> }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ["songs-picker", debouncedSearch],
    queryFn: () => listSongs({ search: debouncedSearch || undefined, limit: 20 }),
  });

  const addMutation = useMutation({
    mutationFn: (songId: number) => addSongToPlaylist(playlistId, { song_id: songId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event"] }),
  });

  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <h3 className="mb-3 font-display text-base font-semibold text-ink">Adicionar música</h3>
      <Input
        placeholder="Buscar por título"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mb-3"
      />
      {addMutation.isError && (
        <p className="mb-2 text-sm text-red">{getErrorMessage(addMutation.error)}</p>
      )}
      <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
        {isLoading ? (
          <SkeletonLines count={4} />
        ) : data && data.items.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma música encontrada.</p>
        ) : (
          data?.items.map((song) => {
            const added = alreadyAddedIds.has(song.id);
            return (
              <div
                key={song.id}
                className="flex items-center justify-between gap-2 rounded-field border border-line px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{song.title}</p>
                  {song.artist && <p className="truncate text-xs text-muted">{song.artist}</p>}
                </div>
                {added ? (
                  <Badge tone="north">Já no culto</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={addMutation.isPending && addMutation.variables === song.id}
                    onClick={() => addMutation.mutate(song.id)}
                    aria-label={`Adicionar ${song.title} ao repertório`}
                  >
                    Adicionar
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Aba Repertório
// ---------------------------------------------------------------------------

function RepertoireBoard({
  eventId,
  event,
  canEdit,
}: {
  eventId: number;
  event: EventDetailType;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const playlist = event.playlist!;
  const sorted = [...playlist.songs].sort((a, b) => a.position - b.position);
  // A ordem vem do servidor; só enquanto um arrastar é confirmado vale a ordem otimista.
  const [pendingOrder, setPendingOrder] = useState<number[] | null>(null);
  const order = pendingOrder ?? sorted.map((s) => s.id);
  const [reorderError, setReorderError] = useState<unknown>(null);
  const itemsById = new Map(playlist.songs.map((item) => [item.id, item]));
  const songTitle = (id: UniqueIdentifier) => itemsById.get(Number(id))?.song.title ?? "Música";
  const positionOf = (id: UniqueIdentifier) => order.indexOf(Number(id)) + 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const removeMutation = useMutation({
    mutationFn: (itemId: number) => removeSongFromPlaylist(playlist.id, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
  });

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(Number(active.id));
    const newIndex = order.indexOf(Number(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const next = arrayMove(order, oldIndex, newIndex);
    setPendingOrder(next);
    setReorderError(null);

    reorderPlaylistSongs(playlist.id, { item_ids: next })
      .then(() => queryClient.invalidateQueries({ queryKey: ["event", eventId] }))
      .catch((err: unknown) => setReorderError(err))
      .finally(() => setPendingOrder(null));
  };

  const addedIds = new Set(playlist.songs.map((item) => item.song_id));

  return (
    <div className={`grid gap-6 ${canEdit ? "xl:grid-cols-[1fr_320px]" : ""}`}>
      <div>
        {playlist.total_duration_min > 0 && (
          <p className="mb-3 text-sm text-muted">
            Tempo total: {playlist.total_duration_min} min
          </p>
        )}

        {reorderError !== null && (
          <div className="mb-3 rounded-field border border-red/20 bg-red-tint px-3 py-2 text-sm text-red">
            {getErrorMessage(reorderError)}
          </div>
        )}

        {order.length === 0 ? (
          <EmptyState
            icon={<IconMusic width={28} height={28} />}
            title="Nenhuma música no repertório"
            description={canEdit ? "Use a busca para adicionar." : "As músicas aparecem aqui quando forem adicionadas."}
          />
        ) : canEdit ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  "Para pegar a música, pressione espaço ou Enter. Use as setas para mover e espaço ou Enter para soltar. Esc cancela.",
              },
              announcements: {
                onDragStart: ({ active }) => `${songTitle(active.id)} selecionada.`,
                onDragOver: ({ active, over }) =>
                  over ? `${songTitle(active.id)} sobre a posição ${positionOf(over.id)}.` : undefined,
                onDragEnd: ({ active, over }) =>
                  over ? `${songTitle(active.id)} movida para a posição ${positionOf(over.id)}.` : undefined,
                onDragCancel: ({ active }) => `Movimento de ${songTitle(active.id)} cancelado.`,
              },
            }}
          >
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {order.map((id, index) => {
                  const item = itemsById.get(id);
                  if (!item) return null;
                  return (
                    <SortableRepertoireRow
                      key={id}
                      item={item}
                      position={index + 1}
                      onRemove={() => removeMutation.mutate(item.id)}
                      removing={removeMutation.isPending && removeMutation.variables === item.id}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="flex flex-col gap-2">
            {sorted.map((item, index) => (
              <RepertoireRow
                key={item.id}
                item={item}
                position={index + 1}
                canEdit={false}
                onRemove={() => undefined}
                removing={false}
              />
            ))}
          </div>
        )}
      </div>

      {canEdit && <AddSongPanel playlistId={playlist.id} alreadyAddedIds={addedIds} />}
    </div>
  );
}

function RepertoireTab({
  eventId,
  event,
  canEdit,
}: {
  eventId: number;
  event: EventDetailType;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const createPlaylistMutation = useMutation({
    mutationFn: () =>
      createPlaylist({ title: `Repertório — ${event.title}`, date: event.date, event_id: event.id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event", eventId] }),
  });

  if (!event.playlist) {
    return (
      <EmptyState
        icon={<IconMusic width={28} height={28} />}
        title="Nenhum repertório ainda"
        description={
          canEdit
            ? "Crie o repertório deste evento para começar a montar a lista de músicas."
            : "O repertório deste evento ainda não foi montado."
        }
        action={
          canEdit ? (
            <Button
              size="sm"
              loading={createPlaylistMutation.isPending}
              onClick={() => createPlaylistMutation.mutate()}
            >
              Criar repertório
            </Button>
          ) : undefined
        }
      />
    );
  }

  return <RepertoireBoard eventId={eventId} event={event} canEdit={canEdit} />;
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-field px-4 text-sm font-medium ${
        active ? "bg-north text-white" : "text-ink hover:bg-ivory"
      }`}
    >
      {children}
    </button>
  );
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("repertoire");

  const { data: event, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => getEvent(eventId, "chords"),
    enabled: Number.isFinite(eventId),
  });

  const queryClient = useQueryClient();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: async (playlistId: number | null) => {
      // A API não apaga o repertório junto com o evento: ele ficaria solto e
      // travaria a exclusão das músicas que estão nele.
      if (playlistId !== null) await deletePlaylist(playlistId);
      await deleteEvent(eventId);
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate("/events", { replace: true });
    },
  });

  if (isLoading) {
    return (
      <div>
        <SkeletonLines count={8} />
      </div>
    );
  }

  if (isError) {
    if (isNotFound(error)) {
      return (
        <EmptyState
          icon={<IconCalendar width={32} height={32} />}
          title="Evento não encontrado"
          action={
            <Link to="/events">
              <Button variant="secondary" size="sm">
                Voltar para eventos
              </Button>
            </Link>
          }
        />
      );
    }
    if (isForbidden(error)) return <ForbiddenState />;
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  if (!event) return null;

  const canEditRepertoire = isEventCollaborator(user);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
              {event.title}
            </h1>
            <EventStatusPill status={event.status} />
          </div>
          <p className="text-sm text-muted">
            {formatDateTime(event.date, event.time)} — {EVENT_TYPE_LABEL[event.type]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEventCollaborator(user) && (
            <ShareButton
              target={{ eventId: event.id }}
              subject="as letras do repertório deste evento, na ordem"
            />
          )}
          {isEventOwner(user, event) && (
            <>
              <Link to={`/events/${event.id}/edit`}>
                <Button variant="secondary" icon={<IconEdit width={16} height={16} />}>
                  Editar
                </Button>
              </Link>
              <Button
                variant="secondary"
                icon={<IconTrash width={16} height={16} />}
                onClick={() => setConfirmingDelete(true)}
              >
                Excluir
              </Button>
            </>
          )}
          <Link to={`/events/${event.id}/program`}>
            <Button variant="secondary">
              {isEventCollaborator(user) ? "Programação IA" : "Programação"}
            </Button>
          </Link>
          <Button onClick={() => navigate(`/events/${event.id}/stage`)}>Modo palco</Button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Excluir evento"
          description={
            <>
              <strong className="text-ink">{event.title}</strong> sai da agenda junto com o
              repertório, a escala e a pregação. As músicas continuam no catálogo.
            </>
          }
          confirmLabel="Excluir evento"
          danger
          loading={deleteMutation.isPending}
          error={deleteMutation.error}
          onCancel={() => {
            setConfirmingDelete(false);
            deleteMutation.reset();
          }}
          onConfirm={() => deleteMutation.mutate(event.playlist?.id ?? null)}
        />
      )}

      {event.warnings.length > 0 && (
        <div className="mb-5 flex flex-col gap-2">
          {event.warnings.map((warning, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-field border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber-ink"
            >
              <IconAlertTriangle width={16} height={16} />
              {warningLabel(warning, event)}
            </div>
          ))}
        </div>
      )}

      <div className="mb-5 flex gap-1 rounded-field border border-line bg-surface p-1 w-fit">
        <TabButton active={tab === "repertoire"} onClick={() => setTab("repertoire")}>
          Repertório
        </TabButton>
        <TabButton active={tab === "roster"} onClick={() => setTab("roster")}>
          Escala
        </TabButton>
        <TabButton active={tab === "preaching"} onClick={() => setTab("preaching")}>
          Pregação
        </TabButton>
      </div>

      {tab === "repertoire" && (
        <RepertoireTab eventId={eventId} event={event} canEdit={canEditRepertoire} />
      )}
      {tab === "roster" && <RosterTab eventId={eventId} event={event} user={user} />}
      {tab === "preaching" && <PreachingTab eventId={eventId} event={event} user={user} />}
    </div>
  );
}

export function EventDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <EventDetail key={id} />;
}
