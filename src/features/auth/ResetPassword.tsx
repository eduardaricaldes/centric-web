import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { resetPassword } from "../../api/auth";
import { Button } from "../../components/Button";
import { IconFlame } from "../../components/icons";
import { Input } from "../../components/Input";
import { getErrorMessage } from "../../lib/errors";

const resetSchema = z
  .object({
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetForm = z.infer<typeof resetSchema>;

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-north text-white">
            <IconFlame width={28} height={28} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">Nova senha</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function LinkRequired() {
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-6 text-center">
        <p className="font-display text-lg font-semibold text-ink">Link necessário</p>
        <p className="text-sm text-muted">
          Para trocar de senha por aqui, peça um link a quem administra o sistema ou lidera
          o seu ministério.
        </p>
        <Link to="/login" className="mt-2 text-sm font-medium text-north hover:text-north-deep">
          Voltar para o login
        </Link>
      </div>
    </AuthShell>
  );
}

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({ resolver: zodResolver(resetSchema) });

  if (!token) {
    return <LinkRequired />;
  }

  if (done) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-6 text-center">
          <p className="font-display text-lg font-semibold text-ink">Senha alterada</p>
          <p className="text-sm text-muted">Já dá para entrar com a nova senha.</p>
          <Link to="/login" className="mt-2">
            <Button>Ir para o login</Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  const onSubmit = async (values: ResetForm) => {
    setSubmitError(null);
    try {
      await resetPassword({ token, new_password: values.password });
      setDone(true);
    } catch (error) {
      setSubmitError(error);
    }
  };

  return (
    <AuthShell>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6"
      >
        <Input
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {submitError !== null && (
          <div className="rounded-field border border-red/20 bg-red-tint px-3 py-2.5 text-sm text-red">
            {getErrorMessage(submitError)}
          </div>
        )}

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Trocar senha
        </Button>
      </form>
    </AuthShell>
  );
}
