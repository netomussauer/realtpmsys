/**
 * Tipos compartilhados do conteúdo institucional estático.
 *
 * Os arquivos JSON em `apps/web/content/*.json` são tipados via estes
 * types. Quando o esquema mudar (ex.: adicionar campo "inscricoes_abertas"
 * em Categoria), atualize aqui — o TS quebra todas as páginas que ainda
 * dependem do shape antigo.
 */

export interface Categoria {
  id: string;
  nome: string;
  faixa_etaria: string;
  descricao: string;
  dias_horarios: string;
  valor_mensal: number;
  vagas: "Disponíveis" | "Limitadas" | "Esgotadas" | "Sob consulta";
}

export interface FotoGaleria {
  id: string;
  src: string;
  alt: string;
  categoria: "treino" | "jogo" | "competicao" | "evento" | "infraestrutura";
}

export interface Competicao {
  id: string;
  titulo: string;
  data: string;       // ISO YYYY-MM-DD
  data_fim?: string;  // opcional, evento de múltiplos dias
  local: string;
  categorias: string[];
  status: "previsto" | "em_andamento" | "concluido";
  descricao: string;
}
