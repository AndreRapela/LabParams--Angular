import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export interface DadosGrafico {
  parametro_id: number;
  parametro: string;
  unidade_medida: string | null;
  valor_medio: number | string;
  valor_minimo_observado: number | string;
  valor_maximo_observado: number | string;
  total_analises: number;
  ultima_coleta: string;
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
