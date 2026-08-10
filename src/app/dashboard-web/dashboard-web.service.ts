import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export interface Legislacao {
  id: number;
  nome: string;
  sigla: string;
}

export interface Matriz {
  id: number;
  nome: string;
}

export type ComplianceStatus =
  | 'conforme'
  | 'alerta'
  | 'critico'
  | 'nao-conforme'
  | 'informativo';

export interface ComplianceData {
  id: number;
  parametro_id: number;
  parameter_name: string;
  current_value: number | string | null;
  valor_qualitativo?: string | null;
  min_limit?: number;
  max_limit?: number;
  limite_minimo?: number;
  limite_maximo?: number;
  unit?: string;
  unidade_medida?: string;
  status: ComplianceStatus;
  last_update: string;
  porcentagem?: number;
  tipo_limite?: string;
  criterio_legal?: string | null;
  matriz_nome?: string;
  legislacao_sigla?: string;
  legislacao_nome?: string;
  matriz_id?: number;
  legislacao_id?: number;
}

export interface DashboardStatistics {
  compliant_count: number;
  alert_count: number;
  critical_count: number;
  non_compliant_count: number;
  informative_count?: number;
  total_parameters: number;
}

export interface DashboardResponse {
  success: boolean;
  data: ComplianceData[];
  statistics: DashboardStatistics;
  last_updated: string;
  message?: string;
}

export interface FilterOptionsResponse {
  success: boolean;
  matrizes: Matriz[];
  legislacoes: Legislacao[];
  message?: string;
  timestamp?: string;
}

export interface DashboardFilters {
  matrizId?: number | null;
  legislacaoId?: number | null;
  amostra_numero?: string;
  parametro_id?: number[];
  data_coleta?: string;
  data_publicacao?: string;
  status?: string;
}

const EMPTY_STATISTICS: DashboardStatistics = {
  compliant_count: 0,
  alert_count: 0,
  critical_count: 0,
  non_compliant_count: 0,
  total_parameters: 0,
};

@Injectable({ providedIn: 'root' })
export class DashboardWebService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/dashboard-web`;

  constructor(private readonly http: HttpClient) {}

  getDashboardData(filters: DashboardFilters = {}): Observable<DashboardResponse> {
    return this.http
      .get<DashboardResponse>(this.apiUrl, {
        params: this.buildParams(filters),
      })
      .pipe(
        map((response) => ({
          ...response,
          data: response.data ?? [],
          statistics: response.statistics ?? EMPTY_STATISTICS,
        })),
        catchError((error: HttpErrorResponse) => this.handleError(error))
      );
  }

  getFilterOptions(): Observable<FilterOptionsResponse> {
    return this.http
      .get<FilterOptionsResponse>(`${this.apiUrl}/filter-options`)
      .pipe(
        map((response) => ({
          ...response,
          matrizes: response.matrizes ?? [],
          legislacoes: response.legislacoes ?? [],
        })),
        catchError((error: HttpErrorResponse) => this.handleError(error))
      );
  }

  private buildParams(filters: DashboardFilters): HttpParams {
    let params = new HttpParams();
    const values: Array<[string, string | number | null | undefined]> = [
      ['matriz_id', filters.matrizId],
      ['legislacao_id', filters.legislacaoId],
      ['amostra_numero', filters.amostra_numero],
      ['data_coleta', filters.data_coleta],
      ['data_publicacao', filters.data_publicacao],
      ['status', filters.status],
    ];

    for (const [key, value] of values) {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    }

    if (filters.parametro_id?.length) {
      params = params.set('parametro_id', filters.parametro_id.join(','));
    }

    return params;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    const messages: Record<number, string> = {
      0: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
      401: 'Sua sessão expirou. Entre novamente.',
      403: 'Você não tem permissão para acessar este recurso.',
      404: 'O serviço solicitado não foi encontrado.',
      500: 'O servidor encontrou um erro. Tente novamente em instantes.',
      504: 'O servidor demorou demais para responder.',
    };

    return throwError(
      () => new Error(messages[error.status] ?? 'Não foi possível carregar os dados.')
    );
  }
}
