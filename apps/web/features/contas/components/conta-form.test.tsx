import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContaForm } from "./conta-form";

describe("ContaForm — criar", () => {
  it("não pede senha (o sistema gera uma temporária)", () => {
    render(<ContaForm mode="criar" onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
    expect(screen.getByText(/senha temporária ao criar a conta/i)).toBeInTheDocument();
  });

  it("valida e-mail antes de enviar", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContaForm mode="criar" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/e-mail/i), "nao-e-email");
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText("E-mail inválido")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("envia e-mail, nome e perfil escolhidos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContaForm mode="criar" onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/e-mail/i), "ana@example.com");
    await user.type(screen.getByLabelText(/nome/i), "Ana");
    await user.selectOptions(screen.getByLabelText(/perfil/i), "RESPONSAVEL");
    await user.click(screen.getByRole("button", { name: /criar conta/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ email: "ana@example.com", nome: "Ana", perfil: "RESPONSAVEL" });
  });

  it("mostra o erro do servidor e desabilita o botão enquanto envia", () => {
    render(<ContaForm mode="criar" serverError="e-mail já está em uso" isSubmitting onSubmit={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("e-mail já está em uso");
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });

  it("chama onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ContaForm mode="criar" onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalled();
  });
});

describe("ContaForm — editar", () => {
  const initial = { nome: "Ana", perfil: "TREINADOR" as const };

  it("mostra o e-mail apenas para leitura", () => {
    render(<ContaForm mode="editar" email="ana@example.com" initial={initial} onSubmit={vi.fn()} />);

    const email = screen.getByLabelText(/e-mail/i);
    expect(email).toHaveValue("ana@example.com");
    expect(email).toBeDisabled();
  });

  it("envia nome e perfil alterados", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContaForm mode="editar" email="ana@example.com" initial={initial} onSubmit={onSubmit} />);

    await user.clear(screen.getByLabelText(/nome/i));
    await user.type(screen.getByLabelText(/nome/i), "Ana Souza");
    await user.selectOptions(screen.getByLabelText(/perfil/i), "ADMIN");
    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ nome: "Ana Souza", perfil: "ADMIN" });
  });

  it("perfilBloqueado: o select fica desabilitado, mas o perfil atual ainda é enviado", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ContaForm
        mode="editar"
        email="adm@example.com"
        initial={{ nome: "Adm", perfil: "ADMIN" }}
        perfilBloqueado
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText(/perfil/i)).toBeDisabled();
    expect(screen.getByText(/não pode alterar o próprio perfil/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /salvar alterações/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({ nome: "Adm", perfil: "ADMIN" });
  });
});
