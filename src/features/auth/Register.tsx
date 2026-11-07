import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { login as loginRequest, register as registerRequest } from "../../api/auth";
import { Button } from "../../components/Button";
import { IconFlame } from "../../components/icons";
import { Input } from "../../components/Input";
import { getErrorMessage } from "../../lib/errors";
import { setStoredRole, setToken } from "../../lib/storage";
import { useAuth } from "./AuthContext";

const registerSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
  prefersChords: z.boolean(),
});

type RegisterForm = z.infer<typeof registerSchema>;

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-north text-white">
            <IconFlame width={28} height={28} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">Criar conta</h1>
          <p className="text-sm text-muted">Preencha seus dados para entrar no Centric</p>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Sem token na URL: nada de formulário fadado a falhar — explica o motivo. */
function InviteRequired() {
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface p-6 text-center">
        <p className="font-display text-lg font-semibold text-ink">O cadastro é por convite</p>
        <p className="text-sm text-muted">
          O Centric não tem cadastro aberto. Peça um link de convite a quem lidera o seu
          ministério ou a quem administra o sistema.
        </p>
        <Link
          to="/login"
          className="mt-2 text-sm font-medium text-north hover:text-north-deep"
        >
          Voltar para o login
        </Link>
      </div>
    </AuthShell>
  );
}

export function Register() {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const token = searchParams.get("token");
  const emailFromInvite = searchParams.get("email");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { prefersChords: false, email: emailFromInvite ?? "" },
  });

  if (!token) {
    return <InviteRequired />;
  }

  const onSubmit = async (values: RegisterForm) => {
    setSubmitError(null);
    try {
      await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
        prefers_chords: values.prefersChords,
        invite_token: token,
      });
      // Entra direto, sem voltar ao login.
      const result = await loginRequest(values.email, values.password);
      setToken(result.access_token);
      setStoredRole(result.role);
      refetchUser();
      navigate("/", { replace: true });
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
        <Input label="Nome" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          disabled={Boolean(emailFromInvite)}
          hint={emailFromInvite ? "Definido pelo convite." : undefined}
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Senha"
          type="password"
          autoComplete="new-password"
          hint="Mínimo de 8 caracteres."
          error={errors.password?.message}
          {...register("password")}
        />

        <label className="flex items-center gap-3 rounded-field border border-line px-3 py-2.5">
          <input
            type="checkbox"
            className="h-5 w-5 accent-north"
            {...register("prefersChords")}
          />
          <span className="text-sm text-ink">
            Sou músico, quero ver a cifra
          </span>
        </label>

        {submitError !== null && (
          <div className="flex flex-col gap-2 rounded-field border border-red/20 bg-red-tint px-3 py-2.5 text-sm text-red">
            <span>{getErrorMessage(submitError)}</span>
          </div>
        )}

        <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
          Criar conta
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link to="/login" className="font-medium text-north hover:text-north-deep">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
