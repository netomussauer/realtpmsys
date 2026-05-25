import type { Metadata } from "next";
import { Calendar, MapPin, Users } from "lucide-react";
import { siteConfig } from "@/shared/lib/config";
import { SectionTitle } from "../_components/section-title";
import competicoesData from "@/content/competicoes.json";
import type { Competicao } from "@/shared/types/content";

const eventos = competicoesData.eventos as Competicao[];

export const metadata: Metadata = {
  title: "Competições e calendário",
  description: `Calendário de competições e torneios da ${siteConfig.name} em ${siteConfig.cidade}/${siteConfig.uf}.`,
};

const statusLabel: Record<Competicao["status"], string> = {
  previsto: "Previsto",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

const statusStyle: Record<Competicao["status"], string> = {
  previsto: "bg-accent/15 text-accent-foreground border-accent/30",
  em_andamento: "bg-green-100 text-green-900 border-green-200",
  concluido: "bg-muted text-muted-foreground border-border",
};

function formatarData(iso: string, dataFim?: string): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  if (!dataFim) return fmt.format(new Date(iso + "T12:00:00"));
  const inicio = new Date(iso + "T12:00:00");
  const fim = new Date(dataFim + "T12:00:00");
  return `${fmt.format(inicio)} a ${fmt.format(fim)}`;
}

export default function CompeticoesPage() {
  // Ordena por data de início (ASC) — eventos futuros primeiro.
  const ordenados = [...eventos].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Calendário
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-wide md:text-6xl">
            Competições e torneios
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80 md:text-lg">
            Os principais eventos da temporada da Real TPM. Mantenha-se por
            dentro dos próximos compromissos dos atletas.
          </p>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <SectionTitle
          eyebrow="Temporada 2026"
          title="Próximos eventos"
          description="Calendário em formação. Eventos podem sofrer alterações de data e local."
        />

        {ordenados.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-border bg-muted/40 p-12 text-center">
            <Calendar className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-display text-xl text-primary">
              Calendário em preparação
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Estamos finalizando a programação 2026. Volte em breve.
            </p>
          </div>
        ) : (
          <div className="mt-12 space-y-4">
            {ordenados.map((ev) => (
              <article
                key={ev.id}
                className="grid gap-4 rounded-lg border border-border bg-card p-6 md:grid-cols-[auto_1fr_auto] md:items-center"
              >
                {/* Coluna 1 — data destacada */}
                <div className="flex flex-col items-center justify-center rounded-md bg-primary px-4 py-3 text-center text-primary-foreground md:min-w-[120px]">
                  <span className="text-xs uppercase tracking-widest text-accent">
                    {new Date(ev.data + "T12:00:00").toLocaleDateString("pt-BR", {
                      month: "short",
                    })}
                  </span>
                  <span className="font-display text-3xl tracking-wide">
                    {new Date(ev.data + "T12:00:00").getDate()}
                  </span>
                  <span className="text-xs opacity-60">
                    {new Date(ev.data + "T12:00:00").getFullYear()}
                  </span>
                </div>

                {/* Coluna 2 — conteúdo */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-2xl text-primary tracking-wide">
                      {ev.titulo}
                    </h2>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusStyle[ev.status]}`}
                    >
                      {statusLabel[ev.status]}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{ev.descricao}</p>
                  <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <dt className="sr-only">Data</dt>
                      <dd>{formatarData(ev.data, ev.data_fim)}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <dt className="sr-only">Local</dt>
                      <dd>{ev.local}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 shrink-0" />
                      <dt className="sr-only">Categorias</dt>
                      <dd>{ev.categorias.join(", ")}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mt-12 text-center text-xs text-muted-foreground">
          As datas e locais podem sofrer ajustes. Confirme com a coordenação
          antes de cada evento.
        </p>
      </section>
    </>
  );
}
