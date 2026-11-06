"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Field } from "@/features/contas/components/field";
import { authService } from "@/features/auth/services/auth.service";
import {
  SENHA_MIN,
  trocarSenhaSchema,
  type TrocarSenhaFormData,
} from "@/features/contas/schemas/conta.schema";

interface TrocarSenhaFormProps {
  /** Senha temporária em uso: a troca é obrigatória e leva ao dashboard ao concluir. */
  obrigatoria?: boolean;
}

/**
 * Troca da PRÓPRIA senha (qualquer perfil).
 *
 * Passa pelo BFF (`authService.trocarSenha` → /api/auth/senha), que anexa o
 * refresh token do cookie httpOnly e já renova a sessão. Em troca obrigatória
 * (senha temporária) o usuário segue para o dashboard ao concluir; na troca
 * voluntária fica na página com a confirmação.
 */
export function TrocarSenhaForm({ obrigatoria = false }: TrocarSenhaFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [concluida, setConcluida] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TrocarSenhaFormData>({
    resolver: zodResolver(trocarSenhaSchema),
    defaultValues: { senhaAtual: "", novaSenha: "", confirmarSenha: "" },
  });

  const mutation = useMutation<void, Error, TrocarSenhaFormData>({
    mutationFn: ({ senhaAtual, novaSenha }) => authService.trocarSenha({ senhaAtual, novaSenha }),
    onSuccess: async () => {
      setServerError(null);
      reset();
      await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
      if (obrigatoria) {
        router.push("/dashboard");
        router.refresh();
        return;
      }
      setConcluida(true);
    },
    onError: (err) => {
      setConcluida(false);
      setServerError(err.message);
    },
  });

  return (
    <form
      onSubmit={handleSubmit((data) => mutation.mutate(data))}
      noValidate
      className="space-y-5 rounded-lg border border-border bg-card p-6"
    >
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}
      {concluida && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Senha alterada. Suas outras sessões foram encerradas.</span>
        </div>
      )}

      <Field label="Senha atual *" error={errors.senhaAtual?.message}>
        <input {...register("senhaAtual")} type="password" autoComplete="current-password" className="form-input" />
      </Field>
      <Field
        label="Nova senha *"
        error={errors.novaSenha?.message}
        hint={`Mínimo de ${SENHA_MIN} caracteres, com ao menos uma letra e um dígito.`}
      >
        <input {...register("novaSenha")} type="password" autoComplete="new-password" className="form-input" />
      </Field>
      <Field label="Confirmar nova senha *" error={errors.confirmarSenha?.message}>
        <input {...register("confirmarSenha")} type="password" autoComplete="new-password" className="form-input" />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" variant="default" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Alterar senha"}
        </Button>
      </div>
    </form>
  );
}
