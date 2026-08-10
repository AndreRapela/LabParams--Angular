export type StatusResultado =
  | 'rascunho'
  | 'em_revisao'
  | 'aprovado'
  | 'rejeitado'
  | 'publicado';
export type DecisaoRevisao = 'aprovar' | 'rejeitar';

export interface ResultadoWorkflow {
  id: number;
  amostra_id: number;
  parametro_id: number;
  metodo_analitico_id?: number | null;
  amostra_codigo?: string;
  amostra_numero?: string;
  codigodaamostra?: string;
  numerodaamostra?: string;
  parametro_nome?: string;
  matriz_nome?: string;
  matriz?: string;
  legislacao_sigla?: string;
  contexto_nome?: string;
  unidade_medida?: string;
  valor_medido: number | null;
  valor_qualitativo?: string | null;
  status_conformidade?: 'conforme' | 'nao-conforme' | 'informativo';
  status_resultado?: StatusResultado;
  versao?: number;
  datacoleta: string;
  data_submissao?: string | null;
  data_aprovacao?: string | null;
  data_publicacao?: string | null;
  submetido_por_nome?: string | null;
  aprovado_por_nome?: string | null;
  publicado_por_nome?: string | null;
  criterio_legal?: string | null;
}

export interface HistoricoWorkflow {
  id: number;
  resultado_analise_id: number;
  status_anterior: StatusResultado | null;
  status_novo: StatusResultado;
  acao: string;
  comentario: string | null;
  ator_nome: string | null;
  ator_email?: string | null;
  created_at: string;
}

export interface SubmeterResultadoPayload {
  comentario: string | null;
}

export interface RevisarResultadoPayload {
  decisao: DecisaoRevisao;
  senha: string;
  comentario: string | null;
}

export interface PublicarResultadoPayload {
  senha: string;
  comentario: string | null;
}
