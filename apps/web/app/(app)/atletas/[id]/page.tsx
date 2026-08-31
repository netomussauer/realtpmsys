"use client";

import Link from "next/link";
import { use } from "react";
import {
  ChevronLeft,
  Pencil,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Shirt,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatDateBR } from "@/shared/lib/format";
import { StatusBadge } from "@/features/atletas/components/status-badge";
import { StatusActions } from "@/features/atletas/components/status-actions";
import {
  useAtleta,
  useResponsaveisDoAtleta,
  useUniformeDoAtleta,
} from "@/features/atletas/hooks/use-atleta";

/**
 * /atletas/[id] — detalhe do atleta.
 *
 * Next 15: `params` agora é Promise<{id}> — usar `use()` para resolver
 * em Client Components (sem `await` direto, que só funciona em Server).
 */
export default function AtletaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const atletaQuery = useAtleta(id);
  const responsaveisQuery = useResponsaveisDoAtleta(id);
  const uniformeQuery = useUniformeDoAtleta(id);

  if (atletaQuery.isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
      </div>
    );
  }

  if (atletaQuery.isError || !atletaQuery.data) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        Atleta não encontrado ou erro ao carregar.
        {atletaQuery.error && (
          <p className="mt-1 text-xs">{(atletaQuery.error as Error).message}</p>
        )}
      </div>
    );
  }

  const a = atletaQuery.data;
  const responsaveis = responsaveisQuery.data?.data ?? [];
  const uniforme = uniformeQuery.data;

  return (
    <div className="space-y-6">
      <Link
        href="/atletas"
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
              {a.nome}
            </h1>
            <StatusBadge status={a.status} />
          </div>
          <p className="text-sm text-muted-foreground">{a.idade} anos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/atletas/${a.id}/editar`}>
              <Pencil className="h-4 w-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <StatusActions atletaId={a.id} statusAtual={a.status} />

      {/* Dados pessoais */}
      <Card title="Dados pessoais">
        <DetailGrid>
          <DetailItem icon={Calendar} label="Nascimento" value={formatDateBR(a.data_nascimento)} />
          <DetailItem icon={CreditCard} label="CPF" value={a.cpf ?? "—"} />
          <DetailItem icon={CreditCard} label="RG" value={a.rg ?? "—"} />
          <DetailItem icon={Phone} label="Telefone" value={a.telefone ?? "—"} />
          <DetailItem icon={Mail} label="Email" value={a.email ?? "—"} />
          <DetailItem
            icon={MapPin}
            label="Endereço"
            value={[a.endereco, a.cidade, a.uf, a.cep].filter(Boolean).join(", ") || "—"}
            wide
          />
        </DetailGrid>
      </Card>

      {/* Responsáveis */}
      <Card title="Responsáveis">
        {responsaveisQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando responsáveis...</p>
        ) : responsaveis.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum responsável cadastrado.
          </p>
        ) : (
          <ul className="space-y-3">
            {responsaveis.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 p-3"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {r.nome}
                    {r.contato_principal && (
                      <span className="ml-2 inline-flex items-center rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
                        Principal
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {r.parentesco.toLowerCase()}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span><Phone className="inline h-3 w-3 mr-1" />{r.telefone}</span>
                    {r.email && (
                      <span><Mail className="inline h-3 w-3 mr-1" />{r.email}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Uniforme */}
      <Card title="Uniforme">
        {uniformeQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : !uniforme ? (
          <p className="text-sm text-muted-foreground">
            <Shirt className="inline h-4 w-4 mr-1" />
            Sem uniforme cadastrado.
          </p>
        ) : (
          <DetailGrid>
            <DetailItem icon={Shirt} label="Camisa" value={uniforme.tam_camisa} />
            <DetailItem icon={Shirt} label="Short" value={uniforme.tam_short} />
            <DetailItem icon={Shirt} label="Chuteira" value={uniforme.tam_chuteira} />
          </DetailGrid>
        )}
      </Card>
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

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">{children}</div>;
}

function DetailItem({
  icon: Icon,
  label,
  value,
  wide,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2 md:col-span-3" : ""}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-sm text-foreground">
        <Icon className="h-4 w-4 text-accent shrink-0" />
        {value}
      </p>
    </div>
  );
}
