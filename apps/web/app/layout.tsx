import type { Metadata, Viewport } from "next";
import { Inter, Bebas_Neue } from "next/font/google";
import { Providers } from "./providers";
import { siteConfig } from "@/shared/lib/config";
import "./globals.css";

// Fonte sans-serif para corpo de texto. Inter é neutra, legível, ampla
// cobertura de glifos PT-BR.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Fonte display para títulos do site institucional — Bebas Neue é a fonte
// "esportiva" clássica, alta legibilidade em headers grandes.
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} — ${siteConfig.slogan}`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: `${siteConfig.name} — escola de futebol em ${siteConfig.cidade}/${siteConfig.uf}, fundada em ${siteConfig.fundacao}. ${siteConfig.slogan}.`,
  keywords: [
    "escola de futebol",
    "futebol infantil",
    siteConfig.cidade,
    "Baixada Fluminense",
    "categorias de base",
    siteConfig.name,
  ],
  authors: [{ name: siteConfig.name }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.slogan}`,
    description: `Escola de futebol em ${siteConfig.cidade}/${siteConfig.uf}.`,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: siteConfig.cores.primaria,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${bebas.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
