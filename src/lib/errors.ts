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
  "Program not found": "Este culto ainda não tem programação definida.",
  "A LEADER invite requires a ministry": "Escolha o ministério que a pessoa vai liderar.",
  "User does not lead any ministry":
    "Para ser líder, a pessoa precisa liderar um ministério. Defina isso na tela do ministério.",
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

  // Fase 6 (administração) — Etapa 9
  "Invite token is required": "O cadastro é só por convite. Peça um link a quem administra.",
  "Invalid invite token": "Este link de convite não é válido.",
  "Invite already used": "Este convite já foi usado.",
  "Invite expired": "Este convite expirou. Peça um novo a quem administra.",
  "Invite does not match this email": "Este convite foi feito para outro e-mail.",
  "Invalid reset token": "Este link de redefinição não é válido.",
  "Reset token already used": "Este link de redefinição já foi usado.",
  "Reset token expired": "Este link expirou. Peça um novo a quem administra.",
  "Current password is incorrect": "A senha atual está incorreta.",
  "An admin cannot demote themselves": "Um administrador não pode rebaixar a si mesmo.",
  "Cannot remove the last admin":
    "Não é possível rebaixar: precisa restar pelo menos um administrador no sistema.",
  "User is already a member of this ministry": "Esta pessoa já é membro deste ministério.",
  "Only ADMIN can set a member as LEADER": "Só um administrador pode definir alguém como líder.",
  "Ministry name already in use": "Já existe um ministério com esse nome.",
  "Leaders can only invite MEMBER": "Líderes só podem convidar para o papel de membro.",
  "Leaders must invite to a ministry they lead":
    "Líderes só podem convidar gente para o ministério que lideram.",
  "Email already has an account": "Este e-mail já tem uma conta.",
  "Ministry member not found": "Esta pessoa não é membro deste ministério.",
  "Invite not found": "Convite não encontrado.",
  "Only the creator or an ADMIN can cancel this invite":
    "Só quem criou o convite ou um administrador pode cancelá-lo.",
};

const STATUS_FALLBACK: Record<number, string> = {
  400: "Não foi possível concluir: os dados enviados são inválidos.",
  403: "Você não tem permissão para fazer isso.",
  404: "Não encontrei o que você está procurando.",
  409: "Isso já existe ou entra em conflito com o que já está salvo.",
  422: "Não foi possível concluir: revise os campos e tente de novo.",
  429: "Muitas tentativas. Espere um minuto e tente de novo.",
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
