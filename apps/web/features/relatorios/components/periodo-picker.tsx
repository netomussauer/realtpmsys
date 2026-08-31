"use client";

import { useId } from "react";
import { periodoSchema } from "@/features/relatorios/schemas/periodo.schema";
import type { PeriodoFilter } from "@/features/relatorios/types/relatorio.types";

interface PeriodoPickerProps {
  value: PeriodoFilter;
  onChange: (value: PeriodoFilter) => void;
}

/**
 * Seletor de período (data_inicio + data_fim) usado pelos 2 relatórios de
 * frequência — ambos os campos são obrigatórios no backend (400 se
 * ausentes ou se `data_fim` for anterior a `data_inicio`, vide
 * relatorio_handler.go). Valida com `periodoSchema` e mostra erro inline
 * só depois que os dois campos foram preenchidos (evita mostrar "Informe a
 * data final" enquanto o usuário ainda está preenchendo o formulário).
 *
 * Sem debounce — inputs `type=date` disparam poucas mudanças por interação
 * (mesmo racional de features/frequencia/components/treino-filter-bar.tsx).
 */
export function PeriodoPicker({ value, onChange }: PeriodoPickerProps) {
  const errorId = useId();
  const hasBothDates = Boolean(value.data_inicio && value.data_fim);
  const result = periodoSchema.safeParse(value);
  const error = hasBothDates && !result.success ? result.error.issues[0]?.message : null;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="space-y-1.5">
          <label
            htmlFor={`${errorId}-inicio`}
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            De *
          </label>
          <input
            id={`${errorId}-inicio`}
            type="date"
            value={value.data_inicio}
            onChange={(e) => onChange({ ...value, data_inicio: e.target.value })}
            className="form-input"
            required
            aria-required="true"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor={`${errorId}-fim`}
            className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
          >
            Até *
          </label>
          <input
            id={`${errorId}-fim`}
            type="date"
            value={value.data_fim}
            onChange={(e) => onChange({ ...value, data_fim: e.target.value })}
            className="form-input"
            required
            aria-required="true"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
      </div>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
