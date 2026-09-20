import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { createEvent, getEvent, updateEvent } from "../../api/events";
import { Button } from "../../components/Button";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Select } from "../../components/Select";
import { SkeletonLines } from "../../components/Skeleton";
import { getErrorMessage, isForbidden } from "../../lib/errors";
import { EVENT_TYPE_LABEL } from "./eventLabels";

const eventSchema = z.object({
  title: z.string().min(1, "Informe o título"),
  date: z.string().min(1, "Informe a data"),
  time: z.string().min(1, "Informe o horário"),
  type: z.enum(["CULTO", "ENSAIO", "CONFRATERNIZACAO", "ACAO_MISSIONARIA", "EVENTO_ESPECIAL", "OUTRO"]),
  status: z.enum(["RASCUNHO", "PUBLICADO"]),
});

type EventForm = z.infer<typeof eventSchema>;

export function EventFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const eventId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    data: event,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["event", eventId],
    queryFn: () => getEvent(eventId),
    enabled: isEditing && Number.isFinite(eventId),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    values: event
      ? {
          title: event.title,
          date: event.date,
          time: event.time.slice(0, 5),
          type: event.type,
          status: event.status,
        }
      : undefined,
    defaultValues: { status: "RASCUNHO", type: "CULTO" },
  });

  const onSubmit = async (values: EventForm) => {
    setSubmitError(null);
    try {
      if (isEditing) {
        await updateEvent(eventId, values);
        await queryClient.invalidateQueries({ queryKey: ["event", eventId] });
        navigate(`/events/${eventId}`);
      } else {
        const created = await createEvent(values);
        navigate(`/events/${created.id}`);
      }
    } catch (submitErr) {
      setSubmitError(submitErr);
    }
  };

  if (isEditing && isLoading) {
    return (
      <div className="max-w-xl">
        <SkeletonLines count={6} />
      </div>
    );
  }

  if (isEditing && isError) {
    return isForbidden(error) ? <ForbiddenState /> : <ErrorState error={error} />;
  }

  return (
    <div className="max-w-xl">
      <PageHeader title={isEditing ? "Editar evento" : "Novo evento"} />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6"
      >
        <Input label="Título" error={errors.title?.message} {...register("title")} />

        <div className="flex gap-4">
          <Input label="Data" type="date" error={errors.date?.message} {...register("date")} />
          <Input label="Horário" type="time" error={errors.time?.message} {...register("time")} />
        </div>

        <Select label="Tipo" error={errors.type?.message} {...register("type")}>
          {Object.entries(EVENT_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>

        <Select label="Status" error={errors.status?.message} {...register("status")}>
          <option value="RASCUNHO">Rascunho</option>
          <option value="PUBLICADO">Publicado</option>
        </Select>

        {submitError !== null && (
          <div className="rounded-field border border-red/20 bg-red-tint px-3 py-2.5 text-sm text-red">
            {getErrorMessage(submitError)}
          </div>
        )}

        <div className="mt-1 flex gap-2">
          <Button type="submit" loading={isSubmitting}>
            {isEditing ? "Salvar" : "Criar evento"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
