/**
 * Configuração centralizada do site institucional.
 *
 * Centraliza dados da Academia em UM lugar — todas as páginas leem daqui em
 * vez de hardcoded. Quando o gestor passar dados reais, basta editar este
 * arquivo (e não 6 páginas distintas).
 *
 * Campos marcados como `// TODO:` são placeholders que precisam ser
 * substituídos pelos dados reais da escola.
 */

export const siteConfig = {
  // Identidade ─────────────────────────────────────────────────────────────
  name: "Academia de Futebol Real TPM",
  shortName: "Real TPM",
  slogan: "Os muleques da Baixada",
  fundacao: 2023,
  cidade: "Duque de Caxias",
  uf: "RJ",

  // Contato ────────────────────────────────────────────────────────────────
  contato: {
    // TODO: substituir pelos valores reais quando disponíveis.
    telefone: "(21) 99999-9999",
    whatsapp: "(21) 99999-9999",
    email: "contato@realtpm.com.br",
    endereco: {
      logradouro: "Rua Exemplo, 123",
      bairro: "Centro",
      cidade: "Duque de Caxias",
      uf: "RJ",
      cep: "25000-000",
    },
    // URL Google Maps embed — apontar pra endereço real depois.
    mapaEmbedSrc:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3673.0!2d-43.3!3d-22.78!2m3!1f0!2f0!3f0",
  },

  // Redes sociais ──────────────────────────────────────────────────────────
  redes: {
    instagram: "https://instagram.com/academiarealtpm", // TODO
    facebook: null as string | null,
    youtube: null as string | null,
  },

  // Identidade visual (sincroniza com app/globals.css) ─────────────────────
  // Paleta v2 (2026-05-25): preto + azul claro. Trocar `cores` aqui exige
  // editar também `:root` em app/globals.css — as duas referências precisam
  // sempre bater. Documentação: README.md §Design tokens.
  cores: {
    primaria: "#0A0A0A",   // Preto — base do sistema (header, sidebar, títulos)
    secundaria: "#38BDF8", // Azul claro (sky-400) — CTAs, links, focus ring
    neutra: "#FFFFFF",     // Branco — backgrounds e texto sobre preto
  },

  // Links do menu público ──────────────────────────────────────────────────
  menuPublico: [
    { label: "Início", href: "/" },
    { label: "Sobre", href: "/sobre" },
    { label: "Categorias", href: "/categorias" },
    { label: "Galeria", href: "/galeria" },
    { label: "Competições", href: "/competicoes" },
    { label: "Contato", href: "/contato" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
