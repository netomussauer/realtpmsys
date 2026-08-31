import { z } from "zod";

/**
 * Schema do formulário de Matrícula — bate com o body de
 * POST /turmas/{id}/matriculas: `{ atleta_id, data_inicio }`.
 */
export const matriculaSchema = z.object({
  atleta_id: z.string().uuid("Selecione um atleta"),
  data_inicio: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)"),
});

export type MatriculaFormData = z.infer<typeof matriculaSchema>;
