import { z } from "zod";

/**
 * Schema do formulário de Turma — espelha `TurmaPayload` (POST/PUT).
 *
 * Regras espelham o backend Go (domain/turma/entity.go): nome obrigatório,
 * faixa etária 4-18 com min<=max, capacidade > 0, horários pode ser array
 * vazio. Backend SEMPRE valida de novo — isto é só UX antecipada.
 *
 * `treinador_id`/`campo_id` são opcionais — o select HTML envia "" quando
 * "nenhum" está selecionado; normalizamos para `undefined` (o backend
 * aceita null/omitido).
 */

const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const horarioSchema = z
  .object({
    dia_semana: z.enum(["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"], {
      message: "Selecione o dia da semana",
    }),
    hora_inicio: z.string().regex(horaRegex, "Hora inválida (HH:MM)"),
    hora_fim: z.string().regex(horaRegex, "Hora inválida (HH:MM)"),
  })
  .refine((h) => h.hora_fim > h.hora_inicio, {
    message: "Hora fim deve ser depois da hora início",
    path: ["hora_fim"],
  });

export const turmaSchema = z
  .object({
    nome: z
      .string()
      .min(3, "Nome deve ter ao menos 3 caracteres")
      .max(150, "Nome muito longo"),

    faixa_etaria_min: z.coerce
      .number({ message: "Informe a idade mínima" })
      .int("Idade deve ser um número inteiro")
      .min(4, "Idade mínima permitida é 4")
      .max(18, "Idade máxima permitida é 18"),

    faixa_etaria_max: z.coerce
      .number({ message: "Informe a idade máxima" })
      .int("Idade deve ser um número inteiro")
      .min(4, "Idade mínima permitida é 4")
      .max(18, "Idade máxima permitida é 18"),

    capacidade_max: z.coerce
      .number({ message: "Informe a capacidade" })
      .int("Capacidade deve ser um número inteiro")
      .min(1, "Capacidade deve ser maior que zero"),

    treinador_id: z
      .string()
      .uuid("Treinador inválido")
      .optional()
      .or(z.literal("").transform(() => undefined)),

    campo_id: z
      .string()
      .uuid("Campo inválido")
      .optional()
      .or(z.literal("").transform(() => undefined)),

    horarios: z.array(horarioSchema).default([]),
  })
  .refine((data) => data.faixa_etaria_max >= data.faixa_etaria_min, {
    message: "Idade máxima deve ser maior ou igual à mínima",
    path: ["faixa_etaria_max"],
  });

export type TurmaFormData = z.infer<typeof turmaSchema>;
export type HorarioFormData = z.infer<typeof horarioSchema>;
