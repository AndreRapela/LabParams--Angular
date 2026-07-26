import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

// --- INTERFACES CORRIGIDAS ---

// Define o formato do dado unitário que vem do banco para o gráfico
// CORREÇÃO: Alinhado com o backend real que retorna valor_parametro
export interface DadosGrafico {
  parametro: string;
  valor_parametro: number | string; // CORRIGIDO: valor_parametro (não valor_medio)
  // total_analises REMOVIDO: não é retornado pelo backend atual
}

// Define o envelope padrão da sua API (success, data, message)
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  count?: number;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GraficoParametroService {

  // URL da Rota que criamos no Backend (ajuste a porta se necessário)
  private apiUrl = `${API_CONFIG.baseUrl}/grafico-parametros`;

  constructor(private http: HttpClient) { }

  /**
   * Busca os dados para o gráfico de parâmetros
   * @returns Observable com a lista de dados para o gráfico
   */
  getDadosGrafico(): Observable<ApiResponse<DadosGrafico[]>> {
    return this.http.get<ApiResponse<DadosGrafico[]>>(this.apiUrl);
  }
}
