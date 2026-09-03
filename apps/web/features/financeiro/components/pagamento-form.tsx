"use client";

import { cloneElement, useId, type ReactElement } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pagamentoSchema, type PagamentoFormData } from "@/features/financeiro/schemas/pagamento.schema";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

interface PagamentoFormProps {
  /** Valor da mensalidade — usado como valor pré-preenchido (pagamento integral é o caso comum). */
  valorSugerido: string;
  serverError?: string | null;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<PagamentoFormData>;
  onCancel: () => void;
}

const FORMAS_PAGAMENTO = [
  "PIX",
  "DINHEIRO",
  "CARTAO_DEBITO",
  "CARTAO_CREDITO",
  "BOLETO",
  "TRANSFERENCIA",
];

/**
 * Formulário de registrar pagamento — exibido inline abaixo da linha da
 * mensalidade na tabela (mesmo padrão pragmático de
 * features/turmas/components/matricula-form.tsx, que também não é um
 * modal de verdade — o design system deste projeto não tem um componente
 * de Dialog/Modal ainda, só shared/components/ui/button.tsx).
 *
 * `forma_pagamento` é `string` livre no contrato real do backend (não um
 * enum fechado) — o `<select>` aqui é só uma lista de valores comuns como
 * UX, não uma validação de domínio.
 */
export function PagamentoForm({
  valorSugerido,
  serverError,
  isSubmitting,
  onSubmit,
  onCancel,
}: PagamentoFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PagamentoFormData>({
    resolver: zodResolver(pagamentoSchema),
    defaultValues: {
      valor_pago: valorSugerido,
      data_pagamento: today,
      forma_pagamento: "",
      observacao: "",
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

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor pago *" error={errors.valor_pago?.message}>
          <input
            {...register("valor_pago")}
            type="text"
            inputMode="decimal"
            placeholder="150.00"
            className="form-input"
          />
        </Field>

        <Field label="Data do pagamento *" error={errors.data_pagamento?.message}>
          <input {...register("data_pagamento")} type="date" className="form-input" />
        </Field>

        <Field label="Forma de pagamento *" error={errors.forma_pagamento?.message}>
          <select {...register("forma_pagamento")} className="form-input">
            <option value="">Selecione...</option>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f} value={f}>
                {f.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Observação" error={errors.observacao?.message}>
          <input {...register("observacao")} type="text" className="form-input" />
        </Field>
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" variant="default" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "Registrando..." : "Confirmar pagamento"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string;
  error?: string;
  children: ReactElement<{ id?: string }>;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      {cloneElement(children, { id })}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
