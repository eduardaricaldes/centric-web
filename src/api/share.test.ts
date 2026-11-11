import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createShareLink,
  getPublicShare,
  listShareLinks,
  publicShareSchema,
  publicShareSongs,
  publicSongHasChords,
  revokeShareLink,
  shareUrl,
} from "./share";
import { isPublicApiPath, isPublicPage } from "./client";

const song = {
  title: "Ousado Amor",
  artist: "Isaias Saad",
  tone: "G",
  lyrics: "Ousado amor",
  chordpro: "[G]Ousado [D]amor",
};

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastCall(fetchMock: ReturnType<typeof mockFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url: new URL(url), init };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("shareUrl", () => {
  it("monta o endereço da página pública /s/:token", () => {
    expect(shareUrl("abc_DEF-123", "https://centric-web-gamma.vercel.app")).toBe(
      "https://centric-web-gamma.vercel.app/s/abc_DEF-123",
    );
  });
});

describe("rotas públicas", () => {
  it("a API de leitura pública não leva token de login", () => {
    expect(isPublicApiPath("/public/share/abc")).toBe(true);
    expect(isPublicApiPath("/auth/login")).toBe(true);
    expect(isPublicApiPath("/share-links/")).toBe(false);
    expect(isPublicApiPath("/songs/1")).toBe(false);
  });

  it("só /s/* é página aberta (sessão vencida não manda para o login)", () => {
    expect(isPublicPage("/s/abc")).toBe(true);
    expect(isPublicPage("/songs/1")).toBe(false);
    expect(isPublicPage("/settings")).toBe(false);
  });
});

describe("publicShareSchema", () => {
  it("aceita link de música", () => {
    const share = publicShareSchema.parse({ kind: "song", song });
    expect(publicShareSongs(share)).toEqual([song]);
  });

  it("aceita repertório de evento e mantém a ordem", () => {
    const second = { ...song, title: "Descansarei", chordpro: null };
    const share = publicShareSchema.parse({
      kind: "event",
      title: "Culto de domingo",
      date: "2026-10-04",
      songs: [second, song],
    });
    expect(publicShareSongs(share).map((item) => item.title)).toEqual([
      "Descansarei",
      "Ousado Amor",
    ]);
  });

  it("descarta campos que não são de letra, se algum dia vierem", () => {
    const share = publicShareSchema.parse({
      kind: "song",
      song: { ...song, id: 7, email: "alguem@north.com" },
    });
    expect(share.kind === "song" && Object.keys(share.song).sort()).toEqual(
      ["artist", "chordpro", "lyrics", "title", "tone"],
    );
  });

  it("recusa resposta sem letra", () => {
    expect(() => publicShareSchema.parse({ kind: "song", song: { title: "X" } })).toThrow();
  });
});

describe("publicSongHasChords", () => {
  it("só conta como cifra quando há acorde entre colchetes", () => {
    expect(publicSongHasChords(song)).toBe(true);
    expect(publicSongHasChords({ ...song, chordpro: null })).toBe(false);
    expect(publicSongHasChords({ ...song, chordpro: "só letra" })).toBe(false);
  });
});

describe("chamadas à API", () => {
  it("getPublicShare lê sem login e valida a resposta", async () => {
    vi.stubGlobal("localStorage", { getItem: () => "jwt-da-sessao" });
    const fetchMock = mockFetch(200, { kind: "song", song });

    const share = await getPublicShare("tok");

    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/public/share/tok");
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(share.kind).toBe("song");
  });

  it("getPublicShare propaga o 404 de link revogado", async () => {
    mockFetch(404, { detail: "Link not found" });
    await expect(getPublicShare("revogado")).rejects.toMatchObject({ status: 404 });
  });

  it("createShareLink manda song_id ou event_id", async () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    const fetchMock = mockFetch(201, { id: 1, token: "t", kind: "EVENT" });

    await createShareLink({ eventId: 9 });

    const { url, init } = lastCall(fetchMock);
    expect(url.pathname).toBe("/share-links/");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ event_id: 9 });
  });

  it("listShareLinks filtra pela música e revokeShareLink usa DELETE", async () => {
    vi.stubGlobal("localStorage", { getItem: () => null });
    const fetchMock = mockFetch(200, { total: 0, items: [] });

    await listShareLinks({ songId: 3 });
    expect(lastCall(fetchMock).url.searchParams.get("song_id")).toBe("3");

    mockFetch(204, undefined);
    await expect(revokeShareLink(5)).resolves.toBeUndefined();
  });
});
