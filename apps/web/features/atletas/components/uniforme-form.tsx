"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  uniformeSchema,
  type UniformeFormData,
} from "@/features/atletas/schemas/uniforme.schema";
import { Button } from "@/shared/components/ui/button";

interface UniformeFormProps {
  initial?: Partial<UniformeFormData>;
  submitLabel?: string;
  serverError?: string | null;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<UniformeFormData>;
  onCancel?: () => void;
  onSkip?: () => void;
}

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XGG"] as const;

/**
 * Sub-formulário do Uniforme — Step 3 (opcional) do wizard.
 *
 * Único formulário com TODOS os campos obrigatórios — backend exige.
 * Pular é botão separado (não envia nada) e o uniforme pode ser
 * adicionado depois pelo endpoint dedicado.
 */
export function UniformeForm({
  initial,
  submitLabel = "Salvar uniforme",
  serverError,
  isSubmitting,
  onSubmit,
  onCancel,
  onSkip,
}: UniformeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UniformeFormData>({
    resolver: zodResolver(uniformeSchema),
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Tamanho da camisa *" error={errors.tam_camisa?.message}>
          <select {...register("tam_camisa")} className="form-input">
            <option value="">Selecione...</option>
            {TAMANHOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="Tamanho do short *" error={errors.tam_short?.message}>
          <select {...register("tam_short")} className="form-input">
            <option value="">Selecione...</option>
            {TAMANHOS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field
          label="Tamanho da chuteira *"
          error={errors.tam_chuteira?.message}
          hint="Ex.: 36"
        >
          <input
            {...register("tam_chuteira")}
            type="text"
            inputMode="numeric"
            maxLength={2}
            className="form-input"
          />
        </Field>
      </div>

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
