.PHONY: run build test lint sqlc migrate-up migrate-down migrate-create tidy db/test-setup db/test-portforward

# ── Variáveis ─────────────────────────────────────────────────────────────────
APP_NAME   = realtpmsys
BUILD_DIR  = ./bin
DB_URL     ?= postgresql://postgres:postgres@localhost:5432/realtpmsys?sslmode=disable
DB_URL_TEST ?= postgresql://realtpmsys_test:realtpmsys_test@localhost:5432/realtpmsys_test?sslmode=disable
# Lab K3s — usado por db/test-setup e db/test-portforward (testes de integração).
KUBECTL    ?= kubectl
PG_NAMESPACE ?= shared-infra
PG_POD     ?= postgresql-0

# ── Desenvolvimento ───────────────────────────────────────────────────────────
run:
	go run ./cmd/api/...

build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BUILD_DIR)/$(APP_NAME) ./cmd/api/...

# ── Qualidade ─────────────────────────────────────────────────────────────────
# Sem -race por padrão: requer CGO_ENABLED=1 e o ambiente WSL não tem libc dev.
# Para rodar com -race localmente: `make test/race`.
test:
	go test ./... -count=1

test/race:
	CGO_ENABLED=1 go test ./... -race -count=1

test/unit:
	go test ./internal/domain/... ./internal/application/... -count=1 -v

# Testes de integração: rodam contra o Postgres do shared-infra (lab K3s).
# Requer port-forward 5432:5432 ativo — vide `make db/test-portforward`.
# Tag de build `integration` filtra do `make test` padrão.
test/integration:
	DB_URL_TEST=$(DB_URL_TEST) go test ./internal/infrastructure/... -count=1 -v -tags integration

# Cria o database/user de teste no Postgres do lab (idempotente).
# Roda uma vez por workstation; usa kubectl exec direto no postgresql-0.
db/test-setup:
	@echo "→ criando user/database realtpmsys_test no lab (idempotente)"
	@$(KUBECTL) exec -n $(PG_NAMESPACE) $(PG_POD) -- psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='realtpmsys_test'" | grep -q 1 || \
		$(KUBECTL) exec -n $(PG_NAMESPACE) $(PG_POD) -- psql -U postgres -c "CREATE USER realtpmsys_test WITH PASSWORD 'realtpmsys_test';"
	@$(KUBECTL) exec -n $(PG_NAMESPACE) $(PG_POD) -- psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='realtpmsys_test'" | grep -q 1 || \
		$(KUBECTL) exec -n $(PG_NAMESPACE) $(PG_POD) -- psql -U postgres -c "CREATE DATABASE realtpmsys_test OWNER realtpmsys_test;"
	@$(KUBECTL) exec -n $(PG_NAMESPACE) $(PG_POD) -- psql -U postgres -d realtpmsys_test -c "REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT ALL ON SCHEMA public TO realtpmsys_test;"
	@echo "✓ db/test-setup pronto"

# Abre port-forward 5432→postgresql.shared-infra.svc em background. Mata
# qualquer port-forward antigo na mesma porta antes de iniciar.
db/test-portforward:
	@pkill -f "port-forward.*5432:5432" 2>/dev/null || true
	@$(KUBECTL) port-forward -n $(PG_NAMESPACE) svc/postgresql 5432:5432 >/dev/null 2>&1 &
	@sleep 2
	@echo "✓ port-forward 5432→$(PG_POD):5432 ativo. Para parar: pkill -f 'port-forward.*5432:5432'"

test/coverage:
	go test ./... -count=1 -coverprofile=coverage.out
	go tool cover -func=coverage.out | tail -1
	go tool cover -html=coverage.out -o coverage.html
	@echo "HTML em coverage.html"

lint:
	golangci-lint run ./...

fmt:
	gofmt -w .
	goimports -w .

vet:
	go vet ./...

check: fmt vet lint test

# ── Banco de dados ────────────────────────────────────────────────────────────
migrate-up:
	migrate -path ./migrations -database "$(DB_URL)" up

migrate-down:
	migrate -path ./migrations -database "$(DB_URL)" down 1

migrate-create:
	@read -p "Nome da migration: " name; \
	migrate create -ext sql -dir ./migrations -seq $$name

# ── sqlc ──────────────────────────────────────────────────────────────────────
sqlc:
	sqlc generate

sqlc/verify:
	sqlc vet

# ── Dependências ──────────────────────────────────────────────────────────────
tidy:
	go mod tidy

# ── Docker ───────────────────────────────────────────────────────────────────
docker/build:
	docker build -t $(APP_NAME):latest .

docker/run:
	docker run --rm -p 8000:8000 --env-file .env $(APP_NAME):latest
