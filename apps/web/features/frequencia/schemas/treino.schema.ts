import { z } from "zod";

/**
 * Schema do formulário de criação de Treino — bate com o body de
 * POST /turmas/{turmaId}/treinos: `{ data_treino, hora_inicio?, hora_fim?, observacao? }`.
 *
 * Regras espelham o backend Go (treino_handler.go): se informar hora,
 * precisa informar as duas (hora_inicio + hora_fim juntas ou nenhuma), e
 * hora_fim > hora_inicio. Backend SEMPRE valida de novo — isto é só UX
 * antecipada. Sem schema de edição: o backend não expõe PUT/PATCH para
 * este sub-recurso (só criar + listar).
 */

const dataRegex = /^\d{4}-\d{2}-\d{2}$/;
const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const treinoSchema = z
  .object({
    data_treino: z.string().regex(dataRegex, "Data inválida (use AAAA-MM-DD)"),

    hora_inicio: z
      .string()
      .regex(horaRegex, "Hora inválida (HH:MM)")
      .optional()
      .or(z.literal("").transform(() => undefined)),

    hora_fim: z
      .string()
      .regex(horaRegex, "Hora inválida (HH:MM)")
      .optional()
      .or(z.literal("").transform(() => undefined)),

    observacao: z
      .string()
      .max(500, "Observação muito longa")
      .optional()
      .or(z.literal("").transform(() => undefined)),
  })
  .refine((d) => Boolean(d.hora_inicio) === Boolean(d.hora_fim), {
    message: "Informe hora início e hora fim juntas, ou deixe as duas em branco",
    path: ["hora_fim"],
  })
  .refine((d) => !d.hora_inicio || !d.hora_fim || d.hora_fim > d.hora_inicio, {
    message: "Hora fim deve ser depois da hora início",
    path: ["hora_fim"],
  });

export type TreinoFormData = z.infer<typeof treinoSchema>;
