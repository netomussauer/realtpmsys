"use client";

import { cloneElement, useId, type ReactElement } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  responsavelSchema,
  type ResponsavelFormData,
} from "@/features/atletas/schemas/responsavel.schema";
import { Button } from "@/shared/components/ui/button";

interface ResponsavelFormProps {
  initial?: Partial<ResponsavelFormData>;
  submitLabel?: string;
  serverError?: string | null;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<ResponsavelFormData>;
  onCancel?: () => void;
  /** Step 2 do wizard sugere "Pular" se opcional. */
  onSkip?: () => void;
}

/**
 * Sub-formulário do Responsável — usado no Step 2 do wizard de cadastro
 * de atleta. Backend exige nome+telefone+parentesco; CPF/email opcionais.
 *
 * `contato_principal` default true — o 1º responsável cadastrado é
 * sempre principal (regra implícita do produto: atleta menor sempre
 * tem ao menos um adulto responsável marcável).
 */
export function ResponsavelForm({
  initial,
  submitLabel = "Adicionar responsável",
  serverError,
  isSubmitting,
  onSubmit,
  onCancel,
  onSkip,
}: ResponsavelFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResponsavelFormData>({
    resolver: zodResolver(responsavelSchema),
    defaultValues: {
      contato_principal: true,
      ...initial,
    },
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

        <Field label="Telefone *" error={errors.telefone?.message}>
          <input
            {...register("telefone")}
            type="tel"
            autoComplete="tel"
            className="form-input"
          />
        </Field>

        <Field label="Parentesco *" error={errors.parentesco?.message}>
          <select {...register("parentesco")} className="form-input">
            <option value="">Selecione...</option>
            <option value="PAI">Pai</option>
            <option value="MAE">Mãe</option>
            <option value="AVO">Avô / Avó</option>
            <option value="OUTRO">Outro</option>
          </select>
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

        <Field label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="form-input"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          {...register("contato_principal")}
          defaultChecked={initial?.contato_principal ?? true}
          className="rounded border-input"
        />
        <span>Este é o contato principal do atleta</span>
      </label>

      <div className="flex flex-wrap justify-between gap-2 pt-2">
        {onSkip && (
          <Button type="button" variant="ghost" onClick={onSkip} disabled={isSubmitting}>
            Pular (adicionar depois)
          </Button>
        )}
        <div className="flex gap-2 ml-auto">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Voltar
            </Button>
          )}
          <Button type="submit" variant="default" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : submitLabel}
          </Button>
        </div>
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
  children: ReactElement<{ id?: string }>;
}) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      {cloneElement(children, { id })}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
