import { describe, expect, it } from "vitest";
import { horarioSchema, turmaSchema } from "./turma.schema";

const valido = {
  nome: "Sub-13 Manhã",
  faixa_etaria_min: 10,
  faixa_etaria_max: 13,
  capacidade_max: 20,
};

describe("turmaSchema", () => {
  it("aceita dados válidos e preenche horarios com array vazio por padrão", () => {
    const result = turmaSchema.safeParse(valido);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.horarios).toEqual([]);
    }
  });

  it("rejeita nome com menos de 3 caracteres", () => {
    const result = turmaSchema.safeParse({ ...valido, nome: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome deve ter ao menos 3 caracteres");
    }
  });

  it("rejeita nome com mais de 150 caracteres", () => {
    const result = turmaSchema.safeParse({ ...valido, nome: "a".repeat(151) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome muito longo");
    }
  });

  it("rejeita quando faixa_etaria_min não é um número (coerção falha)", () => {
    const result = turmaSchema.safeParse({ ...valido, faixa_etaria_min: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Informe a idade mínima");
    }
  });

  it("rejeita faixa_etaria_min fracionária", () => {
    const result = turmaSchema.safeParse({ ...valido, faixa_etaria_min: 4.5 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Idade deve ser um número inteiro");
    }
  });

  it("rejeita faixa_etaria_min abaixo de 4", () => {
    const result = turmaSchema.safeParse({ ...valido, faixa_etaria_min: 2 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Idade mínima permitida é 4");
    }
  });

  it("rejeita faixa_etaria_max acima de 18", () => {
    const result = turmaSchema.safeParse({ ...valido, faixa_etaria_max: 25 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Idade máxima permitida é 18");
    }
  });

  it("rejeita quando faixa_etaria_max é menor que faixa_etaria_min", () => {
    const result = turmaSchema.safeParse({ ...valido, faixa_etaria_min: 15, faixa_etaria_max: 10 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Idade máxima deve ser maior ou igual à mínima");
      expect(result.error.issues[0].path).toEqual(["faixa_etaria_max"]);
    }
  });

  it("rejeita capacidade_max igual a zero", () => {
    const result = turmaSchema.safeParse({ ...valido, capacidade_max: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Capacidade deve ser maior que zero");
    }
  });

  it("normaliza treinador_id vazio (\"\") para undefined", () => {
    const result = turmaSchema.safeParse({ ...valido, treinador_id: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.treinador_id).toBeUndefined();
    }
  });

  it("rejeita treinador_id que não é um UUID válido", () => {
    const result = turmaSchema.safeParse({ ...valido, treinador_id: "nao-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Treinador inválido");
    }
  });

  it("normaliza campo_id vazio (\"\") para undefined", () => {
    const result = turmaSchema.safeParse({ ...valido, campo_id: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.campo_id).toBeUndefined();
    }
  });

  it("rejeita campo_id que não é um UUID válido", () => {
    const result = turmaSchema.safeParse({ ...valido, campo_id: "nao-uuid" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Campo inválido");
    }
  });
});

describe("horarioSchema", () => {
  const horaValida = { dia_semana: "SEG" as const, hora_inicio: "08:00", hora_fim: "09:00" };

  it("aceita um horário válido", () => {
    expect(horarioSchema.safeParse(horaValida).success).toBe(true);
  });

  it("rejeita dia_semana fora do enum permitido", () => {
    const result = horarioSchema.safeParse({ ...horaValida, dia_semana: "XXX" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecione o dia da semana");
    }
  });

  it("rejeita hora_inicio fora do formato HH:MM", () => {
    const result = horarioSchema.safeParse({ ...horaValida, hora_inicio: "25:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hora inválida (HH:MM)");
    }
  });

  it("rejeita quando hora_fim não é depois de hora_inicio", () => {
    const result = horarioSchema.safeParse({ ...horaValida, hora_inicio: "10:00", hora_fim: "09:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hora fim deve ser depois da hora início");
      expect(result.error.issues[0].path).toEqual(["hora_fim"]);
    }
  });

  it("rejeita quando hora_fim é igual a hora_inicio", () => {
    const result = horarioSchema.safeParse({ ...horaValida, hora_inicio: "09:00", hora_fim: "09:00" });
    expect(result.success).toBe(false);
  });
});
