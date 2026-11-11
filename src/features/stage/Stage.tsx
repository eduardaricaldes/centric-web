import { useQuery } from "@tanstack/react-query";
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEventForStage } from "../../api/events";
import type { PlaylistSong } from "../../api/types";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { IconChevronLeft, IconChevronRight, IconX } from "../../components/icons";
import { useAuth } from "../auth/AuthContext";
import { parseChordProLines, toLyricLines, transposeChordPro, transposeTone } from "../../lib/chordpro";
import { isForbidden, isNotFound } from "../../lib/errors";
import { getStageFontSize, setStageFontSize } from "../../lib/storage";

type StageView = "lyrics" | "chords";

const MIN_FONT = 18;
const MAX_FONT = 64;
const FONT_STEP = 2;
const DEFAULT_FONT = 32;
// A música inteira precisa caber na tela: a fonte escolhida é o teto, e encolhe até aqui.
const MIN_FIT_FONT = 14;
// Ordem de preferência: em empate de fonte, ganha a primeira.
const COLUMN_OPTIONS = [2, 1, 3, 4];

// --- Wake Lock (regra: onde não existir, ignora em silêncio) -----------------

function useWakeLock(): boolean {
  const [active, setActive] = useState(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let cancelled = false;
    navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (cancelled) {
          void sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        setActive(true);
      })
      .catch(() => setActive(false));

    return () => {
      cancelled = true;
      sentinelRef.current?.release().catch(() => undefined);
      sentinelRef.current = null;
    };
  }, []);

  return active;
}

// --- Encaixe da música na tela ------------------------------------------------

function overflowsWidth(element: HTMLElement): boolean {
  if (element.scrollWidth > element.clientWidth + 1) return true;
  // Linha de cifra não quebra: se passar da coluna, invade a vizinha sem aumentar o scrollWidth.
  return Array.from(element.children).some((line) => line.scrollWidth > line.clientWidth + 1);
}

/** Maior fonte entre o mínimo e `maxSize` que não estoura; 0 se nem o mínimo couber. */
function largestSize(maxSize: number, tryAt: (size: number) => boolean): number {
  let low = MIN_FIT_FONT;
  let high = maxSize;
  let found = 0;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (tryAt(middle)) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

/**
 * Procura a combinação de colunas e fonte que mostra a música inteira, com a maior fonte
 * possível até `preferredSize`. Escreve direto no elemento porque medir exige aplicar cada
 * tentativa no DOM. Se nada couber, sai das colunas e rola na vertical, com fonte legível.
 */
function useFitLyrics(
  ref: RefObject<HTMLDivElement | null>,
  preferredSize: number,
  contentKey: string,
) {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const apply = (columns: number | "auto", size: number) => {
      element.style.columnCount = String(columns);
      element.style.fontSize = `${size}px`;
    };

    const fit = () => {
      let bestColumns = 0;
      let bestSize = 0;
      for (const columns of COLUMN_OPTIONS) {
        const size = largestSize(preferredSize, (candidate) => {
          apply(columns, candidate);
          return element.scrollHeight <= element.clientHeight + 1 && !overflowsWidth(element);
        });
        if (size > bestSize) {
          bestColumns = columns;
          bestSize = size;
        }
        if (bestSize === preferredSize) break;
      }
      if (bestSize > 0) {
        apply(bestColumns, bestSize);
        return;
      }
      const scrollSize = largestSize(preferredSize, (candidate) => {
        apply("auto", candidate);
        return !overflowsWidth(element);
      });
      apply("auto", scrollSize || MIN_FIT_FONT);
    };

    fit();
    let cancelled = false;
    // A fonte da web muda a largura do texto quando termina de carregar.
    document.fonts?.ready.then(() => {
      if (!cancelled) fit();
    });
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [ref, preferredSize, contentKey]);
}

// --- Corpo da música (chave = id da música: zera a transposição ao trocar) ---

function toneLabel(semitones: number): string {
  if (semitones === 0) return "Tom original";
  const abs = Math.abs(semitones);
  const sign = semitones > 0 ? "+" : "−";
  return `${sign}${abs} semitom${abs > 1 ? "s" : ""}`;
}

/** Rótulo de parte ("Verso 1", "Refrão"): menor que a letra, e nunca no fim de uma coluna. */
const SECTION_CLASSES =
  "mb-[0.15em] mt-[0.4em] break-after-avoid break-inside-avoid font-sans text-[0.6em] font-semibold uppercase tracking-wide text-white/50";

