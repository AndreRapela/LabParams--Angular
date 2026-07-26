import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

// --- INTERFACES ---

// Interface principal da Amostra (Espelha o que o Backend espera e retorna)
export interface Amostra {
  id?: number;
  codigo_amostra: string;
  numero_da_amostra: string;
  data_coleta: string;
  localizacao: string;
  matriz_id: number;
  usuario_id: string; // UUID do usuário responsável

  // Array de IDs dos parâmetros (Para Create/Update)
  parametros_ids?: number[];

  // --- Campos de Leitura (Vindos dos JOINs do Backend) ---
  matriz_nome?: string;
  usuario_nome?: string;
  usuario_email?: string;
  created_at?: string;

  // Detalhes dos parâmetros vinculados (Vem no findById para exibição)
  parametros_detalhes?: { id: number; nome: string }[];

  qtd_parametros?: number;
}

// Interfaces para os Dropdowns
export interface MatrizOption {
  id: number;
  nome: string;
}

export interface UsuarioOption {
  id: string;
  nome: string;
  email: string;
}

// Envelope padrão da API
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AmostraService {

  // URL base do módulo de Amostras
  private apiUrl = `${API_CONFIG.baseUrl}/amostras`;

  constructor(private http: HttpClient) { }

  // ============================================================
  // CRUD PRINCIPAL
  // ============================================================

  /**
   * Lista todas as amostras
   */
  findAll(): Observable<ApiResponse<Amostra[]>> {
    return this.http.get<ApiResponse<Amostra[]>>(this.apiUrl);
  }

  /**
   * Busca uma amostra por ID (Incluindo os parâmetros vinculados)
   */
  findById(id: number): Observable<ApiResponse<Amostra>> {
    return this.http.get<ApiResponse<Amostra>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Cria uma nova amostra
   * O objeto 'amostra' deve conter 'parametros_ids' e 'usuario_id'
   */
  create(amostra: Amostra): Observable<ApiResponse<Amostra>> {
    return this.http.post<ApiResponse<Amostra>>(this.apiUrl, amostra);
  }

  /**
   * Atualiza uma amostra existente
   */
  update(id: number, amostra: Amostra): Observable<ApiResponse<Amostra>> {
    return this.http.put<ApiResponse<Amostra>>(`${this.apiUrl}/${id}`, amostra);
  }

  /**
   * Exclui uma amostra
   */
  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  // ============================================================
  // DROPDOWNS E AUXILIARES
  // ============================================================

  /**
   * Busca lista de Matrizes para o <select>
   */
  getMatrizes(): Observable<ApiResponse<MatrizOption[]>> {
    return this.http.get<ApiResponse<MatrizOption[]>>(`${this.apiUrl}/matrizes`);
  }

  /**
   * Busca lista de Usuários para o <select>
   */
  getUsuarios(): Observable<ApiResponse<UsuarioOption[]>> {
    return this.http.get<ApiResponse<UsuarioOption[]>>(`${this.apiUrl}/usuarios`);
  }
}
