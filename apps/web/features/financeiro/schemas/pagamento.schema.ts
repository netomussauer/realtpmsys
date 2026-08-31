import { z } from "zod";

/**
 * Schema do formulário de registrar pagamento — bate com o body de
 * PATCH /mensalidades/{id}/pagar: `{ valor_pago, data_pagamento,
 * forma_pagamento, observacao? }`.
 *
 * Valores monetários trafegam como string decimal (ex.: "150.00") — nunca
 * `number` — para bater com o formato que o backend espera (evita erro de
 * arredondamento de ponto flutuante em valores financeiros). Backend
 * SEMPRE valida de novo — isto é só UX antecipada.
 */

const decimalRegex = /^\d+(\.\d{1,2})?$/;

export const pagamentoSchema = z.object({
  valor_pago: z
    .string()
    .regex(decimalRegex, "Valor inválido (use o formato 150.00)")
    .refine((v) => parseFloat(v) > 0, "Valor deve ser maior que zero"),

  data_pagamento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)"),

  forma_pagamento: z.string().min(1, "Selecione a forma de pagamento"),

  observacao: z
    .string()
    .max(300, "Observação muito longa")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type PagamentoFormData = z.infer<typeof pagamentoSchema>;
