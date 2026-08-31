import { z } from "zod";

/**
 * Schema do formulário de geração em lote de mensalidades — bate com o
 * body de POST /mensalidades/gerar: `{ competencia_ano, competencia_mes }`.
 *
 * Não fazia parte da lista explícita de schemas do pedido original (que
 * citava só pagamento.schema.ts e contrato.schema.ts), mas o formulário de
 * "Gerar mensalidades do mês" também precisa de validação — extraído para
 * arquivo próprio para manter o padrão schema-first (Regra 5) e o padrão
 * de 1 schema por formulário já usado em features/turmas e
 * features/frequencia (ex.: treino.schema.ts, matricula.schema.ts).
 */

export const gerarMensalidadesSchema = z.object({
  competencia_ano: z.coerce
    .number({ message: "Informe o ano" })
    .int("Ano deve ser um número inteiro")
    .min(2020, "Ano inválido")
    .max(2100, "Ano inválido"),

  competencia_mes: z.coerce
    .number({ message: "Informe o mês" })
    .int("Mês deve ser um número inteiro")
    .min(1, "Mês deve ser entre 1 e 12")
    .max(12, "Mês deve ser entre 1 e 12"),
});

export type GerarMensalidadesFormData = z.infer<typeof gerarMensalidadesSchema>;
