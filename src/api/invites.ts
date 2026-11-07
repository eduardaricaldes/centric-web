import { apiRequest } from "./client";
import type { InviteCreatePayload, InviteCreateResponse, InviteListResponse } from "./types";

/**
 * ADMIN convida qualquer papel/ministério; LEADER só MEMBER no ministério que lidera
 * (a API confere de novo — regra 3.1.9 do BRIEFING). O token só vem nesta resposta.
 */
export function createInvite(payload: InviteCreatePayload): Promise<InviteCreateResponse> {
  return apiRequest<InviteCreateResponse>("/invites/", {
    method: "POST",
    json: payload,
  });
}

/** Só convites em aberto (não usados, não expirados). LEADER só vê os que criou. */
export function listInvites(): Promise<InviteListResponse> {
  return apiRequest<InviteListResponse>("/invites/");
}

export function cancelInvite(inviteId: number): Promise<void> {
  return apiRequest<void>(`/invites/${inviteId}`, { method: "DELETE" });
}
