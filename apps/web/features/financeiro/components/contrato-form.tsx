"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contratoSchema, type ContratoFormData } from "@/features/financeiro/schemas/contrato.schema";
import { Button } from "@/shared/components/ui/button";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { usePlanosAtivos } from "@/features/financeiro/hooks/use-planos";

interface ContratoFormProps {
  serverError?: string | null;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<ContratoFormData>;
  onCancel?: () => void;
}

/**
 * Formulário de "Firmar contrato" — usado na página de detalhe do atleta
 * (`/atletas/[id]`). Não existe listagem de contratos: o backend só expõe
 * `POST /contratos` (vide financeiro.service.ts) — este formulário é a
 * única superfície de UI para o recurso Contrato.
 *
 * `valor_contratado` é opcional: se deixado em branco, o backend usa o
 * `valor_mensal` do plano selecionado. O placeholder/hint mostra esse
 * valor como referência assim que um plano é escolhido.
 */
export function ContratoForm({ serverError, isSubmitting, onSubmit, onCancel }: ContratoFormProps) {
  const planosQuery = usePlanosAtivos();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ContratoFormData>({
    resolver: zodResolver(contratoSchema),
    defaultValues: { plano_id: "", data_inicio: "", valor_contratado: "" },
  });

  const planoSelecionadoId = watch("plano_id");
  const planoSelecionado = planosQuery.data?.find((p) => p.id === planoSelecionadoId);

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

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Plano *</label>
        <select {...register("plano_id")} className="form-input" disabled={planosQuery.isLoading}>
          <option value="">Selecione um plano...</option>
          {(planosQuery.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome} — {formatCurrencyBRL(p.valor_mensal)}/mês
            </option>
          ))}
        </select>
        {errors.plano_id && <p className="text-xs text-destructive">{errors.plano_id.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Data de início *</label>
          <input {...register("data_inicio")} type="date" className="form-input" />
          {errors.data_inicio && (
            <p className="text-xs text-destructive">{errors.data_inicio.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-foreground">Valor contratado</label>
          <input
            {...register("valor_contratado")}
            type="text"
            inputMode="decimal"
            placeholder={planoSelecionado?.valor_mensal ?? "150.00"}
            className="form-input"
          />
          {errors.valor_contratado ? (
            <p className="text-xs text-destructive">{errors.valor_contratado.message}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {planoSelecionado
                ? `Deixe em branco para usar o valor do plano (${formatCurrencyBRL(planoSelecionado.valor_mensal)})`
                : "Opcional — usa o valor do plano se não informado"}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="default" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "Firmando contrato..." : "Firmar contrato"}
        </Button>
      </div>
    </form>
  );
}
