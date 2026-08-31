/**
 * formatDateBR — formata uma data ISO (YYYY-MM-DD) como DD/MM/AAAA (pt-BR).
 *
 * Extraído de 4 cópias idênticas (`atletas/[id]/page.tsx`,
 * `matricula-table.tsx`, `treino-table.tsx`, `treino-detail-view.tsx`) —
 * achado de code-review: uma correção futura de locale/timezone precisaria
 * ser aplicada em lockstep nas 4 se ficassem duplicadas.
 *
 * O `T12:00:00` evita que o parse interprete a data como UTC meia-noite e
 * "volte" um dia em fusos negativos (ex: America/Sao_Paulo) — meio-dia
 * garante que a data local nunca cruza a virada.
 */
export function formatDateBR(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}
