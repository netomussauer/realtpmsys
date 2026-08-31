"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import type { TurmaFilter, TurmaStatus } from "@/features/turmas/types/turma.types";
import { Button } from "@/shared/components/ui/button";

interface TurmaFilterBarProps {
  value: TurmaFilter;
  onChange: (filter: TurmaFilter) => void;
}

/**
 * Barra de filtros da lista de turmas — nome (texto livre) + status.
 *
 * Mesmo padrão de debounce (300ms) de `atleta-filter-bar.tsx`. O contrato
 * real de `GET /turmas` (TurmaHandler.List) aceita `nome` e `status` — NÃO
 * aceita `treinador_id` (achado de code-review: a versão anterior deste
 * componente tinha um filtro de treinador que era um no-op silencioso, o
 * backend nunca lia esse parâmetro).
 *
 * Mudança no filter reseta `page` pra 1 — evita ficar com página obsoleta
 * quando o resultado filtrado tem menos páginas.
 */
export function TurmaFilterBar({ value, onChange }: TurmaFilterBarProps) {
  const [nomeLocal, setNomeLocal] = useState(value.nome ?? "");

  useEffect(() => {
    setNomeLocal(value.nome ?? "");
  }, [value.nome]);

  useEffect(() => {
    if (nomeLocal === (value.nome ?? "")) return;
    const t = setTimeout(() => {
      onChange({ ...value, nome: nomeLocal || undefined, page: 1 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeLocal]);

  const handleStatus = (s: string) => {
    onChange({ ...value, status: (s as TurmaStatus) || undefined, page: 1 });
  };

  const hasFilters = !!(value.nome || value.status);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-end">
      <div className="flex-1 space-y-1.5">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Buscar por nome
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={nomeLocal}
            onChange={(e) => setNomeLocal(e.target.value)}
            placeholder="Sub-13, Manhã, ..."
            className="form-input pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5 md:w-48">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </label>
        <select
          value={value.status ?? ""}
          onChange={(e) => handleStatus(e.target.value)}
          className="form-input"
        >
          <option value="">Todos</option>
          <option value="ATIVA">Ativas</option>
          <option value="SUSPENSA">Suspensas</option>
          <option value="ENCERRADA">Encerradas</option>
        </select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ page: 1, per_page: value.per_page ?? 20 })}
          className="md:self-end"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
