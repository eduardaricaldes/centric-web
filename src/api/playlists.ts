import { apiRequest } from "./client";
import type {
  AddSongToPlaylistPayload,
  PageParams,
  Playlist,
  PlaylistCreatePayload,
  PlaylistDetail,
  PlaylistListResponse,
  PlaylistSong,
  PlaylistUpdatePayload,
  ReorderPlaylistPayload,
  SongView,
} from "./types";

export interface ListPlaylistsParams extends PageParams {
  search?: string;
}

export function listPlaylists(params: ListPlaylistsParams = {}): Promise<PlaylistListResponse> {
  return apiRequest<PlaylistListResponse>("/playlist/", { query: { ...params } });
}

export function getPlaylist(id: number, view?: SongView): Promise<PlaylistDetail> {
  return apiRequest<PlaylistDetail>(`/playlist/${id}`, { query: { view } });
}

export function createPlaylist(payload: PlaylistCreatePayload): Promise<Playlist> {
  return apiRequest<Playlist>("/playlist/", { method: "POST", json: payload });
}

export function updatePlaylist(id: number, payload: PlaylistUpdatePayload): Promise<Playlist> {
  return apiRequest<Playlist>(`/playlist/${id}`, { method: "PUT", json: payload });
}

export function deletePlaylist(id: number): Promise<void> {
  return apiRequest<void>(`/playlist/${id}`, { method: "DELETE" });
}

export function addSongToPlaylist(
  playlistId: number,
  payload: AddSongToPlaylistPayload,
): Promise<PlaylistSong> {
  return apiRequest<PlaylistSong>(`/playlist/${playlistId}/songs/`, {
    method: "POST",
    json: payload,
  });
}

export function removeSongFromPlaylist(playlistId: number, itemId: number): Promise<void> {
  return apiRequest<void>(`/playlist/${playlistId}/songs/${itemId}`, { method: "DELETE" });
}

/** A resposta traz os itens reordenados, mas a tela já reordenou otimista antes de chamar isso. */
export function reorderPlaylistSongs(
  playlistId: number,
  payload: ReorderPlaylistPayload,
): Promise<unknown> {
  return apiRequest(`/playlist/${playlistId}/songs/reorder`, {
    method: "PUT",
    json: payload,
  });
}