function StageSongBody({
  item,
  view,
  fontSize,
}: {
  item: PlaylistSong;
  view: StageView;
  fontSize: number;
}) {
  const [semitones, setSemitones] = useState(0);
  const rawChordpro = item.song.chordpro ?? "";
  const lyricLines = toLyricLines(rawChordpro);
  const tone = item.song.tone ? transposeTone(item.song.tone, semitones) : null;

  const lines =
    view === "chords" ? parseChordProLines(transposeChordPro(rawChordpro, semitones)) : null;

  const lyricsRef = useRef<HTMLDivElement>(null);
  useFitLyrics(lyricsRef, fontSize, `${view}:${semitones}`);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white">
            {item.song.title}
          </h2>
          {item.song.artist && <p className="mt-1 text-white/60">{item.song.artist}</p>}
        </div>

        {item.song.tone && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSemitones((value) => Math.max(value - 1, -11))}
              aria-label="Baixar meio tom"
              className="flex h-10 w-10 items-center justify-center rounded-field border border-white/20 text-lg text-white hover:bg-white/10"
            >
              −
            </button>
            <div className="text-center">
              <div className="font-mono text-lg font-medium text-amber">{tone}</div>
              <div className="text-[11px] uppercase tracking-wide text-white/50">
                {toneLabel(semitones)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSemitones((value) => Math.min(value + 1, 11))}
              aria-label="Subir meio tom"
              className="flex h-10 w-10 items-center justify-center rounded-field border border-white/20 text-lg text-white hover:bg-white/10"
            >
              +
            </button>
          </div>
        )}
      </div>

      <div ref={lyricsRef} className="min-h-0 flex-1 overflow-auto" style={{ columnGap: "3rem" }}>
        {view === "chords" && lines
          ? lines.map((line, index) =>
              line.section ? (
                <p key={index} className={SECTION_CLASSES}>
                  {line.section}
                </p>
              ) : (
                <div
                  key={index}
                  className="mb-[0.3em] break-inside-avoid whitespace-pre font-mono leading-tight"
                >
                  {line.chordRow && <div className="text-amber">{line.chordRow}</div>}
                  <div className="text-white">{line.lyricRow || " "}</div>
                </div>
              ),
            )
          : lyricLines.map((line, index) =>
              line.section ? (
                <p key={index} className={SECTION_CLASSES}>
                  {line.text}
                </p>
              ) : (
                <p
                  key={index}
                  className="mb-[0.3em] break-inside-avoid whitespace-pre-wrap font-display leading-snug text-white"
                >
                  {line.text || " "}
                </p>
              ),
            )}
      </div>
    </div>
  );
}

// --- Tela principal ------------------------------------------------------

