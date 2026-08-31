"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import type {
  MensalidadeFilter,
  MensalidadeStatus,
} from "@/features/financeiro/types/financeiro.types";
import { MENSALIDADE_STATUS } from "@/features/financeiro/types/financeiro.types";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/features/auth/hooks/use-permission";
import { atletaService } from "@/features/atletas/services/atleta.service";

interface MensalidadeFilterBarProps {
  value: MensalidadeFilter;
  onChange: (filter: MensalidadeFilter) => void;
}

const STATUS_LABELS: Record<MensalidadeStatus, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  VENCIDO: "Vencido",
  CANCELADO: "Cancelado",
  ISENTO: "Isento",
};

/**
 * Filtro de status (sempre visível, todos os perfis) + filtro de atleta
 * (só ADMIN).
 *
 * O filtro por `atleta_id` só tem efeito quando quem chama `GET
 * /mensalidades` é ADMIN — quando RESPONSAVEL chama, o backend troca
 * automaticamente para `ListPorResponsavel` com base no JWT e IGNORA
 * silenciosamente esse parâmetro (achado real, verificado direto no
 * handler Go). Por isso o campo só é renderizado com
 * `usePermission(["ADMIN"])`: mostrá-lo para RESPONSAVEL seria enganoso
 * — pareceria filtrar mas não faria nada (mesmo tipo de bug já encontrado
 * e corrigido em features/turmas/components/turma-filter-bar.tsx, lá com
 * um filtro de treinador que o backend nunca lia).
 *
 * Busca de atleta reaproveita o mesmo padrão de combobox de
 * features/turmas/components/matricula-form.tsx (debounce 300ms, busca a
 * partir de 2 caracteres, sem introduzir dependência nova de UI).
 */
export function MensalidadeFilterBar({ value, onChange }: MensalidadeFilterBarProps) {
  const isAdmin = usePermission(["ADMIN"]);

  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [atletaSelecionado, setAtletaSelecionado] = useState<{ id: string; nome: string } | null>(
    null,
  );

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const buscaQuery = useQuery({
    queryKey: ["atletas", "picker", buscaDebounced],
    queryFn: () => atletaService.list({ nome: buscaDebounced, per_page: 10 }),
    enabled: isAdmin && buscaDebounced.length >= 2,
  });

  const handleSelectAtleta = (id: string, nome: string) => {
    setAtletaSelecionado({ id, nome });
    setBusca("");
    onChange({ ...value, atleta_id: id, page: 1 });
  };

  const handleClearAtleta = () => {
    setAtletaSelecionado(null);
    onChange({ ...value, atleta_id: undefined, page: 1 });
  };

  const handleStatus = (s: string) => {
    onChange({ ...value, status: (s as MensalidadeStatus) || undefined, page: 1 });
  };

  const handleClearAll = () => {
    setAtletaSelecionado(null);
    setBusca("");
    onChange({ page: 1, per_page: value.per_page ?? 20 });
  };

  const hasFilters = !!(value.status || (isAdmin && value.atleta_id));

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-end">
      {isAdmin && (
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Atleta
          </label>

          {atletaSelecionado ? (
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2 text-sm">
              <span className="font-medium text-foreground">{atletaSelecionado.nome}</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearAtleta}>
                Limpar
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar atleta por nome..."
                className="form-input pl-9"
              />
              {busca.length >= 2 && (
                <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                  {(busca !== buscaDebounced || buscaQuery.isLoading) && (
                    <p className="p-3 text-sm text-muted-foreground">Buscando...</p>
                  )}
                  {busca === buscaDebounced &&
                    !buscaQuery.isLoading &&
                    (buscaQuery.data?.data.length ?? 0) === 0 && (
                      <p className="p-3 text-sm text-muted-foreground">
                        Nenhum atleta encontrado.
                      </p>
                    )}
                  {(buscaQuery.data?.data ?? []).map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleSelectAtleta(a.id, a.nome)}
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      {a.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
          {MENSALIDADE_STATUS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearAll} className="md:self-end">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
