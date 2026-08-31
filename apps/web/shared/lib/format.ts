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

/**
 * formatCurrencyBRL — formata um valor monetário como moeda brasileira
 * (ex.: "150" ou "150.5" → "R$ 150,50").
 *
 * A API financeira (feature `financeiro`) devolve valores como string
 * decimal (não `number`) para evitar erro de arredondamento de ponto
 * flutuante em dinheiro — este helper só formata para exibição, nunca faz
 * aritmética com o valor. Se o valor não puder ser convertido para número,
 * devolve o valor original sem formatar (evita quebrar a UI por um dado
 * inesperado do backend).
 */
export function formatCurrencyBRL(value: string | number): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
