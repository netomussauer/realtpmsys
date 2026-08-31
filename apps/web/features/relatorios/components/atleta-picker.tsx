"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { atletaService } from "@/features/atletas/services/atleta.service";

export interface AtletaPickerValue {
  id: string;
  nome: string;
}

interface AtletaPickerProps {
  value: AtletaPickerValue | null;
  onChange: (atleta: AtletaPickerValue | null) => void;
}

/**
 * Combobox de busca de atleta por nome, pra selecionar o atleta do
 * relatório de frequência por atleta. Mesmo padrão (debounce 300ms, busca
 * a partir de 2 caracteres, `atletaService.list({ nome, per_page: 10 })`)
 * já usado em features/turmas/components/matricula-form.tsx e
 * features/financeiro/components/mensalidade-filter-bar.tsx.
 *
 * Extraído como componente próprio (em vez de embutido inline) porque,
 * diferente dos dois usos anteriores, aqui não há um <form> RHF ao redor
 * — é só um filtro de página, junto do PeriodoPicker.
 */
export function AtletaPicker({ value, onChange }: AtletaPickerProps) {
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const buscaQuery = useQuery({
    queryKey: ["atletas", "picker", buscaDebounced],
    queryFn: () => atletaService.list({ nome: buscaDebounced, per_page: 10 }),
    enabled: buscaDebounced.length >= 2,
  });

  const handleSelect = (id: string, nome: string) => {
    onChange({ id, nome });
    setBusca("");
  };

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Atleta *
      </label>

      {value ? (
        <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2 text-sm md:w-72">
          <span className="font-medium text-foreground">{value.nome}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Trocar
          </Button>
        </div>
      ) : (
        <div className="relative md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar atleta por nome..."
            className="form-input pl-9"
            aria-label="Buscar atleta por nome"
          />
          {busca.length >= 2 && (
            <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
              {(busca !== buscaDebounced || buscaQuery.isLoading) && (
                <p className="p-3 text-sm text-muted-foreground">Buscando...</p>
              )}
              {busca === buscaDebounced && !buscaQuery.isLoading && buscaQuery.isError && (
                <p role="alert" className="p-3 text-sm text-destructive">
                  Erro ao buscar atletas: {(buscaQuery.error as Error).message}
                </p>
              )}
              {busca === buscaDebounced &&
                !buscaQuery.isLoading &&
                !buscaQuery.isError &&
                (buscaQuery.data?.data.length ?? 0) === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">Nenhum atleta encontrado.</p>
                )}
              {(buscaQuery.data?.data ?? []).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleSelect(a.id, a.nome)}
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
  );
}
