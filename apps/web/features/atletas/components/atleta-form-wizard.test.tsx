import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useCadastrarAtleta,
  useAdicionarResponsavel,
  useSetUniforme,
} from "@/features/atletas/hooks/use-mutations";
import { AtletaFormWizard } from "./atleta-form-wizard";

vi.mock("@/features/atletas/hooks/use-mutations");

const { mockedPush, mockedUseRouter } = vi.hoisted(() => ({
  mockedPush: vi.fn(),
  mockedUseRouter: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: mockedUseRouter,
}));

const mockedUseCadastrarAtleta = vi.mocked(useCadastrarAtleta);
const mockedUseAdicionarResponsavel = vi.mocked(useAdicionarResponsavel);
const mockedUseSetUniforme = vi.mocked(useSetUniforme);

const atletaCriado = { id: "a1", nome: "João da Silva", status: "ATIVO" } as never;

function mockHooks({
  cadastrarMutateAsync = vi.fn().mockResolvedValue(atletaCriado),
  cadastrarPending = false,
  respMutateAsync = vi.fn().mockResolvedValue({ id: "r1" }),
  respPending = false,
  uniformeMutateAsync = vi.fn().mockResolvedValue({ id: "u1" }),
  uniformePending = false,
} = {}) {
  mockedUseCadastrarAtleta.mockReturnValue({
    mutateAsync: cadastrarMutateAsync,
    isPending: cadastrarPending,
  } as unknown as ReturnType<typeof useCadastrarAtleta>);
  mockedUseAdicionarResponsavel.mockReturnValue({
    mutateAsync: respMutateAsync,
    isPending: respPending,
  } as unknown as ReturnType<typeof useAdicionarResponsavel>);
  mockedUseSetUniforme.mockReturnValue({
    mutateAsync: uniformeMutateAsync,
    isPending: uniformePending,
  } as unknown as ReturnType<typeof useSetUniforme>);
  return { cadastrarMutateAsync, respMutateAsync, uniformeMutateAsync };
}

// Cada step do wizard monta um único sub-formulário por vez, então os
// rótulos abaixo (reaproveitados entre AtletaForm/ResponsavelForm/
// UniformeForm) nunca colidem dentro de um mesmo render.
const LABELS: Record<string, RegExp> = {
  nome: /nome completo/i,
  data_nascimento: /data de nascimento/i,
  telefone: /^telefone/i,
  parentesco: /parentesco/i,
  tam_camisa: /camisa/i,
  tam_short: /short/i,
  tam_chuteira: /chuteira/i,
};

function field(_container: HTMLElement, name: string) {
  return screen.getByLabelText(LABELS[name] ?? name, { selector: "input,select,textarea" }) as HTMLElement;
}

async function preencherAtleta(container: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  await user.type(field(container, "nome"), "João da Silva");
  await user.type(field(container, "data_nascimento"), "2010-05-20");
}

