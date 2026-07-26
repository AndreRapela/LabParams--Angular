import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

// Interface de um item de Alerta
export interface Alerta {
  id: number;
  valor_medido: number | string;
  data_alerta: string; // created_at
  parametro_nome: string;
  unidade_medida: string;
  limite_minimo?: string;
  limite_maximo?: string;
  matriz_nome: string;

  // Campos calculados no Backend
  status: 'ALERTA' | 'NÃO CONFORME' | 'CRÍTICO';
  mensagem_limite: string;
}

// Interface das Estatísticas (Cards)
export interface AlertaStats {
  total: number;
  alerta: number;
  naoConforme: number;
  critico: number;
}

// Interface da Resposta da API
export interface AlertaResponse {
  success: boolean;
  data: Alerta[];
  stats: AlertaStats;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AlertaNaoConformidadeService {

  // URL da API que criamos no arquivo alertasRoutes.js
  private apiUrl = `${API_CONFIG.baseUrl}/alertas`;

  constructor(private http: HttpClient) {}

  /**
   * Busca a lista de não conformidades e as estatísticas
   */
  getAlertas(): Observable<AlertaResponse> {
    return this.http.get<AlertaResponse>(this.apiUrl);
  }
}
