"use client";

import { X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import type { InadimplenciaFilter } from "@/features/relatorios/types/relatorio.types";

interface InadimplenciaFilterBarProps {
  value: InadimplenciaFilter;
  onChange: (filter: InadimplenciaFilter) => void;
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
] as const;

/**
 * Filtro de competência (ano + mês) do relatório de inadimplência — os dois
 * campos são OPCIONAIS no backend (`GET /relatorios/inadimplencia`); deixar
 * ambos em branco traz mensalidades em aberto de todas as competências. O
 * `<select>` de mês já restringe a escolha a 1-12 na origem (o backend
 * rejeitaria qualquer outro valor com 400).
 */
export function InadimplenciaFilterBar({ value, onChange }: InadimplenciaFilterBarProps) {
  const hasFilters = value.competencia_ano !== undefined || value.competencia_mes !== undefined;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-end">
      <div className="space-y-1.5 md:w-36">
        <label htmlFor="inadimplencia-ano" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ano
        </label>
        <input
          id="inadimplencia-ano"
          type="number"
          min={2020}
          max={2100}
          value={value.competencia_ano ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              competencia_ano: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          placeholder="Todos"
          className="form-input"
        />
      </div>

      <div className="space-y-1.5 md:w-48">
        <label htmlFor="inadimplencia-mes" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Mês
        </label>
        <select
          id="inadimplencia-mes"
          value={value.competencia_mes ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              competencia_mes: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="form-input"
        >
          <option value="">Todos</option>
          {MESES.map((m, i) => (
            <option key={m} value={i + 1}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})} className="md:self-end">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
