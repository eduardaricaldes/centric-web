import { Badge } from "./Badge";
import type { AssignmentStatus, EventStatus } from "../api/types";

const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  RASCUNHO: "Rascunho",
  PUBLICADO: "Publicado",
};

export function EventStatusPill({ status }: { status: EventStatus }) {
  return (
    <Badge tone={status === "PUBLICADO" ? "north" : "neutral"}>
      {EVENT_STATUS_LABEL[status]}
    </Badge>
  );
}

const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  CONVIDADO: "Convidado",
  CONFIRMADO: "Confirmado",
  RECUSADO: "Recusado",
};

const ASSIGNMENT_STATUS_TONE: Record<AssignmentStatus, "neutral" | "green" | "red"> = {
  CONVIDADO: "neutral",
  CONFIRMADO: "green",
  RECUSADO: "red",
};

export function AssignmentStatusPill({ status }: { status: AssignmentStatus }) {
  return <Badge tone={ASSIGNMENT_STATUS_TONE[status]}>{ASSIGNMENT_STATUS_LABEL[status]}</Badge>;
}
