import { useEffect, useRef, useState } from "react";
import { getLive, liveSocketUrl, type LiveState } from "../../api/live";

const POLL_MS = 3000;

export type LiveConnection = "connecting" | "live" | "offline";

/**
 * Slide atual do telão. Tenta WebSocket (aviso na hora); se o servidor não
 * aguentar (Vercel) ou a conexão cair, pergunta a cada 3 segundos. Sem internet,
 * fica no último slide recebido.
 */
export function useLiveState(token: string, enabled: boolean) {
  const [state, setState] = useState<LiveState | null>(null);
  const [connection, setConnection] = useState<LiveConnection>("connecting");
  const lastVersion = useRef(-1);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let socket: WebSocket | null = null;
    let pollTimer: number | undefined;

    const accept = (next: LiveState) => {
      if (next.version >= lastVersion.current) {
        lastVersion.current = next.version;
        setState(next);
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        accept(await getLive(token));
        setConnection("live");
      } catch {
        setConnection("offline");
      }
      pollTimer = window.setTimeout(poll, POLL_MS);
    };

    const startPolling = () => {
      if (stopped || pollTimer !== undefined) return;
      void poll();
    };

    try {
      socket = new WebSocket(liveSocketUrl(token));
      socket.onopen = () => setConnection("live");
      socket.onmessage = (message) => {
        const data = JSON.parse(String(message.data)) as LiveState & { ping?: boolean };
        if (!data.ping) accept(data);
      };
      // Servidor sem WebSocket ou conexão caiu: passa a perguntar.
      socket.onerror = () => startPolling();
      socket.onclose = () => startPolling();
    } catch {
      startPolling();
    }

    return () => {
      stopped = true;
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
      if (socket) {
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
      }
    };
  }, [token, enabled]);

  return { state, connection };
}
