"use client";

import Link from "next/link";
import { use, useState } from "react";
import { ChevronLeft, Pencil, AlertCircle, Clock, Plus, Calendar } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/features/turmas/components/status-badge";
import { StatusActions } from "@/features/turmas/components/status-actions";
import { MatriculaTable } from "@/features/turmas/components/matricula-table";
import { MatriculaForm } from "@/features/turmas/components/matricula-form";
import { useTurma } from "@/features/turmas/hooks/use-turma";
import { useMatriculas } from "@/features/turmas/hooks/use-matriculas";
import { useMatricularAtleta } from "@/features/turmas/hooks/use-mutations";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { MatriculaFormData } from "@/features/turmas/schemas/matricula.schema";

const DIA_LABELS: Record<string, string> = {
  SEG: "Segunda",
  TER: "Terça",
  QUA: "Quarta",
  QUI: "Quinta",
  SEX: "Sexta",
  SAB: "Sábado",
  DOM: "Domingo",
};

/**
 * /turmas/[id] — detalhe da turma.
 *
 * Next 15: `params` agora é Promise<{id}> — usar `use()` para resolver
 * em Client Components (sem `await` direto, que só funciona em Server).
 *
 * "Vagas disponíveis": o backend não expõe esse campo no TurmaResponse
 * (diferente do que o openapi.yaml desatualizado documenta). Como a página
 * já busca as matrículas ATIVAS da turma pra exibir a lista, calculamos
 * `capacidade_max - total de matrículas ATIVAS` client-side usando o
 * `pagination.total` de uma query dedicada (per_page=1, só pra ler o
 * total sem baixar a lista inteira duas vezes).
 */
export default function TurmaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const canManage = usePermission(["ADMIN"]);

  const [showMatriculaForm, setShowMatriculaForm] = useState(false);
  const [matriculaError, setMatriculaError] = useState<string | null>(null);
  const [matriculaPage, setMatriculaPage] = useState(1);

  const turmaQuery = useTurma(id);
  const matriculasQuery = useMatriculas(id, { page: matriculaPage, per_page: 20 });
  const ativasQuery = useMatriculas(id, { status: "ATIVA", per_page: 1 });
  const matricular = useMatricularAtleta(id);

  if (turmaQuery.isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
      </div>
    );
  }

  if (turmaQuery.isError || !turmaQuery.data) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        Turma não encontrada ou erro ao carregar.
        {turmaQuery.error && (
          <p className="mt-1 text-xs">{(turmaQuery.error as Error).message}</p>
        )}
      </div>
    );
  }

  const t = turmaQuery.data;
  const vagasOcupadas = ativasQuery.data?.pagination.total;
  const vagasDisponiveis =
    vagasOcupadas !== undefined ? Math.max(0, t.capacidade_max - vagasOcupadas) : undefined;
  const vagasLabel =
    vagasDisponiveis === undefined
      ? undefined
      : vagasDisponiveis === 1
        ? "1 vaga disponível"
        : `${vagasDisponiveis} vagas disponíveis`;

  const onSubmitMatricula = async (data: MatriculaFormData) => {
    setMatriculaError(null);
    try {
      await matricular.mutateAsync(data);
      setShowMatriculaForm(false);
    } catch (e) {
      setMatriculaError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        href="/turmas"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para a lista
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl text-primary tracking-wide">
              {t.nome}
            </h1>
            <StatusBadge status={t.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Faixa etária {t.faixa_etaria_min}–{t.faixa_etaria_max} anos · Capacidade{" "}
            {t.capacidade_max}
            {vagasLabel && ` · ${vagasLabel}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/treinos?turma_id=${t.id}`}>
              <Calendar className="h-4 w-4" />
              Ver treinos
            </Link>
          </Button>
          {canManage && (
            <Button asChild variant="outline">
              <Link href={`/turmas/${t.id}/editar`}>
                <Pencil className="h-4 w-4" />
                Editar
              </Link>
            </Button>
          )}
        </div>
      </div>

      {canManage && <StatusActions turmaId={t.id} statusAtual={t.status} />}

      {/* Horários */}
      <Card title="Horários">
        {t.horarios.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum horário cadastrado.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {t.horarios.map((h) => (
              <li
                key={h.id}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm"
              >
                <Clock className="h-4 w-4 text-accent shrink-0" />
                <span>
                  {DIA_LABELS[h.dia_semana] ?? h.dia_semana} · {h.hora_inicio}–{h.hora_fim}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Matrículas */}
      <section className="rounded-lg border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-primary tracking-wide">Matrículas</h2>
          {canManage && !showMatriculaForm && (
            <Button variant="default" size="sm" onClick={() => setShowMatriculaForm(true)}>
              <Plus className="h-4 w-4" />
              Matricular atleta
            </Button>
          )}
        </div>

        {canManage && showMatriculaForm && (
          <div className="mt-4 rounded-md border border-border bg-muted/20 p-4">
            <MatriculaForm
              serverError={matriculaError}
              isSubmitting={matricular.isPending}
              onSubmit={onSubmitMatricula}
              onCancel={() => {
                setShowMatriculaForm(false);
                setMatriculaError(null);
              }}
            />
          </div>
        )}

        <div className="mt-4">
          <MatriculaTable
            turmaId={t.id}
            matriculas={matriculasQuery.data?.data ?? []}
            pagination={matriculasQuery.data?.pagination ?? { total: 0, page: 1, per_page: 20 }}
            onPageChange={setMatriculaPage}
            isLoading={matriculasQuery.isLoading}
          />
        </div>
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers (locais — não promovidos a shared porque são específicos da page)
// ─────────────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <h2 className="font-display text-xl text-primary tracking-wide">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
