import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Trophy, HeartHandshake, Target, ShieldCheck } from "lucide-react";
import { siteConfig } from "@/shared/lib/config";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "./_components/section-title";
import { CategoriaCard } from "./_components/categoria-card";
import categoriasData from "@/content/categorias.json";
import galeriaData from "@/content/galeria.json";
import type { Categoria, FotoGaleria } from "@/shared/types/content";

const categorias = categoriasData.categorias as Categoria[];
const galeria = galeriaData.fotos as FotoGaleria[];

// SSG: nada de cookies/headers nesta página → Next 15 gera estático no build.
export default function HomePage() {
  // Categorias em destaque: as 3 primeiras do JSON (Sub-7, Sub-9, Sub-12).
  // Faixa etária menor tem maior interesse no funil de matrícula.
  const categoriasDestaque = categorias.slice(0, 3);
  // Galeria preview: 4 primeiras fotos. Em /galeria mostramos todas.
  const galeriaPreview = galeria.slice(0, 4);

  return (
    <>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section
        className="relative isolate overflow-hidden bg-primary text-primary-foreground"
        aria-labelledby="hero-title"
      >
        {/* Imagem de fundo desfocada — campo de futebol */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1920&q=70"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary" />
        </div>

        <div className="container py-20 md:py-32 max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Academia de Futebol — desde {siteConfig.fundacao}
          </p>
          <h1
            id="hero-title"
            className="mt-4 font-display text-5xl tracking-wide md:text-7xl lg:text-8xl"
          >
            {siteConfig.name}
          </h1>
          <p className="mt-3 font-display text-2xl text-accent md:text-3xl">
            {siteConfig.slogan}
          </p>
          <p className="mt-6 max-w-xl text-base text-primary-foreground/80 md:text-lg">
            Formação de atletas e cidadãos em {siteConfig.cidade} / {siteConfig.uf}.
            Categorias da Sub-7 à Sub-16, com ambiente seguro, técnicos formados
            e foco em desenvolvimento técnico e humano.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/categorias">
                Matricule seu filho
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/sobre">Conheça a escola</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ───────────────────── VALORES (3 pilares) ───────────────────── */}
      <section className="container py-16 md:py-24">
        <SectionTitle
          eyebrow="Nossa proposta"
          title="Mais que futebol, formação de gente boa"
          description="Trabalhamos em três frentes que andam juntas — técnica, disciplina e socialização."
          align="center"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Target,
              titulo: "Técnica de qualidade",
              texto:
                "Treinamentos estruturados com progressão por faixa etária. Fundamentos, tática e jogo aplicado.",
            },
            {
              icon: HeartHandshake,
              titulo: "Disciplina e respeito",
              texto:
                "Valorizamos o esforço, o respeito ao colega e ao adversário. Futebol como ferramenta de educação.",
            },
            {
              icon: Trophy,
              titulo: "Competição saudável",
              texto:
                "Participação em torneios regionais. O resultado importa, mas o desenvolvimento vem antes.",
            },
          ].map(({ icon: Icon, titulo, texto }) => (
            <div
              key={titulo}
              className="rounded-lg border border-border bg-card p-6 text-center"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-xl tracking-wide text-primary">
                {titulo}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── CATEGORIAS EM DESTAQUE ──────────────── */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionTitle
              eyebrow="Categorias"
              title="Para todas as idades"
              description="Da Sub-7 à Sub-16, cada categoria tem horários e objetivos próprios."
            />
            <Button asChild variant="outline">
              <Link href="/categorias">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {categoriasDestaque.map((c) => (
              <CategoriaCard key={c.id} categoria={c} compact />
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────── GALERIA (preview) ──────────────── */}
      <section className="container py-16 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle
            eyebrow="O dia a dia"
            title="A escola em movimento"
            description="Fotos de treinos, jogos e bastidores."
          />
          <Button asChild variant="outline">
            <Link href="/galeria">
              Ver galeria completa
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          {galeriaPreview.map((foto) => (
            <div
              key={foto.id}
              className="relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              <Image
                src={foto.src}
                alt={foto.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform hover:scale-105"
              />
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── CTA FINAL ──────────────── */}
      <section
        className="relative isolate overflow-hidden bg-primary py-20 text-primary-foreground"
        aria-labelledby="cta-title"
      >
        <div className="container max-w-3xl text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-accent" />
          <h2
            id="cta-title"
            className="mt-4 font-display text-4xl tracking-wide md:text-5xl"
          >
            Pronto pra fazer parte da{" "}
            <span className="text-accent">Real TPM</span>?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Vagas abertas para Sub-7 a Sub-14. Agende uma aula experimental
            gratuita e conheça nossa estrutura.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href="/contato">
                Agendar aula experimental
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <a
                href={`https://wa.me/${siteConfig.contato.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp direto
              </a>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
