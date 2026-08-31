# realtpmsys — Sistema de Gerenciamento de Escola de Futebol

Sistema completo (backend + frontend) para a **Academia de Futebol Real TPM** ("Os muleques da Baixada" — Duque de Caxias/RJ): cadastro de atletas, controle de turmas, frequência, mensalidades, e site institucional público.

**Stack:**

- **Backend:** Go 1.24 · Chi v5 · PostgreSQL 16 · pgx/v5 · sqlc · golang-migrate
- **Frontend:** Next.js 15 · React 19 · TypeScript · Tailwind CSS · TanStack Query · Zod (vide [apps/web/README.md](apps/web/README.md))

> Backend migrado de Python para Go em 2026-04-15 — ADR-001 em [docs/SDD.md](docs/SDD.md).
> Frontend Next.js entregue em 2026-05-26 — ADR-012.
> **MVP operacional** no K3s do infra-lab:
>
> - API em `http://api.realtpmsys.local:8000` (MetalLB 192.168.1.208)
> - Web em `http://app.realtpmsys.local` (MetalLB 192.168.1.211)
>
> CI/CD via Tekton + Kaniko + Harbor + ArgoCD (mesmos manifests pra ambos).

---

## Documentação de Design

| Documento | Descrição |
| --- | --- |
| [docs/SDD.md](docs/SDD.md) | System Design Document completo (arquitetura, ADRs, riscos) |
| [docs/schema.sql](docs/schema.sql) | Schema PostgreSQL com todos os índices e constraints |
| [docs/openapi.yaml](docs/openapi.yaml) | Contrato OpenAPI 3.1 de todos os endpoints |
| [docs/persistence-guide.md](docs/persistence-guide.md) | Guia de implementação da camada de persistência em Go |
| [docs/frontend-architecture.md](docs/frontend-architecture.md) | Plano original do frontend (abr/2026) — **superado**, ver `docs/SDD.md` (ADR-012) para o estado real implementado |
| [infra/README.md](infra/README.md) | Deploy: Dockerfile, K8s, ArgoCD, Tekton pipeline |

---

## Bounded Contexts (DDD)

```text
Identidade ─→ Atletas ─→ Turmas ─→ Frequência
              ↓ ↘         ↑ ↘        ↑
          Treinadores   Campos   Financeiro
```

| Contexto | Pacote | Responsabilidade |
| --- | --- | --- |
| Identidade | `internal/domain/identidade/` | `Usuario`, `Perfil`, JWT (Login) |
| Atletas | `internal/domain/atleta/` | Cadastro, idade, CPF, máquina de estados (ATIVO/INATIVO/SUSPENSO) |
| Treinadores | `internal/domain/treinador/` | CRUD, vínculo 1:1 com Usuario, ativar/inativar |
| Campos | `internal/domain/campo/` | CRUD, toggle ativo/inativo (sem soft delete) |
| Turmas | `internal/domain/turma/` | Turma + HorarioTurma (agregado) + Matricula com validações |
| Frequência | `internal/domain/frequencia/` | Treino (1:1 turma+data) + Frequencia (lote idempotente) |
| Financeiro | `internal/domain/financeiro/` | Plano, Contrato, Mensalidade (com máquina de estados) |

---

## Estrutura de Pastas

