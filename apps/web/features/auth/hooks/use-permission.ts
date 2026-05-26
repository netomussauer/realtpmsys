"use client";

import { useSession } from "./use-session";
import type { Perfil } from "@/features/auth/types/auth.types";

/**
 * usePermission — verifica se a sessão atual tem algum dos perfis permitidos.
 *
 * Use pra ocultar elementos de UI por perfil. **NÃO substitui a checagem
 * server-side** — o backend Go faz a autorização real (RequirePerfil
 * middleware + filtros por usuario_responsavel_id). Aqui é só ergonomia.
 *
 * Ex.: `if (canManageTurmas) <Button>Criar turma</Button>`
 */
export function usePermission(perfisPermitidos: ReadonlyArray<Perfil>): boolean {
  const { session } = useSession();
  if (!session) return false;
  return perfisPermitidos.includes(session.perfil);
}
