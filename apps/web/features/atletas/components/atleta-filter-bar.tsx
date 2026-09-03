"use client";

import { useState, useEffect, useId } from "react";
import { Search, X } from "lucide-react";
import type {
  AtletaFilter,
  AtletaStatus,
} from "@/features/atletas/types/atleta.types";
import { Button } from "@/shared/components/ui/button";

interface AtletaFilterBarProps {
  value: AtletaFilter;
  onChange: (filter: AtletaFilter) => void;
}

/**
 * Barra de filtros da lista de atletas — nome (texto livre) + status.
 *
 * Debounce de 300ms no input de nome — evita disparar fetch a cada
 * tecla. Status é select e dispara mudança imediata.
 *
 * Mudança no filter reseta `page` pra 1 (decidido aqui pra centralizar;
 * página manteria estado obsoleto se ficasse com o que era).
 */
export function AtletaFilterBar({ value, onChange }: AtletaFilterBarProps) {
  const nomeId = useId();
  const statusId = useId();
  const [nomeLocal, setNomeLocal] = useState(value.nome ?? "");

  // Mantém o local em sync se value.nome muda externamente (clear filter).
  useEffect(() => {
    setNomeLocal(value.nome ?? "");
  }, [value.nome]);

  // Debounce do nome.
  useEffect(() => {
    if (nomeLocal === (value.nome ?? "")) return;
    const t = setTimeout(() => {
      onChange({ ...value, nome: nomeLocal || undefined, page: 1 });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeLocal]);

  const handleStatus = (s: string) => {
    onChange({
      ...value,
      status: (s as AtletaStatus) || undefined,
      page: 1,
    });
  };

  const hasFilters = !!(value.nome || value.status);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-end">
      <div className="flex-1 space-y-1.5">
        <label htmlFor={nomeId} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Buscar por nome
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id={nomeId}
            type="search"
            value={nomeLocal}
            onChange={(e) => setNomeLocal(e.target.value)}
            placeholder="João, Maria, ..."
            className="form-input pl-9"
          />
        </div>
      </div>

      <div className="space-y-1.5 md:w-48">
        <label htmlFor={statusId} className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Status
        </label>
        <select
          id={statusId}
          value={value.status ?? ""}
          onChange={(e) => handleStatus(e.target.value)}
          className="form-input"
        >
          <option value="">Todos</option>
          <option value="ATIVO">Ativos</option>
          <option value="INATIVO">Inativos</option>
          <option value="SUSPENSO">Suspensos</option>
        </select>
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({ page: 1, per_page: value.per_page ?? 20 })
          }
          className="md:self-end"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
