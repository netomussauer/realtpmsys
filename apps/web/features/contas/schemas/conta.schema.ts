import { z } from "zod";

/**
 * Schemas do contexto Contas. As regras espelham o backend Go
 * (internal/domain/identidade/entity.go) — o backend SEMPRE valida de novo;
 * isto é só UX antecipada.
 */

export const PERFIS = ["ADMIN", "TREINADOR", "RESPONSAVEL"] as const;

const perfilSchema = z.enum(PERFIS, { message: "Selecione o perfil" });

const nomeSchema = z.string().trim().max(150, "Nome muito longo (máx. 150)");

/** Criação: a senha não é digitada — o sistema gera uma temporária. */
export const criarContaSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe o e-mail")
    .max(254, "E-mail muito longo")
    .email("E-mail inválido"),
  nome: nomeSchema,
  perfil: perfilSchema,
});
export type CriarContaFormData = z.infer<typeof criarContaSchema>;

/** Edição: e-mail não muda (é a identidade de login). */
export const editarContaSchema = z.object({
  nome: nomeSchema,
  perfil: perfilSchema,
});
export type EditarContaFormData = z.infer<typeof editarContaSchema>;

/** Política de senha: igual à do backend (ValidarSenha). */
export const SENHA_MIN = 10;
export const SENHA_MAX_BYTES = 72;

/** `string.length` conta UTF-16; a política do bcrypt é em bytes UTF-8. */
function bytes(s: string): number {
  return new TextEncoder().encode(s).length;
}

export const novaSenhaSchema = z
  .string()
  .min(SENHA_MIN, `A senha deve ter ao menos ${SENHA_MIN} caracteres`)
  .refine((s) => bytes(s) <= SENHA_MAX_BYTES, `A senha é longa demais (máx. ${SENHA_MAX_BYTES} bytes)`)
  .refine((s) => /\p{L}/u.test(s) && /\p{N}/u.test(s), "A senha deve conter ao menos uma letra e um dígito");

export const trocarSenhaSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual"),
    novaSenha: novaSenhaSchema,
    confirmarSenha: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((d) => d.novaSenha === d.confirmarSenha, {
    message: "A confirmação não confere com a nova senha",
    path: ["confirmarSenha"],
  })
  .refine((d) => d.novaSenha !== d.senhaAtual, {
    message: "A nova senha deve ser diferente da atual",
    path: ["novaSenha"],
  });
export type TrocarSenhaFormData = z.infer<typeof trocarSenhaSchema>;
