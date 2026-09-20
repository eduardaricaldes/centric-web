import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEventForStage } from "../../api/events";
import type { PlaylistSong } from "../../api/types";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { IconChevronLeft, IconChevronRight, IconX } from "../../components/icons";
import { useAuth } from "../auth/AuthContext";
import { parseChordProLines, toPlainLyrics, transposeChordPro, transposeTone } from "../../lib/chordpro";
import { isForbidden, isNotFound } from "../../lib/errors";
import { getStageFontSize, setStageFontSize } from "../../lib/storage";

type StageView = "lyrics" | "chords";

const MIN_FONT = 18;
const MAX_FONT = 64;
const FONT_STEP = 2;
const DEFAULT_FONT = 32;

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

// --- Corpo da música (chave = id da música: zera a transposição ao trocar) ---

function toneLabel(semitones: number): string {
  if (semitones === 0) return "Tom original";
  const abs = Math.abs(semitones);
  const sign = semitones > 0 ? "+" : "−";
  return `${sign}${abs} semitom${abs > 1 ? "s" : ""}`;
}

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
  const plainLyrics = toPlainLyrics(rawChordpro);
  const tone = item.song.tone ? transposeTone(item.song.tone, semitones) : null;

  const lines =
    view === "chords" ? parseChordProLines(transposeChordPro(rawChordpro, semitones)) : null;

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

      <div
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ fontSize, columnCount: 2, columnGap: "3rem" }}
      >
        {view === "chords" && lines
          ? lines.map((line, index) => (
              <div key={index} className="mb-2 break-inside-avoid font-mono leading-tight">
                <div className="text-amber">{line.chordRow || " "}</div>
                <div className="text-white">{line.lyricRow || " "}</div>
              </div>
            ))
          : plainLyrics.split("\n").map((line, index) => (
              <p key={index} className="mb-2 break-inside-avoid font-display leading-snug text-white">
                {line || " "}
              </p>
            ))}
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
