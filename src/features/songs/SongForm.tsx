import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useBlocker, useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import {
  createSong,
  findSongsWithSameTitle,
  getSong,
  listSongCategories,
  updateSong,
  type SongImportDraft,
} from "../../api/songs";
import type { SongListItem } from "../../api/types";
import { Button } from "../../components/Button";
import { ErrorState, ForbiddenState } from "../../components/ErrorState";
import { Input, Textarea } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { Select } from "../../components/Select";
import { SkeletonLines } from "../../components/Skeleton";
import { SlidesEditor } from "./SlidesEditor";
import { useAuth } from "../auth/AuthContext";
import { normalizeChordPro, parseChordProLines, toLyricLines, toPlainLyrics } from "../../lib/chordpro";
import { getErrorMessage, isForbidden, isNotFound } from "../../lib/errors";
import { canManageSongs } from "../../lib/permissions";

const songSchema = z.object({
  title: z.string().min(1, "Informe o título"),
  artist: z.string().optional(),
  tone: z.string().optional(),
  category: z.string().optional(),
  duration_min: z.string().regex(/^$|^[1-9]\d*$/, "Use minutos inteiros").optional(),
  chordpro: z.string().min(1, "Escreva a letra (com ou sem cifra entre colchetes)"),
  slides: z.string().optional(),
});

type SongFormValues = z.infer<typeof songSchema>;

