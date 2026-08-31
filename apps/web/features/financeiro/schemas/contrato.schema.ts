import { z } from "zod";

/**
 * Schema do formulário de "Firmar contrato" — bate com o body de
 * POST /contratos: `{ atleta_id, plano_id, data_inicio, valor_contratado? }`.
 *
 * `atleta_id` NÃO faz parte deste schema — o formulário é sempre renderizado
 * a partir da página de detalhe do atleta (`/atletas/[id]`), que já conhece
 * o ID pela rota; ele é passado direto ao service/mutation (mesmo padrão de
 * `turmaId` em features/turmas/components/matricula-form.tsx, que também
 * não inclui `turma_id` no schema do formulário).
 *
 * `valor_contratado` é opcional — se omitido, o backend usa o
 * `valor_mensal` do plano selecionado.
 */

const decimalRegex = /^\d+(\.\d{1,2})?$/;

export const contratoSchema = z.object({
  plano_id: z.string().uuid("Selecione um plano"),

  data_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)"),

  valor_contratado: z
    .string()
    .regex(decimalRegex, "Valor inválido (use o formato 150.00)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type ContratoFormData = z.infer<typeof contratoSchema>;
