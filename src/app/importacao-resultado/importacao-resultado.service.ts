import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import {
  FormatoTemplate,
  ImportacaoResposta
} from './importacao-resultado.model';

@Injectable({
  providedIn: 'root'
})
export class ImportacaoResultadoService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/importacao`;
  private readonly uploadTimeoutMs = 300_000;

  constructor(private readonly http: HttpClient) {}

  importarPlanilha(arquivo: File): Observable<ImportacaoResposta> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);

    return this.http
      .post<ImportacaoResposta>(`${this.apiUrl}/resultado-analise`, formData)
      .pipe(timeout(this.uploadTimeoutMs));
  }

  baixarTemplate(formato: FormatoTemplate = 'csv'): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/template`, {
      params: { formato },
      responseType: 'blob'
    });
  }
}
