"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  atletaSchema,
  type AtletaFormData,
} from "@/features/atletas/schemas/atleta.schema";
import { Button } from "@/shared/components/ui/button";

interface AtletaFormProps {
  initial?: Partial<AtletaFormData>;
  submitLabel?: string;
  /** Mensagem de erro do servidor (resposta da mutation) */
  serverError?: string | null;
  /** Quando true desabilita inputs e botão (loading state da mutation) */
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<AtletaFormData>;
  /** Botão extra de cancelar — opcional pra dar saída pro usuário */
  onCancel?: () => void;
}

/**
 * Formulário de dados pessoais do Atleta — Step 1 do wizard de cadastro
 * + reaproveitado na edição (PUT).
 *
 * Validação Zod no client (atletaSchema) — backend valida tudo de novo.
 * Campos opcionais aceitam "" e são normalizados para `undefined` no
 * schema, evitando que o backend receba "" indistinguível de null.
 */
export function AtletaForm({
  initial,
  submitLabel = "Salvar",
  serverError,
  isSubmitting,
  onSubmit,
  onCancel,
}: AtletaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AtletaFormData>({
    resolver: zodResolver(atletaSchema),
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome completo *" error={errors.nome?.message}>
          <input
            {...register("nome")}
            type="text"
            autoComplete="name"
            className="form-input"
          />
        </Field>

        <Field label="Data de nascimento *" error={errors.data_nascimento?.message}>
          <input
            {...register("data_nascimento")}
            type="date"
            className="form-input"
          />
        </Field>

        <Field label="CPF" error={errors.cpf?.message} hint="Apenas dígitos (11)">
          <input
            {...register("cpf")}
            type="text"
            inputMode="numeric"
            maxLength={11}
            className="form-input"
          />
        </Field>

        <Field label="RG" error={errors.rg?.message}>
          <input
            {...register("rg")}
            type="text"
            className="form-input"
          />
        </Field>

        <Field label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="form-input"
          />
        </Field>

        <Field label="Telefone" error={errors.telefone?.message}>
          <input
            {...register("telefone")}
            type="tel"
            autoComplete="tel"
            className="form-input"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
        <Field label="Endereço" error={errors.endereco?.message}>
          <input
            {...register("endereco")}
            type="text"
            autoComplete="street-address"
            className="form-input"
          />
        </Field>

        <Field label="Cidade" error={errors.cidade?.message}>
          <input
            {...register("cidade")}
            type="text"
            className="form-input"
          />
        </Field>

        <Field label="UF" error={errors.uf?.message} hint="Ex.: RJ">
          <input
            {...register("uf")}
            type="text"
            maxLength={2}
            className="form-input w-20 uppercase"
            style={{ textTransform: "uppercase" }}
          />
        </Field>
      </div>

      <Field label="CEP" error={errors.cep?.message} hint="Apenas dígitos (8)">
        <input
          {...register("cep")}
          type="text"
          inputMode="numeric"
          maxLength={8}
          className="form-input md:w-40"
        />
      </Field>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
