import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { createSong, getSong, updateSong } from "../../api/songs";
import { Button } from "../../components/Button";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input, Textarea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { SkeletonLines } from "../../components/Skeleton";
import { useAuth } from "../auth/AuthContext";
import { parseChordProLines, toPlainLyrics } from "../../lib/chordpro";
import { getErrorMessage, isForbidden, isNotFound } from "../../lib/errors";
import { canManageSongs } from "../../lib/permissions";

const songSchema = z.object({
  title: z.string().min(1, "Informe o título"),
  artist: z.string().optional(),
  tone: z.string().optional(),
  category: z.string().optional(),
  duration_min: z.string().regex(/^$|^[1-9]\d*$/, "Use minutos inteiros").optional(),
  chordpro: z.string().min(1, "Escreva a letra (com ou sem cifra entre colchetes)"),
});

type SongFormValues = z.infer<typeof songSchema>;

function StagePreview({ chordpro }: { chordpro: string }) {
  const [view, setView] = useState<"lyrics" | "chords">("chords");
  const lines = view === "chords" ? parseChordProLines(chordpro) : null;
  const plain = toPlainLyrics(chordpro);

  return (
    <div className="rounded-card bg-navy p-5">
      <div className="mb-3 flex rounded-field border border-white/20 p-1 w-fit">
        <button
          type="button"
          onClick={() => setView("lyrics")}
          className={`h-8 rounded-field px-3 text-sm font-medium ${
            view === "lyrics" ? "bg-white text-navy" : "text-white"
          }`}
        >
          Letra
        </button>
        <button
          type="button"
          onClick={() => setView("chords")}
          className={`h-8 rounded-field px-3 text-sm font-medium ${
            view === "chords" ? "bg-white text-navy" : "text-white"
          }`}
        >
          Cifra
        </button>
      </div>

      <div className="max-h-[28rem] overflow-auto text-sm">
        {view === "chords" && lines
          ? lines.map((line, index) => (
              <div key={index} className="mb-1.5 whitespace-pre font-mono leading-tight">
                {line.chordRow && <div className="text-amber">{line.chordRow}</div>}
                <div className="text-white">{line.lyricRow || " "}</div>
              </div>
            ))
          : plain.split("\n").map((line, index) => (
              <p key={index} className="mb-1.5 font-display leading-snug text-white">
                {line || " "}
              </p>
            ))}
      </div>
    </div>
  );
}

export function SongFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const songId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [submitError, setSubmitError] = useState<unknown>(null);
  // Destino depois de salvar: o bloqueio de saída precisa desligar antes de navegar.
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const saved = savedPath !== null;

  const {
    data: song,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["song", songId],
    queryFn: () => getSong(songId),
    enabled: isEditing && Number.isFinite(songId),
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SongFormValues>({
    resolver: zodResolver(songSchema),
    values: song
      ? {
          title: song.title,
          artist: song.artist ?? "",
          tone: song.tone ?? "",
          category: song.category ?? "",
          duration_min: song.duration_min?.toString() ?? "",
          chordpro: song.chordpro ?? song.lyrics,
        }
      : undefined,
  });

  const chordproValue = useWatch({ control, name: "chordpro" }) ?? "";
  const blocker = useBlocker(isDirty && !saved);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (isDirty && !saved) event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty, saved]);

  useEffect(() => {
    if (savedPath) navigate(savedPath);
  }, [savedPath, navigate]);

  const onSubmit = async (values: SongFormValues) => {
    setSubmitError(null);
    const payload = {
      title: values.title,
      artist: values.artist || null,
      tone: values.tone || null,
      category: values.category || null,
      duration_min: values.duration_min ? Number(values.duration_min) : null,
      chordpro: values.chordpro,
      lyrics: toPlainLyrics(values.chordpro),
    };
    try {
      if (isEditing) {
        await updateSong(songId, payload);
        await queryClient.invalidateQueries({ queryKey: ["song", songId] });
        await queryClient.invalidateQueries({ queryKey: ["songs"] });
        setSavedPath(`/songs/${songId}`);
      } else {
        const created = await createSong(payload);
        await queryClient.invalidateQueries({ queryKey: ["songs"] });
        setSavedPath(`/songs/${created.id}`);
      }
    } catch (err) {
      setSubmitError(err);
    }
  };

  if (!canManageSongs(user)) {
    return <ForbiddenState message="Só administradores podem cadastrar ou editar músicas." />;
  }

  if (isEditing && isLoading) {
    return (
      <div className="max-w-4xl">
        <SkeletonLines count={10} />
      </div>
    );
  }

  if (isEditing && isError) {
    if (isNotFound(error)) return <ErrorState error={error} />;
    if (isForbidden(error)) return <ForbiddenState />;
    return <ErrorState error={error} />;
  }

  return (
    <div className="max-w-5xl">
      <PageHeader title={isEditing ? "Editar música" : "Nova música"} />

      {blocker.state === "blocked" && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-field border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber-ink">
          <span>Você tem alterações não salvas. Sair mesmo assim?</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => blocker.reset?.()}>
              Continuar editando
            </Button>
            <Button size="sm" variant="danger" onClick={() => blocker.proceed?.()}>
              Sair sem salvar
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
          <Input label="Título" error={errors.title?.message} {...register("title")} />
          <div className="flex gap-4">
            <Input label="Artista" className="flex-1" {...register("artist")} />
            <Input label="Tom original" className="w-32" placeholder="Ex.: G" {...register("tone")} />
          </div>
          <div className="flex gap-4">
            <Input label="Categoria" className="flex-1" placeholder="Ex.: Adoração" {...register("category")} />
            <Input
              label="Duração (min)"
              className="w-32"
              inputMode="numeric"
              placeholder="Ex.: 5"
              error={errors.duration_min?.message}
              {...register("duration_min")}
            />
          </div>

          <Textarea
            label="Letra / cifra (ChordPro)"
            hint="Coloque o acorde entre colchetes na sílaba em que ele entra, ex.: Gra[C]ça."
            mono
            rows={20}
            error={errors.chordpro?.message}
            {...register("chordpro")}
          />

          {submitError !== null && (
            <div className="rounded-field border border-red/20 bg-red-tint px-3 py-2.5 text-sm text-red">
              {getErrorMessage(submitError)}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" loading={isSubmitting}>
              Salvar
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </div>
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <p className="mb-2 text-sm font-medium text-muted">Pré-visualização (modo palco)</p>
          <StagePreview chordpro={chordproValue} />
        </div>
      </form>
    </div>
  );
}
