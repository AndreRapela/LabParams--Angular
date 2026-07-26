import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ImportacaoResultadoService {

  private readonly apiUrl = environment.apiUrl || 'http://localhost:3000';
  private readonly uploadTimeoutMs = 300_000;

  constructor(private http: HttpClient) {}

  /**
   * Importa planilha de resultados de análise
   * @param arquivo File (CSV, XLS ou XLSX)
   */
  importarPlanilha(arquivo: File): Observable<any> {
    const formData = new FormData();
    formData.append('arquivo', arquivo);

    // O token JWT é adicionado automaticamente pelo interceptor de autenticação
    return this.http
      .post(`${this.apiUrl}/importacao/resultado-analise`, formData)
      .pipe(timeout(this.uploadTimeoutMs));
  }

  /**
   * Baixa template de importação (opcional - para uso futuro)
   * @param formato 'csv' ou 'xlsx'
   */
  baixarTemplate(formato: 'csv' | 'xlsx' = 'csv'): void {
    const url = `${this.apiUrl}/importacao/template?formato=${formato}`;
    window.open(url, '_blank');
  }
}
