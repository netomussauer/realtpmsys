"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, User, Phone, Shirt } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { AtletaForm } from "./atleta-form";
import { ResponsavelForm } from "./responsavel-form";
import { UniformeForm } from "./uniforme-form";
import {
  useCadastrarAtleta,
  useAdicionarResponsavel,
  useSetUniforme,
} from "@/features/atletas/hooks/use-mutations";
import type { AtletaFormData } from "@/features/atletas/schemas/atleta.schema";
import type { ResponsavelFormData } from "@/features/atletas/schemas/responsavel.schema";
import type { UniformeFormData } from "@/features/atletas/schemas/uniforme.schema";
import type { AtletaDTO } from "@/features/atletas/types/atleta.types";

/**
 * AtletaFormWizard — orquestra cadastro em 3 steps.
 *
 * Step 1 (Atleta) é obrigatório. Steps 2 (Responsável) e 3 (Uniforme)
 * podem ser pulados — o wizard salva o atleta primeiro, recebe o ID, e
 * só depois chama os endpoints sub-recurso. Cada step é um POST/PUT
 * independente — falha num step não invalida os anteriores.
 *
 * Quando completa: redirect pra /atletas/{id} (página de detalhe).
 */
export function AtletaFormWizard() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [atletaCriado, setAtletaCriado] = useState<AtletaDTO | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const cadastrar = useCadastrarAtleta();
  const adicionarResp = useAdicionarResponsavel(atletaCriado?.id ?? "");
  const setUniforme = useSetUniforme(atletaCriado?.id ?? "");

  const finalizar = () => {
    if (atletaCriado) router.push(`/atletas/${atletaCriado.id}`);
  };

  // ── Step 1 — Atleta (obrigatório) ────────────────────────────────────
  const onSubmitAtleta = async (data: AtletaFormData) => {
    setServerError(null);
    try {
      const created = await cadastrar.mutateAsync(data);
      setAtletaCriado(created);
      setStep(2);
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  // ── Step 2 — Responsável (opcional) ──────────────────────────────────
  const onSubmitResponsavel = async (data: ResponsavelFormData) => {
    setServerError(null);
    try {
      await adicionarResp.mutateAsync(data);
      setStep(3);
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  // ── Step 3 — Uniforme (opcional) ─────────────────────────────────────
  const onSubmitUniforme = async (data: UniformeFormData) => {
    setServerError(null);
    try {
      await setUniforme.mutateAsync(data);
      finalizar();
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      <div className="rounded-lg border border-border bg-card p-6">
        {step === 1 && (
          <>
            <StepHeader
              title="Dados do atleta"
              description="Comece pelos dados pessoais. Você pode adicionar responsável e uniforme em seguida."
            />
            <AtletaForm
              submitLabel="Avançar"
              serverError={serverError}
              isSubmitting={cadastrar.isPending}
              onSubmit={onSubmitAtleta}
              onCancel={() => router.push("/atletas")}
            />
          </>
        )}

        {step === 2 && atletaCriado && (
          <>
            <StepHeader
              title="Responsável"
              description={`Adicione um responsável para ${atletaCriado.nome}. Você pode pular este passo e adicionar depois.`}
            />
            <ResponsavelForm
              submitLabel="Avançar"
              serverError={serverError}
              isSubmitting={adicionarResp.isPending}
              onSubmit={onSubmitResponsavel}
              onSkip={() => setStep(3)}
            />
          </>
        )}

        {step === 3 && atletaCriado && (
          <>
            <StepHeader
              title="Uniforme"
              description={`Tamanhos do uniforme de ${atletaCriado.nome}. Opcional — pode ser definido depois.`}
            />
            <UniformeForm
              submitLabel="Concluir cadastro"
              serverError={serverError}
              isSubmitting={setUniforme.isPending}
              onSubmit={onSubmitUniforme}
              onSkip={finalizar}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: "Atleta", icon: User },
    { num: 2, label: "Responsável", icon: Phone },
    { num: 3, label: "Uniforme", icon: Shirt },
  ] as const;

  return (
    <ol className="flex items-center justify-between">
      {steps.map((s, idx) => {
        const Icon = s.icon;
        const isCompleted = s.num < current;
        const isCurrent = s.num === current;
        return (
          <li key={s.num} className="flex flex-1 items-center">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                  isCompleted && "border-accent bg-accent text-accent-foreground",
                  isCurrent && "border-primary bg-primary text-primary-foreground",
                  !isCurrent && !isCompleted && "border-border bg-muted text-muted-foreground",
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Passo {s.num}
                </p>
                <p
                  className={cn(
                    "text-sm font-medium",
                    (isCompleted || isCurrent) ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {s.label}
                </p>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className={cn("mx-3 h-0.5 flex-1", s.num < current ? "bg-accent" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl text-primary tracking-wide">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
    </div>
  );
}
