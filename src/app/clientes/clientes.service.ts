import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { ApiEnvelope } from '../shared/pilot-workflow/api.types';
import { Cliente, ClientePayload } from './cliente.model';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/clientes`;

  constructor(private readonly http: HttpClient) {}

  listar(busca = ''): Observable<ApiEnvelope<Cliente[]>> {
    const params = busca.trim()
      ? new HttpParams().set('q', busca.trim())
      : undefined;
    return this.http.get<ApiEnvelope<Cliente[]>>(this.apiUrl, { params });
  }

  buscarPorId(id: number): Observable<ApiEnvelope<Cliente>> {
    return this.http.get<ApiEnvelope<Cliente>>(`${this.apiUrl}/${id}`);
  }

  criar(payload: ClientePayload): Observable<ApiEnvelope<Cliente>> {
    return this.http.post<ApiEnvelope<Cliente>>(this.apiUrl, payload);
  }

  atualizar(
    id: number,
    payload: ClientePayload,
  ): Observable<ApiEnvelope<Cliente>> {
    return this.http.put<ApiEnvelope<Cliente>>(`${this.apiUrl}/${id}`, payload);
  }
}
