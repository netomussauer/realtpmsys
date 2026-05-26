import { z } from "zod";

/**
 * Schema do sub-form Uniforme (Step 3 — opcional — do wizard).
 *
 * Backend tem constraint unique(atleta_id) — sempre upsert. Schema
 * permite todos os campos vazios = pular o step.
 */
const tamanho = z.enum(["PP", "P", "M", "G", "GG", "XGG"]);

export const uniformeSchema = z.object({
  tam_camisa: tamanho,
  tam_short: tamanho,
  // Chuteira é numérico em string ("36", "37"). Não restringimos com
  // enum pra acomodar tamanhos variados; só validamos que é número.
  tam_chuteira: z
    .string()
    .regex(/^\d{2}$/, "Tamanho da chuteira: número de 2 dígitos"),
});

export type UniformeFormData = z.infer<typeof uniformeSchema>;
