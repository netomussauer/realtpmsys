package handler

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/middleware"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─────────────────────────────────────────────────────────────────────────────
// Fakes mínimos — cobrem só o necessário para os testes de autorização.
// ─────────────────────────────────────────────────────────────────────────────

type fakeAtletaRepo struct {
	atleta.Repository

	atletaByID            *atleta.Atleta
	atletaByIDPorResp     *atleta.Atleta
	isAtletaDoResponsavel bool
	errIsAtletaDoResp     error

	// Captura argumentos para verificações.
	gotIDByResp     uuid.UUID
	gotUserIDByResp uuid.UUID
}

func (f *fakeAtletaRepo) GetByID(_ context.Context, _ uuid.UUID) (*atleta.Atleta, error) {
	return f.atletaByID, nil
}
func (f *fakeAtletaRepo) GetByIDPorResponsavel(_ context.Context, id, userID uuid.UUID) (*atleta.Atleta, error) {
	f.gotIDByResp = id
	f.gotUserIDByResp = userID
	return f.atletaByIDPorResp, nil
}
func (f *fakeAtletaRepo) IsAtletaDoResponsavel(_ context.Context, atletaID, userID uuid.UUID) (bool, error) {
	f.gotIDByResp = atletaID
	f.gotUserIDByResp = userID
	return f.isAtletaDoResponsavel, f.errIsAtletaDoResp
}

type fakeMensalidadeRepo struct {
	listMensalidades            []*financeiro.Mensalidade
	listPorRespMensalidades     []*financeiro.Mensalidade
	getByID                     *financeiro.Mensalidade
	getByIDPorResponsavel       *financeiro.Mensalidade
	usuarioRespCapturado        uuid.UUID
	chamouListPorResponsavel    bool
	chamouGetByIDPorResponsavel bool
}

func (f *fakeMensalidadeRepo) GetByID(_ context.Context, _ uuid.UUID) (*financeiro.Mensalidade, error) {
	return f.getByID, nil
}
func (f *fakeMensalidadeRepo) GetByIDPorResponsavel(_ context.Context, _ uuid.UUID, userID uuid.UUID) (*financeiro.Mensalidade, error) {
	f.chamouGetByIDPorResponsavel = true
	f.usuarioRespCapturado = userID
	return f.getByIDPorResponsavel, nil
}
func (f *fakeMensalidadeRepo) GetByContratoCompetencia(_ context.Context, _ uuid.UUID, _, _ int) (*financeiro.Mensalidade, error) {
	return nil, nil
}
func (f *fakeMensalidadeRepo) List(_ context.Context, _ financeiro.MensalidadeFilter) ([]*financeiro.Mensalidade, int64, error) {
	return f.listMensalidades, int64(len(f.listMensalidades)), nil
}
func (f *fakeMensalidadeRepo) ListPorResponsavel(_ context.Context, userID uuid.UUID, _ financeiro.MensalidadeFilter) ([]*financeiro.Mensalidade, int64, error) {
	f.chamouListPorResponsavel = true
	f.usuarioRespCapturado = userID
	return f.listPorRespMensalidades, int64(len(f.listPorRespMensalidades)), nil
}
func (f *fakeMensalidadeRepo) Save(_ context.Context, _ *financeiro.Mensalidade) error {
	return nil
}
func (f *fakeMensalidadeRepo) SaveBatch(_ context.Context, _ []*financeiro.Mensalidade) error {
	return nil
}
func (f *fakeMensalidadeRepo) MarcarVencidas(_ context.Context) (int64, error) { return 0, nil }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// requestComAuth simula uma request que passou pelo middleware Auth — injeta
// user_id e perfil no contexto, igual ao que o middleware faria.
func requestComAuth(method, target, userID, perfil string) *http.Request {
	r := httptest.NewRequest(method, target, nil)
	ctx := context.WithValue(r.Context(), middleware.ContextKeyUserID, userID)
	ctx = context.WithValue(ctx, middleware.ContextKeyPerfil, perfil)
	return r.WithContext(ctx)
}

