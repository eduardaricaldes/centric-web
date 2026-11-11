import { z } from "zod";
import { apiRequest } from "./client";
import type { ShareLink, ShareLinkListResponse, ShareTarget } from "./types";

function targetPayload(target: ShareTarget): { song_id?: number; event_id?: number } {
  return "songId" in target ? { song_id: target.songId } : { event_id: target.eventId };
}

/** Chave do TanStack Query para os links ativos de uma música ou evento. */
export function shareLinksKey(target: ShareTarget): readonly unknown[] {
  return ["share-links", targetPayload(target)];
}

/**
 * Gera o link, ou devolve o que já está ativo para a mesma música/evento — a API
 * nunca cria um segundo link enquanto o primeiro não for revogado.
 */
export function createShareLink(target: ShareTarget): Promise<ShareLink> {
  return apiRequest<ShareLink>("/share-links/", { method: "POST", json: targetPayload(target) });
}

export function listShareLinks(target: ShareTarget): Promise<ShareLinkListResponse> {
  return apiRequest<ShareLinkListResponse>("/share-links/", { query: targetPayload(target) });
}

/** Revogar derruba o link na hora: quem abrir o endereço antigo recebe 404. */
export function revokeShareLink(id: number): Promise<void> {
  return apiRequest<void>(`/share-links/${id}`, { method: "DELETE" });
}

/** Endereço que se manda para a pessoa sem cadastro (página `/s/:token`). */
export function shareUrl(token: string, origin: string = window.location.origin): string {
  return new URL(`/s/${encodeURIComponent(token)}`, origin).toString();
}

// ---------------------------------------------------------------------------
// Leitura pública — a resposta vem de fora do login, então passa pelo zod.
// ---------------------------------------------------------------------------

const publicSongSchema = z.object({
  title: z.string(),
  artist: z.string().nullish(),
  tone: z.string().nullish(),
  lyrics: z.string(),
  chordpro: z.string().nullish(),
});

export const publicShareSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("song"), song: publicSongSchema }),
  z.object({
    kind: z.literal("event"),
    title: z.string(),
    date: z.string(),
    songs: z.array(publicSongSchema),
  }),
]);

export type PublicSong = z.infer<typeof publicSongSchema>;
export type PublicShare = z.infer<typeof publicShareSchema>;

export async function getPublicShare(token: string): Promise<PublicShare> {
  const data = await apiRequest<unknown>(`/public/share/${encodeURIComponent(token)}`);
  return publicShareSchema.parse(data);
}

/** Cifra de verdade = ChordPro com pelo menos um acorde entre colchetes. */
export function publicSongHasChords(song: PublicSong): boolean {
  return Boolean(song.chordpro && /\[[^\]]+\]/.test(song.chordpro));
}

/** Músicas que a página pública mostra, na ordem do repertório. */
export function publicShareSongs(share: PublicShare): PublicSong[] {
  return share.kind === "song" ? [share.song] : share.songs;
}
