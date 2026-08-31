"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  gerarMensalidadesSchema,
  type GerarMensalidadesFormData,
} from "@/features/financeiro/schemas/gerar-mensalidades.schema";
import { Button } from "@/shared/components/ui/button";

interface GerarMensalidadesFormProps {
  serverError?: string | null;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<GerarMensalidadesFormData>;
  onCancel?: () => void;
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/**
 * Formulário de geração em lote de mensalidades — competência (ano + mês)
 * default = mês atual. `POST /mensalidades/gerar` é idempotente: reenviar
 * para a mesma competência não duplica cobranças já geradas (o resultado
 * mostra quantas foram `ignoradas` nesse caso).
 */
export function GerarMensalidadesForm({
  serverError,
  isSubmitting,
  onSubmit,
  onCancel,
}: GerarMensalidadesFormProps) {
  const now = new Date();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GerarMensalidadesFormData>({
    resolver: zodResolver(gerarMensalidadesSchema),
    defaultValues: {
      competencia_ano: now.getFullYear(),
      competencia_mes: now.getMonth() + 1,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        Gera as mensalidades da competência selecionada para todos os contratos
        ativos. Operação idempotente — reenviar para o mesmo mês não duplica
        cobranças já geradas.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mês *" error={errors.competencia_mes?.message}>
          <select {...register("competencia_mes")} className="form-input">
            {MESES.map((label, i) => (
              <option key={label} value={i + 1}>
                {label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Ano *" error={errors.competencia_ano?.message}>
          <input
            {...register("competencia_ano")}
            type="number"
            min={2020}
            max={2100}
            className="form-input"
          />
        </Field>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="default" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "Gerando..." : "Gerar mensalidades"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
