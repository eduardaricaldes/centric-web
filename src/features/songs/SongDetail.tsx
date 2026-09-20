import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { chordproOrFallback, getSong, hasRealChords } from "../../api/songs";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonLines } from "../../components/Skeleton";
import { IconChevronLeft, IconEdit, IconMusic } from "../../components/icons";
import { useAuth } from "../auth/AuthContext";
import { formatTimestamp } from "../../lib/dates";
import { isNotFound } from "../../lib/errors";
import { canManageSongs } from "../../lib/permissions";
import { parseChordProLines, transposeChordPro, transposeTone } from "../../lib/chordpro";

type SongView = "lyrics" | "chords";

/** `key={id}` no wrapper de rota remonta este componente ao trocar de música, então
 * o estado local (visão e transposição) já nasce correto sem precisar de efeito. */
export function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const songId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: song, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["song", songId],
    queryFn: () => getSong(songId),
    enabled: Number.isFinite(songId),
  });

  const [view, setView] = useState<SongView>(user?.prefers_chords ? "chords" : "lyrics");
  const [semitones, setSemitones] = useState(0);

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <SkeletonLines count={12} />
      </div>
    );
  }

  if (isError) {
    if (isNotFound(error)) {
      return (
        <EmptyState
          icon={<IconMusic width={32} height={32} />}
          title="Música não encontrada"
          description="Ela pode ter sido removida do catálogo."
          action={
            <Link to="/songs">
              <Button variant="secondary" size="sm">
                Voltar para o catálogo
              </Button>
            </Link>
          }
        />
      );
    }
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  if (!song) return null;

  const canManage = canManageSongs(user);
  const showChords = view === "chords" && hasRealChords(song);
  const body = showChords
    ? transposeChordPro(chordproOrFallback(song), semitones)
    : song.lyrics;
  const lines = showChords ? parseChordProLines(body) : null;

  const toneLabel =
    song.tone && semitones !== 0
      ? transposeTone(song.tone, semitones)
      : song.tone;

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => navigate("/songs")}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
      >
        <IconChevronLeft width={16} height={16} />
        Voltar para músicas
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {song.title}
          </h1>
          {song.artist && <p className="mt-1 text-sm text-muted">{song.artist}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            {song.category && <Badge tone="neutral">{song.category}</Badge>}
            {toneLabel && (
              <Badge tone="amber">
                Tom: {toneLabel}
                {semitones !== 0 && ` (${semitones > 0 ? "+" : ""}${semitones})`}
              </Badge>
            )}
            <span className="text-xs text-muted self-center">
              Atualizada em {formatTimestamp(song.updated_at)}
            </span>
          </div>
        </div>
        {canManage && (
          <Link to={`/songs/${song.id}/edit`}>
            <Button variant="secondary" icon={<IconEdit width={16} height={16} />}>
              Editar
            </Button>
          </Link>
        )}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-3">
        <div className="flex rounded-field border border-line p-1">
          <button
            type="button"
            onClick={() => setView("lyrics")}
            className={`h-9 rounded-field px-3 text-sm font-medium ${
              view === "lyrics" ? "bg-north text-white" : "text-ink"
            }`}
          >
            Letra
          </button>
          <button
            type="button"
            onClick={() => setView("chords")}
            disabled={!hasRealChords(song)}
            className={`h-9 rounded-field px-3 text-sm font-medium disabled:opacity-40 ${
              view === "chords" ? "bg-north text-white" : "text-ink"
            }`}
          >
            Cifra
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!showChords}
            onClick={() => setSemitones((value) => value - 1)}
            aria-label="Baixar meio tom"
          >
            −
          </Button>
          <span className="w-28 text-center text-sm text-muted">
            {semitones === 0 ? "Tom original" : `${semitones > 0 ? "+" : ""}${semitones} semitons`}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!showChords}
            onClick={() => setSemitones((value) => value + 1)}
            aria-label="Subir meio tom"
          >
            +
          </Button>
        </div>
      </div>

      <div className="rounded-card border border-line bg-surface p-6">
        {showChords && lines ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-ink">
            {lines.map((line, index) => (
              <div key={index} className="mb-1">
                {line.chordRow && (
                  <div className="text-amber-ink">{line.chordRow || " "}</div>
                )}
                <div>{line.lyricRow || " "}</div>
              </div>
            ))}
          </pre>
        ) : (
          <div className="whitespace-pre-wrap font-display text-lg leading-relaxed text-ink">
            {song.lyrics}
          </div>
        )}
      </div>
    </div>
  );
}

/** Remonta SongDetail ao trocar de música (o React Router não remonta só por mudar o param). */
export function SongDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <SongDetail key={id} />;
}
