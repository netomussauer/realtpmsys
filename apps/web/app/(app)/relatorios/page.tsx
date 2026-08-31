"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { usePermission } from "@/features/auth/hooks/use-permission";
import { TurmaPicker } from "@/features/frequencia/components/turma-picker";
import { InadimplenciaResumoTiles } from "@/features/relatorios/components/inadimplencia-resumo-tiles";
import { InadimplenciaFilterBar } from "@/features/relatorios/components/inadimplencia-filter-bar";
import { InadimplenciaTable } from "@/features/relatorios/components/inadimplencia-table";
import { PeriodoPicker } from "@/features/relatorios/components/periodo-picker";
import { AtletaPicker, type AtletaPickerValue } from "@/features/relatorios/components/atleta-picker";
import { FrequenciaAtletaResult } from "@/features/relatorios/components/frequencia-atleta-result";
import { FrequenciaTurmaTable } from "@/features/relatorios/components/frequencia-turma-table";
import { useInadimplencia } from "@/features/relatorios/hooks/use-inadimplencia";
import { useFrequenciaAtleta } from "@/features/relatorios/hooks/use-frequencia-atleta";
import { useFrequenciaTurma } from "@/features/relatorios/hooks/use-frequencia-turma";
import { isPeriodoValido } from "@/features/relatorios/schemas/periodo.schema";
import type { InadimplenciaFilter, PeriodoFilter } from "@/features/relatorios/types/relatorio.types";

const PERIODO_VAZIO: PeriodoFilter = { data_inicio: "", data_fim: "" };

/**
 * /relatorios — hub com os 3 relatórios read-only do backend (sem CRUD,
 * sem sub-recursos): Inadimplência, Frequência por Atleta e Frequência por
 * Turma.
 *
 * Layout: seções empilhadas com headers e âncoras (não abas) — o design
 * system deste projeto ainda não tem um componente de Tabs pronto, e
 * seções empilhadas evitam ter que construir um do zero só pra esta
 * página (opção mais simples de implementar bem, como orientado).
 *
 * PERMISSÃO DIFERENCIADA DENTRO DA PÁGINA (achado verificado direto em
 * router.go): os 3 relatórios NÃO compartilham a mesma granularidade de
 * acesso.
 *   - Inadimplência (`GET /relatorios/inadimplencia`) — ADMIN only.
 *   - Frequência por Atleta e por Turma — ADMIN + TREINADOR.
 * O middleware já libera TREINADOR na rota /relatorios inteira (só bloqueia
 * RESPONSAVEL), então um TREINADOR chega até aqui normalmente. Sem o
 * `usePermission(["ADMIN"])` abaixo, ele veria a seção de Inadimplência
 * inteira (filtro, tiles, tabela) e o request pra
 * `GET /relatorios/inadimplencia` estouraria 403 — mesmo tipo de bug já
 * encontrado e corrigido nesta sessão em outras features (filtro que o
 * backend ignora/rejeita silenciosamente). Por isso a seção de
 * Inadimplência só é renderizada quando `isAdmin` é true, E `useInadimplencia`
 * recebe `enabled: isAdmin` explicitamente — o hook é chamado
 * incondicionalmente (regra dos hooks), mas só dispara a requisição de
 * fato quando habilitado (achado de code-review: só esconder a seção no
 * JSX não bastava, a query já tinha disparado antes disso ser avaliado).
 *
 * Estado dos 3 relatórios fica local ao componente (mesmo padrão
 * pragmático de /mensalidades e /treinos — sem useSearchParams).
 */
