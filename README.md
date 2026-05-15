# realtpmsys — Sistema de Gerenciamento de Escola de Futebol

Sistema completo para gestão de escola de futebol: cadastro de atletas, controle de turmas, frequência e mensalidades.

**Stack:** Go 1.22 · Chi v5 · PostgreSQL 16 · pgx/v5 · sqlc · golang-migrate

> Stack migrada de Python para Go em 2026-04-15 — ADR-001 em [docs/SDD.md](docs/SDD.md).

---

## Documentação de Design

| Documento | Descrição |
| --- | --- |
| [docs/SDD.md](docs/SDD.md) | System Design Document completo (arquitetura, ADRs, riscos) |
| [docs/schema.sql](docs/schema.sql) | Schema PostgreSQL com todos os índices e constraints |
| [docs/openapi.yaml](docs/openapi.yaml) | Contrato OpenAPI 3.1 de todos os endpoints |
| [docs/persistence-guide.md](docs/persistence-guide.md) | Guia de implementação da camada de persistência em Go |

---

## Bounded Contexts (DDD)

```text
Identidade → Atletas → Turmas → Frequência
                   ↘             ↗
                    Financeiro
```

| Contexto | Pacote | Responsabilidade |
| --- | --- | --- |
| Identidade | `internal/domain/` | Auth, perfis de usuário |
| Atletas | `internal/domain/atleta/` | Cadastro, responsáveis, uniformes |
| Turmas | `internal/domain/turma/` | Horários, matrículas, treinadores |
| Frequência | `internal/domain/frequencia/` | Presenças por treino |
| Financeiro | `internal/domain/financeiro/` | Planos, contratos, mensalidades |

---

## Estrutura de Pastas

```text
cmd/api/           # entry point (main.go)
internal/
├── domain/        # Entidades, erros de domínio, interfaces (Ports)
├── application/   # Use Cases — orquestra domínio + ports
└── infrastructure/
    ├── persistence/
    │   ├── sqlc/      # código Go gerado pelo sqlc (não editar)
    │   ├── sqlc/queries/  # SQL fonte (.sql)
    │   └── repository/    # Adapters concretos (pgx + sqlc)
    ├── http/          # Chi router, handlers, middleware JWT, RFC 7807
    └── jobs/          # robfig/cron: geração de mensalidades
migrations/        # golang-migrate: pares up/down versionados
docs/              # SDD, schema, OpenAPI, persistence-guide
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
> - **Públicos:** `/health`, `POST /auth/login` (retorna `access_token` Bearer)
> - **Atletas:** CRUD completo em `/api/v1/atletas` (List/Get ADMIN+TREINADOR,
>   escrita ADMIN). Inclui `PATCH /{id}/inativar`, `/suspender`, `/reativar`.
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
>   (List, Get, Pagar, Cancelar, Gerar)
> - Job mensal `0 6 1 * *` ativo via cron
> - Endpoints de Relatórios (inadimplência, frequência consolidada) ainda pendentes
>
> **Credenciais iniciais (após `make migrate-up`):**
> `admin@realtpmsys.local` / `admin123` — **trocar em produção**.

---

## Testes

```bash
# Unitários — domínio puro, sem banco (~rápido)
make test/unit

# Integração — requer DB_URL_TEST configurado
make test/integration

# Todos com cobertura
make test/coverage
```

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
- [x] Repositórios pgx + sqlc: `Usuario`, `Atleta`, `Turma` (com horários em tx), `Matricula`, `Treino`, `Frequencia` (com SaveBatch), `Mensalidade`, `Plano`, `Contrato`
- [x] Código sqlc gerado (usuarios, atletas, turmas, horarios_turma, matriculas, treinos, frequencias, contratos, mensalidades, planos) com `sql_package: pgx/v5`
- [x] Domínio Identidade: `Usuario`, `Perfil` + `LoginUseCase` (bcrypt + JWT HS256)
- [x] Domínio Turma: `Turma`, `HorarioTurma`, `Matricula` com máquinas de estado
- [x] Domínio Frequência: `Treino` (com regra única por turma+data) e `Frequencia` (presença com validação de justificativa)
- [x] Use cases Atleta: `Cadastrar`, `Atualizar`, `MudarStatus`, `Remover`
- [x] Use cases Turma: `Criar`, `Atualizar`, `MudarStatus`, `MatricularAtleta`, `CancelarMatricula`
- [x] Use cases Frequência: `CriarTreino` (valida turma ATIVA, sem duplicidade), `LancarFrequencia` (lote idempotente)
- [x] Regras de negócio em Matrícula: valida idade na faixa etária, capacidade da turma, duplicidade
- [x] `AuthHandler` — endpoint público `POST /auth/login`
- [x] `AtletaHandler` — CRUD completo + transições de status
- [x] `TurmaHandler` — CRUD com horários + transições + endpoints de matrículas
- [x] `TreinoHandler` — criar/listar treinos por turma + lançar/consultar frequências
- [x] `ContratoHandler` — endpoint `POST /api/v1/contratos` (ADMIN)
- [x] `MensalidadeHandler` com respostas RFC 7807 — endpoints completos
- [x] Middleware JWT (`Auth` + `RequirePerfil`) ativo em `/api/v1/*`
- [x] Job agendado mensal `0 6 1 * *` ativo (gera mensalidades para todos os contratos ATIVO)
- [x] Migrations golang-migrate (`000001_initial_schema`, `000002_admin_password`)
- [x] `config.go` — leitura validada de variáveis de ambiente
- [x] **Build verde:** `go build ./...` e `go vet ./...` passam sem erros
- [ ] Repositórios + handlers: Treinador, Campo, Responsavel, Uniforme
- [ ] Endpoints de Relatórios (inadimplência, frequência consolidada por atleta/turma)
- [ ] Use case `MarcarMensalidadesVencidasUseCase` (TODO em `mensalidade_job.go`)
- [ ] Testes (zero arquivos `*_test.go` no momento)
- [ ] Dockerfile + manifestos K8s para deploy via ArgoCD

> Para implementar os módulos pendentes, siga o [guia de persistência](docs/persistence-guide.md) com o agente `dev-expert-fullcycle`.
