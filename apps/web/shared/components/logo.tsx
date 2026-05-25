import Link from "next/link";
import { cn } from "@/shared/lib/utils";
import { siteConfig } from "@/shared/lib/config";

interface LogoProps {
  /** Quando true, renderiza só as iniciais + sem texto longo (mobile/sidebar). */
  compact?: boolean;
  /** Cor — usa primary (escuro sobre claro) ou primary-foreground (claro sobre escuro). */
  variant?: "primary" | "inverse";
  className?: string;
}

/**
 * Logo — marca da Academia Real TPM como Link para "/".
 *
 * Placeholder textual com tipografia display + escudo CSS estilizado. Quando
 * houver SVG/PNG oficial, substituir o <span class="shield"> por <Image />.
 */
export function Logo({ compact = false, variant = "primary", className }: LogoProps) {
  const tone =
    variant === "inverse"
      ? "text-primary-foreground"
      : "text-primary";

  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 group", className)}
      aria-label={siteConfig.name}
    >
      {/* "Escudo" — círculo com iniciais. Substituir por <Image src="/logo.svg"/> quando tiver. */}
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 font-display text-lg tracking-tight",
          variant === "inverse"
            ? "border-accent text-accent"
            : "border-primary text-primary bg-background",
        )}
        aria-hidden="true"
      >
        RT
      </span>
      <span className={cn("flex flex-col leading-none", tone)}>
        <span className="font-display text-xl tracking-wide">
          {compact ? siteConfig.shortName : siteConfig.name}
        </span>
        {!compact && (
          <span className="text-[0.65rem] uppercase tracking-widest opacity-75">
            {siteConfig.cidade} — {siteConfig.uf}
          </span>
        )}
      </span>
    </Link>
  );
}
