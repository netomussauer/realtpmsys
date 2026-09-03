import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { authService } from "../services/auth.service";
import { LoginForm } from "./login-form";

vi.mock("../services/auth.service");

const {
  mockedPush,
  mockedRefresh,
  mockedUseRouter,
  mockedUseSearchParams,
  mockedInvalidateQueries,
} = vi.hoisted(() => ({
  mockedPush: vi.fn(),
  mockedRefresh: vi.fn(),
  mockedUseRouter: vi.fn(),
  mockedUseSearchParams: vi.fn(),
  mockedInvalidateQueries: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: mockedUseRouter,
  useSearchParams: mockedUseSearchParams,
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockedInvalidateQueries }),
  };
});

const mockedLogin = vi.mocked(authService.login);

function renderForm() {
  return render(<LoginForm />, { wrapper: QueryWrapper });
}

async function preencherFormulario(user: ReturnType<typeof userEvent.setup>, email: string, senha: string) {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/senha/i), senha);
}

describe("LoginForm", () => {
  beforeEach(() => {
    mockedLogin.mockReset();
    mockedPush.mockReset();
    mockedRefresh.mockReset();
    mockedInvalidateQueries.mockClear();
    mockedUseRouter.mockReturnValue({ push: mockedPush, refresh: mockedRefresh });
    mockedUseSearchParams.mockReturnValue(new URLSearchParams());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exibe erro de validação quando o email é inválido", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email/i), "nao-e-email");
    await user.type(screen.getByLabelText(/senha/i), "qualquercoisa");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Email inválido")).toBeInTheDocument();
    expect(mockedLogin).not.toHaveBeenCalled();
  });

  it("exibe erro de validação quando a senha está vazia", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email/i), "joao@realtpm.app");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("Informe sua senha")).toBeInTheDocument();
  });

  it("chama authService.login com os valores do formulário", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({ userId: "u1", perfil: "ADMIN" });
    renderForm();

    await preencherFormulario(user, "joao@realtpm.app", "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await screen.findByRole("button", { name: /^entrar$/i });
    expect(mockedLogin).toHaveBeenCalledWith({ email: "joao@realtpm.app", senha: "senha123" });
  });

  it("redireciona para /dashboard após login bem-sucedido sem ?next", async () => {
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({ userId: "u1", perfil: "ADMIN" });
    renderForm();

    await preencherFormulario(user, "joao@realtpm.app", "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await vi.waitFor(() => expect(mockedPush).toHaveBeenCalledWith("/dashboard"));
    expect(mockedRefresh).toHaveBeenCalledTimes(1);
    expect(mockedInvalidateQueries).toHaveBeenCalledWith({ queryKey: ["auth", "session"] });
  });

  it("redireciona para a URL de ?next quando presente", async () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("next=/turmas"));
    const user = userEvent.setup();
    mockedLogin.mockResolvedValue({ userId: "u1", perfil: "ADMIN" });
    renderForm();

    await preencherFormulario(user, "joao@realtpm.app", "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    await vi.waitFor(() => expect(mockedPush).toHaveBeenCalledWith("/turmas"));
  });

  it("exibe a mensagem de erro do servidor quando o login falha", async () => {
    const user = userEvent.setup();
    mockedLogin.mockRejectedValue(new Error("credenciais inválidas"));
    renderForm();

    await preencherFormulario(user, "joao@realtpm.app", "senhaerrada");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    expect(await screen.findByText("credenciais inválidas")).toBeInTheDocument();
    expect(mockedPush).not.toHaveBeenCalled();
  });

  it("desabilita o botão de submit enquanto a mutation está pendente", async () => {
    const user = userEvent.setup();
    let resolveLogin: (v: { userId: string; perfil: "ADMIN" }) => void = () => {};
    mockedLogin.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));
    renderForm();

    await preencherFormulario(user, "joao@realtpm.app", "senha123");
    await user.click(screen.getByRole("button", { name: /entrar/i }));

    const button = await screen.findByRole("button", { name: /entrando/i });
    expect(button).toBeDisabled();

    resolveLogin({ userId: "u1", perfil: "ADMIN" });
  });
});
