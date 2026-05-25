/**
 * Placeholder da Fase 2. A Fase 4 vai trazer KPIs reais (atletas ativos,
 * inadimplência do mês, taxa de presença) buscados via TanStack Query.
 */
export default function DashboardPlaceholder() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl text-primary tracking-wide">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Visão geral da operação. Conteúdo será preenchido na Fase 4.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Atletas ativos", value: "–" },
          { label: "Turmas em andamento", value: "–" },
          { label: "Inadimplência do mês", value: "–" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-border bg-card p-6"
          >
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {kpi.label}
            </p>
            <p className="mt-2 text-3xl font-display text-primary">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
