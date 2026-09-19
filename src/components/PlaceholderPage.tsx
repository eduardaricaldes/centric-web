import { PageHeader } from "./PageHeader";

/** Espaço reservado para telas que ainda serão construídas nas próximas etapas. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <p className="text-sm text-muted">Esta tela ainda vai ser construída.</p>
    </div>
  );
}
