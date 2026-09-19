import { clearToken, getToken, setStoredRedirect } from "../lib/storage";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Rotas que não exigem (e não devem mandar) o header Authorization. */
const PUBLIC_PATHS = ["/auth/login", "/auth/register", "/health/db"];

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;
  readonly path: string;

  constructor(status: number, detail: unknown, path: string) {
    super(typeof detail === "string" ? detail : `HTTP ${status}`);
    this.status = status;
    this.detail = detail;
    this.path = path;
  }
}

/** Erro de rede (API fora do ar, sem internet) — distinto de um erro HTTP. */
export class NetworkError extends Error {}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  query?: Record<string, string | number | boolean | undefined | null>;
  json?: unknown;
  form?: Record<string, string>;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(path, BASE_URL);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function handleUnauthorized(): void {
  const { pathname, search } = window.location;
  clearToken();
  setStoredRedirect(pathname + search);
  window.location.href = "/login";
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", query, json, form, signal } = options;
  const headers: Record<string, string> = {};
  const isPublic = PUBLIC_PATHS.includes(path);

  if (!isPublic) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let body: BodyInit | undefined;
  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(form).toString();
  } else if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body,
      signal,
    });
  } catch (cause) {
    throw new NetworkError("Não consegui falar com o servidor.", { cause });
  }

  if (response.status === 401 && !isPublic) {
    handleUnauthorized();
    throw new ApiError(401, "Sessão expirada", path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    const detail = data && typeof data === "object" && "detail" in data ? data.detail : data;
    throw new ApiError(response.status, detail, path);
  }

  return data as T;
}
