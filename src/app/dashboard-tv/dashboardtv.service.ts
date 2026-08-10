import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export interface ComplianceData {
  id: number;
  parameter_name: string;
  current_value: number | string | null;
  target_value: number | null;
  unit: string;
  status: 'conforme' | 'alerta' | 'critico' | 'nao-conforme' | 'informativo';
  last_update: string;
  limite_minimo: number | null;
  limite_maximo: number | null;
  tipo_limite?: string;
  criterio_legal?: string | null;
  matriz_nome?: string;
  legislacao_sigla?: string;
  legislacao_nome?: string;
}

export interface DashboardTvResponse {
  success: boolean;
  data: ComplianceData[];
  count: number;
  last_updated: string;
  total_parameters: number;
  compliant_count: number;
  alert_count: number;
  critical_count: number;
  non_compliant_count: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardTvService {
  private apiUrl = `${API_CONFIG.baseUrl}/dashboardtv`;

  constructor(private http: HttpClient) {}

  getDashboardData(
    parametroIds: number[] = []
  ): Observable<DashboardTvResponse> {
    const params: any = {};

    if (parametroIds.length > 0) {
      params.parametro_id = parametroIds;
    }

    return this.http.get<any>(this.apiUrl,{ params }).pipe(
      map((apiResponse) => {
        if (!apiResponse.success) {
          throw new Error('Erro na resposta da API');
        }

        const dataArray = apiResponse.data || [];
        return this.mapApiDataToDashboard(dataArray, apiResponse.count);
      })
    );
  }

  private mapApiDataToDashboard(
    apiData: any[],
    totalCount: number
  ): DashboardTvResponse {
    const mappedData = apiData.map((item) =>
      this.mapApiItemToComplianceData(item)
    );

    const compliantCount = mappedData.filter(
      (item) => item.status === 'conforme'
    ).length;
    const alertCount = mappedData.filter(
      (item) => item.status === 'alerta'
    ).length;
    const criticalCount = mappedData.filter(
      (item) => item.status === 'critico'
    ).length;
    const nonCompliantCount = mappedData.filter(
      (item) => item.status === 'nao-conforme'
    ).length;

    return {
      success: true,
      data: mappedData,
      count: totalCount,
      last_updated: new Date().toISOString(),
      total_parameters: totalCount,
      compliant_count: compliantCount,
      alert_count: alertCount,
      critical_count: criticalCount,
      non_compliant_count: nonCompliantCount,
    };
  }

  private mapApiItemToComplianceData(item: any): ComplianceData {
    const validStatuses = new Set([
      'conforme', 'alerta', 'critico', 'nao-conforme', 'informativo',
    ]);
    const status = validStatuses.has(item.status_conformidade)
      ? item.status_conformidade
      : 'informativo';
    const currentValue = item.valor_qualitativo ||
      (item.valor_parametro === null ? null : Number(item.valor_parametro));
    const minLimit = item.limite_minimo === null ? null : Number(item.limite_minimo);
    const maxLimit = item.limite_maximo === null ? null : Number(item.limite_maximo);

    return {
      id: parseInt(item.id),
      parameter_name: item.nome,
      current_value: currentValue,
      target_value: maxLimit,
      unit: item.unidade_medida,
      status: status, // ← Status calculado pela API
      last_update: item.created_at || new Date().toISOString(),
      limite_minimo: minLimit,
      limite_maximo: maxLimit,
      tipo_limite: item.tipo_limite,
      criterio_legal: item.criterio_legal,
      matriz_nome: item.matriz_nome,
      legislacao_sigla: item.legislacao_sigla,
      legislacao_nome: item.legislacao_nome,
    };
  }
}
