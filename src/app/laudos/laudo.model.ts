export interface LaudoClienteSnapshot {
  id?: number;
  codigo?: string | null;
  nome_razao_social: string;
  nome_fantasia?: string | null;
  documento?: string | null;
  email?: string | null;
  telefone?: string | null;
  endereco?: string | null;
}

export interface LaudoAmostraSnapshot {
  id?: number;
  codigo_amostra: string;
  numero_da_amostra: string;
  matriz: string | null;
  localizacao?: string | null;
  local_atual?: string | null;
  data_coleta: string | null;
  status?: string | null;
}

export interface LaudoMetodoSnapshot {
  id: number | string;
  codigo: string;
  nome: string;
  versao: string;
  referencia_normativa: string | null;
}

export interface LaudoLegislacaoSnapshot {
  id?: number | string;
  nome: string;
  sigla: string | null;
}

export interface LaudoContextoSnapshot {
  id?: number | string;
  nome: string;
  codigo: string | null;
}

export interface LaudoResultadoSnapshot {
  id: number;
  versao?: number;
  parametro: string;
  unidade: string | null;
  tipo_resultado?: string | null;
  valor_medido: number | string | null;
  valor_qualitativo: string | null;
  status_conformidade: 'conforme' | 'nao-conforme' | 'informativo' | null;
  limite_minimo: number | string | null;
  limite_maximo: number | string | null;
  tipo_limite: string | null;
  criterio_legal: string | null;
  fonte_legal: string | null;
  legislacao: LaudoLegislacaoSnapshot | string | null;
  contexto: LaudoContextoSnapshot | string | null;
  metodo: LaudoMetodoSnapshot | null;
  status_resultado: string;
  aprovado_em?: string | null;
  publicado_em: string | null;
  aprovado_por?: string | null;
  publicado_por?: string | null;
}

export interface LaudoResponsavelSnapshot {
  id: string;
  nome: string;
  email: string;
}

export interface LaudoAssinaturaEletronica {
  id: number | string;
  acao: string;
  metodo: string;
  assinada_em: string;
  hash: string;
  valida: boolean;
}

export interface LaudoSnapshot {
  documento?: {
    id?: number | string;
    numero: string;
    versao: number;
    emitido_em: string;
    motivo_revisao?: string | null;
  };
  laboratorio?: {
    nome: string;
    documento: string | null;
    endereco: string | null;
    contato: string | null;
  };
  cliente?: LaudoClienteSnapshot | null;
  pedido?: {
    id: number;
    codigo: string;
    solicitante: string | null;
    descricao: string;
    data_entrada: string;
    prazo: string | null;
    prioridade: string;
    status?: string;
  } | null;
  amostra?: LaudoAmostraSnapshot | null;
  resultados?: LaudoResultadoSnapshot[];
  responsavel?: LaudoResponsavelSnapshot | null;
  observacoes?: string | null;
}

export interface LaudoResumo {
  id: number;
  numero: string;
  amostra_id: number;
  pedido_analise_id: number | null;
  versao: number;
  conteudo_hash: string;
  observacoes: string | null;
  motivo_revisao?: string | null;
  assinatura_eletronica_id?: number | null;
  emitido_por: string;
  emitido_em: string;
  emitido_por_nome?: string | null;
  emitido_por_email?: string | null;
  codigo_amostra?: string | null;
  numero_da_amostra?: string | null;
  cliente_nome?: string | null;
  total_resultados?: number;
}

export interface LaudoDetalhe extends LaudoResumo {
  snapshot: LaudoSnapshot;
  integridade_valida: boolean;
  integridade_conteudo_valida?: boolean;
  assinatura_valida?: boolean;
  assinatura?: LaudoAssinaturaEletronica | null;
}

export interface CriarVersaoLaudoPayload {
  senha: string;
  motivo: string | null;
  observacoes: string | null;
}

export interface LaudoVerificadoPublico {
  numero: string;
  versao: number;
  emitido_em: string;
  conteudo_hash: string;
  integridade_valida: boolean;
  integridade_conteudo_valida?: boolean;
  assinatura_valida?: boolean;
  assinatura?: LaudoAssinaturaEletronica | null;
  laboratorio_nome: string;
  total_resultados: number;
}

export interface VerificacaoLaudoResponse {
  success: boolean;
  valid: boolean;
  data?: LaudoVerificadoPublico;
  message?: string;
}
