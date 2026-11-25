import { useLayoutEffect, useRef, useState } from "react";
import { IconFlame } from "../../components/icons";
import type { ScreenState } from "./channel";

const MAX_FONT = 96;
const MIN_FONT = 20;

/** O conteúdo do telão. Usado em tela cheia no projetor e em miniatura no operador. */
export function ScreenContent({ state, compact = false }: { state: ScreenState; compact?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(MAX_FONT);
  const [logoFailed, setLogoFailed] = useState(false);

  const linesKey = state.mode === "slide" ? state.lines.join("\n") : state.mode;

  // Maior fonte que cabe na tela, sem rolagem.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text || state.mode !== "slide") return;
    const fit = () => {
      let size = compact ? 28 : MAX_FONT;
      const min = compact ? 6 : MIN_FONT;
      text.style.fontSize = `${size}px`;
      while (size > min && (text.scrollHeight > box.clientHeight || text.scrollWidth > box.clientWidth)) {
        size -= 2;
        text.style.fontSize = `${size}px`;
      }
      setFontSize(size);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [linesKey, compact, state.mode]);

  if (state.mode === "black") return <div className="h-full w-full bg-black" />;

  if (state.mode === "logo") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        {!logoFailed ? (
          <img
            src="/logo-north.png"
            alt="North"
            className="max-h-[40%] max-w-[60%] object-contain"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className="flex items-center gap-3 text-white">
            <IconFlame width={compact ? 20 : 72} height={compact ? 20 : 72} />
            <span className={`font-display font-semibold ${compact ? "text-lg" : "text-7xl"}`}>North</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={boxRef} className={`flex h-full w-full items-center justify-center bg-black ${compact ? "p-2" : "p-[5vmin]"}`}>
      <div
        ref={textRef}
        className="text-center font-display font-semibold leading-tight text-white"
        style={{ fontSize }}
      >
        {state.lines.map((line, index) => (
          <p key={index}>{line}</p>
        ))}
      </div>
    </div>
  );
}
