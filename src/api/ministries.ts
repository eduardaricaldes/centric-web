import { apiRequest } from "./client";
import type { MinistryListResponse, MinistryMember } from "./types";

/** Só ADMIN/LEADER — usado para montar o seletor de "escalar alguém". */
export function listMinistries(): Promise<MinistryListResponse> {
  return apiRequest<MinistryListResponse>("/ministries/");
}

export function listMinistryMembers(ministryId: number): Promise<MinistryMember[]> {
  return apiRequest<MinistryMember[]>(`/ministries/${ministryId}/members`);
}
