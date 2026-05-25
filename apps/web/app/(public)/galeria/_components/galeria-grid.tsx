"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { FotoGaleria } from "@/shared/types/content";
import { cn } from "@/shared/lib/utils";

interface GaleriaGridProps {
  fotos: FotoGaleria[];
}

/**
 * GaleriaGrid — grid responsivo de fotos com lightbox próprio.
 *
 * Sem dependências externas (yet-another-react-lightbox, etc.) pra evitar
 * bundle inchado em uma única página. Implementa o essencial:
 *  - click na thumbnail abre overlay fullscreen
 *  - setas ← → e teclado navegam
 *  - ESC fecha
 *  - lock de scroll do body enquanto aberto
 *
 * Trade-off: não tem zoom nem swipe touch — adicionar uma lib quando esses
 * gestos forem demandados.
 */
export function GaleriaGrid({ fotos }: GaleriaGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const isOpen = activeIndex !== null;

  const close = useCallback(() => setActiveIndex(null), []);
  const prev = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i - 1 + fotos.length) % fotos.length)),
    [fotos.length],
  );
  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i + 1) % fotos.length)),
    [fotos.length],
  );

  // Atalhos de teclado quando o lightbox está aberto.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    // Lock scroll do body enquanto overlay aberto.
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, close, prev, next]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {fotos.map((foto, idx) => (
          <button
            key={foto.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className="group relative aspect-square overflow-hidden rounded-lg bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Ver foto: ${foto.alt}`}
          >
            <Image
              src={foto.src}
              alt={foto.alt}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-primary/0 transition-colors group-hover:bg-primary/10" />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Visualizador de foto"
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/95 backdrop-blur"
          onClick={close}
        >
          {/* Fecha */}
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 rounded-full bg-background/10 p-2 text-primary-foreground hover:bg-background/20"
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Anterior */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-4 rounded-full bg-background/10 p-3 text-primary-foreground hover:bg-background/20"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Próxima */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-4 rounded-full bg-background/10 p-3 text-primary-foreground hover:bg-background/20"
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Imagem central */}
          <div
            className="relative h-[80vh] w-[90vw] max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={fotos[activeIndex].src}
              alt={fotos[activeIndex].alt}
              fill
              sizes="90vw"
              className="object-contain"
              priority
            />
            <div
              className={cn(
                "absolute bottom-0 left-0 right-0 p-4 text-center text-sm text-primary-foreground",
                "bg-gradient-to-t from-primary/80 to-transparent",
              )}
            >
              {fotos[activeIndex].alt}
              <span className="ml-3 text-xs text-primary-foreground/60">
                ({activeIndex + 1} / {fotos.length})
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
