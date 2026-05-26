import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AtletaFormWizard } from "@/features/atletas/components/atleta-form-wizard";

/**
 * /atletas/novo — wizard de cadastro em 3 steps (Atleta → Responsável → Uniforme).
 *
 * Server Component que renderiza o wizard (client). O fluxo interno
 * (steps, redirect pós-conclusão) mora no próprio wizard.
 */
export default function NovoAtletaPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/atletas"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para a lista
      </Link>

      <header>
        <h1 className="font-display text-3xl text-primary tracking-wide">
          Novo atleta
        </h1>
        <p className="text-sm text-muted-foreground">
          Cadastro em 3 passos. Você pode pular o responsável e o uniforme se
          ainda não tiver os dados — adicione mais tarde pela página de detalhe.
        </p>
      </header>

      <AtletaFormWizard />
    </div>
  );
}
