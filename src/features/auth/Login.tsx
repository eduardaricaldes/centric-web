import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { login as loginRequest } from "../../api/auth";
import { Button } from "../../components/Button";
import { IconFlame } from "../../components/icons";
import { Input } from "../../components/Input";
import { getErrorMessage } from "../../lib/errors";
import { clearStoredRedirect, getStoredRedirect, setStoredRole, setToken } from "../../lib/storage";
import { useAuth } from "./AuthContext";

const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { refetchUser } = useAuth();
  const [submitError, setSubmitError] = useState<unknown>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginForm) => {
    setSubmitError(null);
    try {
      const result = await loginRequest(values.email, values.password);
      setToken(result.access_token);
      setStoredRole(result.role);
      refetchUser();
      const redirectTo = getStoredRedirect();
      clearStoredRedirect();
      navigate(redirectTo ?? "/", { replace: true });
    } catch (error) {
      setSubmitError(error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-north text-white">
            <IconFlame width={28} height={28} />
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">Centric</h1>
          <p className="text-sm text-muted">Entre para organizar o culto</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6"
        >
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <Link
            to="/reset-password"
            className="-mt-2 self-end text-sm font-medium text-north hover:text-north-deep"
          >
            Esqueci minha senha
          </Link>

          {submitError !== null && (
            <div className="flex flex-col gap-2 rounded-field border border-red/20 bg-red-tint px-3 py-2.5 text-sm text-red">
              <span>{getErrorMessage(submitError)}</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <button
                  type="submit"
                  className="text-sm font-medium underline underline-offset-2"
                >
                  Tentar de novo
                </button>
                <Link
                  to="/reset-password"
                  className="text-sm font-medium underline underline-offset-2"
                >
                  Redefinir senha
                </Link>
              </div>
            </div>
          )}

          <Button type="submit" loading={isSubmitting} className="mt-1 w-full">
            Entrar
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Ainda não tem conta?{" "}
          <Link to="/register" className="font-medium text-north hover:text-north-deep">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
