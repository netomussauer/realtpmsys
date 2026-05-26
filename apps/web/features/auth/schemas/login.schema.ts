import { z } from "zod";

/**
 * Schema do formulário de login.
 *
 * Validação client-side via React Hook Form. Backend ainda valida tudo de
 * novo via `LoginUseCase` (defesa em profundidade). As regras aqui são
 * apenas UX — feedback imediato pro usuário.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Informe seu email")
    .email("Email inválido"),
  senha: z
    .string()
    .min(1, "Informe sua senha"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