describe("AtletaFormWizard", () => {
  beforeEach(() => {
    mockedPush.mockReset();
    mockedUseRouter.mockReturnValue({ push: mockedPush });
  });

  it("inicia no step 1 (Dados do atleta)", () => {
    mockHooks();
    render(<AtletaFormWizard />);
    expect(screen.getByText("Dados do atleta")).toBeInTheDocument();
  });

  it("não avança quando o step 1 tem dados inválidos", async () => {
    const user = userEvent.setup();
    const { cadastrarMutateAsync } = mockHooks();
    const { container } = render(<AtletaFormWizard />);

    await user.type(field(container, "nome"), "Jo");
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(await screen.findByText("Nome deve ter ao menos 3 caracteres")).toBeInTheDocument();
    expect(cadastrarMutateAsync).not.toHaveBeenCalled();
  });

  it("avança para o step 2 (Responsável) após cadastrar o atleta com sucesso", async () => {
    const user = userEvent.setup();
    mockHooks();
    const { container } = render(<AtletaFormWizard />);

    await preencherAtleta(container, user);
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(await screen.findByRole("heading", { name: "Responsável" })).toBeInTheDocument();
    expect(screen.getByText(/Adicione um responsável para João da Silva/)).toBeInTheDocument();
  });

  it("mostra o erro do servidor e permanece no step 1 quando o cadastro falha", async () => {
    const user = userEvent.setup();
    mockHooks({ cadastrarMutateAsync: vi.fn().mockRejectedValue(new Error("CPF já cadastrado")) });
    const { container } = render(<AtletaFormWizard />);

    await preencherAtleta(container, user);
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(await screen.findByText("CPF já cadastrado")).toBeInTheDocument();
    expect(screen.getByText("Dados do atleta")).toBeInTheDocument();
  });

  it("step 2: pular avança para o step 3 sem chamar adicionarResponsavel", async () => {
    const user = userEvent.setup();
    const { respMutateAsync } = mockHooks();
    const { container } = render(<AtletaFormWizard />);

    await preencherAtleta(container, user);
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await screen.findByRole("heading", { name: "Responsável" });

    await user.click(screen.getByRole("button", { name: /pular/i }));

    expect(await screen.findByRole("heading", { name: "Uniforme" })).toBeInTheDocument();
    expect(respMutateAsync).not.toHaveBeenCalled();
  });

  it("step 2: envia o responsável e avança para o step 3", async () => {
    const user = userEvent.setup();
    const { respMutateAsync } = mockHooks();
    const { container } = render(<AtletaFormWizard />);

    await preencherAtleta(container, user);
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await screen.findByRole("heading", { name: "Responsável" });

    await user.type(field(container, "nome"), "Maria da Silva");
    await user.type(field(container, "telefone"), "21999999999");
    await user.selectOptions(field(container, "parentesco"), "MAE");
    await user.click(screen.getByRole("button", { name: /avançar/i }));

    expect(await screen.findByRole("heading", { name: "Uniforme" })).toBeInTheDocument();
    expect(respMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ nome: "Maria da Silva", parentesco: "MAE" }),
    );
  });

  it("step 3: pular chama finalizar e redireciona para /atletas/{id}", async () => {
    const user = userEvent.setup();
    const { uniformeMutateAsync } = mockHooks();
    const { container } = render(<AtletaFormWizard />);

    await preencherAtleta(container, user);
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await screen.findByRole("heading", { name: "Responsável" });
    await user.click(screen.getByRole("button", { name: /pular/i }));
    await screen.findByRole("heading", { name: "Uniforme" });

    await user.click(screen.getByRole("button", { name: /pular/i }));

    expect(mockedPush).toHaveBeenCalledWith("/atletas/a1");
    expect(uniformeMutateAsync).not.toHaveBeenCalled();
  });

  it("step 3: envia o uniforme, chama finalizar e redireciona", async () => {
    const user = userEvent.setup();
    const { uniformeMutateAsync } = mockHooks();
    const { container } = render(<AtletaFormWizard />);

    await preencherAtleta(container, user);
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await screen.findByRole("heading", { name: "Responsável" });
    await user.click(screen.getByRole("button", { name: /pular/i }));
    await screen.findByRole("heading", { name: "Uniforme" });

    await user.selectOptions(field(container, "tam_camisa"), "M");
    await user.selectOptions(field(container, "tam_short"), "P");
    await user.type(field(container, "tam_chuteira"), "38");
    await user.click(screen.getByRole("button", { name: /concluir cadastro/i }));

    await vi.waitFor(() => expect(mockedPush).toHaveBeenCalledWith("/atletas/a1"));
    expect(uniformeMutateAsync).toHaveBeenCalledWith({ tam_camisa: "M", tam_short: "P", tam_chuteira: "38" });
  });

  it("step 3: mostra o erro do servidor e não redireciona quando o uniforme falha", async () => {
    const user = userEvent.setup();
    mockHooks({ uniformeMutateAsync: vi.fn().mockRejectedValue(new Error("Uniforme inválido")) });
    const { container } = render(<AtletaFormWizard />);

    await preencherAtleta(container, user);
    await user.click(screen.getByRole("button", { name: /avançar/i }));
    await screen.findByRole("heading", { name: "Responsável" });
    await user.click(screen.getByRole("button", { name: /pular/i }));
    await screen.findByRole("heading", { name: "Uniforme" });

    await user.selectOptions(field(container, "tam_camisa"), "M");
    await user.selectOptions(field(container, "tam_short"), "P");
    await user.type(field(container, "tam_chuteira"), "38");
    await user.click(screen.getByRole("button", { name: /concluir cadastro/i }));

    expect(await screen.findByText("Uniforme inválido")).toBeInTheDocument();
    expect(mockedPush).not.toHaveBeenCalled();
  });
});
