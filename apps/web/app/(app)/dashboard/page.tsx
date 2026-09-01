"use client";

import { AlertCircle } from "lucide-react";
import { usePermission } from "@/features/auth/hooks/use-permission";
import { useAtletas } from "@/features/atletas/hooks/use-atletas";
import { useTurmas } from "@/features/turmas/hooks/use-turmas";
import { useInadimplencia } from "@/features/relatorios/hooks/use-inadimplencia";
import { useMensalidades } from "@/features/financeiro/hooks/use-mensalidades";
import { formatCurrencyBRL } from "@/shared/lib/format";
import { cn } from "@/shared/lib/utils";

/**
 * /dashboard — Fase 4: KPIs reais por perfil, todos consumidos de hooks e
 * endpoints já existentes (nenhum service/hook novo, nenhuma mudança de
 * backend). Conjunto de cards varia por perfil porque o backend em si
 * restringe o acesso por endpoint (verificado em router.go):
 *   - `GET /atletas` e `GET /turmas` (list) → ADMIN, TREINADOR.
 *   - `GET /relatorios/inadimplencia` → ADMIN only.
 *   - `GET /mensalidades` (list) → ADMIN, RESPONSAVEL (RESPONSAVEL recebe
 *     automaticamente só as mensalidades dos atletas vinculados a ele,
 *     filtrado server-side — nenhum parâmetro extra necessário aqui).
 *
 * Mesmo padrão de gating de app/(app)/relatorios/page.tsx: cada hook cujo
 * endpoint não é liberado pra todo perfil recebe `enabled` explícito, além
 * do card só ser renderizado quando o perfil bate — só esconder no JSX não
 * basta, a query já teria disparado e estourado 403 antes disso.
 *
 * `per_page: 1` nas listagens de atletas/turmas mantém o payload mínimo:
 * só precisamos de `pagination.total`, não dos itens.
 */
export default function DashboardPage() {
  const isAdmin = usePermission(["ADMIN"]);
  const isTreinador = usePermission(["TREINADOR"]);
  const isResponsavel = usePermission(["RESPONSAVEL"]);

  const canSeeOperacao = isAdmin || isTreinador;

  const now = new Date();
  const competenciaAno = now.getFullYear();
  const competenciaMes = now.getMonth() + 1;

  const atletasQuery = useAtletas({ status: "ATIVO", per_page: 1 }, canSeeOperacao);
  const turmasQuery = useTurmas({ status: "ATIVA", per_page: 1 }, canSeeOperacao);
  const inadimplenciaQuery = useInadimplencia(
    { competencia_ano: competenciaAno, competencia_mes: competenciaMes },
    isAdmin,
  );
  // per_page:100 (o teto real aceito pelo backend — acima disso ele reseta
  // pra 20, vide normalizePagination em mensalidade_repository.go) porque o
  // `resumo` (total_pendente/total_vencido) NÃO é uma agregação separada:
  // MensalidadeHandler.List soma só a página retornada (CalcularResumo
  // sobre o slice já limitado pelo LIMIT), então per_page:1 mostraria o
  // valor de uma única mensalidade em vez do total real sempre que o
  // responsável tiver mais de uma em aberto. 100 cobre o caso real (um
  // responsável tem poucos atletas vinculados) sem paginar no dashboard.
  const mensalidadesQuery = useMensalidades({ per_page: 100 }, isResponsavel);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-primary tracking-wide">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">Visão geral da operação.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {canSeeOperacao && (
          <>
            <StatTile
              label="Atletas ativos"
              isLoading={atletasQuery.isLoading}
              isError={atletasQuery.isError}
              value={atletasQuery.data?.pagination.total}
            />
            <StatTile
              label="Turmas em andamento"
              isLoading={turmasQuery.isLoading}
              isError={turmasQuery.isError}
              value={turmasQuery.data?.pagination.total}
            />
          </>
        )}

        {isAdmin && (
          <StatTile
            label="Inadimplência do mês"
            isLoading={inadimplenciaQuery.isLoading}
            isError={inadimplenciaQuery.isError}
            value={
              inadimplenciaQuery.data
                ? formatCurrencyBRL(inadimplenciaQuery.data.resumo.total_devido)
                : undefined
            }
          />
        )}

        {isResponsavel && (
          <>
            <StatTile
              label="Mensalidades pendentes"
              isLoading={mensalidadesQuery.isLoading}
              isError={mensalidadesQuery.isError}
              value={
                mensalidadesQuery.data
                  ? formatCurrencyBRL(mensalidadesQuery.data.resumo.total_pendente)
                  : undefined
              }
            />
            <StatTile
              label="Mensalidades vencidas"
              isLoading={mensalidadesQuery.isLoading}
              isError={mensalidadesQuery.isError}
              value={
                mensalidadesQuery.data
                  ? formatCurrencyBRL(mensalidadesQuery.data.resumo.total_vencido)
                  : undefined
              }
              valueClassName="text-destructive"
            />
          </>
        )}
      </div>
    </div>
  );
}

interface StatTileProps {
  label: string;
  isLoading: boolean;
  isError: boolean;
  value: string | number | undefined;
  valueClassName?: string;
}

function StatTile({ label, isLoading, isError, value, valueClassName }: StatTileProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>

      {isError ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Erro ao carregar
        </p>
      ) : (
        <p className={cn("mt-2 text-3xl font-display text-primary", valueClassName)}>
          {isLoading || value === undefined ? "–" : value}
        </p>
      )}
    </div>
  );
}
