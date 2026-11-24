import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getEventForStage } from "../../api/events";
import { Button } from "../../components/Button";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { SkeletonLines } from "../../components/Skeleton";
import { IconChevronLeft, IconMonitor } from "../../components/icons";
import { isForbidden } from "../../lib/errors";
import { songSlides, type Slide } from "../../lib/slides";
import { createOperatorChannel, type ScreenState } from "./channel";
import { ScreenContent } from "./Screen";

interface Position {
  song: number;
  slide: number;
}

interface ProjectedSong {
  title: string;
  slides: Slide[];
}

function stateFor(songs: ProjectedSong[], position: Position | null): ScreenState | null {
  if (!position) return null;
  const song = songs[position.song];
  const slide = song?.slides[position.slide];
  if (!song || !slide) return null;
  return { mode: "slide", lines: slide.lines, songTitle: song.title };
}

function step(songs: ProjectedSong[], position: Position | null, delta: 1 | -1): Position | null {
  if (songs.length === 0) return null;
  if (!position) return { song: 0, slide: 0 };
  let { song, slide } = position;
  slide += delta;
  while (song >= 0 && song < songs.length && (slide < 0 || slide >= songs[song].slides.length)) {
    if (slide < 0) {
      song -= 1;
      slide = song >= 0 ? songs[song].slides.length - 1 : 0;
    } else {
      song += 1;
      slide = 0;
    }
  }
  if (song < 0 || song >= songs.length) return position;
  return { song, slide };
}

/** Tela do operador (Fase 2): escolhe o slide e o telão mostra, mesmo sem internet. */
export function OperatorPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const { data: event, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["event", eventId, "projection"],
    queryFn: () => getEventForStage(eventId),
    enabled: Number.isFinite(eventId),
    // Depois de carregado, o culto segue mesmo se a internet cair.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const songs: ProjectedSong[] = useMemo(
    () =>
      (event?.playlist?.songs ?? []).map((item) => ({
        title: item.song.title,
        slides: songSlides(item.song),
      })),
    [event],
  );

  const [selectedSong, setSelectedSong] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const [overlay, setOverlay] = useState<"black" | "logo" | null>("logo");

  const live: ScreenState = overlay ? { mode: overlay } : (stateFor(songs, position) ?? { mode: "logo" });
  const next = stateFor(songs, step(songs, position, 1));

  const liveRef = useRef<ScreenState>({ mode: "logo" });
  const channelRef = useRef<ReturnType<typeof createOperatorChannel> | null>(null);

  useEffect(() => {
    const channel = createOperatorChannel(() => liveRef.current);
    channelRef.current = channel;
    return () => channel.close();
  }, []);

  const liveKey = JSON.stringify(live);
  useEffect(() => {
    const state = JSON.parse(liveKey) as ScreenState;
    liveRef.current = state;
    channelRef.current?.send(state);
  }, [liveKey]);

  const show = useCallback((target: Position) => {
    setOverlay(null);
    setPosition(target);
    setSelectedSong(target.song);
  }, []);

  const move = useCallback(
    (delta: 1 | -1) => {
      const target = step(songs, position, delta);
      if (target) show(target);
    },
    [songs, position, show],
  );

  useEffect(() => {
    const onKey = (keyEvent: KeyboardEvent) => {
      const target = keyEvent.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const key = keyEvent.key;
      if (["ArrowRight", "ArrowDown", "PageDown", " "].includes(key)) {
        keyEvent.preventDefault();
        move(1);
      } else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(key)) {
        keyEvent.preventDefault();
        move(-1);
      } else if (key === "b" || key === "B") {
        setOverlay((current) => (current === "black" ? null : "black"));
      } else if (key === "l" || key === "L") {
        setOverlay((current) => (current === "logo" ? null : "logo"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  useEffect(() => {
    if (event) document.title = `Projeção · ${event.title}`;
  }, [event]);

  const openScreen = () => {
    window.open("/telao", "centric-telao", "popup,width=1280,height=720");
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <SkeletonLines count={8} />
      </div>
    );
  }
  if (isError || !event) {
    return (
      <div className="p-6">{isForbidden(error) ? <ForbiddenState /> : <ErrorState error={error} onRetry={() => refetch()} />}</div>
    );
  }

  const current = songs[selectedSong];

  return (
    <div className="flex h-screen flex-col bg-ivory">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to={`/events/${event.id}`} className="text-muted hover:text-ink" aria-label="Voltar para o evento">
            <IconChevronLeft width={20} height={20} />
          </Link>
          <div>
            <h1 className="font-display text-lg font-semibold text-ink">{event.title}</h1>
            <p className="text-xs text-muted">Setas: avançar e voltar · B: tela preta · L: logo</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={overlay === "black" ? "primary" : "secondary"} size="sm" onClick={() => setOverlay(overlay === "black" ? null : "black")}>
            Tela preta (B)
          </Button>
          <Button variant={overlay === "logo" ? "primary" : "secondary"} size="sm" onClick={() => setOverlay(overlay === "logo" ? null : "logo")}>
            Logo (L)
          </Button>
          <Button size="sm" icon={<IconMonitor width={16} height={16} />} onClick={openScreen}>
            Abrir telão
          </Button>
        </div>
      </header>

      {songs.length === 0 ? (
        <div className="p-6 text-sm text-muted">
          Este evento ainda não tem repertório. Adicione músicas no evento para projetar.
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[14rem_1fr_20rem]">
          <nav className="min-h-0 overflow-auto rounded-card border border-line bg-surface p-2" aria-label="Repertório">
            {songs.map((song, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedSong(index)}
                className={`mb-1 block w-full rounded-field px-3 py-2 text-left text-sm ${
                  index === selectedSong ? "bg-north text-white" : "text-ink hover:bg-ivory"
                }`}
              >
                <span className="mr-2 text-xs opacity-60">{index + 1}</span>
                {song.title}
                {position?.song === index && !overlay && <span className="ml-1 text-xs">● no telão</span>}
              </button>
            ))}
          </nav>

          <section className="min-h-0 overflow-auto" aria-label="Slides">
            <h2 className="mb-2 text-sm font-medium text-muted">{current?.title}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {current?.slides.map((slide, index) => {
                const isLive = !overlay && position?.song === selectedSong && position.slide === index;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => show({ song: selectedSong, slide: index })}
                    className={`rounded-card border-2 bg-surface p-3 text-left text-sm leading-snug ${
                      isLive ? "border-north" : "border-line hover:border-north/40"
                    }`}
                  >
                    <span className="mb-1 block text-xs text-muted">
                      {index + 1}
                      {slide.label ? ` · ${slide.label}` : ""}
                      {isLive ? " · no telão" : ""}
                    </span>
                    {slide.lines.map((line, lineIndex) => (
                      <span key={lineIndex} className="block text-ink">
                        {line}
                      </span>
                    ))}
                  </button>
                );
              })}
              {current && current.slides.length === 0 && <p className="text-sm text-muted">Esta música não tem letra.</p>}
            </div>
          </section>

          <aside className="flex flex-col gap-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">No telão agora</p>
              <div className="aspect-video overflow-hidden rounded-card border border-line">
                <ScreenContent state={live} compact />
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Próximo</p>
              <div className="aspect-video overflow-hidden rounded-card border border-line opacity-70">
                <ScreenContent state={next ?? { mode: "black" }} compact />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => move(-1)}>
                Voltar
              </Button>
              <Button className="flex-1" onClick={() => move(1)}>
                Avançar
              </Button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
