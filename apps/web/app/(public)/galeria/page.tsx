import type { Metadata } from "next";
import { siteConfig } from "@/shared/lib/config";
import { SectionTitle } from "../_components/section-title";
import { GaleriaGrid } from "./_components/galeria-grid";
import galeriaData from "@/content/galeria.json";
import type { FotoGaleria } from "@/shared/types/content";

const fotos = galeriaData.fotos as FotoGaleria[];

export const metadata: Metadata = {
  title: "Galeria de fotos",
  description: `Veja fotos dos treinos, jogos e bastidores da ${siteConfig.name}.`,
};

export default function GaleriaPage() {
  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Galeria
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-wide md:text-6xl">
            A escola em fotos
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80 md:text-lg">
            Treinos, jogos, conquistas e bastidores. Acompanhe o dia a dia da
            Real TPM.
          </p>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <SectionTitle
          eyebrow={`${fotos.length} fotos`}
          title="Todas as fotos"
          description="Clique em qualquer foto para ampliar. Use as setas para navegar."
        />
        <div className="mt-10">
          <GaleriaGrid fotos={fotos} />
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Quer ver mais? Acompanhe nosso{" "}
          <a
            href={siteConfig.redes.instagram ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline-offset-4 hover:underline"
          >
            Instagram
          </a>
          .
        </p>
      </section>
    </>
  );
}
