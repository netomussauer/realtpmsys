import type { Metadata } from "next";
import Image from "next/image";
import { Target, Heart, Award } from "lucide-react";
import { siteConfig } from "@/shared/lib/config";
import { SectionTitle } from "../_components/section-title";

export const metadata: Metadata = {
  title: "Sobre a Academia",
  description: `Conheça a história da ${siteConfig.name}, fundada em ${siteConfig.fundacao} em ${siteConfig.cidade}/${siteConfig.uf}.`,
};

export default function SobrePage() {
  return (
    <>
      {/* Header da página */}
      <section className="bg-primary text-primary-foreground">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Sobre nós
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-wide md:text-6xl">
            Uma escola, um propósito
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80 md:text-lg">
            Conheça a história, a missão e os valores da {siteConfig.name}.
          </p>
        </div>
      </section>

      {/* História */}
      <section className="container py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <SectionTitle eyebrow="Nossa história" title="Desde 2023 na Baixada" />
            <div className="mt-6 space-y-4 text-foreground/80">
              <p>
                A <strong className="text-foreground">{siteConfig.name}</strong>{" "}
                nasceu em {siteConfig.fundacao}, em {siteConfig.cidade}, com a
                missão de oferecer uma estrutura séria de formação esportiva
                acessível à comunidade da Baixada Fluminense.
              </p>
              <p>
                Em poucos anos, consolidamos categorias da Sub-7 à Sub-16,
                participação em torneios regionais e uma comissão técnica
                composta por profissionais formados em educação física e com
                experiência em divisões de base.
              </p>
              <p>
                Mais do que formar atletas, nosso compromisso é com a formação
                de pessoas — disciplina, respeito e trabalho em equipe são
                valores que carregamos para dentro e fora do campo.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            <Image
              src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1200&q=80"
              alt="Treinador conversando com atletas em treino"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Missão, Visão, Valores */}
      <section className="bg-muted/40 py-16 md:py-24">
        <div className="container">
          <SectionTitle
            eyebrow="O que nos move"
            title="Missão, visão e valores"
            align="center"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Target,
                titulo: "Missão",
                texto:
                  "Formar atletas e cidadãos por meio do futebol, oferecendo treinamento técnico de qualidade num ambiente acolhedor e disciplinado.",
              },
              {
                icon: Heart,
                titulo: "Visão",
                texto:
                  "Ser referência em formação esportiva de base na Baixada Fluminense até 2030, com atletas reconhecidos em divisões de base de clubes profissionais.",
              },
              {
                icon: Award,
                titulo: "Valores",
                texto:
                  "Respeito, disciplina, trabalho em equipe, superação e ética. Valorizamos o esforço acima do talento, e o coletivo acima do individual.",
              },
            ].map(({ icon: Icon, titulo, texto }) => (
              <div
                key={titulo}
                className="rounded-lg bg-card p-8 border border-border"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-2xl tracking-wide text-primary">
                  {titulo}
                </h3>
                <p className="mt-3 text-sm text-foreground/80">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comissão técnica (placeholder) */}
      <section className="container py-16 md:py-24">
        <SectionTitle
          eyebrow="Quem está com a gente"
          title="Comissão técnica"
          description="Profissionais formados, capacitados e apaixonados pelo que fazem."
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* TODO: substituir por dados reais quando disponíveis. */}
          {[
            { nome: "Aguardando cadastro", funcao: "Coordenador Técnico" },
            { nome: "Aguardando cadastro", funcao: "Preparador Físico" },
            { nome: "Aguardando cadastro", funcao: "Técnico Sub-12 / Sub-14" },
          ].map((membro, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6 text-center"
            >
              <div className="mx-auto h-20 w-20 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs uppercase">
                Foto
              </div>
              <h3 className="mt-4 font-display text-lg text-primary">
                {membro.nome}
              </h3>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {membro.funcao}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
