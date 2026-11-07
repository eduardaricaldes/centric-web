import type { MinistryRole, UserRole } from "../../api/types";
import type { Tone } from "../../components/Badge";

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Administrador",
  LEADER: "Líder",
  MEMBER: "Membro",
};

export const ROLE_TONE: Record<UserRole, Tone> = {
  ADMIN: "north",
  LEADER: "amber",
  MEMBER: "neutral",
};

export const MINISTRY_ROLE_LABEL: Record<MinistryRole, string> = {
  LEADER: "Líder",
  MEMBER: "Membro",
};
