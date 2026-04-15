// Package shared contém tipos e erros comuns a todos os contextos de domínio.
package shared

import "errors"

// Erros sentinela — use errors.Is para comparação.
var (
	// Genéricos
	ErrNotFound        = errors.New("entidade não encontrada")
	ErrConflict        = errors.New("conflito de estado ou unicidade")
	ErrDomainViolation = errors.New("regra de domínio violada")

	// Atletas
	ErrNomeObrigatorio  = errors.New("nome do atleta é obrigatório")
	ErrCPFInvalido      = errors.New("CPF deve ter 11 dígitos numéricos")
	ErrAtletaJaInativo  = errors.New("atleta já está inativo")
	ErrAtletaJaSuspenso = errors.New("atleta já está suspenso")

	// Financeiro
	ErrMensalidadeJaPaga      = errors.New("mensalidade já foi paga")
	ErrMensalidadeCancelada   = errors.New("mensalidade cancelada não pode ser paga")
	ErrMensalidadePagaNaoPodeSerCancelada = errors.New("mensalidade paga não pode ser cancelada")
	ErrContratoAtivoExistente = errors.New("atleta já possui contrato ativo")
	ErrPlanoInativo           = errors.New("plano está inativo")
	ErrDiasSemanasInvalido    = errors.New("dias por semana deve ser 2, 3 ou 5")
	ErrValorInvalido          = errors.New("valor deve ser positivo")
	ErrDiaVencimentoInvalido  = errors.New("dia de vencimento deve estar entre 1 e 28")

	// Turmas
	ErrTurmaSemVagas          = errors.New("turma atingiu capacidade máxima")
	ErrAtletaJaMatriculado    = errors.New("atleta já possui matrícula ativa nesta turma")
	ErrFaixaEtariaInvalida    = errors.New("faixa etária inválida: min deve ser <= max, entre 4 e 18")
)

// DomainError enriquece um erro sentinela com contexto adicional.
type DomainError struct {
	Sentinel error
	Detail   string
}

func (e *DomainError) Error() string {
	if e.Detail != "" {
		return e.Sentinel.Error() + ": " + e.Detail
	}
	return e.Sentinel.Error()
}

func (e *DomainError) Is(target error) bool {
	return errors.Is(e.Sentinel, target)
}

func (e *DomainError) Unwrap() error { return e.Sentinel }

// Newf cria um DomainError com contexto.
func Newf(sentinel error, detail string) error {
	return &DomainError{Sentinel: sentinel, Detail: detail}
}
