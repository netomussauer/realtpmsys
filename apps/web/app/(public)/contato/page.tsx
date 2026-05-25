import type { Metadata } from "next";
import { Mail, Phone, MapPin, Instagram, MessageCircle } from "lucide-react";
import { siteConfig } from "@/shared/lib/config";
import { SectionTitle } from "../_components/section-title";
import { ContatoForm } from "./_components/contato-form";

export const metadata: Metadata = {
  title: "Contato",
  description: `Entre em contato com a ${siteConfig.name}. WhatsApp, email, telefone e endereço em ${siteConfig.cidade}/${siteConfig.uf}.`,
};

export default function ContatoPage() {
  // Tira não-dígitos pra montar links tel: e wa.me
  const telDigits = siteConfig.contato.telefone.replace(/\D/g, "");
  const waDigits = siteConfig.contato.whatsapp.replace(/\D/g, "");
  const waMessage = encodeURIComponent(
    "Olá, vim pelo site e gostaria de mais informações.",
  );

  return (
    <>
      <section className="bg-primary text-primary-foreground">
        <div className="container py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Contato
          </p>
          <h1 className="mt-3 font-display text-5xl tracking-wide md:text-6xl">
            Fale com a gente
          </h1>
          <p className="mt-4 max-w-2xl text-primary-foreground/80 md:text-lg">
            WhatsApp, email ou venha visitar a estrutura. Vamos adorar te
            receber.
          </p>
        </div>
      </section>

      <section className="container py-16 md:py-24">
        <div className="grid gap-12 lg:grid-cols-2">
          {/* Coluna esquerda — canais diretos */}
          <div>
            <SectionTitle eyebrow="Canais diretos" title="Fale agora" />
            <div className="mt-8 space-y-4">
              {/* WhatsApp — destaque */}
              <a
                href={`https://wa.me/${waDigits}?text=${waMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 rounded-lg border-2 border-accent bg-accent/10 p-5 transition-colors hover:bg-accent/20"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <MessageCircle className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg tracking-wide text-primary">
                    WhatsApp
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Resposta mais rápida — {siteConfig.contato.whatsapp}
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-accent">
                  Recomendado
                </span>
              </a>

              {/* Email */}
              <a
                href={`mailto:${siteConfig.contato.email}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <Mail className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg tracking-wide text-primary">
                    Email
                  </p>
                  <p className="text-sm text-muted-foreground break-all">
                    {siteConfig.contato.email}
                  </p>
                </div>
              </a>

              {/* Telefone */}
              <a
                href={`tel:${telDigits}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <Phone className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg tracking-wide text-primary">
                    Telefone
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {siteConfig.contato.telefone}
                  </p>
                </div>
              </a>

              {/* Instagram */}
              {siteConfig.redes.instagram && (
                <a
                  href={siteConfig.redes.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                    <Instagram className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-lg tracking-wide text-primary">
                      Instagram
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Acompanhe o dia a dia da escola
                    </p>
                  </div>
                </a>
              )}

              {/* Endereço */}
              <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                  <MapPin className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg tracking-wide text-primary">
                    Endereço
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {siteConfig.contato.endereco.logradouro}
                    <br />
                    {siteConfig.contato.endereco.bairro}
                    <br />
                    {siteConfig.contato.endereco.cidade} /{" "}
                    {siteConfig.contato.endereco.uf} —{" "}
                    {siteConfig.contato.endereco.cep}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Coluna direita — formulário */}
          <div>
            <SectionTitle eyebrow="Mensagem" title="Envie pelo site" />
            <p className="mt-2 text-sm text-muted-foreground">
              Preencha o formulário e abriremos seu cliente de email com a
              mensagem pronta pra enviar.
            </p>
            <div className="mt-8">
              <ContatoForm />
            </div>
          </div>
        </div>
      </section>

      {/* Mapa */}
      <section className="bg-muted/40 py-16">
        <div className="container">
          <SectionTitle
            eyebrow="Como chegar"
            title="Nossa localização"
            description={`${siteConfig.contato.endereco.logradouro}, ${siteConfig.contato.endereco.bairro} — ${siteConfig.cidade}/${siteConfig.uf}.`}
          />
          <div className="mt-8 overflow-hidden rounded-lg border border-border">
            <iframe
              src={siteConfig.contato.mapaEmbedSrc}
              width="100%"
              height="450"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Localização da ${siteConfig.name}`}
              aria-label={`Mapa interativo mostrando a localização da ${siteConfig.name}`}
            />
          </div>
        </div>
      </section>
    </>
  );
}
