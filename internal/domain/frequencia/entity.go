// Package frequencia contém as entidades do contexto Frequência:
// Treino (Aggregate Root) e Frequencia (entidade filha).
package frequencia

import (
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// ─────────────────────────────────────────────────────────────────────────────
// TREINO
// ─────────────────────────────────────────────────────────────────────────────

// Treino é uma sessão concreta de treino, com data e turma.
type Treino struct {
	ID         uuid.UUID
	TurmaID    uuid.UUID
	DataTreino time.Time
	HoraInicio string // HH:MM ("" quando ausente)
	HoraFim    string // HH:MM ("" quando ausente)
	Observacao *string
	CriadoEm   time.Time
}

// NewTreino cria um treino validado.
func NewTreino(turmaID uuid.UUID, data time.Time) (*Treino, error) {
	if data.IsZero() {
		return nil, shared.Newf(shared.ErrDomainViolation, "data_treino é obrigatória")
	}
	return &Treino{
		ID:         uuid.New(),
		TurmaID:    turmaID,
		DataTreino: data,
		CriadoEm:   time.Now().UTC(),
	}, nil
}

// SetHorario aceita HH:MM em ambos os campos. Quando ambos vazios, mantém nulos.
// Quando preenchidos, valida que fim > inicio (no nível de string lexicográfica,
// pois HH:MM é comparável).
func (t *Treino) SetHorario(horaInicio, horaFim string) error {
	if horaInicio == "" && horaFim == "" {
		t.HoraInicio = ""
		t.HoraFim = ""
		return nil
	}
	if horaInicio == "" || horaFim == "" {
		return shared.Newf(shared.ErrDomainViolation, "hora_inicio e hora_fim devem ser informadas em conjunto")
	}
	if horaFim <= horaInicio {
		return shared.Newf(shared.ErrDomainViolation, "hora_fim deve ser maior que hora_inicio")
	}
	t.HoraInicio = horaInicio
	t.HoraFim = horaFim
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// FREQUENCIA
// ─────────────────────────────────────────────────────────────────────────────

// Presenca enumera os valores válidos da coluna `presenca`.
type Presenca string

const (
	PresencaPresente    Presenca = "PRESENTE"
	PresencaAusente     Presenca = "AUSENTE"
	PresencaJustificado Presenca = "JUSTIFICADO"
)

// IsValid retorna true se a presença está entre os valores aceitos.
func (p Presenca) IsValid() bool {
	switch p {
	case PresencaPresente, PresencaAusente, PresencaJustificado:
		return true
	}
	return false
}

// Frequencia representa o registro de presença de um atleta em um treino.
type Frequencia struct {
	ID            uuid.UUID
	TreinoID      uuid.UUID
	AtletaID      uuid.UUID
	Presenca      Presenca
	Justificativa *string
	RegistradoEm  time.Time
}

// NewFrequencia cria uma frequência validada.
func NewFrequencia(treinoID, atletaID uuid.UUID, presenca Presenca, justificativa *string) (*Frequencia, error) {
	if !presenca.IsValid() {
		return nil, shared.Newf(shared.ErrDomainViolation, "presenca inválida: "+string(presenca))
	}
	if presenca == PresencaJustificado && (justificativa == nil || *justificativa == "") {
		return nil, shared.Newf(shared.ErrDomainViolation, "justificativa é obrigatória quando presenca = JUSTIFICADO")
	}
	return &Frequencia{
		ID:            uuid.New(),
		TreinoID:      treinoID,
		AtletaID:      atletaID,
		Presenca:      presenca,
		Justificativa: justificativa,
		RegistradoEm:  time.Now().UTC(),
	}, nil
}
