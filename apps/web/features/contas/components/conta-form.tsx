"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  criarContaSchema,
  editarContaSchema,
  PERFIS,
  type CriarContaFormData,
  type EditarContaFormData,
} from "@/features/contas/schemas/conta.schema";
import { PERFIL_LABELS } from "@/features/contas/components/conta-badges";
import { Field } from "@/features/contas/components/field";
import { Button } from "@/shared/components/ui/button";

interface CommonProps {
  submitLabel?: string;
  /** Mensagem de erro do servidor (resposta da mutation) */
  serverError?: string | null;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

interface CriarProps extends CommonProps {
  mode: "criar";
  onSubmit: SubmitHandler<CriarContaFormData>;
}

interface EditarProps extends CommonProps {
  mode: "editar";
  /** E-mail só é exibido: é a identidade de login e não muda. */
  email: string;
  initial: EditarContaFormData;
  /** Impede o admin de rebaixar a si mesmo (o backend também recusa). */
  perfilBloqueado?: boolean;
  onSubmit: SubmitHandler<EditarContaFormData>;
}

type ContaFormProps = CriarProps | EditarProps;

/**
 * Formulário de conta — criação (e-mail + nome + perfil) e edição (nome +
 * perfil). Nunca pede senha: na criação o sistema gera uma temporária.
 */
export function ContaForm(props: ContaFormProps) {
  return props.mode === "criar" ? <CriarForm {...props} /> : <EditarForm {...props} />;
}

function ServerError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      {message}
    </div>
  );
}

function Actions({
  submitLabel,
  isSubmitting,
  onCancel,
}: Pick<CommonProps, "submitLabel" | "isSubmitting" | "onCancel">) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
      )}
      <Button type="submit" variant="default" disabled={isSubmitting}>
        {isSubmitting ? "Salvando..." : (submitLabel ?? "Salvar")}
      </Button>
    </div>
  );
}

function PerfilOptions() {
  return (
    <>
      {PERFIS.map((p) => (
        <option key={p} value={p}>
          {PERFIL_LABELS[p]}
        </option>
      ))}
    </>
  );
}

function CriarForm({ submitLabel = "Criar conta", serverError, isSubmitting, onCancel, onSubmit }: CriarProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CriarContaFormData>({
    resolver: zodResolver(criarContaSchema),
    defaultValues: { email: "", nome: "", perfil: "TREINADOR" },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <ServerError message={serverError} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="E-mail *" error={errors.email?.message} className="md:col-span-2" hint="Será o login da pessoa.">
          <input {...register("email")} type="email" autoComplete="off" className="form-input" />
        </Field>
        <Field label="Nome" error={errors.nome?.message}>
          <input {...register("nome")} type="text" autoComplete="off" className="form-input" />
        </Field>
        <Field label="Perfil *" error={errors.perfil?.message}>
          <select {...register("perfil")} className="form-input">
            <PerfilOptions />
          </select>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        O sistema gera uma senha temporária ao criar a conta. No primeiro acesso a pessoa
        precisará trocá-la.
      </p>
      <Actions submitLabel={submitLabel} isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}

function EditarForm({
  email,
  initial,
  perfilBloqueado,
  submitLabel = "Salvar alterações",
  serverError,
  isSubmitting,
  onCancel,
  onSubmit,
}: EditarProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditarContaFormData>({
    resolver: zodResolver(editarContaSchema),
    defaultValues: initial,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <ServerError message={serverError} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="E-mail" className="md:col-span-2">
          <input value={email} readOnly disabled className="form-input" />
        </Field>
        <Field label="Nome" error={errors.nome?.message}>
          <input {...register("nome")} type="text" autoComplete="off" className="form-input" />
        </Field>
        <Field
          label="Perfil *"
          error={errors.perfil?.message}
          hint={perfilBloqueado ? "Você não pode alterar o próprio perfil." : "Mudar o perfil encerra as sessões da pessoa."}
        >
          {perfilBloqueado ? (
            // Um <select disabled> não entra no submit do react-hook-form (o
            // valor viria undefined e o Zod recusaria). Mostramos o perfil
            // atual desabilitado e mantemos o valor num campo oculto registrado.
            <select value={initial.perfil} disabled onChange={() => {}} className="form-input">
              <PerfilOptions />
            </select>
          ) : (
            <select {...register("perfil")} className="form-input">
              <PerfilOptions />
            </select>
          )}
        </Field>
        {perfilBloqueado && <input type="hidden" {...register("perfil")} />}
      </div>
      <Actions submitLabel={submitLabel} isSubmitting={isSubmitting} onCancel={onCancel} />
    </form>
  );
}
