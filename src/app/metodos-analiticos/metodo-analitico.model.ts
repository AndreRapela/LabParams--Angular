export interface MetodoAnalitico {
  id: number;
  codigo: string;
  nome: string;
  versao: string;
  parametro_id: number | null;
  parametro_nome?: string | null;
  matriz_id: number | null;
  matriz_nome?: string | null;
  referencia_normativa: string | null;
  principio: string | null;
  procedimento_resumido: string | null;
  unidade_resultado: string | null;
  limite_deteccao: number | null;
  limite_quantificacao: number | null;
  incerteza_padrao: number | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MetodoAnaliticoPayload {
  codigo: string;
  nome: string;
  versao: string;
  parametro_id: number | null;
  matriz_id: number | null;
  referencia_normativa: string | null;
  principio: string | null;
  procedimento_resumido: string | null;
  unidade_resultado: string | null;
  limite_deteccao: number | null;
  limite_quantificacao: number | null;
  incerteza_padrao: number | null;
  ativo: boolean;
}
