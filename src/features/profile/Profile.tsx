import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { changePassword, updateMe } from "../../api/auth";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";
import { PageHeader } from "../../components/PageHeader";
import { getErrorMessage } from "../../lib/errors";
import { useAuth } from "../auth/AuthContext";
import { ROLE_LABEL } from "../admin/labels";

const nameSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
});
type NameForm = z.infer<typeof nameSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe a senha atual"),
    newPassword: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

function NameEditor() {
  const { user, refetchUser } = useAuth();
  const [editing, setEditing] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NameForm>({ resolver: zodResolver(nameSchema), defaultValues: { name: user?.name ?? "" } });

  const mutation = useMutation({
    mutationFn: (name: string) => updateMe({ name }),
    onSuccess: () => {
      refetchUser();
      setEditing(false);
    },
  });

  if (!user) return null;

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <p className="font-display text-lg font-semibold text-ink">{user.name}</p>
        <button
          type="button"
          onClick={() => {
            reset({ name: user.name });
            setEditing(true);
          }}
          className="text-xs font-medium text-north hover:text-north-deep"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values.name))}
      className="flex items-start gap-2"
    >
      <Input error={errors.name?.message} {...register("name")} className="w-48" />
      <Button type="submit" size="sm" loading={mutation.isPending}>
        Salvar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
        Cancelar
      </Button>
      {mutation.isError && (
        <span className="text-sm text-red">{getErrorMessage(mutation.error)}</span>
      )}
    </form>
  );
}

function ChangePasswordCard() {
  const [success, setSuccess] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const [submitError, setSubmitError] = useState<unknown>(null);

  const onSubmit = async (values: PasswordForm) => {
    setSubmitError(null);
    setSuccess(false);
    try {
      await changePassword({
        current_password: values.currentPassword,
        new_password: values.newPassword,
      });
      setSuccess(true);
      reset();
    } catch (error) {
      setSubmitError(error);
    }
  };

  return (
    <Card className="mt-6 max-w-md">
      <p className="mb-4 font-display text-lg font-semibold text-ink">Trocar senha</p>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Senha atual"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {submitError !== null && (
          <p className="text-sm text-red">{getErrorMessage(submitError)}</p>
        )}
        {success && <p className="text-sm text-green">Senha alterada com sucesso.</p>}

        <Button type="submit" loading={isSubmitting} className="self-start">
          Trocar senha
        </Button>
      </form>
    </Card>
  );
}

export function Profile() {
  const { user, refetchUser } = useAuth();
  const [error, setError] = useState<unknown>(null);

  const chordsMutation = useMutation({
    mutationFn: (prefersChords: boolean) => updateMe({ prefers_chords: prefersChords }),
    onSuccess: () => {
      setError(null);
      refetchUser();
    },
    onError: (err) => setError(err),
  });

  if (!user) return null;

  return (
    <div className="max-w-md">
      <PageHeader title="Perfil" />

      <Card>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-north-tint text-lg font-semibold text-north">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <NameEditor />
            <p className="text-sm text-muted">{user.email}</p>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2">
          <span className="text-sm text-muted">Papel:</span>
          <Badge tone="north">{ROLE_LABEL[user.role] ?? user.role}</Badge>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-field border border-line px-3 py-3">
          <div>
            <p className="text-sm font-medium text-ink">Sou músico, quero ver a cifra</p>
            <p className="text-xs text-muted">
              Decide se as músicas abrem em cifra ou em letra limpa por padrão.
            </p>
          </div>
          <input
            type="checkbox"
            className="h-5 w-5 shrink-0 accent-north"
            checked={user.prefers_chords}
            disabled={chordsMutation.isPending}
            onChange={(event) => chordsMutation.mutate(event.target.checked)}
          />
        </label>

        {error !== null && <p className="mt-3 text-sm text-red">{getErrorMessage(error)}</p>}
      </Card>

      <ChangePasswordCard />
    </div>
  );
}
