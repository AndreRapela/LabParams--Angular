export type FormatoTemplate = 'csv' | 'xlsx';

export interface ImportacaoResumo {
  total_linhas: number;
  validadas_com_sucesso: number;
  inseridas_no_banco: number;
  erros_validacao: number;
  erros_insercao: number;
  total_erros: number;
}

export interface ImportacaoErroLinha {
  linha?: number;
  erro: string;
  dados?: Record<string, unknown>;
}

export interface ImportacaoResposta {
  success: boolean;
  message: string;
  resumo: ImportacaoResumo;
  erros?: ImportacaoErroLinha[];
  error?: string;
  request_id?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isResumo(value: unknown): value is ImportacaoResumo {
  if (!isRecord(value)) {
    return false;
  }

  return isFiniteNumber(value['total_linhas'])
    && isFiniteNumber(value['validadas_com_sucesso'])
    && isFiniteNumber(value['inseridas_no_banco'])
    && isFiniteNumber(value['erros_validacao'])
    && isFiniteNumber(value['erros_insercao'])
    && isFiniteNumber(value['total_erros']);
}

function isErroLinha(value: unknown): value is ImportacaoErroLinha {
  if (!isRecord(value) || typeof value['erro'] !== 'string') {
    return false;
  }

  const linha = value['linha'];
  const dados = value['dados'];

  return (linha === undefined || isFiniteNumber(linha))
    && (dados === undefined || isRecord(dados));
}

export function isImportacaoResposta(value: unknown): value is ImportacaoResposta {
  if (!isRecord(value)
    || typeof value['success'] !== 'boolean'
    || typeof value['message'] !== 'string'
    || !isResumo(value['resumo'])) {
    return false;
  }

  const erros = value['erros'];
  const error = value['error'];
  const requestId = value['request_id'];

  return (erros === undefined || (Array.isArray(erros) && erros.every(isErroLinha)))
    && (error === undefined || typeof error === 'string')
    && (requestId === undefined || typeof requestId === 'string');
}
