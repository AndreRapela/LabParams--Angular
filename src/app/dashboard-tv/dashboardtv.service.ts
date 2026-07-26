import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export interface ComplianceData {
  id: number;
  parameter_name: string;
  current_value: number;
  target_value: number;
  unit: string;
  status: 'conforme' | 'alerta' | 'critico' | 'não conforme';
  last_update: string;
  limite_minimo: number;
  limite_maximo: number;
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
      (item) => item.status === 'não conforme'
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
    // Mapeamento direto dos status - a API já calculou tudo
    const statusMap: {
      [key: string]: 'conforme' | 'alerta' | 'critico' | 'não conforme';
    } = {
      conforme: 'conforme',
      alerta: 'alerta',
      crítico: 'critico',
      'não conforme': 'não conforme',
      'dados inválidos': 'não conforme',
      'dados inválidos - valor': 'não conforme',
      'dados inválidos - mínimo': 'não conforme',
      'dados inválidos - máximo': 'não conforme',
    };

    // Apenas converte valores para formatação
    const currentValue = item.valor_parametro
      ? parseFloat(item.valor_parametro)
      : 0;
    const minLimit = item.limite_minimo ? parseFloat(item.limite_minimo) : 0;
    const maxLimit = item.limite_maximo ? parseFloat(item.limite_maximo) : 0;

    // Usa o status_conformidade calculado pela API
    const status = statusMap[item.status_conformidade] || 'não conforme';

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
      matriz_nome: item.matriz_nome,
      legislacao_sigla: item.legislacao_sigla,
      legislacao_nome: item.legislacao_nome,
    };
  }
}
