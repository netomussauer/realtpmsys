import { Clock, Users, BadgeCheck } from "lucide-react";
import type { Categoria } from "@/shared/types/content";
import { cn } from "@/shared/lib/utils";

const vagasStyle: Record<Categoria["vagas"], string> = {
  Disponíveis: "bg-accent/15 text-accent-foreground border-accent/30",
  Limitadas: "bg-yellow-100 text-yellow-900 border-yellow-200",
  Esgotadas: "bg-destructive/10 text-destructive border-destructive/30",
  "Sob consulta": "bg-muted text-muted-foreground border-border",
};

/**
 * CategoriaCard — card de uma turma/categoria.
 *
 * Usado na Home (preview de 3) e na página /categorias (grid completo).
 * Variant `compact` esconde descrição — útil em grid Home onde economiza
 * altura.
 */
interface CategoriaCardProps {
  categoria: Categoria;
  compact?: boolean;
}

export function CategoriaCard({ categoria, compact = false }: CategoriaCardProps) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 transition-shadow hover:shadow-md">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-2xl tracking-wide text-primary">
            {categoria.nome}
          </h3>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
            {categoria.faixa_etaria}
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            vagasStyle[categoria.vagas],
          )}
        >
          {categoria.vagas}
        </span>
      </header>

      {!compact && (
        <p className="text-sm text-muted-foreground line-clamp-3">
          {categoria.descricao}
        </p>
      )}

      <dl className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <Clock className="h-4 w-4 text-accent shrink-0" />
          <dt className="sr-only">Horário</dt>
          <dd>{categoria.dias_horarios}</dd>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <Users className="h-4 w-4 text-accent shrink-0" />
          <dt className="sr-only">Faixa etária</dt>
          <dd>{categoria.faixa_etaria}</dd>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <BadgeCheck className="h-4 w-4 text-accent shrink-0" />
          <dt className="sr-only">Mensalidade</dt>
          <dd>
            <span className="text-xs text-muted-foreground">a partir de </span>
            <strong className="text-primary">
              R$ {categoria.valor_mensal.toLocaleString("pt-BR")}
            </strong>
            <span className="text-xs text-muted-foreground">/mês</span>
          </dd>
        </div>
      </dl>
    </article>
  );
}
