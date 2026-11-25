import { useEffect, useState } from "react";
import { listenAsScreen, readLastState, type ScreenState } from "./channel";
import { ScreenContent } from "./Screen";

/**
 * Janela do telão: arraste para o projetor e clique para tela cheia. Não busca
 * nada na internet; tudo chega do operador pelo navegador.
 */
export function TelaoPage() {
  const [state, setState] = useState<ScreenState>(() => readLastState());
  const [hint, setHint] = useState(true);

  useEffect(() => listenAsScreen(setState), []);

  useEffect(() => {
    document.title = "Telão · Centric";
    const timer = window.setTimeout(() => setHint(false), 6000);
    return () => window.clearTimeout(timer);
  }, []);

  const goFullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  return (
    <div className="fixed inset-0 cursor-none bg-black" onClick={goFullscreen} onDoubleClick={goFullscreen}>
      <ScreenContent state={state} />
      {hint && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
          Arraste esta janela para o projetor e clique para tela cheia
        </div>
      )}
    </div>
  );
}
