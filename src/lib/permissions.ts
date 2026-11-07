import type { Assignment, Event, User } from "../api/types";

/**
 * Catálogo de músicas: só ADMIN cria, edita ou apaga (a API usa `require_admin`
 * nessas rotas — LEADER recebe 403 de verdade, mesmo que o BRIEFING antigo dissesse
 * "admin/líder"). LEADER e MEMBER só consultam.
 */
export function canManageSongs(user: User | null): boolean {
  return user?.role === "ADMIN";
}

/**
 * Permissão de gestão ligada a ministério (escalar pessoas, editar repertório de um
 * evento que não é seu). A API só libera de verdade quando a pessoa é ADMIN, ou é
 * LEADER e líder *daquele* ministério (`ensure_ministry_manager`) — mas não existe
 * endpoint que devolva "de quais ministérios eu sou líder", então o front não tem como
 * saber isso de antemão. Por isso este helper é otimista para LEADER: mostra a ação,
 * e a tela precisa aguentar o 403 real (regra 3.1.9) se o líder não for daquele
 * ministério específico. Documentado em NOTAS.md.
 */
export function canManage(user: User | null, _ministryId?: number): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || user.role === "LEADER";
}

/** Só ADMIN ou o LEADER que criou o evento pode editá-lo/excluí-lo (`ensure_event_owner`). */
export function isEventOwner(user: User | null, event: Event): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  return user.role === "LEADER" && event.created_by === user.id;
}

/** Criar evento, repertório vinculado a evento, ou pregação: ADMIN ou LEADER. */
export function isEventCollaborator(user: User | null): boolean {
  if (!user) return false;
  return user.role === "ADMIN" || user.role === "LEADER";
}

/** Só a própria pessoa escalada confirma ou recusa presença. */
export function canRespondToAssignment(user: User | null, assignment: Assignment): boolean {
  return user !== null && user.id === assignment.user_id;
}

/**
 * Seção Administração (Etapa 9): visível para ADMIN e LEADER. Cada tela dentro dela
 * ainda distingue o que cada um pode fazer — este helper só decide se a seção existe
 * para essa pessoa, tanto no menu quanto na proteção da rota.
 */
export function canAdminister(user: User | null): boolean {
  return user?.role === "ADMIN" || user?.role === "LEADER";
}

/**
 * Ações que a API reserva a `require_admin`: promover/rebaixar administrador, criar e
 * editar ministério, marcar alguém como LEADER num ministério, e o seletor de papel
 * livre num convite. LEADER recebe 403 de verdade nessas rotas.
 */
export function isAdmin(user: User | null): boolean {
  return user?.role === "ADMIN";
}
