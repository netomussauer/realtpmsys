import { cn } from "@/shared/lib/utils";

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

/**
 * SectionTitle — padroniza o cabeçalho de cada seção do site institucional.
 *
 * Estrutura:
 *   [eyebrow tag opcional]
 *   [Título grande em fonte display]
 *   [Descrição opcional, secundária]
 *
 * Usado em todas as seções da Home + páginas internas (Sobre, Categorias).
 */
export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionTitleProps) {
  return (
    <header
      className={cn(
        "space-y-2 max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-4xl text-primary tracking-wide md:text-5xl">
        {title}
      </h2>
      {description && (
        <p className="text-base text-muted-foreground md:text-lg">
          {description}
        </p>
      )}
    </header>
  );
}
