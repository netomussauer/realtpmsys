"use client";

import { useState, useEffect, useId } from "react";
import { Search, X } from "lucide-react";
import type { ContaFilter, Perfil } from "@/features/contas/types/conta.types";
import { PERFIS } from "@/features/contas/schemas/conta.schema";
import { PERFIL_LABELS } from "@/features/contas/components/conta-badges";
import { Button } from "@/shared/components/ui/button";

interface ContaFilterBarProps {
  value: ContaFilter;
  onChange: (filter: ContaFilter) => void;
}

/**
 * Filtros da lista de contas — busca (e-mail ou nome, com debounce de 300ms,
 * mesmo padrão de turma-filter-bar), perfil e status. Qualquer mudança
 * reseta `page` para 1.
 */
export function ContaFilterBar({ value, onChange }: ContaFilterBarProps) {
  const buscaId = useId();
  const perfilId = useId();
  const statusId = useId();
  const [buscaLocal, setBuscaLocal] = useState(value.busca ?? "");

  useEffect(() => {
    setBuscaLocal(value.busca ?? "");
  }, [value.busca]);

  useEffect(() => {
    if (buscaLocal === (value.busca ?? "")) return;
    const t = setTimeout(() => {
      onChange({ ...value, busca: buscaLocal || undefined, page: 1 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaLocal]);

  const hasFilters = !!(value.busca || value.perfil || value.ativo);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-end">
      <div className="flex-1 space-y-1.5">
        <label htmlFor={buscaId} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Buscar por e-mail ou nome
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id={buscaId}
            type="search"
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            placeholder="maria@..., João"
            className="form-input pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5 md:w-48">
        <label htmlFor={perfilId} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Perfil
        </label>
        <select
          id={perfilId}
          value={value.perfil ?? ""}
          onChange={(e) => onChange({ ...value, perfil: (e.target.value as Perfil) || undefined, page: 1 })}
          className="form-input"
        >
          <option value="">Todos</option>
          {PERFIS.map((p) => (
            <option key={p} value={p}>
              {PERFIL_LABELS[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5 md:w-40">
        <label htmlFor={statusId} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </label>
        <select
          id={statusId}
          value={value.ativo ?? ""}
          onChange={(e) =>
            onChange({ ...value, ativo: (e.target.value as "true" | "false") || undefined, page: 1 })
          }
          className="form-input"
        >
          <option value="">Todas</option>
          <option value="true">Ativas</option>
          <option value="false">Inativas</option>
        </select>
      </div>

      {hasFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({ page: 1, per_page: value.per_page })}
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