```text
cmd/api/main.go                       # entry point + DI wiring + graceful shutdown
internal/
├── domain/                           # zero deps externas — Entidades + Ports
│   ├── shared/errors.go              # erros sentinela + DomainError
│   ├── identidade/                   # Usuario, Perfil
│   ├── atleta/                       # Atleta + Responsavel + Uniforme
│   ├── treinador/                    # Treinador
│   ├── campo/                        # Campo
│   ├── turma/                        # Turma + HorarioTurma + Matricula
│   ├── frequencia/                   # Treino + Frequencia + Presenca
│   └── financeiro/                   # Plano + Contrato + Mensalidade + GeradorMensalidadeService
├── application/                      # Use Cases — orquestra domínio + ports
│   ├── identidade/                   # LoginUseCase (bcrypt + JWT HS256)
│   ├── atleta/                       # Cadastrar/Atualizar/MudarStatus/Remover
│   ├── treinador/                    # Cadastrar/Atualizar/MudarStatus/Remover
│   ├── campo/                        # Criar/Atualizar/Toggle
│   ├── turma/                        # Criar/Atualizar/MudarStatus/MatricularAtleta/CancelarMatricula
│   ├── frequencia/                   # CriarTreino/LancarFrequencia
│   ├── financeiro/                   # FirmarContrato/RegistrarPagamento/CancelarMensalidade/Gerar/MarcarVencidas
│   └── relatorio/                    # Service (inadimplência + frequência)
├── config/config.go                  # env vars (DB_URL, JWT_SECRET, APP_*, ...)
└── infrastructure/
    ├── persistence/
    │   ├── sqlc/                     # código gerado pelo sqlc — NÃO editar
    │   ├── sqlc/queries/             # SQL fonte (.sql) — uma por domínio
    │   ├── repository/               # Adapters (pgx + sqlc) — 10 repos
    │   └── migrate/migrate.go        # aplica migrations no startup (lib)
    ├── http/
    │   ├── router.go                 # Chi router + middlewares globais
    │   ├── middleware/auth.go        # JWT validation + RequirePerfil
    │   ├── response/problem.go       # RFC 7807 — mapeia erros de domínio
    │   └── handler/                  # 8 handlers (auth/atleta/treinador/...)
    └── jobs/mensalidade_job.go       # cron mensal (geração) + diário (vencer)
migrations/                           # golang-migrate — 000001 schema, 000002 admin, 000003 seed responsavel
infra/                                # deploy/CI manifests
├── k8s/                              # Deployment + Service + SealedSecret (ns realtpmsys)
├── tekton/                           # Pipeline + Task Kaniko + Trigger + EventListener
└── argocd/                           # 2 Applications (k8s + tekton)
docs/                                 # SDD, schema, OpenAPI, persistence-guide, frontend-architecture
Dockerfile                            # multi-stage: golang:1.24-bookworm → distroless
```

---

## Setup Rápido (WSL Ubuntu)

```bash
# 1. Toolchain (uma vez só — instala em ~/go-sdk e ~/go/bin)
#    Já instalado no ambiente do José: Go 1.22.5 + sqlc v1.27 + migrate v4.17
go version && sqlc version && migrate -version

# 2. Variáveis de ambiente
cp .env.example .env
# editar DB_URL e JWT_SECRET

# 3a. Banco — opção A: PostgreSQL do shared-infra (K3s lab)
kubectl -n shared-infra port-forward svc/postgresql 5432:5432
# DB_URL=postgresql://realtpmsys:<pwd>@localhost:5432/realtpmsys?sslmode=disable

# 3b. Banco — opção B: container local
docker run -d --name realtpmsys-db \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16

# 4. Aplicar migrations
make migrate-up

# 5. Regenerar código sqlc se queries/ mudar
make sqlc

# 6. Subir o servidor
make run
# → curl http://localhost:8000/health
```

