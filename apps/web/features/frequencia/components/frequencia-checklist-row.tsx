"use client";

import { useWatch, type Control, type UseFormRegister, type FieldErrors } from "react-hook-form";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import type { FrequenciaLoteFormData } from "@/features/frequencia/schemas/frequencia.schema";

interface FrequenciaChecklistRowProps {
  index: number;
  atletaId: string;
  control: Control<FrequenciaLoteFormData>;
  register: UseFormRegister<FrequenciaLoteFormData>;
  errors: FieldErrors<FrequenciaLoteFormData>;
}

/**
 * Linha do checklist de lançamento de frequência — resolve o nome do
 * atleta via `useAtleta(atletaId)` (mesmo padrão de
 * features/turmas/components/matricula-table.tsx: o back não devolve
 * `atleta_nome` em nenhum sub-recurso, cada linha busca/reaproveita o
 * cache de `["atletas","detail",id]`).
 *
 * `atleta_id` da linha é fixo (não editável pelo usuário) — o `<select>`
 * de presença é o único campo interativo, com o campo de justificativa
 * aparecendo condicionalmente quando presença === "JUSTIFICADO".
 */
export function FrequenciaChecklistRow({
  index,
  atletaId,
  control,
  register,
  errors,
}: FrequenciaChecklistRowProps) {
  const atletaQuery = useAtleta(atletaId);
  const presenca = useWatch({ control, name: `registros.${index}.presenca` });
  const rowError = errors.registros?.[index];

  return (
    <tr className="text-sm align-top">
      <td className="px-4 py-3 font-medium text-foreground">
        {atletaQuery.isLoading ? "Carregando..." : (atletaQuery.data?.nome ?? atletaId)}
        <input type="hidden" {...register(`registros.${index}.atleta_id`)} />
      </td>
      <td className="px-4 py-3">
        <select
          {...register(`registros.${index}.presenca`)}
          className="form-input"
          aria-label={`Presença de ${atletaQuery.data?.nome ?? "atleta"}`}
        >
          <option value="PRESENTE">Presente</option>
          <option value="AUSENTE">Ausente</option>
          <option value="JUSTIFICADO">Justificado</option>
        </select>
      </td>
      <td className="px-4 py-3">
        {presenca === "JUSTIFICADO" ? (
          <>
            <input
              {...register(`registros.${index}.justificativa`)}
              type="text"
              placeholder="Motivo da ausência justificada"
              className="form-input"
              aria-describedby={rowError?.justificativa ? `just-error-${index}` : undefined}
              aria-invalid={!!rowError?.justificativa}
            />
            {rowError?.justificativa && (
              <p id={`just-error-${index}`} role="alert" className="mt-1 text-xs text-destructive">
                {rowError.justificativa.message}
              </p>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}
