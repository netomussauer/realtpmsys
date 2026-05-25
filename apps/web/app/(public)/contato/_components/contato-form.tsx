"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { siteConfig } from "@/shared/lib/config";

/**
 * Schema do formulário. Validado client-side com Zod + RHF.
 *
 * Trade-off pragmático: sem backend de envio de email ainda. O submit
 * monta um link `mailto:` pré-preenchido e abre o cliente nativo do
 * usuário. Em fase futura, trocar pra um POST /api/contato ou serviço
 * tipo Resend/SendGrid quando volume de mensagens justificar.
 */
const contatoSchema = z.object({
  nome: z.string().min(3, "Informe seu nome completo").max(120),
  email: z.string().email("Email inválido"),
  telefone: z
    .string()
    .min(10, "Telefone incompleto")
    .max(20),
  assunto: z.string().min(3, "Informe o assunto").max(120),
  mensagem: z.string().min(10, "Mensagem muito curta").max(2000),
});

type ContatoFormData = z.infer<typeof contatoSchema>;

export function ContatoForm() {
  const [enviado, setEnviado] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ContatoFormData>({
    resolver: zodResolver(contatoSchema),
  });

  const onSubmit = (data: ContatoFormData) => {
    const body = encodeURIComponent(
      `Nome: ${data.nome}\nTelefone: ${data.telefone}\nEmail: ${data.email}\n\nMensagem:\n${data.mensagem}`,
    );
    const subject = encodeURIComponent(`[Site] ${data.assunto}`);
    window.location.href = `mailto:${siteConfig.contato.email}?subject=${subject}&body=${body}`;
    setEnviado(true);
    reset();
  };

  if (enviado) {
    return (
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-accent" />
        <h3 className="mt-4 font-display text-xl text-primary">
          Email aberto no seu app
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifique seu cliente de email — a mensagem foi pré-preenchida com
          seus dados. Caso queira enviar outra, clique no botão abaixo.
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => setEnviado(false)}
        >
          Enviar nova mensagem
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <FormField
        label="Nome completo"
        error={errors.nome?.message}
      >
        <input
          {...register("nome")}
          type="text"
          autoComplete="name"
          className="form-input"
        />
      </FormField>

      <div className="grid gap-4 md:grid-cols-2">
        <FormField label="Email" error={errors.email?.message}>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            className="form-input"
          />
        </FormField>
        <FormField label="Telefone / WhatsApp" error={errors.telefone?.message}>
          <input
            {...register("telefone")}
            type="tel"
            autoComplete="tel"
            placeholder="(21) 99999-9999"
            className="form-input"
          />
        </FormField>
      </div>

      <FormField label="Assunto" error={errors.assunto?.message}>
        <input
          {...register("assunto")}
          type="text"
          placeholder="Ex.: Interesse em matricular meu filho"
          className="form-input"
        />
      </FormField>

      <FormField label="Mensagem" error={errors.mensagem?.message}>
        <textarea
          {...register("mensagem")}
          rows={5}
          className="form-input resize-y"
        />
      </FormField>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={isSubmitting}
        className="w-full sm:w-auto"
      >
        <Send className="h-4 w-4" />
        {isSubmitting ? "Enviando..." : "Enviar mensagem"}
      </Button>

      <p className="text-xs text-muted-foreground">
        Ao enviar, seu cliente de email é aberto com a mensagem pré-preenchida.
        Nenhum dado é armazenado no servidor.
      </p>
    </form>
  );
}

/** Campo padrão — label + input/textarea + mensagem de erro. */
function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
