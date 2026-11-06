"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface SenhaTemporariaBoxProps {
  email: string;
  senha: string;
  /** Texto de contexto, ex.: "Conta criada." ou "Senha redefinida." */
  titulo: string;
  onConcluir: () => void;
  concluirLabel?: string;
}

/**
 * Exibe a senha temporária UMA vez, com botão de copiar.
 *
 * A senha vem direto do resultado da mutation e só existe na memória deste
 * componente: não vai ao cache do TanStack Query, a storage, nem à URL. Ao
 * concluir (ou sair da página) ela se perde — o ADMIN pode gerar outra
 * pela ação "Redefinir senha".
 */
export function SenhaTemporariaBox({
  email,
  senha,
  titulo,
  onConcluir,
  concluirLabel = "Concluir",
}: SenhaTemporariaBoxProps) {
  const [copiada, setCopiada] = useState(false);
  const [erroCopia, setErroCopia] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(senha);
      setCopiada(true);
      setErroCopia(false);
    } catch {
      // Clipboard indisponível (HTTP sem TLS, permissão negada): o usuário
      // ainda pode selecionar e copiar a senha manualmente.
      setErroCopia(true);
    }
  };

  return (
    <section
      aria-labelledby="senha-temp-titulo"
      className="space-y-4 rounded-lg border border-accent/40 bg-accent/10 p-6"
    >
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-accent-foreground" />
        <div>
          <h2 id="senha-temp-titulo" className="font-display text-xl text-primary">
            {titulo}
          </h2>
          <p className="text-sm text-muted-foreground">
            Repasse a senha temporária abaixo a <strong className="text-foreground">{email}</strong>.
            Ela <strong className="text-foreground">não será exibida novamente</strong>; no primeiro
            acesso a pessoa será obrigada a escolher uma senha própria.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <code
          data-testid="senha-temporaria"
          className="select-all rounded-md border border-border bg-background px-3 py-2 font-mono text-base tracking-wider"
        >
          {senha}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copiar}>
          {copiada ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiada ? "Copiada" : "Copiar"}
        </Button>
      </div>
      {erroCopia && (
        <p role="status" className="text-xs text-destructive">
          Não foi possível copiar automaticamente — selecione a senha e copie manualmente.
        </p>
      )}

      <div className="flex justify-end">
        <Button type="button" variant="default" onClick={onConcluir}>
          {concluirLabel}
        </Button>
      </div>
    </section>
  );
}
