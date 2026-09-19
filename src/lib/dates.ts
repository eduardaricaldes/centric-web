import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

/** "2026-09-20" -> "20/09/2026" */
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), "dd/MM/yyyy", { locale: ptBR });
}

/** "2026-09-20" -> "domingo, 20 de setembro" */
export function formatDateLong(isoDate: string): string {
  return format(parseISO(isoDate), "EEEE, d 'de' MMMM", { locale: ptBR });
}

/** "19:30:00" -> "19h30" */
export function formatTime(isoTime: string): string {
  const [hours, minutes] = isoTime.split(":");
  return `${hours}h${minutes}`;
}

/** "2026-09-20" + "19:30:00" -> "20/09/2026 às 19h30" */
export function formatDateTime(isoDate: string, isoTime: string): string {
  return `${formatDate(isoDate)} às ${formatTime(isoTime)}`;
}

/** ISO datetime da API (created_at/updated_at) -> "20/09/2026 19h30" */
export function formatTimestamp(isoDateTime: string): string {
  return format(parseISO(isoDateTime), "dd/MM/yyyy HH'h'mm", { locale: ptBR });
}
