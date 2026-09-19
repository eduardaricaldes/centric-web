import { ApiError, NetworkError } from "../api/client";

/**
 * A API responde em inglês. Este mapa traduz as frases conhecidas; o que não é
 * reconhecido cai num texto genérico por status.
 */
const KNOWN_DETAILS: Record<string, string> = {
  "Incorrect email or password": "E-mail ou senha incorretos.",
  "E-mail already registered": "Este e-mail já está cadastrado.",
  "Song not found": "Música não encontrada.",
  "Song Not Found": "Música não encontrada.",
  "song not found": "Música não encontrada.",
  "Event not found": "Evento não encontrado.",
  "Playlist not found": "Repertório não encontrado.",
  "User not found": "Pessoa não encontrada.",
  "Ministry not found": "Ministério não encontrado.",
  "Assignment not found": "Escala não encontrada.",
  "Preaching not found": "Pregação não encontrada.",
  "Program suggestion not found": "Sugestão de programação não encontrada.",
  "Song already in this playlist": "Esta música já está no repertório.",
  "Event already has a playlist": "Este evento já tem um repertório.",
  "Program suggestion already applied": "Esta sugestão já foi aplicada.",
  "item_ids must contain every song of this playlist exactly once":
    "A nova ordem precisa incluir todas as músicas do repertório, sem faltar nem repetir.",
  "from must be before or equal to to": "A data inicial precisa ser antes da data final.",
  "Ministry leader access required": "Você precisa ser líder deste ministério para fazer isso.",
  "Event manager access required": "Você não tem permissão para gerenciar este evento.",
  "Playlist manager access required": "Você não tem permissão para gerenciar este repertório.",
  "Insufficient permissions": "Você não tem permissão para fazer isso.",
  "Leaders must link playlists to an event they manage":
    "Líderes só podem criar repertórios vinculados a um evento que gerenciam.",
  "Only the assigned user can respond": "Só a pessoa escalada pode confirmar ou recusar.",
  "Could not validate credentials": "Sua sessão expirou. Entre novamente.",
  "AI suggestion is unavailable; continue in manual mode":
    "A IA está indisponível agora. Monte a programação manualmente.",
  "Song catalog is empty": "Cadastre músicas antes de pedir uma sugestão de programação.",
};

const STATUS_FALLBACK: Record<number, string> = {
  400: "Não foi possível concluir: os dados enviados são inválidos.",
  403: "Você não tem permissão para fazer isso.",
  404: "Não encontrei o que você está procurando.",
  409: "Isso já existe ou entra em conflito com o que já está salvo.",
  422: "Não foi possível concluir: revise os campos e tente de novo.",
  500: "Algo deu errado no servidor. Tente novamente em um instante.",
  502: "A IA devolveu algo que não conseguimos usar. Tente de novo.",
  503: "Serviço indisponível agora. Tente novamente em um instante.",
};

function findKnownDetail(detail: unknown): string | null {
  if (typeof detail === "string") {
    return KNOWN_DETAILS[detail] ?? null;
  }
  if (Array.isArray(detail)) {
    return "Revise os campos preenchidos e tente de novo.";
  }
  return null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof NetworkError) {
    return "Não consegui falar com o servidor.";
  }

  if (error instanceof ApiError) {
    const known = findKnownDetail(error.detail);
    if (known) return known;
    return STATUS_FALLBACK[error.status] ?? "Não foi possível concluir a operação.";
  }

  return "Algo inesperado aconteceu.";
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}

export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}
