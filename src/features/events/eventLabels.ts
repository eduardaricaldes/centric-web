import type { EventDetail, EventType, EventWarning } from "../../api/types";

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  CULTO: "Culto",
  ENSAIO: "Ensaio",
  CONFRATERNIZACAO: "Confraternização",
  ACAO_MISSIONARIA: "Ação missionária",
  EVENTO_ESPECIAL: "Evento especial",
  OUTRO: "Outro",
};

/**
 * A API manda `message` em inglês; traduzimos pelo `code` e usamos os nomes que
 * já vieram no próprio evento. Código desconhecido cai no `message` original.
 */
export function warningLabel(warning: EventWarning, event: EventDetail): string {
  switch (warning.code) {
    case "SONG_RECENTLY_USED": {
      const title = event.playlist?.songs.find((item) => item.song_id === warning.song_id)?.song.title;
      return title
        ? `“${title}” foi usada em um evento recente`
        : "Uma música deste repertório foi usada em um evento recente";
    }
    case "USER_MULTIPLE_MINISTRIES": {
      const name = event.assignments.find((a) => a.user.id === warning.user_id)?.user.name;
      return name
        ? `${name} está escalado(a) em mais de um ministério neste evento`
        : "Uma pessoa está escalada em mais de um ministério neste evento";
    }
    default:
      return warning.message;
  }
}
