import { apiRequest } from "./client";
import type {
  MemberCreatePayload,
  MemberUpdatePayload,
  MinistryCreatePayload,
  MinistryDetail,
  MinistryListResponse,
  MinistryMember,
  MinistryUpdatePayload,
} from "./types";

/** Só ADMIN/LEADER — usado para montar o seletor de "escalar alguém" e a tela de Ministérios. */
export function listMinistries(): Promise<MinistryListResponse> {
  return apiRequest<MinistryListResponse>("/ministries/");
}

export function listMinistryMembers(ministryId: number): Promise<MinistryMember[]> {
  return apiRequest<MinistryMember[]>(`/ministries/${ministryId}/members`);
}

/** Só ADMIN. */
export function createMinistry(payload: MinistryCreatePayload): Promise<MinistryDetail> {
  return apiRequest<MinistryDetail>("/ministries/", {
    method: "POST",
    json: payload,
  });
}

/** Só ADMIN. */
export function updateMinistry(
  ministryId: number,
  payload: MinistryUpdatePayload,
): Promise<MinistryDetail> {
  return apiRequest<MinistryDetail>(`/ministries/${ministryId}`, {
    method: "PATCH",
    json: payload,
  });
}

/**
 * Chama `sync_global_role` na API: marcar alguém como LEADER aqui reflete em
 * `users.role` na mesma transação. Nunca chame `updateUserRole` em seguida "para
 * garantir" — recria o meio-líder que a API evita.
 */
export function addMinistryMember(
  ministryId: number,
  payload: MemberCreatePayload,
): Promise<MinistryMember> {
  return apiRequest<MinistryMember>(`/ministries/${ministryId}/members`, {
    method: "POST",
    json: payload,
  });
}

export function updateMinistryMember(
  ministryId: number,
  userId: number,
  payload: MemberUpdatePayload,
): Promise<MinistryMember> {
  return apiRequest<MinistryMember>(`/ministries/${ministryId}/members/${userId}`, {
    method: "PATCH",
    json: payload,
  });
}

export function removeMinistryMember(ministryId: number, userId: number): Promise<void> {
  return apiRequest<void>(`/ministries/${ministryId}/members/${userId}`, {
    method: "DELETE",
  });
}