export function Stage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const wakeLockActive = useWakeLock();

  const { data: event, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["event-stage", eventId],
    queryFn: () => getEventForStage(eventId),
    enabled: Number.isFinite(eventId),
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [view, setView] = useState<StageView>(user?.prefers_chords ? "chords" : "lyrics");
  const [fontSize, setFontSize] = useState(() => getStageFontSize() ?? DEFAULT_FONT);

  const changeFontSize = (delta: number) => {
    setFontSize((value) => {
      const next = Math.min(MAX_FONT, Math.max(MIN_FONT, value + delta));
      setStageFontSize(next);
      return next;
    });
  };

  const exit = () => navigate(`/events/${eventId}`);

  // Teclado e pedal de virar página (que manda setas ou PageUp/PageDown): troca de música.
  const songCount = event?.playlist?.songs?.length ?? 0;
  useEffect(() => {
    const onKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.altKey || keyEvent.ctrlKey || keyEvent.metaKey) return;
      const target = keyEvent.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      if (keyEvent.key === "ArrowRight" || keyEvent.key === "PageDown") {
        keyEvent.preventDefault();
        setCurrentIndex((value) => Math.min(value + 1, Math.max(songCount - 1, 0)));
      } else if (keyEvent.key === "ArrowLeft" || keyEvent.key === "PageUp") {
        keyEvent.preventDefault();
        setCurrentIndex((value) => Math.max(value - 1, 0));
      } else if (keyEvent.key === "Escape") {
        navigate(`/events/${eventId}`);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [songCount, navigate, eventId]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-navy">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    if (isForbidden(error)) {
      return (
        <div className="flex h-screen items-center justify-center bg-navy p-6">
          <ForbiddenState message="Você não tem acesso a este evento." />
        </div>
      );
    }
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-navy p-6">
        {isNotFound(error) ? (
          <p className="text-white">Evento não encontrado.</p>
        ) : (
          <ErrorState error={error} onRetry={() => refetch()} />
        )}
        <button type="button" onClick={exit} className="text-sm text-white/60 underline">
          Voltar
        </button>
      </div>
    );
  }

  const songs = event?.playlist?.songs ?? [];

  if (!event || songs.length === 0) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-navy p-6 text-center">
        <p className="font-display text-xl text-white">Nenhuma música neste repertório</p>
        <p className="max-w-sm text-sm text-white/60">
          Adicione músicas ao repertório do evento antes de abrir o modo palco.
        </p>
        <button
          type="button"
          onClick={exit}
          className="rounded-field border border-white/20 px-4 py-2 text-sm text-white hover:bg-white/10"
        >
          Voltar para o evento
        </button>
      </div>
    );
  }

  const current = songs[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === songs.length - 1;

  return (
    <div className="flex h-screen flex-col bg-navy px-6 py-4 sm:px-10">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 text-white">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={exit}
            className="flex h-10 w-10 items-center justify-center rounded-field text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Sair do modo palco"
          >
            <IconX width={20} height={20} />
          </button>
          <div>
            <p className="text-sm font-medium">{event.title}</p>
            <p className="text-xs text-white/50">
              {currentIndex + 1} de {songs.length}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div
            className="flex items-center gap-1.5 text-xs text-white/50"
            title={wakeLockActive ? "Tela sempre acesa" : "Tela pode apagar"}
          >
            <span
              className={`h-2 w-2 rounded-full ${wakeLockActive ? "bg-green" : "bg-white/20"}`}
              aria-hidden
            />
            <span className="hidden sm:inline">
              {wakeLockActive ? "Tela sempre acesa" : "Modo economia"}
            </span>
          </div>

          <div className="flex rounded-field border border-white/20 p-1">
            <button
              type="button"
              onClick={() => setView("lyrics")}
              className={`h-8 rounded-field px-3 text-sm font-medium ${
                view === "lyrics" ? "bg-white text-navy" : "text-white"
              }`}
            >
              Letra
            </button>
            <button
              type="button"
              onClick={() => setView("chords")}
              className={`h-8 rounded-field px-3 text-sm font-medium ${
                view === "chords" ? "bg-white text-navy" : "text-white"
              }`}
            >
              Cifra
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeFontSize(-FONT_STEP)}
              aria-label="Diminuir fonte"
              className="flex h-8 w-8 items-center justify-center rounded-field border border-white/20 text-sm text-white hover:bg-white/10"
            >
              A−
            </button>
            <button
              type="button"
              onClick={() => changeFontSize(FONT_STEP)}
              aria-label="Aumentar fonte"
              className="flex h-8 w-8 items-center justify-center rounded-field border border-white/20 text-sm text-white hover:bg-white/10"
            >
              A+
            </button>
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1">
        <StageSongBody key={current.id} item={current} view={view} fontSize={fontSize} />
      </div>

      <footer className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => setCurrentIndex((value) => value - 1)}
          title="Música anterior (← ou PageUp)"
          className="flex h-10 items-center gap-1 rounded-field border border-white/20 px-3 text-sm text-white hover:bg-white/10 disabled:opacity-30"
        >
          <IconChevronLeft width={16} height={16} />
          Anterior
        </button>

        <div className="flex flex-1 gap-2 overflow-x-auto">
          {songs.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              title={item.song.title}
              className={`h-10 shrink-0 rounded-field border px-3 text-sm ${
                index === currentIndex
                  ? "border-amber bg-amber/15 text-amber"
                  : "border-white/20 text-white/70 hover:bg-white/10"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={isLast}
          onClick={() => setCurrentIndex((value) => value + 1)}
          title="Próxima música (→ ou PageDown)"
          className="flex h-10 items-center gap-1 rounded-field border border-white/20 px-3 text-sm text-white hover:bg-white/10 disabled:opacity-30"
        >
          Próxima
          <IconChevronRight width={16} height={16} />
        </button>
      </footer>
    </div>
  );
}

/** Remonta ao trocar de evento (mesmo motivo do SongDetailRoute). */
export function StageRoute() {
  const { id } = useParams<{ id: string }>();
  return <Stage key={id} />;
}
