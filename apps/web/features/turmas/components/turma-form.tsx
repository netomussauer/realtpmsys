"use client";

import { cloneElement, useId, type ReactElement } from "react";
import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import {
  turmaSchema,
  type TurmaFormData,
} from "@/features/turmas/schemas/turma.schema";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { useTreinadoresAtivos, useCamposAtivos } from "@/features/turmas/hooks/use-picker-data";
import type { DiaSemana } from "@/features/turmas/types/turma.types";

interface TurmaFormProps {
  initial?: Partial<TurmaFormData>;
  submitLabel?: string;
  /** Mensagem de erro do servidor (resposta da mutation) */
  serverError?: string | null;
  /** Quando true desabilita inputs e botão (loading state da mutation) */
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<TurmaFormData>;
  /** Botão extra de cancelar — opcional pra dar saída pro usuário */
  onCancel?: () => void;
}

const DIAS: { value: DiaSemana; label: string }[] = [
  { value: "SEG", label: "Segunda" },
  { value: "TER", label: "Terça" },
  { value: "QUA", label: "Quarta" },
  { value: "QUI", label: "Quinta" },
  { value: "SEX", label: "Sexta" },
  { value: "SAB", label: "Sábado" },
  { value: "DOM", label: "Domingo" },
];

/**
 * Formulário de Turma — usado tanto no cadastro (POST) quanto na edição
 * (PUT). Inclui sub-formulário de horários (adicionar/remover linhas
 * dinamicamente via useFieldArray) — no PUT os horários são substituídos
 * por completo (o backend não tem PATCH parcial).
 *
 * Validação Zod no client (turmaSchema) — backend valida tudo de novo.
 */
export function TurmaForm({
  initial,
  submitLabel = "Salvar",
  serverError,
  isSubmitting,
  onSubmit,
  onCancel,
}: TurmaFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TurmaFormData>({
    resolver: zodResolver(turmaSchema),
    defaultValues: { horarios: [], ...initial },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "horarios" });

  const treinadoresQuery = useTreinadoresAtivos();
  const camposQuery = useCamposAtivos();

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nome da turma *" error={errors.nome?.message} className="md:col-span-2">
          <input
            {...register("nome")}
            type="text"
            className="form-input"
          />
        </Field>

        <Field label="Idade mínima *" error={errors.faixa_etaria_min?.message} hint="4 a 18 anos">
          <input
            {...register("faixa_etaria_min")}
            type="number"
            min={4}
            max={18}
            className="form-input"
          />
        </Field>

        <Field label="Idade máxima *" error={errors.faixa_etaria_max?.message} hint="4 a 18 anos">
          <input
            {...register("faixa_etaria_max")}
            type="number"
            min={4}
            max={18}
            className="form-input"
          />
        </Field>

        <Field label="Capacidade máxima *" error={errors.capacidade_max?.message}>
          <input
            {...register("capacidade_max")}
            type="number"
            min={1}
            className="form-input"
          />
        </Field>

        <Field label="Treinador" error={errors.treinador_id?.message}>
          <select
            {...register("treinador_id")}
            className="form-input"
            disabled={treinadoresQuery.isLoading}
          >
            <option value="">Sem treinador definido</option>
            {(treinadoresQuery.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Campo" error={errors.campo_id?.message}>
          <select
            {...register("campo_id")}
            className="form-input"
            disabled={camposQuery.isLoading}
          >
            <option value="">Sem campo definido</option>
            {(camposQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Horários</label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ dia_semana: "SEG", hora_inicio: "", hora_fim: "" })}
          >
            <Plus className="h-4 w-4" />
            Adicionar horário
          </Button>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum horário adicionado.</p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
            >
              <Field label="Dia da semana" error={errors.horarios?.[index]?.dia_semana?.message}>
                <select {...register(`horarios.${index}.dia_semana`)} className="form-input">
                  {DIAS.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Hora início" error={errors.horarios?.[index]?.hora_inicio?.message}>
                <input
                  {...register(`horarios.${index}.hora_inicio`)}
                  type="time"
                  className="form-input"
                />
              </Field>

              <Field label="Hora fim" error={errors.horarios?.[index]?.hora_fim?.message}>
                <input
                  {...register(`horarios.${index}.hora_fim`)}
                  type="time"
                  className="form-input"
                />
              </Field>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remover horário"
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

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
