import { apiRequest } from "./client";
import type {
  ChangePasswordPayload,
  LoginResponse,
  RegisterPayload,
  ResetPasswordPayload,
  UpdateMePayload,
  User,
} from "./types";

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

/** A API derruba os tokens antigos e devolve um novo, que mantém esta sessão. */
export function changePassword(payload: ChangePasswordPayload): Promise<LoginResponse> {
  return apiRequest<LoginResponse>("/auth/change-password", {
    method: "POST",
    json: payload,
  });
}

/** Pública: usada por quem recebeu um link de redefinição. Limite de 5/minuto. */
export function resetPassword(payload: ResetPasswordPayload): Promise<void> {
  return apiRequest<void>("/auth/reset-password", {
    method: "POST",
    json: payload,
  });
}
