import { apiRequest } from "./client";
import type { ProgramApplyPayload, ProgramApplyResponse, ProgramSuggestPayload, ProgramSuggestion } from "./types";

/** Última programação aplicada, com momentos e pregação. 404 se ainda não há nenhuma. */
export function getAppliedProgram(eventId: number): Promise<ProgramSuggestion> {
  return apiRequest<ProgramSuggestion>(`/events/${eventId}/program`);
}

export function suggestProgram(
  eventId: number,
  payload: ProgramSuggestPayload,
): Promise<ProgramSuggestion> {
  return apiRequest<ProgramSuggestion>(`/events/${eventId}/program/suggest`, {
    method: "POST",
    json: payload,
  });
}

export function applyProgram(
  eventId: number,
  payload: ProgramApplyPayload,
): Promise<ProgramApplyResponse> {
  return apiRequest<ProgramApplyResponse>(`/events/${eventId}/program/apply`, {
    method: "POST",
    json: payload,
  });
}
