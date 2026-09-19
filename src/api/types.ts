// Tipos escritos à mão a partir da seção 3 do BRIEFING.md, confirmados contra o
// código-fonte de ../centric-api. Nenhum campo aqui deve ser inventado: se a API não
// devolve, o tipo não declara.

export type UserRole = "ADMIN" | "LEADER" | "MEMBER";

export type EventType =
  | "CULTO"
  | "ENSAIO"
  | "CONFRATERNIZACAO"
  | "ACAO_MISSIONARIA"
  | "EVENTO_ESPECIAL"
  | "OUTRO";

export type EventStatus = "RASCUNHO" | "PUBLICADO";

export type AssignmentStatus = "CONVIDADO" | "CONFIRMADO" | "RECUSADO";

export type SongView = "lyrics" | "chords";

export type ProgramBlockType = "MUSICA" | "MOMENTO" | "PREGACAO";

// ---------------------------------------------------------------------------
// Auth / usuário
// ---------------------------------------------------------------------------

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  prefers_chords: boolean;
}

export interface UserSummary {
  id: number;
  name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  role: UserRole;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  prefers_chords?: boolean;
}

export interface UpdateMePayload {
  prefers_chords: boolean;
}

// ---------------------------------------------------------------------------
// Músicas
// ---------------------------------------------------------------------------

/** Item de GET /songs/: só traz UMA das duas visões (lyrics OU chordpro). */
export interface SongListItem {
  id: number;
  title: string;
  artist: string | null;
  lyrics?: string;
  chordpro?: string;
  tone: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /songs/{id}: sempre traz as duas visões. */
export interface SongDetail {
  id: number;
  title: string;
  artist: string | null;
  lyrics: string;
  chordpro: string | null;
  tone: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
}

export interface SongListResponse {
  total: number;
  page: number;
  limit: number;
  items: SongListItem[];
}

export interface SongCreatePayload {
  title: string;
  lyrics: string;
  chordpro?: string | null;
  artist?: string | null;
  tone?: string | null;
  category?: string | null;
}

export interface SongUpdatePayload {
  title?: string;
  lyrics?: string;
  chordpro?: string | null;
  artist?: string | null;
  tone?: string | null;
  category?: string | null;
}

// ---------------------------------------------------------------------------
// Playlist (repertório)
// ---------------------------------------------------------------------------

export interface PlaylistSong {
  id: number;
  playlist_id: number;
  song_id: number;
  position: number;
  created_at: string;
  updated_at: string;
  song: SongListItem;
}

export interface Playlist {
  id: number;
  title: string;
  date: string;
  description: string | null;
  created_by: number;
  event_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PlaylistDetail extends Playlist {
  songs: PlaylistSong[];
}

export interface PlaylistListResponse {
  total: number;
  page: number;
  limit: number;
  items: Playlist[];
}

export interface PlaylistCreatePayload {
  title: string;
  date: string;
  description?: string | null;
  event_id?: number | null;
}

export interface PlaylistUpdatePayload {
  title?: string;
  date?: string;
  description?: string | null;
  event_id?: number | null;
}

export interface AddSongToPlaylistPayload {
  song_id: number;
  position?: number;
}

export interface ReorderPlaylistPayload {
  item_ids: number[];
}

// ---------------------------------------------------------------------------
// Ministério, escala (assignments), pregação
// ---------------------------------------------------------------------------

export interface MinistrySummary {
  id: number;
  name: string;
}

export interface Assignment {
  id: number;
  event_id: number;
  user_id: number;
  ministry_id: number;
  function: string;
  status: AssignmentStatus;
  responded_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssignmentDetail extends Assignment {
  user: UserSummary;
  ministry: MinistrySummary;
}

export interface MyAssignment extends Assignment {
  event_title: string;
  event_date: string;
  event_time: string;
}

export interface AssignmentCreatePayload {
  user_id: number;
  ministry_id: number;
  function: string;
  notes?: string | null;
}

export interface AssignmentUpdatePayload {
  user_id?: number;
  ministry_id?: number;
  function?: string;
  notes?: string | null;
}

export interface AssignmentRespondPayload {
  status: "CONFIRMADO" | "RECUSADO";
}

export interface Preaching {
  id: number;
  event_id: number;
  preacher_id: number;
  theme: string;
  bible_reference: string | null;
  notes: string | null;
  preacher: UserSummary;
}

export interface PreachingUpsertPayload {
  preacher_id: number;
  theme: string;
  bible_reference?: string | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------

export interface Event {
  id: number;
  title: string;
  date: string;
  time: string;
  type: EventType;
  status: EventStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface EventWarning {
  code: string;
  message: string;
  user_id: number;
  ministry_ids: number[];
}

export interface EventDetail extends Event {
  assignments: AssignmentDetail[];
  preaching: Preaching | null;
  playlist: PlaylistDetail | null;
  warnings: EventWarning[];
}

export interface EventListResponse {
  total: number;
  page: number;
  limit: number;
  items: Event[];
}

export interface EventCreatePayload {
  title: string;
  date: string;
  time: string;
  type: EventType;
  status?: EventStatus;
}

export interface EventUpdatePayload {
  title?: string;
  date?: string;
  time?: string;
  type?: EventType;
  status?: EventStatus;
}

// ---------------------------------------------------------------------------
// Programação com IA
// ---------------------------------------------------------------------------

export interface ProgramBlock {
  ordem: number;
  tipo: ProgramBlockType;
  song_id: number | null;
  titulo: string | null;
  duracao_min: number;
  motivo: string | null;
}

export interface ProgramDraft {
  resumo: string;
  blocos: ProgramBlock[];
  alertas: string[];
}

export interface ProgramSuggestion extends ProgramDraft {
  suggestion_id: number;
  event_id: number;
  briefing: string;
  duracao_alvo_min: number;
  provider_model: string;
  cached: boolean;
  created_at: string;
  applied_at: string | null;
}

export interface ProgramSuggestPayload {
  briefing: string;
  duracao_alvo_min?: number;
}

export interface ProgramApplyPayload {
  suggestion_id: number;
  programacao?: ProgramDraft;
}

export interface ProgramApplyResponse {
  suggestion_id: number;
  playlist_id: number;
  song_ids: number[];
  applied_at: string;
}

// ---------------------------------------------------------------------------
// Paginação / listagem — parâmetros comuns
// ---------------------------------------------------------------------------

export interface PageParams {
  page?: number;
  limit?: number;
}
