//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fixtureContratoComAtleta cria os pré-requisitos para uma mensalidade real:
// um plano ativo, um atleta e um contrato ativo. Retorna IDs para reuso.
func fixtureContratoComAtleta(t *testing.T, pool *PgxPlanoRepository, contratoRepo *PgxContratoRepository, atletaRepo *PgxAtletaRepository) (atletaID, contratoID uuid.UUID) {
	t.Helper()
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))

	p, err := financeiro.NewPlano("Padrão 3x", 3, decimal.NewFromInt(150), 10)
	require.NoError(t, err)
	require.NoError(t, pool.Save(ctx, p))

	c, err := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, err)
	require.NoError(t, contratoRepo.Save(ctx, c))

	return a.ID, c.ID
}

// novaMensalidade gera uma mensalidade pendente prontas para SaveBatch/Save.
func novaMensalidade(atletaID, contratoID uuid.UUID, ano, mes int, valor int64) *financeiro.Mensalidade {
	return &financeiro.Mensalidade{
		ID:             uuid.New(),
		ContratoID:     contratoID,
		AtletaID:       atletaID,
		CompetenciaAno: ano,
		CompetenciaMes: mes,
		DataVencimento: time.Date(ano, time.Month(mes), 10, 0, 0, 0, 0, time.UTC),
		Valor:          decimal.NewFromInt(valor),
		Status:         financeiro.MensalidadePendente,
		CriadoEm:      time.Now().UTC(),
		AtualizadoEm:  time.Now().UTC(),
	}
}

func TestMensalidadeRepository_SaveBatch_InsereTudoEmUmaTransacao(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	mensRepo := NewPgxMensalidadeRepository(pool)
	ctx := context.Background()

	atletaID, contratoID := fixtureContratoComAtleta(t, planoRepo, contratoRepo, atletaRepo)

	// Insere 3 mensalidades em batch (jan, fev, mar)
	mensalidades := []*financeiro.Mensalidade{
		novaMensalidade(atletaID, contratoID, 2026, 1, 150),
		novaMensalidade(atletaID, contratoID, 2026, 2, 150),
		novaMensalidade(atletaID, contratoID, 2026, 3, 150),
	}
	require.NoError(t, mensRepo.SaveBatch(ctx, mensalidades))

	rows, total, err := mensRepo.List(ctx, financeiro.MensalidadeFilter{AtletaID: &atletaID})
	require.NoError(t, err)
	assert.EqualValues(t, 3, total)
	assert.Len(t, rows, 3)
}

func TestMensalidadeRepository_MarcarVencidas_AtualizaEmMassa(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	mensRepo := NewPgxMensalidadeRepository(pool)
	ctx := context.Background()

	atletaID, contratoID := fixtureContratoComAtleta(t, planoRepo, contratoRepo, atletaRepo)

	// 1 vencida (data passada, status PENDENTE), 1 ainda no prazo (futuro)
	vencida := novaMensalidade(atletaID, contratoID, 2024, 12, 150) // dezembro/2024 < hoje
	noPrazo := novaMensalidade(atletaID, contratoID, 2099, 12, 150)
	require.NoError(t, mensRepo.SaveBatch(ctx, []*financeiro.Mensalidade{vencida, noPrazo}))

	affected, err := mensRepo.MarcarVencidas(ctx)
	require.NoError(t, err)
	assert.EqualValues(t, 1, affected, "só a com vencimento passado deve virar VENCIDO")

	// Re-rodar é idempotente — segunda chamada não deve alterar nada
	affected2, err := mensRepo.MarcarVencidas(ctx)
	require.NoError(t, err)
	assert.EqualValues(t, 0, affected2)

	// Sanity: status persistido
	got, err := mensRepo.GetByID(ctx, vencida.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, financeiro.MensalidadeVencido, got.Status)
}

