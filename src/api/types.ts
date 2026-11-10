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

/** GET /users/ — só ADMIN/LEADER. */
export interface UserListResponse {
  total: number;
  page: number;
  limit: number;
  items: User[];
}

export interface UserRoleUpdatePayload {
  role: UserRole;
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
  /** Obrigatório desde a Fase 6 (Etapa 9): cadastro só acontece por convite. */
  invite_token?: string;
}

export interface UpdateMePayload {
  name?: string;
  prefers_chords?: boolean;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

export interface PasswordResetTokenResponse {
  token: string;
  expires_at: string;
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
  duration_min: number | null;
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
  duration_min: number | null;
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
  duration_min?: number | null;
}

export interface SongUpdatePayload {
  title?: string;
  lyrics?: string;
  chordpro?: string | null;
  artist?: string | null;
  tone?: string | null;
  category?: string | null;
  duration_min?: number | null;
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
  /** Soma de `duration_min` das músicas (0 quando nenhuma tem duração cadastrada). */
  total_duration_min: number;
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

/** GET /ministries/ — só ADMIN/LEADER. */
export interface MinistryItem {
  id: number;
  name: string;
  description: string | null;
}

export interface MinistryListResponse {
  total: number;
  items: MinistryItem[];
}

export type MinistryRole = "LEADER" | "MEMBER";

/** GET /ministries/{id}/members — só ADMIN/LEADER. Sem e-mail nem dado sensível. */
export interface MinistryMember {
  user_id: number;
  name: string;
  role: MinistryRole;
  instrument: string | null;
}

/** Resposta de POST/PATCH /ministries/ — só ADMIN. */
export interface MinistryDetail {
  id: number;
  name: string;
  description: string | null;
}

export interface MinistryCreatePayload {
  name: string;
  description?: string | null;
}

export interface MinistryUpdatePayload {
  name?: string;
  description?: string | null;
}

export interface MemberCreatePayload {
  user_id: number;
  role?: MinistryRole;
  instrument?: string | null;
}

export interface MemberUpdatePayload {
  role?: MinistryRole;
  instrument?: string | null;
}

// ---------------------------------------------------------------------------
// Convites
// ---------------------------------------------------------------------------

export interface InviteCreatePayload {
  email?: string | null;
  role: UserRole;
  ministry_id?: number | null;
  ministry_role: MinistryRole;
  instrument?: string | null;
}

/** Resposta de POST /invites/ — só aqui o token aparece, uma vez. */
export interface InviteCreateResponse {
  id: number;
  token: string;
  email: string | null;
  role: UserRole;
  ministry_id: number | null;
  ministry_role: MinistryRole | null;
  instrument: string | null;
  expires_at: string;
  created_at: string;
}

/** GET /invites/ — nunca traz o token de volta. */
export interface InviteResponse {
  id: number;
  email: string | null;
  role: UserRole;
  ministry_id: number | null;
  ministry_name: string | null;
  ministry_role: MinistryRole | null;
  instrument: string | null;
  created_by: number;
  created_by_name: string;
  expires_at: string;
  created_at: string;
}

export interface InviteListResponse {
  total: number;
  items: InviteResponse[];
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

/**
 * Lista aberta de avisos (regra 3.3). Hoje existem dois formatos:
 * - `USER_MULTIPLE_MINISTRIES`: `user_id` + `ministry_ids` presentes.
 * - `SONG_RECENTLY_USED`: `song_id` presente (a música voltou a se repetir em
 *   menos de 28 dias, conferido contra `services/programs.py`).
 * O `message` vem em inglês: mostre via `warningLabel` (eventLabels.ts), que
 * traduz pelo `code`. Trate os campos específicos como opcionais.
 */
export interface EventWarning {
  code: string;
  message: string;
  user_id?: number;
  ministry_ids?: number[];
  song_id?: number;
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
