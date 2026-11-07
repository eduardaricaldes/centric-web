import { describe, expect, it } from "vitest";
import type { EventDetail } from "../../api/types";
import { warningLabel } from "./eventLabels";

const event = {
  playlist: { songs: [{ song_id: 7, song: { title: "Rio de Graça" } }] },
  assignments: [{ user: { id: 3, name: "Marina" } }],
} as unknown as EventDetail;

describe("warningLabel", () => {
  it("traduz música repetida com o nome da música", () => {
    const w = { code: "SONG_RECENTLY_USED", message: "Song was used in a recent event", song_id: 7 };
    expect(warningLabel(w, event)).toBe("“Rio de Graça” foi usada em um evento recente");
  });

  it("traduz música repetida mesmo sem achar a música no repertório", () => {
    const w = { code: "SONG_RECENTLY_USED", message: "Song was used in a recent event", song_id: 99 };
    expect(warningLabel(w, event)).toBe("Uma música deste repertório foi usada em um evento recente");
  });

  it("traduz pessoa em mais de um ministério com o nome dela", () => {
    const w = { code: "USER_MULTIPLE_MINISTRIES", message: "User is assigned…", user_id: 3, ministry_ids: [1, 2] };
    expect(warningLabel(w, event)).toBe("Marina está escalado(a) em mais de um ministério neste evento");
  });

  it("código desconhecido mostra o message da API", () => {
    expect(warningLabel({ code: "NOVO", message: "Algo novo" }, event)).toBe("Algo novo");
  });
});
