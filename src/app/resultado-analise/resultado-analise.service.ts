import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

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
}

export interface Matriz {
  id: number;
  nome: string;
}

export interface Legislacao {
  id: number;
  nome: string;
  sigla: string;
}

export interface ResultadoAnalise {
  id?: number;
  valor_medido: number;
  amostra_id: number;
  parametro_id: number;
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

  getParametros(): Observable<ApiResponse<Parametro[]>> {
    return this.http.get<ApiResponse<Parametro[]>>(`${this.apiUrl}/parametros`);
  }

  getMatrizes(): Observable<ApiResponse<Matriz[]>> {
    return this.http.get<ApiResponse<Matriz[]>>(`${this.apiUrl}/matrizes`);
  }

  getLegislacoes(): Observable<ApiResponse<Legislacao[]>> {
    return this.http.get<ApiResponse<Legislacao[]>>(`${this.apiUrl}/legislacoes`);
  }
}
