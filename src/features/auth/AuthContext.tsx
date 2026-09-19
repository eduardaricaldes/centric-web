import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMe } from "../../api/auth";
import { clearToken, getToken } from "../../lib/storage";
import type { User } from "../../api/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  error: unknown;
  isAuthenticated: boolean;
  refetchUser: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hasToken = Boolean(getToken());

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
    enabled: hasToken,
    retry: false,
    staleTime: 60_000,
  });

  const logout = useCallback(() => {
    clearToken();
    queryClient.clear();
    window.location.href = "/login";
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: data ?? null,
      isLoading: hasToken && isLoading,
      error,
      isAuthenticated: hasToken && Boolean(data),
      refetchUser: () => void refetch(),
      logout,
    }),
    [data, isLoading, error, hasToken, refetch, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook do mesmo contexto
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
