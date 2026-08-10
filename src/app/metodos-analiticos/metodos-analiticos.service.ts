import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { ApiEnvelope } from '../shared/pilot-workflow/api.types';
import {
  MetodoAnalitico,
  MetodoAnaliticoPayload,
} from './metodo-analitico.model';

@Injectable({ providedIn: 'root' })
export class MetodosAnaliticosService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/metodos-analiticos`;

  constructor(private readonly http: HttpClient) {}

  listar(apenasAtivos = false): Observable<ApiEnvelope<MetodoAnalitico[]>> {
    const params = apenasAtivos
      ? new HttpParams().set('ativo', 'true')
      : undefined;
    return this.http.get<ApiEnvelope<MetodoAnalitico[]>>(this.apiUrl, {
      params,
    });
  }

  buscarPorId(id: number): Observable<ApiEnvelope<MetodoAnalitico>> {
    return this.http.get<ApiEnvelope<MetodoAnalitico>>(`${this.apiUrl}/${id}`);
  }

  criar(
    payload: MetodoAnaliticoPayload,
  ): Observable<ApiEnvelope<MetodoAnalitico>> {
    return this.http.post<ApiEnvelope<MetodoAnalitico>>(this.apiUrl, payload);
  }

  atualizar(
    id: number,
    payload: MetodoAnaliticoPayload,
  ): Observable<ApiEnvelope<MetodoAnalitico>> {
    return this.http.put<ApiEnvelope<MetodoAnalitico>>(
      `${this.apiUrl}/${id}`,
      payload,
    );
  }
}
