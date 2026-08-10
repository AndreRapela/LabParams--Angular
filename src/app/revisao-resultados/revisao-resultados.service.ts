import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { ApiEnvelope } from '../shared/pilot-workflow/api.types';
import {
  HistoricoWorkflow,
  PublicarResultadoPayload,
  ResultadoWorkflow,
  RevisarResultadoPayload,
  StatusResultado,
  SubmeterResultadoPayload,
} from './revisao-resultado.model';

@Injectable({ providedIn: 'root' })
export class RevisaoResultadosService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/resultados-analise`;

  constructor(private readonly http: HttpClient) {}

  listar(
    status?: StatusResultado | '',
  ): Observable<ApiEnvelope<ResultadoWorkflow[]>> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<ApiEnvelope<ResultadoWorkflow[]>>(this.apiUrl, {
      params,
    });
  }

  buscarPorId(id: number): Observable<ApiEnvelope<ResultadoWorkflow>> {
    return this.http.get<ApiEnvelope<ResultadoWorkflow>>(
      `${this.apiUrl}/${id}`,
    );
  }

  historico(id: number): Observable<ApiEnvelope<HistoricoWorkflow[]>> {
    return this.http.get<ApiEnvelope<HistoricoWorkflow[]>>(
      `${this.apiUrl}/${id}/historico-workflow`,
    );
  }

  submeter(
    id: number,
    payload: SubmeterResultadoPayload,
  ): Observable<ApiEnvelope<ResultadoWorkflow>> {
    return this.http.post<ApiEnvelope<ResultadoWorkflow>>(
      `${this.apiUrl}/${id}/submeter`,
      payload,
    );
  }

  revisar(
    id: number,
    payload: RevisarResultadoPayload,
  ): Observable<ApiEnvelope<ResultadoWorkflow>> {
    return this.http.post<ApiEnvelope<ResultadoWorkflow>>(
      `${this.apiUrl}/${id}/revisar`,
      payload,
    );
  }

  publicar(
    id: number,
    payload: PublicarResultadoPayload,
  ): Observable<ApiEnvelope<ResultadoWorkflow>> {
    return this.http.post<ApiEnvelope<ResultadoWorkflow>>(
      `${this.apiUrl}/${id}/publicar`,
      payload,
    );
  }
}
