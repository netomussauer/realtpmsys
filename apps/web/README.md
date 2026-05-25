# Real TPM — Frontend (`apps/web`)

Site institucional + sistema de gestão da **Academia de Futebol Real TPM**
("Os muleques da Baixada" — Duque de Caxias/RJ, fundada em 2023).

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind CSS + TanStack Query
v5 + Zod + React Hook Form**. Conteúdo institucional em SSG, sistema de gestão
em CSR via TanStack Query.

## Estrutura

```text
apps/web/
├── app/
│   ├── (public)/          # Site institucional (SSG, SEO)
│   │   ├── page.tsx       # Home
│   │   ├── sobre/
│   │   ├── categorias/
│   │   ├── galeria/
│   │   ├── competicoes/
│   │   ├── contato/
│   │   └── layout.tsx     # Header público + footer
│   ├── (auth)/login/      # Página de login
│   ├── (app)/             # Sistema (protegido)
│   │   ├── dashboard/
│   │   ├── atletas/
│   │   └── layout.tsx     # Sidebar + header autenticado
│   ├── api/auth/          # BFF route handlers (cookies httpOnly)
│   ├── middleware.ts      # Protege (app)/* + redirect por perfil
│   └── layout.tsx         # Root (providers, fonts)
├── features/              # Lógica de negócio por domínio
│   ├── auth/
│   └── atletas/
├── shared/                # Componentes/hooks/utils compartilhados
├── content/               # Conteúdo estático MDX/JSON
│   ├── categorias.json
│   ├── competicoes.json
│   └── galeria.json
└── public/                # Assets (logo, galeria)
```

## Desenvolvimento local

```bash
# Pré-requisitos: Node 22+, backend rodando (api.realtpmsys.local:8000)
cd apps/web
cp .env.example .env.local
# Edita .env.local: SESSION_SECRET (gera com openssl rand -base64 32)
npm install
npm run dev
# Abre http://localhost:3000
```

## Deploy

K3s do lab via Tekton+Kaniko, padrão idêntico ao backend Go:

- Dockerfile multi-stage (Node 22 → Next standalone → distroless)
- Manifests em `infra/k8s/web/`
- Pipeline Tekton em `infra/tekton/web/`
- DNS: `app.realtpmsys.local` (MetalLB IP separado)

Detalhes na [Fase 5 do plano de implementação](../../docs/SDD.md).

## Design tokens / Paleta

**Paleta v2 (2026-05-25):** preto + azul claro. Substituiu a v1 (azul-marinho + dourado, descartada antes do site institucional ir ao ar).

| Token CSS              | Hex             | HSL           | Uso                                                           |
| ---------------------- | --------------- | ------------- | ------------------------------------------------------------- |
| `--primary`            | `#0A0A0A`       | `0 0% 4%`     | Header, sidebar, footer institucional, títulos, botões padrão |
| `--primary-foreground` | `#FFFFFF`       | `0 0% 100%`   | Texto sobre fundo preto                                       |
| `--accent`             | `#38BDF8`       | `199 89% 60%` | CTAs ("Acessar sistema", "Matricule-se"), links, focus ring   |
| `--accent-foreground`  | `#0A0A0A`       | `0 0% 4%`     | Texto sobre fundo azul claro                                  |
| `--background`         | `#FFFFFF`       | `0 0% 100%`   | Fundo de páginas claras                                       |
| `--foreground`         | `#0A0A0A`       | `0 0% 4%`     | Texto sobre fundo claro                                       |
| `--muted`              | (cinza azulado) | `210 20% 96%` | Cards secundários, hover states                               |
| `--ring`               | `#38BDF8`       | `199 89% 60%` | Borda visível em foco (acessibilidade)                        |

### Contraste validado (WCAG)

- **Branco sobre preto** (header/sidebar/CTAs): **20.5:1** ✓ AAA
- **Preto sobre branco** (corpo padrão): 20.5:1 ✓ AAA
- **Preto sobre azul claro** (CTA accent): **7.8:1** ✓ AA texto pequeno / AAA texto grande
- **Azul claro sobre preto** (links no footer): 7.8:1 ✓ AA

### Como trocar a paleta

Os valores HSL ficam em **dois lugares** que precisam bater sempre:

1. **`app/globals.css`** — `:root { --primary: ... }`. Fonte da verdade do Tailwind.
2. **`shared/lib/config.ts`** — `cores.primaria/secundaria/neutra`. Usado por:
   - `metadata.themeColor` (cor da barra do browser mobile)
   - Footer e referências textuais às cores
   - Eventual integração com tokens dinâmicos (white label futuro)

Não use cores hardcoded em componentes — sempre `bg-primary`, `text-accent`, etc. Isso garante que uma troca de paleta seja edição em **2 arquivos**, não em 30 componentes.

## Status

🚧 **Em construção** — Fases 1 (Setup) e 2 (Tokens + Layouts) concluídas.
Plano completo: ver [docs/frontend-architecture.md](../../docs/frontend-architecture.md)
e checklist no SDD.
