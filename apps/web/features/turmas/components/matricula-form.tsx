"use client";

import { useState, useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import {
  matriculaSchema,
  type MatriculaFormData,
} from "@/features/turmas/schemas/matricula.schema";
import { Button } from "@/shared/components/ui/button";
import { atletaService } from "@/features/atletas/services/atleta.service";

interface MatriculaFormProps {
  serverError?: string | null;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<MatriculaFormData>;
  onCancel?: () => void;
}

/**
 * Formulário de Matrícula — atleta (busca por nome) + data de início.
 *
 * Não existe endpoint de "get atleta by id list" nem um componente de
 * combobox pronto no design system (Shadcn não foi instalado ainda neste
 * projeto — só shared/components/ui/button.tsx existe). Reaproveitamos
 * `atletaService.list({ nome })` (já existente na feature atletas) com um
 * dropdown de resultados simples, sem introduzir dependência nova.
 *
 * Busca dispara a partir de 2 caracteres — evita listar a base inteira de
 * atletas a cada tecla.
 */
export function MatriculaForm({
  serverError,
  isSubmitting,
  onSubmit,
  onCancel,
}: MatriculaFormProps) {
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [atletaSelecionado, setAtletaSelecionado] = useState<{ id: string; nome: string } | null>(null);

  // Debounce de 300ms — achado de code-review: sem isso, cada tecla digitada
  // disparava um novo GET /atletas?nome=... (mesmo padrão de atleta-filter-bar.tsx).
  useEffect(() => {
    const t = setTimeout(() => setBuscaDebounced(busca), 300);
    return () => clearTimeout(t);
  }, [busca]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MatriculaFormData>({
    resolver: zodResolver(matriculaSchema),
    defaultValues: { atleta_id: "", data_inicio: "" },
  });

  const buscaQuery = useQuery({
    queryKey: ["atletas", "picker", buscaDebounced],
    queryFn: () => atletaService.list({ nome: buscaDebounced, per_page: 10 }),
    enabled: buscaDebounced.length >= 2,
  });

  const handleSelect = (id: string, nome: string) => {
    setAtletaSelecionado({ id, nome });
    setValue("atleta_id", id, { shouldValidate: true });
    setBusca("");
  };

  const handleTrocar = () => {
    setAtletaSelecionado(null);
    setValue("atleta_id", "", { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Atleta *</label>

        {atletaSelecionado ? (
          <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-2 text-sm">
            <span className="font-medium text-foreground">{atletaSelecionado.nome}</span>
            <Button type="button" variant="ghost" size="sm" onClick={handleTrocar}>
              Trocar
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
        {/* Campo controlado via setValue (picker acima) — registrado como hidden
            pro RHF/Zod validarem normalmente no submit. */}
        <input type="hidden" {...register("atleta_id")} />
        {errors.atleta_id && <p className="text-xs text-destructive">{errors.atleta_id.message}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-foreground">Data de início *</label>
        <input
          {...register("data_inicio")}
          type="date"
          className="form-input md:w-56"
        />
        {errors.data_inicio && <p className="text-xs text-destructive">{errors.data_inicio.message}</p>}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="default" disabled={isSubmitting}>
          {isSubmitting ? "Matriculando..." : "Matricular"}
        </Button>
      </div>
    </form>
  );
}
