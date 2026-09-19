const TOKEN_KEY = "centric.token";
const ROLE_KEY = "centric.role";
const REDIRECT_KEY = "centric.redirectTo";
const STAGE_FONT_KEY = "centric.stage.fontSize";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function setStoredRole(role: string): void {
  localStorage.setItem(ROLE_KEY, role);
}

export function getStoredRedirect(): string | null {
  return localStorage.getItem(REDIRECT_KEY);
}

export function setStoredRedirect(path: string): void {
  localStorage.setItem(REDIRECT_KEY, path);
}

export function clearStoredRedirect(): void {
  localStorage.removeItem(REDIRECT_KEY);
}

export function getStageFontSize(): number | null {
  const raw = localStorage.getItem(STAGE_FONT_KEY);
  return raw ? Number(raw) : null;
}

export function setStageFontSize(size: number): void {
  localStorage.setItem(STAGE_FONT_KEY, String(size));
}
