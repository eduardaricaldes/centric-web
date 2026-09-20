import { apiRequest } from "./client";
import type {
  Assignment,
  AssignmentCreatePayload,
  AssignmentRespondPayload,
  AssignmentUpdatePayload,
  MyAssignment,
} from "./types";

export function createAssignment(
  eventId: number,
  payload: AssignmentCreatePayload,
): Promise<Assignment> {
  return apiRequest<Assignment>(`/events/${eventId}/assignments`, {
    method: "POST",
    json: payload,
  });
}

export function updateAssignment(id: number, payload: AssignmentUpdatePayload): Promise<Assignment> {
  return apiRequest<Assignment>(`/assignments/${id}`, { method: "PATCH", json: payload });
}

export function deleteAssignment(id: number): Promise<void> {
  return apiRequest<void>(`/assignments/${id}`, { method: "DELETE" });
}

export function respondToAssignment(
  id: number,
  payload: AssignmentRespondPayload,
): Promise<Assignment> {
  return apiRequest<Assignment>(`/assignments/${id}/respond`, { method: "POST", json: payload });
}

export function listMyAssignments(): Promise<MyAssignment[]> {
  return apiRequest<MyAssignment[]>("/me/assignments");
}
