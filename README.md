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

## Setup Rápido

```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env
# editar DB_URL e JWT_SECRET

# 2. Subir PostgreSQL (Docker)
docker run -d --name realtpmsys-db \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16

# 3. Aplicar migrations
make migrate-up

# 4. Gerar código sqlc (após qualquer mudança em queries/)
make sqlc

# 5. Rodar servidor
make run
# → http://localhost:8000/health
# → http://localhost:8000/docs  (OpenAPI via docs/openapi.yaml)
```

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
- [x] Repositório `PgxMensalidadeRepository` com transação em lote (SaveBatch)
- [x] Handler `MensalidadeHandler` com respostas RFC 7807
- [x] Middleware JWT (`Auth` + `RequirePerfil`)
- [x] Job agendado: geração mensal + marcação de vencidas (`robfig/cron`)
- [x] Migrations golang-migrate (`000001_initial_schema`)
- [x] `config.go` — leitura validada de variáveis de ambiente
- [ ] Repositórios: Atleta, Contrato, Plano, Turma, Frequência
- [ ] Handlers: Atleta, Turma, Treino, Relatórios
- [ ] Testes de integração dos repositórios

> Para implementar os módulos pendentes, siga o [guia de persistência](docs/persistence-guide.md) com o agente `dev-expert-fullcycle`.
