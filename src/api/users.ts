import { apiRequest } from "./client";
import type {
  PageParams,
  PasswordResetTokenResponse,
  UserListResponse,
  UserRoleUpdatePayload,
  User,
} from "./types";

interface ListUsersParams extends PageParams {
  search?: string;
}

/** GET /users/ — ADMIN e LEADER. */
export function listUsers(params: ListUsersParams = {}): Promise<UserListResponse> {
  return apiRequest<UserListResponse>("/users/", { query: { ...params } });
}

/** Só ADMIN. */
export function updateUserRole(userId: number, payload: UserRoleUpdatePayload): Promise<User> {
  return apiRequest<User>(`/users/${userId}/role`, {
    method: "PATCH",
    json: payload,
  });
}

/** ADMIN e LEADER. O token só aparece nesta resposta — nunca mais. */
export function resetUserPassword(userId: number): Promise<PasswordResetTokenResponse> {
  return apiRequest<PasswordResetTokenResponse>(`/users/${userId}/reset-password`, {
    method: "POST",
  });
}
