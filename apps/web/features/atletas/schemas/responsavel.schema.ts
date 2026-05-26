import { z } from "zod";

/**
 * Schema do sub-form Responsável (Step 2 do wizard de cadastro de atleta).
 *
 * Backend: NewResponsavel exige nome + telefone + parentesco. CPF/email
 * são opcionais. ContatoPrincipal default true no wizard (1º responsável
 * deve ser principal).
 */
export const responsavelSchema = z.object({
  nome: z
    .string()
    .min(3, "Nome deve ter ao menos 3 caracteres")
    .max(150),
  telefone: z
    .string()
    .min(8, "Telefone incompleto")
    .max(15),
  parentesco: z.enum(["PAI", "MAE", "AVO", "OUTRO"], {
    message: "Selecione o parentesco",
  }),
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve ter 11 dígitos")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contato_principal: z.boolean().default(true),
});

export type ResponsavelFormData = z.infer<typeof responsavelSchema>;
