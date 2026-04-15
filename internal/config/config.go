// Package config carrega e valida as variáveis de ambiente da aplicação.
package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config centraliza todas as configurações da aplicação.
type Config struct {
	DB        DBConfig
	JWT       JWTConfig
	Server    ServerConfig
}

type DBConfig struct {
	URL      string
	MaxConns int32
	MinConns int32
}

type JWTConfig struct {
	Secret                string
	AccessExpireMinutes   int
	RefreshExpireDays     int
}

type ServerConfig struct {
	Port              string
	ReadTimeoutSecs   int
	WriteTimeoutSecs  int
}

// Load lê variáveis de ambiente e retorna Config validado.
// Retorna erro se variáveis obrigatórias estiverem ausentes.
func Load() (*Config, error) {
	dbURL := os.Getenv("DB_URL")
	if dbURL == "" {
		return nil, fmt.Errorf("DB_URL é obrigatório")
	}
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET é obrigatório")
	}

	return &Config{
		DB: DBConfig{
			URL:      dbURL,
			MaxConns: int32(envInt("DB_MAX_CONNS", 10)),
			MinConns: int32(envInt("DB_MIN_CONNS", 2)),
		},
		JWT: JWTConfig{
			Secret:              jwtSecret,
			AccessExpireMinutes: envInt("JWT_ACCESS_EXPIRES_MINUTES", 60),
			RefreshExpireDays:   envInt("JWT_REFRESH_EXPIRES_DAYS", 7),
		},
		Server: ServerConfig{
			Port:             envStr("APP_PORT", "8000"),
			ReadTimeoutSecs:  envInt("APP_READ_TIMEOUT_SECONDS", 30),
			WriteTimeoutSecs: envInt("APP_WRITE_TIMEOUT_SECONDS", 30),
		},
	}, nil
}

func envStr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return fallback
}
