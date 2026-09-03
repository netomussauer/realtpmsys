"use client";

import { cloneElement, useId, type ReactElement } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { treinoSchema, type TreinoFormData } from "@/features/frequencia/schemas/treino.schema";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface TreinoFormProps {
  serverError?: string | null;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<TreinoFormData>;
  onCancel?: () => void;
}

/**
 * Formulário de registro de treino — data obrigatória; horário é opcional
 * mas, se informado, precisa das duas pontas (regra replicada do backend
 * em schemas/treino.schema.ts). Sem edição/remoção: o backend não expõe
 * essas operações para este sub-recurso (só criar + listar).
 */
export function TreinoForm({ serverError, isSubmitting, onSubmit, onCancel }: TreinoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TreinoFormData>({
    resolver: zodResolver(treinoSchema),
    defaultValues: { data_treino: "", hora_inicio: "", hora_fim: "", observacao: "" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Data do treino *" error={errors.data_treino?.message}>
          <input {...register("data_treino")} type="date" className="form-input" />
        </Field>

        <Field
          label="Hora início"
          error={errors.hora_inicio?.message}
          hint="Opcional — se informar, informe também a hora fim"
        >
          <input {...register("hora_inicio")} type="time" className="form-input" />
        </Field>

        <Field label="Hora fim" error={errors.hora_fim?.message}>
          <input {...register("hora_fim")} type="time" className="form-input" />
        </Field>
      </div>

      <Field label="Observação" error={errors.observacao?.message}>
        <textarea {...register("observacao")} rows={3} className="form-input" />
      </Field>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Registrar treino"}
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
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactElement<{ id?: string }>;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      {cloneElement(children, { id })}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
