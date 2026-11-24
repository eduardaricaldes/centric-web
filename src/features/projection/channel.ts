/**
 * Operador e telão conversam pelo próprio navegador (BroadcastChannel): as duas
 * janelas ficam no mesmo computador, então o Wi-Fi caindo não para o telão.
 * O último estado também fica no localStorage, para o telão voltar igual se for
 * recarregado.
 */

export type ScreenState =
  | { mode: "slide"; lines: string[]; songTitle?: string }
  | { mode: "black" }
  | { mode: "logo" };

type Message = { type: "state"; state: ScreenState } | { type: "hello" };

const CHANNEL = "centric-telao";
const STORAGE_KEY = "centric:telao";

function openChannel(): BroadcastChannel | null {
  return typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHANNEL);
}

export function readLastState(): ScreenState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ScreenState;
  } catch {
    // Sem storage (aba anônima, bloqueado): começa no logo.
  }
  return { mode: "logo" };
}

function saveState(state: ScreenState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignora
  }
}

/** Lado do operador: manda o que deve aparecer e responde quando um telão novo abre. */
export function createOperatorChannel(getState: () => ScreenState) {
  const channel = openChannel();
  const send = (state: ScreenState) => {
    saveState(state);
    channel?.postMessage({ type: "state", state } satisfies Message);
  };
  if (channel) {
    channel.onmessage = (event: MessageEvent<Message>) => {
      if (event.data?.type === "hello") channel.postMessage({ type: "state", state: getState() } satisfies Message);
    };
  }
  return { send, close: () => channel?.close() };
}

/** Lado do telão: escuta o operador. */
export function listenAsScreen(onState: (state: ScreenState) => void) {
  const channel = openChannel();
  if (channel) {
    channel.onmessage = (event: MessageEvent<Message>) => {
      if (event.data?.type === "state") onState(event.data.state);
    };
    channel.postMessage({ type: "hello" } satisfies Message);
  }
  // Outra aba do mesmo navegador sem BroadcastChannel: cai no evento de storage.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) onState(JSON.parse(event.newValue) as ScreenState);
  };
  window.addEventListener("storage", onStorage);
  return () => {
    channel?.close();
    window.removeEventListener("storage", onStorage);
  };
}
