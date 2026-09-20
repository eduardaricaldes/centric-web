import { apiRequest } from "./client";
import type {
  Event,
  EventCreatePayload,
  EventDetail,
  EventListResponse,
  EventStatus,
  EventType,
  EventUpdatePayload,
  PageParams,
  Preaching,
  PreachingUpsertPayload,
  SongView,
} from "./types";

export interface ListEventsParams extends PageParams {
  from?: string;
  to?: string;
  type?: EventType;
  status?: EventStatus;
}

export function listEvents(params: ListEventsParams = {}): Promise<EventListResponse> {
  return apiRequest<EventListResponse>("/events/", { query: { ...params } });
}

export function getEvent(id: number, view?: SongView): Promise<EventDetail> {
  return apiRequest<EventDetail>(`/events/${id}`, { query: { view } });
}

/**
 * Modo palco pede o evento uma única vez com `view=chords`: `chordpro` vem sempre
 * preenchido (a API usa a letra como reserva quando não há cifra de verdade), então
 * a letra "limpa" é derivada com `toPlainLyrics` no navegador — sem segunda
 * requisição para trocar de visão (regra 3.1.5).
 */
export function getEventForStage(id: number): Promise<EventDetail> {
  return getEvent(id, "chords");
}

export function createEvent(payload: EventCreatePayload): Promise<Event> {
  return apiRequest<Event>("/events/", { method: "POST", json: payload });
}

export function updateEvent(id: number, payload: EventUpdatePayload): Promise<Event> {
  return apiRequest<Event>(`/events/${id}`, { method: "PUT", json: payload });
}

export function deleteEvent(id: number): Promise<void> {
  return apiRequest<void>(`/events/${id}`, { method: "DELETE" });
}

/** O evento já embute `preaching` (ou `null`) — isto é só para criar/atualizar. */
export function upsertPreaching(eventId: number, payload: PreachingUpsertPayload): Promise<Preaching> {
  return apiRequest<Preaching>(`/events/${eventId}/preaching`, { method: "PUT", json: payload });
}
