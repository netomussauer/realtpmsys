"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, LogIn } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { authService, type LoginResult } from "@/features/auth/services/auth.service";
import {
  loginSchema,
  type LoginFormData,
} from "@/features/auth/schemas/login.schema";

/**
 * LoginForm — formulário de autenticação com RHF + Zod + TanStack Mutation.
 *
 * Em caso de sucesso:
 *   - cookies httpOnly já foram gravados pelo BFF
 *   - invalida cache de sessão (próximo useSession() vai pegar fresh)
 *   - redireciona pra `?next=...` se presente, ou /dashboard
 *
 * Erros do BFF (401 credenciais inválidas, 502 backend down) ficam
 * legíveis na tela — sem stack trace exposto, mas sem ofuscar o motivo.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const nextUrl = searchParams.get("next") ?? "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const mutation = useMutation<LoginResult, Error, LoginFormData>({
    mutationFn: (data) => authService.login(data),
    onSuccess: async () => {
      setServerError(null);
      // Próxima leitura do useSession() pega valor fresh do BFF.
      await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      router.push(nextUrl);
      router.refresh();
    },
    onError: (err) => {
      setServerError(err.message);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      noValidate
      className="rounded-lg border border-border bg-card p-6 shadow-lg"
    >
      <h1 className="font-display text-2xl text-primary tracking-wide">
        Bem-vindo de volta
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Entre com seu email e senha para acessar o sistema.
      </p>

      {serverError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            autoFocus
            {...register("email")}
            className="form-input"
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="senha" className="text-sm font-medium text-foreground">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            {...register("senha")}
            className="form-input"
          />
          {errors.senha && (
            <p className="text-xs text-destructive">{errors.senha.message}</p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        variant="default"
        size="lg"
        disabled={mutation.isPending}
        className="mt-6 w-full"
      >
        <LogIn className="h-4 w-4" />
        {mutation.isPending ? "Entrando..." : "Entrar"}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Esqueceu a senha? Entre em contato com a coordenação.
      </p>
    </form>
  );
}
