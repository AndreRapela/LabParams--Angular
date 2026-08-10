import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { MetodoAnalitico } from '../metodos-analiticos/metodo-analitico.model';

// Interfaces
export interface Amostra {
  id: number;
  codigo_amostra: string;
  numero_da_amostra: string;
  data_coleta: string;
  localizacao: string;
  matriz_nome: string;
  matriz_id: number;
}

export interface Parametro {
  id: number;
  nome: string;
  unidade_medida: string;
  limite_minimo: number | null;
  limite_maximo: number | null;
  valor_parametro: number | null;
  legislacao_nome: string;
  legislacao_sigla: string;
  matriz_nome: string;
  matriz_id: number;
  legislacao_id: number;
  contexto_legislacao_id: number;
  contexto_nome: string;
  contexto_codigo: string;
  categoria: string;
  tipo_resultado: 'numerico' | 'qualitativo';
  tipo_limite: 'maximo' | 'minimo' | 'faixa' | 'ausencia' | 'informativo';
  criterio_texto: string | null;
  fonte_referencia: string;
}

export interface Matriz {
  id: number;
  nome: string;
}

export interface Legislacao {
  id: number;
  nome: string;
  sigla: string;
  orgao_emissor?: string;
  fonte_url?: string;
  observacao?: string;
}

export interface LegislacaoContexto {
  id: number;
  codigo: string;
  nome: string;
  descricao: string;
  referencia_legal: string;
  legislacao_id: number;
  matriz_id: number;
  fonte_url: string;
}

export interface ResultadoAnalise {
  id?: number;
  valor_medido: number | null;
  valor_qualitativo?: string | null;
  amostra_id: number;
  parametro_id: number;
  metodo_analitico_id?: number | null;
  metodo_codigo?: string | null;
  metodo_nome?: string | null;
  metodo_versao?: string | null;
  status_resultado?: 'rascunho' | 'em_revisao' | 'aprovado' | 'rejeitado' | 'publicado';
  datacoleta: string;
  datadapublicacao?: string;
  created_at?: string;

  // Dados de relacionamento
  amostra_codigo?: string;
  amostra_numero?: string;
  parametro_nome?: string;
  unidade_medida?: string;
  matriz_nome?: string;
  legislacao_nome?: string;
  legislacao_sigla?: string;
  contexto_legislacao_id?: number;
  contexto_nome?: string;
  contexto_codigo?: string;
  limite_minimo?: number | null;
  limite_maximo?: number | null;
  tipo_limite?: Parametro['tipo_limite'];
  criterio_legal?: string | null;
  fonte_legal?: string | null;
  status_conformidade?: 'conforme' | 'nao-conforme' | 'informativo';

  //inseridos para exibição de dados na modal
  matriz?: string;
  legislacao?: string;
  codigodaamostra?: string;
  numerodaamostra?: string;
  matriz_nome_relacional?: string;
  legislacao_nome_relacional?: string;
}

// Interfaces de resposta da API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
}

export interface CreateResponse {
  success: boolean;
  message: string;
  data: ResultadoAnalise;
}

export interface ErrorResponse {
  success: boolean;
  message: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResultadoAnaliseService {
  private apiUrl = `${API_CONFIG.baseUrl}/resultados-analise`;

  constructor(private http: HttpClient) { }

  // Buscar todos os resultados
  getResultados(): Observable<ApiResponse<ResultadoAnalise[]>> {
    return this.http.get<ApiResponse<ResultadoAnalise[]>>(this.apiUrl);
  }

  // Buscar resultado por ID
  getResultadoById(id: number): Observable<ApiResponse<ResultadoAnalise>> {
    return this.http.get<ApiResponse<ResultadoAnalise>>(`${this.apiUrl}/${id}`);
  }

  // Criar novo resultado
  createResultado(resultado: ResultadoAnalise): Observable<CreateResponse> {
    return this.http.post<CreateResponse>(this.apiUrl, resultado);
  }

  // Atualizar resultado
  updateResultado(id: number, resultado: ResultadoAnalise): Observable<CreateResponse> {
    return this.http.put<CreateResponse>(`${this.apiUrl}/${id}`, resultado);
  }

  // Excluir resultado
  deleteResultado(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  // Dropdowns
  getAmostras(): Observable<ApiResponse<Amostra[]>> {
    return this.http.get<ApiResponse<Amostra[]>>(`${this.apiUrl}/amostras`);
  }

  getParametros(contextoId?: number): Observable<ApiResponse<Parametro[]>> {
    const url = contextoId
      ? `${this.apiUrl}/parametros?contexto_id=${contextoId}`
      : `${this.apiUrl}/parametros`;
    return this.http.get<ApiResponse<Parametro[]>>(url);
  }

  getMatrizes(): Observable<ApiResponse<Matriz[]>> {
    return this.http.get<ApiResponse<Matriz[]>>(`${this.apiUrl}/matrizes`);
  }

  getLegislacoes(): Observable<ApiResponse<Legislacao[]>> {
    return this.http.get<ApiResponse<Legislacao[]>>(`${this.apiUrl}/legislacoes`);
  }

  getContextos(): Observable<ApiResponse<LegislacaoContexto[]>> {
    return this.http.get<ApiResponse<LegislacaoContexto[]>>(`${this.apiUrl}/contextos`);
  }

  getMetodosAplicaveis(
    parametroId: number,
    matrizId: number
  ): Observable<ApiResponse<MetodoAnalitico[]>> {
    const params = new HttpParams()
      .set('ativo', 'true')
      .set('aplicavel_parametro_id', parametroId)
      .set('aplicavel_matriz_id', matrizId);
    return this.http.get<ApiResponse<MetodoAnalitico[]>>(
      `${API_CONFIG.baseUrl}/metodos-analiticos`,
      { params }
    );
  }
}
