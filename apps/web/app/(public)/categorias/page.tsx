import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { siteConfig } from "@/shared/lib/config";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "../_components/section-title";
import { CategoriaCard } from "../_components/categoria-card";
import categoriasData from "@/content/categorias.json";
import type { Categoria } from "@/shared/types/content";

const categorias = categoriasData.categorias as Categoria[];

export const metadata: Metadata = {
  title: "Categorias e turmas",
  description: `Conheça as categorias da Sub-7 à Sub-16 da ${siteConfig.name} em ${siteConfig.cidade}/${siteConfig.uf}. Confira horários, faixa etária e valores.`,
};

export default function CategoriasPage() {
  // Quebra Whatsapp num link pré-preenchido com mensagem de interesse.
  const waMessage = encodeURIComponent(
    "Olá! Tenho interesse em matricular meu filho. Poderia me passar mais informações sobre as turmas disponíveis?",
  );
  const waLink = `https://wa.me/${siteConfig.contato.whatsapp.replace(/\D/g, "")}?text=${waMessage}`;

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Categorias
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-wide md:text-6xl">
            Turmas e horários
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80 md:text-lg">
            Da Sub-7 à Sub-16. Cada categoria tem horário, faixa etária e
            objetivos de desenvolvimento próprios.
          </p>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <SectionTitle
          eyebrow="Escolha a turma do seu filho"
          title="Todas as categorias"
          description="Os valores incluem material de treino e participação em jogos amistosos. Torneios federados podem ter taxa adicional."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {categorias.map((c) => (
            <CategoriaCard key={c.id} categoria={c} />
          ))}
        </div>

        {/* Observação / FAQ rápido */}
        <div className="mt-12 rounded-lg border border-accent/30 bg-accent/5 p-6">
          <h3 className="font-display text-xl text-primary tracking-wide">
            Como funciona a matrícula?
          </h3>
          <ol className="mt-4 space-y-2 text-sm text-foreground/80">
            <li>
              <strong className="text-foreground">1.</strong> Entre em contato
              pelo WhatsApp ou agende uma aula experimental gratuita.
            </li>
            <li>
              <strong className="text-foreground">2.</strong> O atleta participa
              de um treino na categoria correspondente à sua faixa etária.
            </li>
            <li>
              <strong className="text-foreground">3.</strong> Se aprovado pela
              criança e responsável, formalizamos a matrícula com contrato e
              pagamento da primeira mensalidade.
            </li>
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/40 py-16">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-3xl text-primary md:text-4xl">
            Pronto pra começar?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Vagas abertas. Vem treinar com a gente.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg">
              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/contato">
                Outros canais
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
