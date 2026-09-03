import { describe, expect, it } from "vitest";
import { atletaSchema } from "./atleta.schema";

const valido = {
  nome: "João da Silva",
  data_nascimento: "2010-05-20",
};

describe("atletaSchema", () => {
  it("aceita nome e data de nascimento válidos, sem campos opcionais", () => {
    const result = atletaSchema.safeParse(valido);
    expect(result.success).toBe(true);
  });

  it("aceita todos os campos opcionais preenchidos", () => {
    const result = atletaSchema.safeParse({
      ...valido,
      cpf: "12345678901",
      rg: "1234567",
      endereco: "Rua A, 100",
      cidade: "Rio de Janeiro",
      uf: "RJ",
      cep: "20000000",
      email: "joao@realtpm.app",
      telefone: "21999999999",
    });
    expect(result.success).toBe(true);
  });

  it("normaliza para undefined os opcionais cujo validador de base rejeita \"\" (cpf, uf, cep, email)", () => {
    // cpf/uf/cep têm regex e email tem .email() — nenhum aceita "" na
    // branch principal, então o parse cai na branch `.or(literal("").transform)`.
    const result = atletaSchema.safeParse({
      ...valido,
      cpf: "",
      uf: "",
      cep: "",
      email: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cpf).toBeUndefined();
      expect(result.data.uf).toBeUndefined();
      expect(result.data.cep).toBeUndefined();
      expect(result.data.email).toBeUndefined();
    }
  });

  it("normaliza para undefined rg/endereco/cidade/telefone vazios", () => {
    // Corrigido: rg/endereco/cidade/telefone só têm `.max(N)` como validador
    // de base (sem regex que rejeite ""), então o literal("") precisa vir
    // primeiro no union — testando a branch de base primeiro faria "" ser
    // aceito trivialmente (satisfaz .max(N)) e nunca cair no transform.
    const result = atletaSchema.safeParse({
      ...valido,
      rg: "",
      endereco: "",
      cidade: "",
      telefone: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rg).toBeUndefined();
      expect(result.data.endereco).toBeUndefined();
      expect(result.data.cidade).toBeUndefined();
      expect(result.data.telefone).toBeUndefined();
    }
  });

  it("rejeita nome com menos de 3 caracteres", () => {
    const result = atletaSchema.safeParse({ ...valido, nome: "Jo" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome deve ter ao menos 3 caracteres");
    }
  });

  it("rejeita nome com mais de 150 caracteres", () => {
    const result = atletaSchema.safeParse({ ...valido, nome: "a".repeat(151) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome muito longo");
    }
  });

  it("rejeita data de nascimento em formato inválido", () => {
    const result = atletaSchema.safeParse({ ...valido, data_nascimento: "20-05-2010" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Data inválida (use YYYY-MM-DD)");
    }
  });

  it("rejeita CPF que não tenha 11 dígitos", () => {
    const result = atletaSchema.safeParse({ ...valido, cpf: "123456" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("CPF deve ter 11 dígitos");
    }
  });

  it("rejeita UF que não seja 2 letras maiúsculas", () => {
    const result = atletaSchema.safeParse({ ...valido, uf: "rj" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("UF: 2 letras maiúsculas");
    }
  });

  it("rejeita CEP que não tenha 8 dígitos", () => {
    const result = atletaSchema.safeParse({ ...valido, cep: "2000-000" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("CEP deve ter 8 dígitos (apenas números)");
    }
  });

  it("rejeita email em formato inválido", () => {
    const result = atletaSchema.safeParse({ ...valido, email: "nao-e-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email inválido");
    }
  });
});
