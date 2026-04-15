.PHONY: run build test lint sqlc migrate-up migrate-down migrate-create tidy

# ── Variáveis ─────────────────────────────────────────────────────────────────
APP_NAME   = realtpmsys
BUILD_DIR  = ./bin
DB_URL     ?= postgresql://postgres:postgres@localhost:5432/realtpmsys?sslmode=disable
DB_URL_TEST ?= postgresql://postgres:postgres@localhost:5432/realtpmsys_test?sslmode=disable

# ── Desenvolvimento ───────────────────────────────────────────────────────────
run:
	go run ./cmd/api/...

build:
	CGO_ENABLED=0 go build -ldflags="-s -w" -o $(BUILD_DIR)/$(APP_NAME) ./cmd/api/...

# ── Qualidade ─────────────────────────────────────────────────────────────────
test:
	go test ./... -race -count=1

test/unit:
	go test ./internal/domain/... ./internal/application/... -race -count=1 -v

test/integration:
	DB_URL=$(DB_URL_TEST) go test ./internal/infrastructure/... -race -count=1 -v -tags integration

test/coverage:
	go test ./... -race -coverprofile=coverage.out
	go tool cover -html=coverage.out -o coverage.html

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
