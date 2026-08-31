import { z } from "zod";

/**
 * Schema do filtro de período (data_inicio + data_fim) usado pelos 2
 * relatórios de frequência (`GET /relatorios/frequencia/{atletaId}` e
 * `GET /relatorios/frequencia/turma/{turmaId}`) — o backend exige os dois
 * campos e responde 400 se `data_fim < data_inicio` (vide
 * relatorio_handler.go). Aqui replicamos a mesma regra client-side pra dar
 * feedback antes de disparar a requisição; o backend segue sendo a fonte
 * de verdade da validação.
 *
 * Usado tanto pelo `PeriodoPicker` (mensagem inline) quanto pelos hooks
 * `useFrequenciaAtleta`/`useFrequenciaTurma` (`enabled` só quando o
 * período for válido).
 */

const dataRegex = /^\d{4}-\d{2}-\d{2}$/;

export const periodoSchema = z
  .object({
    data_inicio: z.string().regex(dataRegex, "Informe a data inicial"),
    data_fim: z.string().regex(dataRegex, "Informe a data final"),
  })
  .refine((d) => d.data_fim >= d.data_inicio, {
    message: "Data final deve ser igual ou depois da data inicial",
    path: ["data_fim"],
  });

export type PeriodoFormData = z.infer<typeof periodoSchema>;

/**
 * isPeriodoValido — checagem booleana de `periodoSchema`, centralizada
 * porque antes era recomputada com `periodoSchema.safeParse(...).success`
 * de forma independente em 4 lugares (page.tsx x2, PeriodoPicker, e cada
 * um dos 2 hooks) — achado de code-review: se a regra de validação mudar
 * no futuro (ex: um limite máximo de intervalo), só atualizar aqui em vez
 * de correr o risco de um dos 4 call sites ficar pra trás e divergir dos
 * outros (ex: UI sem erro mas query desabilitada, ou vice-versa).
 */
export function isPeriodoValido(periodo: PeriodoFormData): boolean {
  return periodoSchema.safeParse(periodo).success;
}
