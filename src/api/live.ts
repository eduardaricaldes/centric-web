import { BASE_URL, apiRequest } from "./client";

export type LiveMode = "slide" | "black" | "logo";

export interface LiveState {
  mode: LiveMode;
  song_index: number | null;
  slide_index: number | null;
  song_title: string | null;
  lines: string[];
  version: number;
  updated_at: string | null;
}

export interface LiveUpdatePayload {
  mode: LiveMode;
  song_index?: number | null;
  slide_index?: number | null;
  song_title?: string | null;
  lines?: string[];
}

/** Operador avisa os celulares qual slide está no telão (Fase 4). */
export function updateLive(eventId: number, payload: LiveUpdatePayload): Promise<LiveState> {
  return apiRequest<LiveState>(`/events/${eventId}/live`, { method: "PUT", json: payload });
}

/** Celular lê o slide atual pelo link público do evento. */
export function getLive(token: string): Promise<LiveState> {
  return apiRequest<LiveState>(`/public/live/${encodeURIComponent(token)}`);
}

export function liveSocketUrl(token: string): string {
  const url = new URL(`/public/live/${encodeURIComponent(token)}/ws`, BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}