export default function RelatoriosPage() {
  const isAdmin = usePermission(["ADMIN"]);

  // ── Inadimplência (ADMIN only) ──────────────────────────────────────
  const [inadimplenciaFilter, setInadimplenciaFilter] = useState<InadimplenciaFilter>({});
  const inadimplenciaQuery = useInadimplencia(inadimplenciaFilter, isAdmin);

  // ── Frequência por Atleta (ADMIN + TREINADOR) ───────────────────────
  const [atletaSelecionado, setAtletaSelecionado] = useState<AtletaPickerValue | null>(null);
  const [periodoAtleta, setPeriodoAtleta] = useState<PeriodoFilter>(PERIODO_VAZIO);
  const frequenciaAtletaQuery = useFrequenciaAtleta(atletaSelecionado?.id, periodoAtleta);

  // ── Frequência por Turma (ADMIN + TREINADOR) ────────────────────────
  const [turmaId, setTurmaId] = useState<string | undefined>(undefined);
  const [periodoTurma, setPeriodoTurma] = useState<PeriodoFilter>(PERIODO_VAZIO);
  const frequenciaTurmaQuery = useFrequenciaTurma(turmaId, periodoTurma);

  const periodoAtletaValido = isPeriodoValido(periodoAtleta);
  const periodoTurmaValido = isPeriodoValido(periodoTurma);

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <div>
          <h1 className="font-display text-3xl text-primary tracking-wide">Relatórios</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Inadimplência e frequência das turmas e atletas."
              : "Frequência das turmas e atletas."}
          </p>
        </div>
        <nav aria-label="Seções deste relatório" className="flex flex-wrap gap-3 text-sm">
          {isAdmin && (
            <a href="#inadimplencia" className="text-primary underline-offset-4 hover:underline">
              Inadimplência
            </a>
          )}
          <a href="#frequencia-atleta" className="text-primary underline-offset-4 hover:underline">
            Frequência por atleta
          </a>
          <a href="#frequencia-turma" className="text-primary underline-offset-4 hover:underline">
            Frequência por turma
          </a>
        </nav>
      </header>

      {isAdmin && (
        <section id="inadimplencia" aria-labelledby="inadimplencia-heading" className="space-y-4">
          <div>
            <h2 id="inadimplencia-heading" className="font-display text-xl text-primary">
              Inadimplência
            </h2>
            <p className="text-sm text-muted-foreground">
              Mensalidades pendentes ou vencidas, por competência.
            </p>
          </div>

          <InadimplenciaResumoTiles
            resumo={inadimplenciaQuery.data?.resumo}
            isLoading={inadimplenciaQuery.isLoading}
          />

          <InadimplenciaFilterBar value={inadimplenciaFilter} onChange={setInadimplenciaFilter} />

          {inadimplenciaQuery.isError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{(inadimplenciaQuery.error as Error).message}</span>
            </div>
          )}

          <InadimplenciaTable
            itens={inadimplenciaQuery.data?.data ?? []}
            isLoading={inadimplenciaQuery.isLoading || inadimplenciaQuery.isFetching}
          />
        </section>
      )}

      <section
        id="frequencia-atleta"
        aria-labelledby="frequencia-atleta-heading"
        className="space-y-4"
      >
        <div>
          <h2 id="frequencia-atleta-heading" className="font-display text-xl text-primary">
            Frequência por atleta
          </h2>
          <p className="text-sm text-muted-foreground">
            Presenças, faltas e taxa de presença de um atleta num período.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-end">
          <AtletaPicker value={atletaSelecionado} onChange={setAtletaSelecionado} />
        </div>

        <PeriodoPicker value={periodoAtleta} onChange={setPeriodoAtleta} />

        {!atletaSelecionado && (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <p className="font-display text-xl text-primary">Selecione um atleta</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Busque um atleta e informe o período para ver a frequência.
            </p>
          </div>
        )}

        {atletaSelecionado && !periodoAtletaValido && (
          <p className="text-sm text-muted-foreground">
            Informe a data inicial e final acima para ver o resultado.
          </p>
        )}

        {atletaSelecionado && frequenciaAtletaQuery.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{(frequenciaAtletaQuery.error as Error).message}</span>
          </div>
        )}

        {atletaSelecionado && (
          <FrequenciaAtletaResult
            resultado={frequenciaAtletaQuery.data}
            isLoading={frequenciaAtletaQuery.isLoading || frequenciaAtletaQuery.isFetching}
          />
        )}
      </section>

      <section
        id="frequencia-turma"
        aria-labelledby="frequencia-turma-heading"
        className="space-y-4"
      >
        <div>
          <h2 id="frequencia-turma-heading" className="font-display text-xl text-primary">
            Frequência por turma
          </h2>
          <p className="text-sm text-muted-foreground">
            Frequência consolidada de todos os atletas de uma turma num período.
          </p>
        </div>

        <TurmaPicker value={turmaId} onChange={setTurmaId} />

        <PeriodoPicker value={periodoTurma} onChange={setPeriodoTurma} />

        {!turmaId && (
          <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <p className="font-display text-xl text-primary">Selecione uma turma</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha uma turma e informe o período para ver a frequência consolidada.
            </p>
          </div>
        )}

        {turmaId && !periodoTurmaValido && (
          <p className="text-sm text-muted-foreground">
            Informe a data inicial e final acima para ver o resultado.
          </p>
        )}

        {turmaId && frequenciaTurmaQuery.isError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{(frequenciaTurmaQuery.error as Error).message}</span>
          </div>
        )}

        {turmaId && (
          <FrequenciaTurmaTable
            resultado={frequenciaTurmaQuery.data}
            isLoading={frequenciaTurmaQuery.isLoading || frequenciaTurmaQuery.isFetching}
          />
        )}
      </section>
    </div>
  );
}
