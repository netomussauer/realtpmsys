import Link from "next/link";
import { Instagram, MapPin, Phone, Mail } from "lucide-react";
import { siteConfig } from "@/shared/lib/config";

/**
 * PublicFooter — rodapé do site institucional.
 *
 * 3 colunas: marca/slogan · contato · navegação. Em mobile vira coluna única.
 * Redes sociais como ícones — apenas as configuradas em siteConfig.redes
 * aparecem (Facebook/YouTube são opcionais e omitidos quando null).
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-12 grid gap-10 md:grid-cols-3">
        {/* Marca */}
        <div className="space-y-3">
          <h3 className="font-display text-2xl tracking-wide">
            {siteConfig.name}
          </h3>
          <p className="text-sm text-primary-foreground/80">
            {siteConfig.slogan}
          </p>
          <p className="text-xs text-primary-foreground/60">
            Desde {siteConfig.fundacao} formando atletas e cidadãos em{" "}
            {siteConfig.cidade} / {siteConfig.uf}.
          </p>
        </div>

        {/* Contato */}
        <div className="space-y-2 text-sm">
          <h4 className="font-display text-lg tracking-wide mb-3">Contato</h4>
          <p className="flex items-start gap-2 text-primary-foreground/80">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              {siteConfig.contato.endereco.logradouro}<br />
              {siteConfig.contato.endereco.bairro} —{" "}
              {siteConfig.contato.endereco.cidade}/{siteConfig.contato.endereco.uf}
            </span>
          </p>
          <p className="flex items-center gap-2 text-primary-foreground/80">
            <Phone className="h-4 w-4 shrink-0" />
            <a
              href={`tel:${siteConfig.contato.telefone.replace(/\D/g, "")}`}
              className="hover:text-accent transition-colors"
            >
              {siteConfig.contato.telefone}
            </a>
          </p>
          <p className="flex items-center gap-2 text-primary-foreground/80">
            <Mail className="h-4 w-4 shrink-0" />
            <a
              href={`mailto:${siteConfig.contato.email}`}
              className="hover:text-accent transition-colors"
            >
              {siteConfig.contato.email}
            </a>
          </p>
          {siteConfig.redes.instagram && (
            <p className="flex items-center gap-2 text-primary-foreground/80 pt-2">
              <Instagram className="h-4 w-4 shrink-0" />
              <a
                href={siteConfig.redes.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                Instagram
              </a>
            </p>
          )}
        </div>

        {/* Navegação */}
        <div className="space-y-2 text-sm">
          <h4 className="font-display text-lg tracking-wide mb-3">Navegação</h4>
          <ul className="space-y-1.5">
            {siteConfig.menuPublico.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-primary-foreground/80 hover:text-accent transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link
                href="/login"
                className="text-accent font-semibold hover:underline"
              >
                Acessar sistema →
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Linha de copyright */}
      <div className="border-t border-primary-foreground/10">
        <div className="container py-4 flex flex-col md:flex-row justify-between gap-2 text-xs text-primary-foreground/60">
          <span>
            © {new Date().getFullYear()} {siteConfig.name}. Todos os direitos
            reservados.
          </span>
          <span>Site desenvolvido em casa, com café e Next.js 15.</span>
        </div>
      </div>
    </footer>
  );
}
