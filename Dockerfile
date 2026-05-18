# syntax=docker/dockerfile:1.7

# Stage 1 — build do binário Go com cache de módulos
# bookworm (Debian) ja vem com git pre-instalado, evitando dependencia
# de dl-cdn.alpinelinux.org durante o build (egress do nó k3s-worker-cicd
# ainda apresenta intermitência para esse host específico).
FROM golang:1.22-bookworm AS builder

WORKDIR /src

# Cache layer de módulos. Kaniko não suporta --mount=type=cache; em troca,
# go mod download popula /go/pkg/mod automaticamente.
ENV GOFLAGS=-mod=mod
COPY go.mod go.sum ./
RUN go mod download

# Código da aplicação
COPY cmd/        ./cmd/
COPY internal/   ./internal/
COPY migrations/ ./migrations/

ARG VERSION=dev
ARG COMMIT=unknown

# Build estático (CGO_ENABLED=0) com flags de tamanho mínimo
RUN CGO_ENABLED=0 GOOS=linux go build \
        -trimpath \
        -ldflags="-s -w -X main.Version=${VERSION} -X main.Commit=${COMMIT}" \
        -o /out/realtpmsys \
        ./cmd/api

# Stage 2 — runtime distroless
# - Sem package manager (evita apt/apk com egress restrito)
# - ca-certificates já incluso
# - User nonroot (uid 65532) já configurado pela imagem base
# - tzdata para fuso "America/Sao_Paulo" do scheduler — distroless static
#   inclui /usr/share/zoneinfo
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=builder --chown=nonroot:nonroot /out/realtpmsys  /app/realtpmsys
COPY --from=builder --chown=nonroot:nonroot /src/migrations/ /app/migrations/

# Variáveis padrão — sobrescritas pelo K8s via env/Secret
ENV APP_PORT=8000 \
    APP_MIGRATIONS_PATH=/app/migrations

USER nonroot:nonroot
EXPOSE 8000

ENTRYPOINT ["/app/realtpmsys"]
