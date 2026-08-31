"use client";

import { X } from "lucide-react";
import type { TreinoFilter } from "@/features/frequencia/types/frequencia.types";
import { Button } from "@/shared/components/ui/button";

interface TreinoFilterBarProps {
  value: TreinoFilter;
  onChange: (filter: TreinoFilter) => void;
}

/**
 * Filtro de período (data_inicio/data_fim) da lista de treinos de uma
 * turma. Sem debounce (diferente de turma-filter-bar.tsx) — inputs `type=date`
 * disparam poucas mudanças por interação, não é texto livre tecla a tecla.
 *
 * Mudança no filtro reseta `page` pra 1 — mesmo racional de turma-filter-bar.tsx.
 */
export function TreinoFilterBar({ value, onChange }: TreinoFilterBarProps) {
  const hasFilters = !!(value.data_inicio || value.data_fim);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-end">
      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          De
        </label>
        <input
          type="date"
          value={value.data_inicio ?? ""}
          onChange={(e) =>
            onChange({ ...value, data_inicio: e.target.value || undefined, page: 1 })
          }
          className="form-input"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Até
        </label>
        <input
          type="date"
          value={value.data_fim ?? ""}
          onChange={(e) =>
            onChange({ ...value, data_fim: e.target.value || undefined, page: 1 })
          }
          className="form-input"
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ page: 1, per_page: value.per_page ?? 30 })}
          className="md:self-end"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
