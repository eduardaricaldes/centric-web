import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listItemHasChords, listSongs } from "../../api/songs";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonTable } from "../../components/Skeleton";
import { IconChevronLeft, IconChevronRight, IconEdit, IconMusic, IconPlus } from "../../components/icons";
import { useAuth } from "../auth/AuthContext";
import { formatTimestamp } from "../../lib/dates";
import { isForbidden } from "../../lib/errors";
import { canManageSongs } from "../../lib/permissions";

const LIMIT = 10;
const DEBOUNCE_MS = 400;

function useDebouncedText(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SongList() {
  const { user } = useAuth();
  const canManage = canManageSongs(user);
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") ?? "";
  const artist = searchParams.get("artist") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const [searchInput, setSearchInput] = useState(search);
  const [artistInput, setArtistInput] = useState(artist);
  const debouncedSearch = useDebouncedText(searchInput, DEBOUNCE_MS);
  const debouncedArtist = useDebouncedText(artistInput, DEBOUNCE_MS);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (debouncedSearch) next.set("search", debouncedSearch);
      else next.delete("search");
      if (debouncedArtist) next.set("artist", debouncedArtist);
      else next.delete("artist");
      next.delete("page");
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reagimos ao valor com debounce
  }, [debouncedSearch, debouncedArtist]);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["songs", { search, artist, page }],
    queryFn: () => listSongs({ search: search || undefined, artist: artist || undefined, page, limit: LIMIT }),
    placeholderData: (previous) => previous,
  });

  const goToPage = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(nextPage));
      return next;
    });
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader
        title="Músicas"
        description="Catálogo com letra e cifra da comunidade."
        actions={
          canManage ? (
            <Link to="/songs/new">
              <Button icon={<IconPlus width={18} height={18} />}>Nova música</Button>
            </Link>
          ) : undefined
        }
      />

      <div className="mb-5 flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por título"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          className="w-full max-w-xs"
          aria-label="Buscar por título"
        />
        <Input
          placeholder="Buscar por artista"
          value={artistInput}
          onChange={(event) => setArtistInput(event.target.value)}
          className="w-full max-w-xs"
          aria-label="Buscar por artista"
        />
      </div>

      {isLoading ? (
        <SkeletonTable rows={LIMIT} cols={6} />
      ) : isError ? (
        isForbidden(error) ? (
          <ForbiddenState />
        ) : (
          <ErrorState error={error} onRetry={() => refetch()} />
        )
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={<IconMusic width={32} height={32} />}
          title="Nenhuma música encontrada"
          description={
            search || artist
              ? "Tente outro termo de busca."
              : "Cadastre a primeira música do repertório."
          }
        />
      ) : (
        <div className={`overflow-x-auto rounded-card border border-line bg-surface ${isFetching ? "opacity-70" : ""}`}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Artista</th>
                <th className="px-4 py-3 font-medium">Tom</th>
                <th className="px-4 py-3 font-medium">Cifra</th>
                <th className="px-4 py-3 font-medium">Categoria</th>
                <th className="px-4 py-3 font-medium">Atualizada</th>
                {canManage && <th className="px-4 py-3 font-medium" />}
              </tr>
            </thead>
            <tbody>
              {data?.items.map((song) => (
                <tr key={song.id} className="border-b border-line last:border-0 hover:bg-ivory">
                  <td className="px-4 py-3">
                    <Link to={`/songs/${song.id}`} className="font-medium text-ink hover:text-north">
                      {song.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{song.artist ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{song.tone ?? "—"}</td>
                  <td className="px-4 py-3">
                    {listItemHasChords(song) ? (
                      <Badge tone="amber">Sim</Badge>
                    ) : (
                      <Badge tone="neutral">Não</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{song.category ?? "—"}</td>
                  <td className="px-4 py-3 text-muted">{formatTimestamp(song.updated_at)}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/songs/${song.id}/edit`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-field text-muted hover:bg-ivory hover:text-north"
                        aria-label={`Editar ${song.title}`}
                      >
                        <IconEdit width={16} height={16} />
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted">
          <span>
            {data.total} música{data.total === 1 ? "" : "s"} — página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              icon={<IconChevronLeft width={16} height={16} />}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Próxima
              <IconChevronRight width={16} height={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