> **Estado atual da API:**
>
> - **Públicos:** `/health`, `POST /auth/login` (retorna par `access_token` + `refresh_token`),
>   `POST /auth/refresh` (consome `refresh_token` e devolve novo `access_token`;
>   refresh **não rotaciona** — vide [docs/openapi.yaml](docs/openapi.yaml))
> - **Perfil RESPONSAVEL** acessa: `GET /atletas/{id}` (e sub-recursos
>   `/responsaveis` e `/uniforme`), `GET /mensalidades` (lista filtrada)
>   e `GET /mensalidades/{id}` — todos restritos aos atletas vinculados a
>   `usuarios.id` via `atletas.usuario_responsavel_id` (404 silencioso
>   quando não bate). Listagem global de atletas continua restrita a
>   ADMIN+TREINADOR.
> - **Observabilidade:** `/metrics` (Prometheus) exposto sem auth para
>   o `kube-prometheus-stack` do lab. Métricas HTTP RED (RPS, erro %,
>   p50/p95/p99) com label `path = RoutePattern` do chi para conter
>   cardinalidade; `realtpmsys_pgxpool_*` (acquired/idle/total/max +
>   empty_acquire e canceled_acquire) sinalizam saturação do pool. Um
>   `ServiceMonitor` + ConfigMap de dashboard em [infra/k8s/](infra/k8s/)
>   ficam em sync via ArgoCD.
>   No nível **DB**, `pg_stat_statements` está ativo no postgres do
>   `shared-infra` — exporter + dashboard "Postgres Top Queries"
>   ([infra-lab/kubernetes/monitoring/dashboards/](https://github.com/netomussauer/infra-lab/tree/main/kubernetes/monitoring/dashboards))
>   mostram queries por `queryid` (mean/calls/total exec time, cache hit,
>   TPS). Drill-down do `queryid` para o texto via `psql` (vide painel
>   "Como usar" no próprio dashboard). ADR-011 documenta a escolha desta
>   abordagem frente ao OTel SDK (em stand-by).
> - **Atletas:** CRUD completo em `/api/v1/atletas` (List/Get ADMIN+TREINADOR,
>   escrita ADMIN). Inclui `PATCH /{id}/inativar`, `/suspender`, `/reativar`.
> - **Treinadores:** CRUD em `/api/v1/treinadores` (List/Get ADMIN+TREINADOR,
>   escrita ADMIN). Vincula usuário existente; `PATCH /{id}/inativar`/`/ativar`.
> - **Campos:** CRUD em `/api/v1/campos` (List/Get ADMIN+TREINADOR, escrita
>   ADMIN). Toggle via `PATCH /{id}/ativar`/`/inativar`.
> - **Turmas:** CRUD + horários em `/api/v1/turmas` (List/Get ADMIN+TREINADOR,
>   escrita ADMIN). Transições `/encerrar`, `/suspender`, `/reativar`.
> - **Matrículas:** `POST /api/v1/turmas/{id}/matriculas`,
>   `GET /api/v1/turmas/{id}/matriculas`, `PATCH /api/v1/matriculas/{id}/cancelar`.
>   Use case valida idade do atleta, vagas disponíveis e duplicidade.
> - **Treinos:** `POST /api/v1/turmas/{id}/treinos` (ADMIN+TREINADOR — registra
>   sessão única por turma/data), `GET /api/v1/turmas/{id}/treinos?data_inicio=&data_fim=`.
> - **Frequência:** `POST /api/v1/treinos/{id}/frequencias` lança presenças em
>   lote (upsert idempotente por treino+atleta). `GET` consulta o registro.
> - **Financeiro:** `POST /api/v1/contratos` (ADMIN), `/api/v1/mensalidades`
>   (List, Get, Pagar, Cancelar, Gerar), `/api/v1/planos` (List ativos + Get
>   ADMIN+TREINADOR, Post ADMIN)
> - **Relatórios:** `GET /api/v1/relatorios/inadimplencia?competencia_ano=&competencia_mes=` (ADMIN),
>   `/relatorios/frequencia/{atleta_id}` e `/relatorios/frequencia/turma/{turma_id}`
>   (ADMIN+TREINADOR) com taxa de presença calculada.
> - Cron jobs ativos: geração de mensalidades `0 6 1 * *` (mensal) e
>   marcação `PENDENTE→VENCIDO` `0 1 * * *` (diário)
>
> **Credenciais iniciais (após `make migrate-up`):**
> `admin@realtpmsys.local` / `admin123` — **trocar em produção**.

---

## Testes

```bash
# Unitários — domínio + application, sem banco (~rápido)
make test/unit

# Tudo + relatório de cobertura (HTML em coverage.html)
make test/coverage

# Com race detector (requer CGO_ENABLED=1)
make test/race

# Integração — usa Postgres do shared-infra (lab K3s); -tags integration
make db/test-setup        # uma vez por workstation: cria user/db no lab
make db/test-portforward  # uma vez por sessão: port-forward 5432:5432
make test/integration
```

### Cobertura atual (domínio + application/relatorio)

| Pacote | Cobertura |
|---|---|
| `internal/domain/atleta` | **100%** |
| `internal/domain/campo` | **100%** |
| `internal/domain/financeiro` | **100%** |
| `internal/domain/frequencia` | **100%** |
| `internal/domain/treinador` | **100%** |
| `internal/domain/turma` | **100%** |
| `internal/application/relatorio` | **100%** |
| `internal/application/identidade` | **fluxos Login + Refresh + emissão de token** |
| `internal/infrastructure/http/middleware` | **Audit (níveis + captura de user_id) + Auth** |
| `internal/infrastructure/persistence/repository` (**14 de 14**) | **Integração com Postgres real** — todos os repos: Atleta, Responsavel (tx swap), Mensalidade (JOINs+SaveBatch+MarcarVencidas), Turma (agregado em tx), Frequencia (upsert), Plano, Contrato (uq parcial ATIVO), Campo, Treinador (uq usuario_id + SoftDelete), Usuario (uq email), Uniforme (upsert), Treino (upsert por turma+data), Matricula (uq parcial ATIVA), Relatorio (JOINs + agregação) |

Estratégia: table-driven tests cobrindo regras de negócio puras (máquinas
de estado, validações, cálculo de idade, taxa de presença, datas de
vencimento em borda — fevereiro bissexto, abril com 30 dias) e fakes para
ports (`identidade.Repository`) nos casos de uso. Middleware testado via
`httptest.Server` com asserts sobre o JSON emitido pelo `slog`.

Testes de integração (`//go:build integration`) rodam contra o postgres
do `shared-infra` no lab — DB `realtpmsys_test`. Setup via
`make db/test-setup` + `make db/test-portforward` + `make test/integration`.
Cobre os 5 repos críticos onde transação ou JOIN são bug-prone; os 9
restantes ficam para segunda leva.

---

## Comandos de Desenvolvimento

```bash
make run          # go run ./cmd/api/...
make build        # binário estático em ./bin/realtpmsys
make lint         # golangci-lint
make sqlc         # regenerar código a partir das queries SQL
make migrate-up   # aplicar migrations pendentes
make migrate-down # reverter 1 migration
make check        # fmt + vet + lint + test (rodar antes do commit)
```

---

## Módulos Implementados

- [x] Estrutura Clean Architecture em Go
- [x] Domínio: `Atleta`, `Mensalidade`, `Contrato`, `Plano` com máquina de estados
- [x] Erros sentinela de domínio com garantia compile-time
- [x] Use Cases financeiros: `FirmarContrato`, `GerarMensalidades`, `RegistrarPagamento`, `CancelarMensalidade`
- [x] `GeradorMensalidadeService` — lógica pura sem I/O, 100% testável
- [x] Repositórios pgx + sqlc: `Usuario`, `Atleta`, `Treinador`, `Campo`, `Turma` (com horários em tx), `Matricula`, `Treino`, `Frequencia` (com SaveBatch), `Mensalidade`, `Plano`, `Contrato`
- [x] Código sqlc gerado para todas as tabelas (usuarios, atletas, treinadores, campos, turmas, horarios_turma, matriculas, treinos, frequencias, contratos, mensalidades, planos) com `sql_package: pgx/v5`
- [x] Domínio Identidade: `Usuario`, `Perfil` + `LoginUseCase` (bcrypt + JWT HS256)
- [x] Domínio Turma: `Turma`, `HorarioTurma`, `Matricula` com máquinas de estado
- [x] Domínio Frequência: `Treino` (com regra única por turma+data) e `Frequencia` (presença com validação de justificativa)
- [x] Use cases Atleta: `Cadastrar`, `Atualizar`, `MudarStatus`, `Remover`
- [x] Use cases Treinador: `Cadastrar` (valida usuário existe e único), `Atualizar`, `MudarStatus`, `Remover`
- [x] Use cases Campo: `Criar`, `Atualizar`, `Toggle` (ativar/inativar)
- [x] Use cases Turma: `Criar`, `Atualizar`, `MudarStatus`, `MatricularAtleta`, `CancelarMatricula`
- [x] Use cases Frequência: `CriarTreino` (valida turma ATIVA, sem duplicidade), `LancarFrequencia` (lote idempotente)
- [x] Regras de negócio em Matrícula: valida idade na faixa etária, capacidade da turma, duplicidade
- [x] `AuthHandler` — endpoint público `POST /auth/login`
- [x] `AtletaHandler` — CRUD completo + transições de status
- [x] `TreinadorHandler` — CRUD + ativar/inativar (com validação de usuário associado)
- [x] `CampoHandler` — CRUD + toggle ativo/inativo
- [x] `TurmaHandler` — CRUD com horários + transições + endpoints de matrículas
- [x] `TreinoHandler` — criar/listar treinos por turma + lançar/consultar frequências
- [x] `ContratoHandler` — endpoint `POST /api/v1/contratos` (ADMIN)
- [x] `MensalidadeHandler` com respostas RFC 7807 — endpoints completos
- [x] Service + `RelatorioHandler` — inadimplência + frequência por atleta + frequência consolidada por turma (com taxa de presença)
- [x] Middleware JWT (`Auth` + `RequirePerfil`) ativo em `/api/v1/*` — rejeita refresh token em rotas protegidas via claim `typ`
- [x] **Refresh token**: `LoginUseCase` emite par access+refresh com claim `typ`; `RefreshTokenUseCase` valida `typ=refresh`, releitura do usuário e devolve novo access (sem rotacionar refresh)
- [x] **Middleware `Audit`**: log JSON estruturado por request (method, path, status, latency_ms, bytes, ip, request_id, user_id, perfil) — substitui o `chimiddleware.Logger` text-based; pula `/health`; severidade `info/warn/error` conforme status
- [x] Cron jobs do contexto Financeiro: `GerarMensalidades` mensal (`0 6 1 * *`) e `MarcarMensalidadesVencidas` diário (`0 1 * * *`)
- [x] Migrations golang-migrate (`000001_initial_schema`, `000002_admin_password`)
- [x] `config.go` — leitura validada de variáveis de ambiente
- [x] **Build verde:** `go build ./...` e `go vet ./...` passam sem erros
- [x] Migrations aplicadas automaticamente no startup (`golang-migrate` como lib)
- [x] **Dockerfile multi-stage** (golang:1.24-bookworm → distroless) com binário ~17 MB
- [x] **Manifestos K8s** em `infra/k8s/` (namespace, Deployment, Service LoadBalancer MetalLB, SealedSecret real)
- [x] **2 Applications ArgoCD**: principal (infra/k8s) + tekton (infra/tekton)
- [x] **Pipeline Tekton** com Kaniko in-cluster — tag `:sha-<7chars>` + `:latest` + task final `rollout-restart` (auto-deploy via SA cross-namespace `tekton-realtpmsys` → Role `tekton-rollout` no ns `realtpmsys`)
- [x] **SealedSecrets** para credenciais (pg-password + jwt-secret + webhook-token)
- [x] **Smoke test E2E validado** em produção lab: atleta → contrato → mensalidade →
  pagamento → relatório de inadimplência
- [x] Deploy + CI/CD documentados em [infra/README.md](infra/README.md)
- [x] **Responsavel + Uniforme** (sub-entidades de Atleta): CRUD em `/api/v1/atletas/{id}/responsaveis`, `/responsaveis/{id}`, `PUT/GET /api/v1/atletas/{id}/uniforme`. Regra `contato_principal` única por atleta via swap em transação.
- [x] **Frontend Next.js** — implementado e em produção (não é mais só plano): site institucional (6 páginas SSG), login com BFF (3 cookies httpOnly), feature Atletas ponta a ponta (lista, detalhe, wizard de cadastro, edição). Ver `docs/SDD.md` (ADR-012) para o estado real — `docs/frontend-architecture.md` é só o plano original, não reflete o que foi de fato construído.
- [x] **CRUD de Planos** — `CriarPlanoUseCase` + `PlanoHandler` + rotas `/api/v1/planos` (`GET` lista ativos, `GET /{id}`, `POST` cria — ADMIN+TREINADOR leem, só ADMIN cria). Antes só era possível criar/editar plano via SQL direto. Sem `PUT`/toggle ainda (fora do contrato OpenAPI atual, entidade não tem método de atualização).
- [x] **UI de Turmas** — CRUD + horários (sub-formulário dinâmico) + transições de status (encerrar/suspender/reativar) + matrículas (matricular/cancelar, com busca de atleta). TREINADOR vê tudo, só ADMIN escreve.
- [x] **UI de Frequência** — treinos por turma (criar + listar com filtro de período) + lançamento de presença em lote (checklist por atleta matriculado, PRESENTE/AUSENTE/JUSTIFICADO). ADMIN e TREINADOR têm paridade total aqui (backend não distingue escrita).
- [x] **UI de Financeiro** — mensalidades (listar/filtrar/pagar/cancelar/gerar em lote, com resumo de totais) e firmar contrato (ação a partir do detalhe do atleta — não há listagem de contratos possível, o backend só expõe `POST /contratos`). ADMIN gerencia tudo; RESPONSAVEL só vê as mensalidades dos próprios atletas; TREINADOR não acessa.
- [ ] Mirror push reverso Gitea → GitHub (resolve webhook automático sem polling)
- [ ] **UI de Relatórios** — o backend está pronto (inadimplência + frequência por atleta/turma), mas o frontend ainda não cobre. Dashboard também é só um placeholder estático.
- [ ] **Testes de use case** dos contextos Atletas, Treinadores, Campos, Turmas e Frequência — só há teste de domínio e de integração de repositório; a lógica de orquestração desses `use_cases.go` (ex: `MatricularAtleta`, `LancarFrequencia`) não tem teste próprio.

> Para implementar os módulos pendentes, siga o [guia de persistência](docs/persistence-guide.md) com o agente `dev-expert-fullcycle`.
