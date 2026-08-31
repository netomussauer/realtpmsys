"use client";

import { useForm, useFieldArray, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  frequenciaLoteSchema,
  type FrequenciaLoteFormData,
} from "@/features/frequencia/schemas/frequencia.schema";
import { Button } from "@/shared/components/ui/button";
import type { MatriculaDTO } from "@/features/turmas/types/turma.types";
import type { FrequenciaDTO } from "@/features/frequencia/types/frequencia.types";
import { FrequenciaChecklistRow } from "./frequencia-checklist-row";

interface FrequenciaFormProps {
  /** Matrículas ATIVAS da turma do treino — uma linha por atleta. */
  matriculas: MatriculaDTO[];
  /** Frequências já lançadas para este treino (pode ser vazio). */
  existentes: FrequenciaDTO[];
  serverError?: string | null;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<FrequenciaLoteFormData>;
}

/**
 * Checklist de lançamento de frequência — uma linha por atleta com
 * matrícula ATIVA na turma do treino.
 *
 * Se já existem frequências lançadas para este treino (`GET
 * /treinos/{id}/frequencias` não vazio), os valores existentes são usados
 * como defaultValues do RHF (vira uma "edição" do lançamento); senão,
 * cada linha começa como "Presente" (opção mais comum — reduz cliques no
 * caso comum de turma toda presente).
 *
 * `defaultValues` é calculado 1x, direto das props — o componente só é
 * montado depois que `matriculas`/`existentes` já carregaram (vide
 * treino-detail-view.tsx), então não precisamos de `useEffect` +
 * `form.reset()` pra popular o form assincronamente (evita o anti-padrão
 * de useEffect pra derivar estado).
 */
export function FrequenciaForm({
  matriculas,
  existentes,
  serverError,
  isSubmitting,
  onSubmit,
}: FrequenciaFormProps) {
  const defaultValues: FrequenciaLoteFormData = {
    registros: matriculas.map((m) => {
      const existente = existentes.find((f) => f.atleta_id === m.atleta_id);
      return {
        atleta_id: m.atleta_id,
        presenca: existente?.presenca ?? "PRESENTE",
        justificativa: existente?.justificativa ?? undefined,
      };
    }),
  };

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FrequenciaLoteFormData>({
    resolver: zodResolver(frequenciaLoteSchema),
    defaultValues,
  });

  const { fields } = useFieldArray({ control, name: "registros" });

  if (matriculas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum atleta com matrícula ativa nesta turma — não há frequência para lançar.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {serverError}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Atleta</th>
              <th className="px-4 py-3 font-medium">Presença</th>
              <th className="px-4 py-3 font-medium">Justificativa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field, index) => (
              <FrequenciaChecklistRow
                key={field.id}
                index={index}
                atletaId={field.atleta_id}
                control={control}
                register={register}
                errors={errors}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" variant="default" disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Salvar frequência"}
        </Button>
      </div>
    </form>
  );
}
