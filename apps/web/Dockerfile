# syntax=docker/dockerfile:1.7
#
# Dockerfile multi-stage do apps/web — Next.js 15 com output=standalone.
#
# Stages:
#   1. deps    — instala deps com cache friendly (só package*.json)
#   2. builder — copia código + build → gera .next/standalone
#   3. runner  — distroless, executa server.js do standalone
#
# Resultado: imagem final ~150MB (vs ~1GB se usasse node:alpine cheio).
# Standalone embute apenas os módulos efetivamente importados (tree-shaken).

# ─── 1. Deps ─────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# `package-lock.json` é versionado depois do primeiro `npm install` local —
# até lá, npm install no build resolve. Quando lockfile existir, usar `npm ci`.
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# ─── 2. Builder ──────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Reaproveita node_modules do stage anterior (cache de layer).
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis necessárias em BUILD time (Next embute em bundle): apenas as
# NEXT_PUBLIC_* importam. Backend URL pública passa por ARG.
ARG NEXT_PUBLIC_API_URL=http://api.realtpmsys.local:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ─── 3. Runner ───────────────────────────────────────────────────────────────
# Distroless reduz superfície de ataque (sem shell, sem apt, sem nada além
# do node22 + libs). Tag `:nonroot` rodando como uid=65532.
FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output do Next coloca uma versão mínima de node_modules e o
# server.js na raiz de /app — copiamos exatamente isso, mais o /static
# (gerado fora do standalone) e o /public.
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=builder --chown=nonroot:nonroot /app/public ./public

USER nonroot

EXPOSE 3000

# Sem shell no distroless — exec direto via ENTRYPOINT do base image (node).
CMD ["server.js"]