func atletaParaTeste(id uuid.UUID) *atleta.Atleta {
	return &atleta.Atleta{
		ID:             id,
		Nome:           "João",
		DataNascimento: time.Date(2014, 1, 1, 0, 0, 0, 0, time.UTC),
		Status:         atleta.StatusAtivo,
	}
}

func mensalidadeParaTeste(id, atletaID uuid.UUID) *financeiro.Mensalidade {
	return &financeiro.Mensalidade{
		ID:             id,
		AtletaID:       atletaID,
		CompetenciaAno: 2026,
		CompetenciaMes: 5,
		DataVencimento: time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC),
		Valor:          decimal.NewFromInt(150),
		Status:         financeiro.MensalidadePendente,
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// AtletaHandler.GetByID — despacho por perfil
// ─────────────────────────────────────────────────────────────────────────────

func TestAtletaGetByID_AdminUsaGetByID(t *testing.T) {
	atletaID := uuid.New()
	repo := &fakeAtletaRepo{atletaByID: atletaParaTeste(atletaID)}
	h := NewAtletaHandler(nil, nil, nil, nil, repo)

	r := chi.NewRouter()
	r.Get("/atletas/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, requestComAuth(http.MethodGet, "/atletas/"+atletaID.String(), uuid.NewString(), "ADMIN"))

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, uuid.Nil, repo.gotIDByResp, "ADMIN não deve invocar GetByIDPorResponsavel")
}

func TestAtletaGetByID_ResponsavelVeAtletaPropio(t *testing.T) {
	atletaID := uuid.New()
	userID := uuid.New()
	repo := &fakeAtletaRepo{atletaByIDPorResp: atletaParaTeste(atletaID)}
	h := NewAtletaHandler(nil, nil, nil, nil, repo)

	r := chi.NewRouter()
	r.Get("/atletas/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, requestComAuth(http.MethodGet, "/atletas/"+atletaID.String(), userID.String(), "RESPONSAVEL"))

	require.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, atletaID, repo.gotIDByResp)
	assert.Equal(t, userID, repo.gotUserIDByResp)
}

func TestAtletaGetByID_ResponsavelNaoVeAtletaAlheio(t *testing.T) {
	atletaID := uuid.New()
	userID := uuid.New()
	// Repo devolve nil pra simular "não pertence a esse responsável".
	repo := &fakeAtletaRepo{atletaByIDPorResp: nil}
	h := NewAtletaHandler(nil, nil, nil, nil, repo)

	r := chi.NewRouter()
	r.Get("/atletas/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, requestComAuth(http.MethodGet, "/atletas/"+atletaID.String(), userID.String(), "RESPONSAVEL"))

	assert.Equal(t, http.StatusNotFound, w.Code, "deve retornar 404 (sem vazar enumeração)")
}

// ─────────────────────────────────────────────────────────────────────────────
// MensalidadeHandler — bug histórico corrigido
// ─────────────────────────────────────────────────────────────────────────────

func TestMensalidadeList_ResponsavelChamaListPorResponsavel(t *testing.T) {
	atletaID := uuid.New()
	userID := uuid.New()
	repo := &fakeMensalidadeRepo{
		listPorRespMensalidades: []*financeiro.Mensalidade{mensalidadeParaTeste(uuid.New(), atletaID)},
	}
	h := NewMensalidadeHandler(nil, nil, nil, repo)

	w := httptest.NewRecorder()
	h.List(w, requestComAuth(http.MethodGet, "/mensalidades", userID.String(), "RESPONSAVEL"))

	require.Equal(t, http.StatusOK, w.Code)
	assert.True(t, repo.chamouListPorResponsavel, "deve usar ListPorResponsavel quando perfil=RESPONSAVEL")
	assert.Equal(t, userID, repo.usuarioRespCapturado)
}

func TestMensalidadeList_AdminChamaListPadrao(t *testing.T) {
	repo := &fakeMensalidadeRepo{listMensalidades: []*financeiro.Mensalidade{}}
	h := NewMensalidadeHandler(nil, nil, nil, repo)

	w := httptest.NewRecorder()
	h.List(w, requestComAuth(http.MethodGet, "/mensalidades", uuid.NewString(), "ADMIN"))

	require.Equal(t, http.StatusOK, w.Code)
	assert.False(t, repo.chamouListPorResponsavel, "ADMIN não deve chamar a versão escopada")
}

func TestMensalidadeGetByID_ResponsavelNaoVeAlheia(t *testing.T) {
	mensID := uuid.New()
	repo := &fakeMensalidadeRepo{getByIDPorResponsavel: nil}
	h := NewMensalidadeHandler(nil, nil, nil, repo)

	r := chi.NewRouter()
	r.Get("/mensalidades/{id}", h.GetByID)

	w := httptest.NewRecorder()
	r.ServeHTTP(w, requestComAuth(http.MethodGet, "/mensalidades/"+mensID.String(), uuid.NewString(), "RESPONSAVEL"))

	assert.Equal(t, http.StatusNotFound, w.Code)
	assert.True(t, repo.chamouGetByIDPorResponsavel)
}

// ─────────────────────────────────────────────────────────────────────────────
// ResponsavelHandler.ensureAcessoAoAtleta
// ─────────────────────────────────────────────────────────────────────────────

func TestEnsureAcesso_AdminPassa(t *testing.T) {
	atletaRepo := &fakeAtletaRepo{}
	h := &ResponsavelHandler{atletaRepo: atletaRepo}

	r := requestComAuth(http.MethodGet, "/atletas/x/responsaveis", uuid.NewString(), "ADMIN")
	w := httptest.NewRecorder()

	ok := h.ensureAcessoAoAtleta(w, r, uuid.New())
	assert.True(t, ok)
	assert.Equal(t, uuid.Nil, atletaRepo.gotIDByResp, "ADMIN não deve chamar IsAtletaDoResponsavel")
}

func TestEnsureAcesso_ResponsavelOK(t *testing.T) {
	userID := uuid.New()
	atletaID := uuid.New()
	atletaRepo := &fakeAtletaRepo{isAtletaDoResponsavel: true}
	h := &ResponsavelHandler{atletaRepo: atletaRepo}

	r := requestComAuth(http.MethodGet, "/atletas/x/responsaveis", userID.String(), "RESPONSAVEL")
	w := httptest.NewRecorder()

	ok := h.ensureAcessoAoAtleta(w, r, atletaID)
	require.True(t, ok)
	assert.Equal(t, atletaID, atletaRepo.gotIDByResp)
	assert.Equal(t, userID, atletaRepo.gotUserIDByResp)
}

func TestEnsureAcesso_Responsavel404(t *testing.T) {
	atletaRepo := &fakeAtletaRepo{isAtletaDoResponsavel: false}
	h := &ResponsavelHandler{atletaRepo: atletaRepo}

	r := requestComAuth(http.MethodGet, "/atletas/x/responsaveis", uuid.NewString(), "RESPONSAVEL")
	w := httptest.NewRecorder()

	ok := h.ensureAcessoAoAtleta(w, r, uuid.New())
	assert.False(t, ok)
	assert.Equal(t, http.StatusNotFound, w.Code)
}

func TestEnsureAcesso_ErroNoRepo(t *testing.T) {
	atletaRepo := &fakeAtletaRepo{errIsAtletaDoResp: errors.New("db caiu")}
	h := &ResponsavelHandler{atletaRepo: atletaRepo}

	r := requestComAuth(http.MethodGet, "/atletas/x/responsaveis", uuid.NewString(), "RESPONSAVEL")
	w := httptest.NewRecorder()

	ok := h.ensureAcessoAoAtleta(w, r, uuid.New())
	assert.False(t, ok)
	assert.GreaterOrEqual(t, w.Code, 500, "erro do repo vira 5xx")
}