function StagePreview({ chordpro }: { chordpro: string }) {
  const [view, setView] = useState<"lyrics" | "chords">("chords");
  const lines = view === "chords" ? parseChordProLines(chordpro) : null;
  const lyricLines = toLyricLines(chordpro);

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
          ? lines.map((line, index) =>
              line.section ? (
                <p key={index} className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                  {line.section}
                </p>
              ) : (
                <div key={index} className="mb-1.5 whitespace-pre font-mono leading-tight">
                  {line.chordRow && <div className="text-amber">{line.chordRow}</div>}
                  <div className="text-white">{line.lyricRow || " "}</div>
                </div>
              ),
            )
          : lyricLines.map((line, index) =>
              line.section ? (
                <p key={index} className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wide text-white/50">
                  {line.text}
                </p>
              ) : (
                <p key={index} className="mb-1.5 font-display leading-snug text-white">
                  {line.text || " "}
                </p>
              ),
            )}
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
  const location = useLocation();
  const importState = (location.state ?? null) as { importDraft?: SongImportDraft; importFileName?: string } | null;
  const importDraft = !isEditing ? importState?.importDraft : undefined;
  // Músicas com o mesmo título: aparece o aviso e o próximo "Salvar" cria mesmo assim.
  const [sameTitle, setSameTitle] = useState<SongListItem[] | null>(null);
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

  // O select precisa das opções antes de receber o valor da música, senão aparece vazio.
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["song-categories"],
    queryFn: listSongCategories,
    staleTime: Infinity,
  });
  // Categoria antiga (texto livre de antes da lista) aparece até alguém trocar.
  const legacyCategory = song?.category && !categories.includes(song.category) ? song.category : null;

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isDirty, dirtyFields },
  } = useForm<SongFormValues>({
    resolver: zodResolver(songSchema),
    defaultValues: importDraft
      ? {
          title: importDraft.title,
          artist: importDraft.artist ?? "",
          tone: importDraft.tone ?? "",
          category: "",
          duration_min: "",
          chordpro: normalizeChordPro(importDraft.chordpro),
        }
      : undefined,
    values: song
      ? {
          title: song.title,
          artist: song.artist ?? "",
          tone: song.tone ?? "",
          category: song.category ?? "",
          duration_min: song.duration_min?.toString() ?? "",
          chordpro: song.chordpro ?? song.lyrics,
          slides: song.slides ?? "",
        }
      : undefined,
  });

  const chordproValue = useWatch({ control, name: "chordpro" }) ?? "";
  const slidesValue = useWatch({ control, name: "slides" }) ?? "";
  const [panel, setPanel] = useState<"preview" | "slides">("preview");

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
      chordpro: normalizeChordPro(values.chordpro),
      lyrics: toPlainLyrics(normalizeChordPro(values.chordpro)),
      // Só manda os slides quando foram mexidos: sem eles, a API volta ao automático se a letra mudou.
      ...(dirtyFields.slides ? { slides: values.slides?.trim() ? values.slides : null } : {}),
    };
    try {
      if (isEditing) {
        await updateSong(songId, payload);
        await queryClient.invalidateQueries({ queryKey: ["song", songId] });
        await queryClient.invalidateQueries({ queryKey: ["songs"] });
        setSavedPath(`/songs/${songId}`);
      } else {
        if (sameTitle === null) {
          const existing = await findSongsWithSameTitle(payload.title);
          if (existing.length > 0) {
            setSameTitle(existing);
            return;
          }
        }
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

  if ((isEditing && isLoading) || categoriesLoading) {
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

      {importDraft && (
        <div className="mb-4 rounded-field border border-north/20 bg-north/5 px-4 py-3 text-sm text-ink">
          Preenchido a partir de <strong>{importState?.importFileName ?? "arquivo"}</strong>
          {importDraft.used_ai ? " pela leitura automática" : ""}. Confira título, tom e letra antes de salvar.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
          <Input
            label="Título"
            error={errors.title?.message}
            {...register("title", { onChange: () => setSameTitle(null) })}
          />
          <div className="flex gap-4">
            <Input label="Artista" className="flex-1" {...register("artist")} />
            <Input label="Tom original" className="w-32" placeholder="Ex.: G" {...register("tone")} />
          </div>
          <div className="flex gap-4">
            <Select label="Categoria" className="flex-1" {...register("category")}>
              <option value="">Sem categoria</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              {legacyCategory && <option value={legacyCategory}>{legacyCategory} (antiga)</option>}
            </Select>
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
            hint="Cole a cifra como no site (acordes em cima da letra) ou escreva o acorde entre colchetes na sílaba: Gra[C]ça."
            mono
            rows={20}
            error={errors.chordpro?.message}
            {...register("chordpro")}
            onPaste={(event) => {
              // Depois que o texto colado entra no campo, converte acordes em cima da letra.
              const target = event.currentTarget;
              setTimeout(() => {
                const converted = normalizeChordPro(target.value);
                if (converted !== target.value) {
                  setValue("chordpro", converted, { shouldDirty: true, shouldValidate: true });
                }
              });
            }}
          />

          {sameTitle && sameTitle.length > 0 && (
            <div className="rounded-field border border-amber/30 bg-amber/10 px-3 py-2.5 text-sm text-amber-ink">
              <p className="font-medium">Essa música já existe no catálogo:</p>
              <ul className="mt-1 list-disc pl-5">
                {sameTitle.map((item) => (
                  <li key={item.id}>
                    <Link to={`/songs/${item.id}`} className="underline" target="_blank">
                      {item.title}
                    </Link>
                    {item.artist ? ` (${item.artist})` : ""}
                  </li>
                ))}
              </ul>
              <p className="mt-1">Se for outra versão, clique em Salvar de novo para criar mesmo assim.</p>
            </div>
          )}

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
          <div className="mb-2 flex gap-1" role="tablist">
            {(
              [
                ["preview", "Pré-visualização"],
                ["slides", "Slides do telão"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={panel === key}
                onClick={() => setPanel(key)}
                className={`h-8 rounded-field px-3 text-sm font-medium ${
                  panel === key ? "bg-north text-white" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {panel === "preview" ? (
            <StagePreview chordpro={chordproValue} />
          ) : (
            <SlidesEditor
              chordpro={chordproValue}
              slidesText={slidesValue}
              lyricsChanged={Boolean(dirtyFields.chordpro) && !dirtyFields.slides}
              onChange={(text) => setValue("slides", text, { shouldDirty: true })}
            />
          )}
        </div>
      </form>
    </div>
  );
}
