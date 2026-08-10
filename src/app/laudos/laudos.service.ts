import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { ApiEnvelope } from '../shared/pilot-workflow/api.types';
import {
  CriarVersaoLaudoPayload,
  LaudoDetalhe,
  LaudoResumo,
  VerificacaoLaudoResponse,
} from './laudo.model';

@Injectable({ providedIn: 'root' })
export class LaudosService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/laudos`;
  private readonly verificationApiUrl = `${API_CONFIG.baseUrl}/verificar-laudo`;

  constructor(private readonly http: HttpClient) {}

  listar(busca = ''): Observable<ApiEnvelope<LaudoResumo[]>> {
    const params = busca.trim()
      ? new HttpParams().set('q', busca.trim())
      : undefined;
    return this.http.get<ApiEnvelope<LaudoResumo[]>>(this.apiUrl, { params });
  }

  buscarPorId(id: number): Observable<ApiEnvelope<LaudoDetalhe>> {
    return this.http.get<ApiEnvelope<LaudoDetalhe>>(`${this.apiUrl}/${id}`);
  }

  criarVersao(
    amostraId: number,
    payload: CriarVersaoLaudoPayload,
  ): Observable<ApiEnvelope<LaudoDetalhe>> {
    return this.http.post<ApiEnvelope<LaudoDetalhe>>(
      `${this.apiUrl}/amostras/${amostraId}/versoes`,
      payload,
    );
  }

  listarPorAmostra(amostraId: number): Observable<ApiEnvelope<LaudoResumo[]>> {
    return this.http.get<ApiEnvelope<LaudoResumo[]>>(
      `${this.apiUrl}/amostras/${amostraId}`,
    );
  }

  obterHtml(id: number): Observable<string> {
    return this.http.get(`${this.apiUrl}/${id}/html`, { responseType: 'text' });
  }

  verificarAutenticidade(hash: string): Observable<VerificacaoLaudoResponse> {
    return this.http.get<VerificacaoLaudoResponse>(
      `${this.verificationApiUrl}/${encodeURIComponent(hash)}`,
    );
  }
}
