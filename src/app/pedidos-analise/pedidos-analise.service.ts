import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { ApiEnvelope } from '../shared/pilot-workflow/api.types';
import {
  AlterarStatusPedidoPayload,
  PedidoAnalise,
  PedidoAnalisePayload,
} from './pedido-analise.model';

@Injectable({ providedIn: 'root' })
export class PedidosAnaliseService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/pedidos-analise`;

  constructor(private readonly http: HttpClient) {}

  listar(status?: string): Observable<ApiEnvelope<PedidoAnalise[]>> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<ApiEnvelope<PedidoAnalise[]>>(this.apiUrl, { params });
  }

  buscarPorId(id: number): Observable<ApiEnvelope<PedidoAnalise>> {
    return this.http.get<ApiEnvelope<PedidoAnalise>>(`${this.apiUrl}/${id}`);
  }

  criar(payload: PedidoAnalisePayload): Observable<ApiEnvelope<PedidoAnalise>> {
    return this.http.post<ApiEnvelope<PedidoAnalise>>(this.apiUrl, payload);
  }

  atualizar(
    id: number,
    payload: PedidoAnalisePayload,
  ): Observable<ApiEnvelope<PedidoAnalise>> {
    return this.http.put<ApiEnvelope<PedidoAnalise>>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }

  alterarStatus(
    id: number,
    payload: AlterarStatusPedidoPayload,
  ): Observable<ApiEnvelope<PedidoAnalise>> {
    return this.http.patch<ApiEnvelope<PedidoAnalise>>(
      `${this.apiUrl}/${id}/status`,
      payload,
    );
  }
}
