"use client";

import { useState } from "react";
import { KeyRound, UserCheck, UserX } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useMudarStatusConta, useRedefinirSenhaConta } from "@/features/contas/hooks/use-mutations";
import { SenhaTemporariaBox } from "@/features/contas/components/senha-temporaria-box";
import type { ContaDTO } from "@/features/contas/types/conta.types";

interface ContaAcoesProps {
  conta: ContaDTO;
  /** true quando a conta exibida é a do próprio admin logado. */
  ehContaPropria: boolean;
}

/**
 * Ações sobre uma conta: ativar/desativar e redefinir senha.
 *
 * - Na conta própria, desativar e redefinir ficam ocultos: o backend recusa
 *   (um admin não desativa a si mesmo; a própria senha se troca em
 *   "Minha conta") — esconder evita oferecer um botão que sempre falha.
 * - Desativar e redefinir derrubam as sessões da pessoa; ambos pedem
 *   confirmação (window.confirm, mesmo padrão dos demais status-actions).
 * - A senha temporária vem do resultado da mutation e é exibida uma única vez.
 */
export function ContaAcoes({ conta, ehContaPropria }: ContaAcoesProps) {
  const status = useMudarStatusConta();
  const redefinir = useRedefinirSenhaConta();
  const [senhaTemp, setSenhaTemp] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const ocupado = status.isPending || redefinir.isPending;

  const alterarStatus = (acao: "ativar" | "desativar") => {
    const prompt =
      acao === "desativar"
        ? `Desativar ${conta.email}? A pessoa perde o acesso imediatamente (as sessões são encerradas).`
        : `Reativar ${conta.email}?`;
    if (!window.confirm(prompt)) return;
    setErro(null);
    status.mutate({ id: conta.id, acao }, { onError: (e) => setErro(e.message) });
  };

  const redefinirSenha = () => {
    if (
      !window.confirm(
        `Redefinir a senha de ${conta.email}? Uma senha temporária será gerada e as sessões atuais serão encerradas.`,
      )
    ) {
      return;
    }
    setErro(null);
    redefinir.mutate(conta.id, {
      onSuccess: (r) => setSenhaTemp(r.senha_temporaria),
      onError: (e) => setErro(e.message),
    });
  };

  if (senhaTemp) {
    return (
      <SenhaTemporariaBox
        titulo="Senha redefinida"
        email={conta.email}
        senha={senhaTemp}
        onConcluir={() => setSenhaTemp(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      {erro && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {ehContaPropria ? (
        <p className="text-sm text-muted-foreground">
          Esta é a sua conta. Para trocar sua senha, use <strong className="text-foreground">Minha conta</strong>;
          você não pode desativar a si mesmo.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {conta.ativo ? (
            <Button variant="destructive" size="sm" disabled={ocupado} onClick={() => alterarStatus("desativar")}>
              <UserX className="h-4 w-4" />
              {status.isPending ? "Desativando..." : "Desativar conta"}
            </Button>
          ) : (
            <Button variant="default" size="sm" disabled={ocupado} onClick={() => alterarStatus("ativar")}>
              <UserCheck className="h-4 w-4" />
              {status.isPending ? "Reativando..." : "Reativar conta"}
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={ocupado} onClick={redefinirSenha}>
            <KeyRound className="h-4 w-4" />
            {redefinir.isPending ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </div>
      )}
    </div>
  );
}
