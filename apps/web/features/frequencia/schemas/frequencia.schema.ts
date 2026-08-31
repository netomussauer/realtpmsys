import { z } from "zod";

/**
 * Schema do lançamento em lote de frequência — bate com o body de
 * POST /treinos/{treinoId}/frequencias: `{ registros: [{ atleta_id, presenca, justificativa? }] }`.
 *
 * Regra espelhada do backend (treino_handler.go): `justificativa` é
 * obrigatória quando `presenca === "JUSTIFICADO"`.
 */

export const presencaEnum = z.enum(["PRESENTE", "AUSENTE", "JUSTIFICADO"]);

export const registroFrequenciaSchema = z
  .object({
    atleta_id: z.string().uuid("Atleta inválido"),
    presenca: presencaEnum,
    justificativa: z
      .string()
      .max(300, "Justificativa muito longa")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((r) => r.presenca !== "JUSTIFICADO" || Boolean(r.justificativa), {
    message: "Justificativa é obrigatória quando a presença é Justificado",
    path: ["justificativa"],
  });

export const frequenciaLoteSchema = z.object({
  registros: z
    .array(registroFrequenciaSchema)
    .min(1, "Nenhum atleta matriculado para lançar frequência"),
});

export type RegistroFrequenciaFormData = z.infer<typeof registroFrequenciaSchema>;
export type FrequenciaLoteFormData = z.infer<typeof frequenciaLoteSchema>;