func TestMensalidadeRepository_ListPorResponsavel_FiltraPorVinculo(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	mensRepo := NewPgxMensalidadeRepository(pool)
	ctx := context.Background()

	// Setup: usuário responsável + atleta vinculado a ele + um atleta alheio
	respUserID := uuid.New()
	_, err := pool.Exec(ctx, `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, $2, 'x', 'RESPONSAVEL', true)
	`, respUserID, "resp-"+respUserID.String()+"@test.local")
	require.NoError(t, err)

	// Atleta do responsável + contrato + 2 mensalidades
	atletaDoResp := novoAtleta(t)
	atletaDoResp.UsuarioResponsavelID = &respUserID
	require.NoError(t, atletaRepo.Save(ctx, atletaDoResp))

	p, _ := financeiro.NewPlano("P1", 3, decimal.NewFromInt(150), 10)
	require.NoError(t, planoRepo.Save(ctx, p))
	c, _ := financeiro.NewContrato(atletaDoResp.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, contratoRepo.Save(ctx, c))
	require.NoError(t, mensRepo.SaveBatch(ctx, []*financeiro.Mensalidade{
		novaMensalidade(atletaDoResp.ID, c.ID, 2026, 1, 150),
		novaMensalidade(atletaDoResp.ID, c.ID, 2026, 2, 150),
	}))

	// Atleta alheio + contrato + 1 mensalidade que NÃO deve aparecer
	atletaAlheio := novoAtleta(t)
	atletaAlheio.Nome = "Outro"
	require.NoError(t, atletaRepo.Save(ctx, atletaAlheio))
	cAlheio, _ := financeiro.NewContrato(atletaAlheio.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, contratoRepo.Save(ctx, cAlheio))
	require.NoError(t, mensRepo.SaveBatch(ctx, []*financeiro.Mensalidade{
		novaMensalidade(atletaAlheio.ID, cAlheio.ID, 2026, 1, 200),
	}))

	t.Run("responsável vê só as 2 do seu atleta", func(t *testing.T) {
		rows, total, err := mensRepo.ListPorResponsavel(ctx, respUserID, financeiro.MensalidadeFilter{})
		require.NoError(t, err)
		assert.EqualValues(t, 2, total)
		assert.Len(t, rows, 2)
		for _, m := range rows {
			assert.Equal(t, atletaDoResp.ID, m.AtletaID, "JOIN deve restringir ao atleta do responsável")
		}
	})

	t.Run("admin (List clássico) vê todas as 3", func(t *testing.T) {
		_, total, err := mensRepo.List(ctx, financeiro.MensalidadeFilter{})
		require.NoError(t, err)
		assert.EqualValues(t, 3, total)
	})

	t.Run("responsável inexistente: 0 linhas, sem erro", func(t *testing.T) {
		rows, total, err := mensRepo.ListPorResponsavel(ctx, uuid.New(), financeiro.MensalidadeFilter{})
		require.NoError(t, err)
		assert.EqualValues(t, 0, total)
		assert.Empty(t, rows)
	})
}

func TestMensalidadeRepository_GetByIDPorResponsavel(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	mensRepo := NewPgxMensalidadeRepository(pool)
	ctx := context.Background()

	respUserID := uuid.New()
	_, err := pool.Exec(ctx, `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, $2, 'x', 'RESPONSAVEL', true)
	`, respUserID, "resp-"+respUserID.String()+"@test.local")
	require.NoError(t, err)

	a := novoAtleta(t)
	a.UsuarioResponsavelID = &respUserID
	require.NoError(t, atletaRepo.Save(ctx, a))

	p, _ := financeiro.NewPlano("P", 3, decimal.NewFromInt(150), 10)
	require.NoError(t, planoRepo.Save(ctx, p))
	c, _ := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, contratoRepo.Save(ctx, c))
	m := novaMensalidade(a.ID, c.ID, 2026, 1, 150)
	require.NoError(t, mensRepo.SaveBatch(ctx, []*financeiro.Mensalidade{m}))

	t.Run("dono vê a sua mensalidade", func(t *testing.T) {
		got, err := mensRepo.GetByIDPorResponsavel(ctx, m.ID, respUserID)
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, m.ID, got.ID)
	})

	t.Run("responsável alheio: nil, nil (não erro)", func(t *testing.T) {
		got, err := mensRepo.GetByIDPorResponsavel(ctx, m.ID, uuid.New())
		require.NoError(t, err)
		assert.Nil(t, got)
	})
}
