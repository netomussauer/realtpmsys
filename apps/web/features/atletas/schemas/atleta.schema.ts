import { z } from "zod";

/**
 * Schema do formulário de Atleta — dados pessoais (Step 1 do wizard).
 *
 * Regras espelham as validações do backend Go (atleta.New + handler),
 * antecipando o erro no client. Backend SEMPRE valida de novo.
 */
export const atletaSchema = z.object({
  nome: z
    .string()
    .min(3, "Nome deve ter ao menos 3 caracteres")
    .max(150, "Nome muito longo"),

  data_nascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)"),

  // Campos opcionais — backend aceita null mas o input HTML envia "".
  // Normalizamos `""` → `undefined` para o backend não receber string vazia.
  cpf: z
    .string()
    .regex(/^\d{11}$/, "CPF deve ter 11 dígitos")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  rg: z.string().max(20).optional().or(z.literal("").transform(() => undefined)),

  endereco: z.string().max(200).optional().or(z.literal("").transform(() => undefined)),

  cidade: z.string().max(100).optional().or(z.literal("").transform(() => undefined)),

  uf: z
    .string()
    .regex(/^[A-Z]{2}$/, "UF: 2 letras maiúsculas")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  cep: z
    .string()
    .regex(/^\d{8}$/, "CEP deve ter 8 dígitos (apenas números)")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("").transform(() => undefined)),

  telefone: z
    .string()
    .max(15)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export type AtletaFormData = z.infer<typeof atletaSchema>;
