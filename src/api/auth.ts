import { apiRequest } from "./client";
import type { LoginResponse, RegisterPayload, UpdateMePayload, User } from "./types";

export function login(email: string, password: string): Promise<LoginResponse> {
  // POST /auth/login exige application/x-www-form-urlencoded com o campo "username".
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    form: { username: email, password },
  });
}

export function register(payload: RegisterPayload): Promise<User> {
  return apiRequest<User>("/auth/register", {
    method: "POST",
    json: payload,
  });
}

export function getMe(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

export function updateMe(payload: UpdateMePayload): Promise<User> {
  return apiRequest<User>("/auth/me", {
    method: "PATCH",
    json: payload,
  });
}
