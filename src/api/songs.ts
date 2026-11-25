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
  category?: string;
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

/** Lista fechada de categorias (definida na API, `app/models/song_categories.py`). */
export function listSongCategories(): Promise<string[]> {
  return apiRequest<string[]>("/songs/categories");
}

/** Rascunho lido de um arquivo (PDF, Word, TXT ou foto). A API não salva nada. */
export interface SongImportDraft {
  title: string;
  artist: string | null;
  tone: string | null;
  chordpro: string;
  lyrics: string;
  used_ai: boolean;
}

export const IMPORT_ACCEPT = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.heic,image/*,application/pdf,text/plain";
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;

export function importSongFile(file: File): Promise<SongImportDraft> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<SongImportDraft>("/songs/import", { method: "POST", formData });
}

/** Compara títulos sem acento, caixa ou pontuação ("Ele é a Glória" = "ele e a gloria!"). */
export function normalizeTitle(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Músicas já cadastradas com o mesmo título, ignorando acento e caixa (aviso antes de criar outra). */
export async function findSongsWithSameTitle(title: string, ignoreId?: number): Promise<SongListItem[]> {
  if (!normalizeTitle(title)) return [];
  const items = await apiRequest<SongListItem[]>("/songs/same-title", { query: { title } });
  return items.filter((item) => item.id !== ignoreId);
}
