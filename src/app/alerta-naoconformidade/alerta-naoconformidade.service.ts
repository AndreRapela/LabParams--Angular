import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { ApiPagination } from '../shared/pilot-workflow/api.types';

export type AlertaStatus = 'ALERTA' | 'NÃO CONFORME' | 'CRÍTICO';
export type AlertaStatusFilter = '' | 'alerta' | 'nao-conforme' | 'critico';

export interface Alerta {
  id: number;
  valor_medido: number | string | null;
  valor_qualitativo?: string | null;
  data_alerta: string;
  parametro_nome: string;
  unidade_medida: string;
  limite_minimo?: string | null;
  limite_maximo?: string | null;
  matriz_nome: string;
  contexto_nome?: string | null;
  status: AlertaStatus;
  mensagem_limite: string;
}

export interface AlertaStats {
  total: number;
  alerta: number;
  naoConforme: number;
  critico: number;
}

export interface AlertaFilters {
  q?: string;
  status?: AlertaStatusFilter;
  page: number;
  page_size: number;
}

export interface AlertaResponse {
  success: boolean;
  data: Alerta[];
  stats: AlertaStats;
  pagination: ApiPagination;
  error?: string;
}

const EMPTY_STATS: AlertaStats = {
  total: 0,
  alerta: 0,
  naoConforme: 0,
  critico: 0,
};

@Injectable({ providedIn: 'root' })
export class AlertaNaoConformidadeService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/alertas`;

  constructor(private readonly http: HttpClient) {}

  getAlertas(filters: AlertaFilters): Observable<AlertaResponse> {
    let params = new HttpParams()
      .set('page', filters.page)
      .set('page_size', filters.page_size);
    const search = filters.q?.trim();
    if (search) params = params.set('q', search);
    if (filters.status) params = params.set('status', filters.status);

    return this.http.get<AlertaResponse>(this.apiUrl, { params }).pipe(
      map((response) => ({
        ...response,
        data: response.data ?? [],
        stats: response.stats ?? EMPTY_STATS,
        pagination: response.pagination ?? {
          page: filters.page,
          page_size: filters.page_size,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_previous: false,
        },
      })),
    );
  }
}
