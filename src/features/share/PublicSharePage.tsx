import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { getPublicShare, publicShareSongs, publicSongHasChords, type PublicSong } from "../../api/share";
import { SkeletonLines } from "../../components/Skeleton";
import { formatDateLong } from "../../lib/dates";
import { getErrorMessage, isNotFound } from "../../lib/errors";
import { parseChordProLines } from "../../lib/chordpro";

type SongView = "lyrics" | "chords";

/**
 * Pede ao Google e afins para não indexar a página enquanto ela estiver aberta.
 * O `vercel.json` manda o mesmo recado no header `X-Robots-Tag` de `/s/*`.
 */
function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);
}

function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · Centric`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

function SongSheet({ song, view, index }: { song: PublicSong; view: SongView; index?: number }) {
  const showChords = view === "chords" && publicSongHasChords(song);

  return (
    <article className="rounded-card border border-line bg-surface p-4 sm:p-6">
      <header className="mb-4">
        <h2 className="font-display text-xl font-semibold leading-tight text-ink sm:text-2xl">
          {index !== undefined && <span className="mr-2 text-muted">{index}.</span>}
          {song.title}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {[song.artist, song.tone && `Tom: ${song.tone}`].filter(Boolean).join(" · ")}
        </p>
      </header>

      {showChords ? (
        // Cifra não quebra linha: o acorde precisa ficar em cima da sílaba certa.
        <pre className="overflow-x-auto font-mono text-sm leading-relaxed text-ink">
          {parseChordProLines(song.chordpro ?? "").map((line, lineIndex) => (
            <div key={lineIndex} className="mb-1">
              {line.chordRow && <div className="text-amber-ink">{line.chordRow}</div>}
              <div>{line.lyricRow || " "}</div>
            </div>
          ))}
        </pre>
      ) : (
        <div className="whitespace-pre-wrap font-display text-lg leading-relaxed text-ink">
          {song.lyrics}
        </div>
      )}
    </article>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ivory">
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">{children}</main>
      <footer className="pb-8 text-center text-xs text-muted">Centric · Comunidade North</footer>
    </div>
  );
}

/** Página aberta, fora do login: letra e cifra de um link compartilhado. */
export function PublicSharePage() {
  const { token = "" } = useParams<{ token: string }>();
  const [view, setView] = useState<SongView>("lyrics");

  useNoIndex();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-share", token],
    queryFn: () => getPublicShare(token),
    retry: false,
  });

  useDocumentTitle(data ? (data.kind === "song" ? data.song.title : data.title) : null);

  if (isLoading) {
    return (
      <Shell>
        <SkeletonLines count={12} />
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <div className="rounded-card border border-line bg-surface p-6 text-center">
          <h1 className="font-display text-xl font-semibold text-ink">
            {isNotFound(error) ? "Link indisponível" : "Não deu para abrir"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {isNotFound(error)
              ? "Este link foi revogado ou não existe. Peça um novo a quem enviou."
              : getErrorMessage(error)}
          </p>
        </div>
      </Shell>
    );
  }

  const songs = publicShareSongs(data);
  const anyChords = songs.some(publicSongHasChords);

  return (
    <Shell>
      {data.kind === "event" && (
        <header className="mb-5">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {data.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{formatDateLong(data.date)}</p>
        </header>
      )}

      {anyChords && (
        <div className="sticky top-0 z-10 -mx-4 mb-4 bg-ivory/95 px-4 py-2 backdrop-blur">
          <div className="inline-flex rounded-field border border-line bg-surface p-1">
            {(["lyrics", "chords"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={`h-9 rounded-field px-4 text-sm font-medium ${
                  view === option ? "bg-north text-white" : "text-ink"
                }`}
              >
                {option === "lyrics" ? "Letra" : "Cifra"}
              </button>
            ))}
          </div>
        </div>
      )}

      {songs.length === 0 ? (
        <p className="rounded-card border border-line bg-surface p-6 text-sm text-muted">
          O repertório deste evento ainda está vazio.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {songs.map((song, index) => (
            <SongSheet
              key={index}
              song={song}
              view={view}
              index={data.kind === "event" ? index + 1 : undefined}
            />
          ))}
        </div>
      )}
    </Shell>
  );
}
