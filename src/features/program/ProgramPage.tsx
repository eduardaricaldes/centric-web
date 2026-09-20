import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { applyProgram, suggestProgram } from "../../api/programs";
import { getSong } from "../../api/songs";
import type { ProgramSuggestion } from "../../api/types";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Input, Textarea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { IconAlertTriangle, IconCalendar, IconMic, IconMusic, IconSparkles } from "../../components/icons";
import { getErrorMessage } from "../../lib/errors";

const suggestSchema = z.object({
  briefing: z.string().min(10, "Descreva o culto com pelo menos 10 caracteres"),
  duracao_alvo_min: z.number().min(15).max(300),
});

type SuggestForm = z.infer<typeof suggestSchema>;

const BLOCK_ICON = {
  MUSICA: IconMusic,
  MOMENTO: IconCalendar,
  PREGACAO: IconMic,
} as const;

const BLOCK_LABEL: Record<string, string> = {
  MUSICA: "Música",
  MOMENTO: "Momento",
  PREGACAO: "Pregação",
};

function useSongTitles(songIds: number[]) {
  const uniqueIds = Array.from(new Set(songIds));
  const results = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: ["song", id],
      queryFn: () => getSong(id),
    })),
  });
  const byId = new Map<number, string>();
  uniqueIds.forEach((id, index) => {
    const data = results[index]?.data;
    if (data) byId.set(id, data.title);
  });
  return byId;
}

function ProgramTimeline({
  suggestion,
  eventId,
  onApplied,
}: {
  suggestion: ProgramSuggestion;
  eventId: number;
  onApplied: () => void;
}) {
  const songIds = suggestion.blocos
    .filter((b) => b.tipo === "MUSICA" && b.song_id !== null)
    .map((b) => b.song_id as number);
  const titles = useSongTitles(songIds);

  const totalMin = suggestion.blocos.reduce((sum, block) => sum + block.duracao_min, 0);
  const target = suggestion.duracao_alvo_min;
  const isApplied = suggestion.applied_at !== null;

  const applyMutation = useMutation({
    mutationFn: () => applyProgram(eventId, { suggestion_id: suggestion.suggestion_id }),
    onSuccess: onApplied,
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-card border border-line bg-surface p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-semibold text-ink">Resumo da IA</h3>
          {isApplied ? (
            <Badge tone="green">Aplicado</Badge>
          ) : (
            <Badge tone="amber">Não aplicado</Badge>
          )}
        </div>
        <p className="text-sm text-ink">{suggestion.resumo}</p>
        <p className="mt-2 text-sm text-muted">
          Tempo somado: {totalMin} min de {target} min alvo
          {suggestion.cached && " — sugestão reaproveitada de um pedido igual"}
        </p>
      </div>

      {suggestion.alertas.length > 0 && (
        <div className="flex flex-col gap-2">
          {suggestion.alertas.map((alerta, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-field border border-amber/30 bg-amber/10 px-3 py-2 text-sm text-amber-ink"
            >
              <IconAlertTriangle width={16} height={16} />
              {alerta}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {suggestion.blocos
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((block) => {
            const Icon = BLOCK_ICON[block.tipo];
            const title =
              block.tipo === "MUSICA"
                ? (block.song_id !== null ? titles.get(block.song_id) : undefined) ?? "Carregando..."
                : block.titulo;
            return (
              <div
                key={block.ordem}
                className="flex items-start gap-3 rounded-field border border-line bg-surface px-3 py-2.5"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ivory text-muted">
                  <Icon width={14} height={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{BLOCK_LABEL[block.tipo]}</Badge>
                    <p className="truncate text-sm font-medium text-ink">{title}</p>
                    <span className="text-xs text-muted">{block.duracao_min} min</span>
                  </div>
                  {block.motivo && <p className="mt-1 text-xs text-muted">{block.motivo}</p>}
                </div>
              </div>
            );
          })}
      </div>

      {applyMutation.isError && (
        <p className="text-sm text-red">{getErrorMessage(applyMutation.error)}</p>
      )}

      {isApplied ? (
        <Link to={`/events/${eventId}`}>
          <Button variant="secondary">Ver repertório aplicado</Button>
        </Link>
      ) : (
        <div className="flex gap-2">
          <Button loading={applyMutation.isPending} onClick={() => applyMutation.mutate()}>
            Aplicar no repertório
          </Button>
        </div>
      )}
    </div>
  );
}

export function ProgramPage() {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);
  const [suggestion, setSuggestion] = useState<ProgramSuggestion | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SuggestForm>({
    resolver: zodResolver(suggestSchema),
    defaultValues: { duracao_alvo_min: 90 },
  });

  const suggestMutation = useMutation({
    mutationFn: (values: SuggestForm) => suggestProgram(eventId, values),
    onSuccess: (data) => setSuggestion(data),
  });

  const onSubmit = (values: SuggestForm) => {
    suggestMutation.mutate(values);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Programação com IA"
        description="Descreva o culto e a IA sugere um rascunho para revisar — nada entra no repertório sem você clicar em aplicar."
      />

      {!suggestion ? (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6"
        >
          <Textarea
            label="Briefing do culto"
            placeholder="Ex.: culto de celebração, tema de gratidão, começar animado e terminar em adoração..."
            rows={6}
            error={errors.briefing?.message}
            {...register("briefing")}
          />
          <Input
            label="Duração alvo (minutos)"
            type="number"
            className="w-40"
            error={errors.duracao_alvo_min?.message}
            {...register("duracao_alvo_min", { valueAsNumber: true })}
          />

          {suggestMutation.isError && (
            <div className="rounded-field border border-red/20 bg-red-tint px-3 py-2.5 text-sm text-red">
              {getErrorMessage(suggestMutation.error)}
            </div>
          )}

          <Button
            type="submit"
            loading={isSubmitting || suggestMutation.isPending}
            icon={<IconSparkles width={16} height={16} />}
            className="w-fit"
          >
            Gerar sugestão
          </Button>
        </form>
      ) : (
        <div>
          <ProgramTimeline
            suggestion={suggestion}
            eventId={eventId}
            onApplied={() =>
              setSuggestion((prev) => (prev ? { ...prev, applied_at: new Date().toISOString() } : prev))
            }
          />
          <div className="mt-4">
            <Button variant="ghost" size="sm" onClick={() => setSuggestion(null)}>
              Descartar e começar de novo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
