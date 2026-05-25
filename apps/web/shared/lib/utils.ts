import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — combina class names com merge de classes Tailwind.
 *
 * Resolve conflitos de classes Tailwind (ex.: `px-2 px-4` mantém só `px-4`),
 * o que clsx puro não faz. Usado em todos os componentes UI.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
