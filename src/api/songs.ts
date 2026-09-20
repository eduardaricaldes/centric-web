import { apiRequest } from "./client";
import type {
  PageParams,
  SongCreatePayload,
  SongDetail,
  SongListItem,
  SongListResponse,
  SongUpdatePayload,
} from "./types";

export interface ListSongsParams extends PageParams {
  search?: string;
  artist?: string;
}

/**
 * `GET /songs/` só devolve UMA das duas visões (regra 3.1.4): quando a visão é
 * "lyrics", a chave `chordpro` nem existe na resposta — não dá para saber se a
 * música tem cifra. Por isso a listagem sempre pede `view=chords` por baixo dos
 * panos: a tabela nunca mostra o corpo da letra/cifra, só o indicador "cifra
 * sim/não", então a visão pedida aqui não tem relação com a preferência do usuário.
 * Ver NOTAS.md.
 */
export function listSongs(params: ListSongsParams = {}): Promise<SongListResponse> {
  return apiRequest<SongListResponse>("/songs/", {
    query: { ...params, view: "chords" },
  });
}

const CHORD_TOKEN_RE = /\[[^\]]*\]/;

/**
 * Heurística: no `view=chords` a API sempre devolve algo em `chordpro` (usa a letra
 * como reserva quando não há cifra de verdade — `song.chordpro or song.lyrics` em
 * `song_views.py`). Só tem cifra de verdade quando o texto contém pelo menos um
 * token `[Acorde]`.
 */
export function listItemHasChords(item: SongListItem): boolean {
  return Boolean(item.chordpro && CHORD_TOKEN_RE.test(item.chordpro));
}

/**
 * `GET /songs/{id}` sempre pede `view=lyrics` explicitamente, para receber o
 * `chordpro` cru (pode ser `null` de verdade) em vez do valor com reserva que a API
 * devolve para `view=chords`. Ver `hasRealChords`.
 */
export function getSong(id: number): Promise<SongDetail> {
  return apiRequest<SongDetail>(`/songs/${id}`, { query: { view: "lyrics" } });
}

export function hasRealChords(song: SongDetail): boolean {
  return song.chordpro !== null && song.chordpro.trim().length > 0;
}

/** ChordPro pronto pra exibir no modo cifra: usa a letra como reserva, igual à API. */
export function chordproOrFallback(song: SongDetail): string {
  return song.chordpro ?? song.lyrics;
}

export function createSong(payload: SongCreatePayload): Promise<SongDetail> {
  return apiRequest<SongDetail>("/songs/", { method: "POST", json: payload });
}

export function updateSong(id: number, payload: SongUpdatePayload): Promise<SongDetail> {
  return apiRequest<SongDetail>(`/songs/${id}`, { method: "PATCH", json: payload });
}

export function deleteSong(id: number): Promise<void> {
  return apiRequest<void>(`/songs/${id}`, { method: "DELETE" });
}
