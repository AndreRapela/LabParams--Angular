import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class GerencimantoParametroService {

  private api = `${API_CONFIG.baseUrl}/gerenciamento-parametros`;

  constructor(private http: HttpClient) {}

  getTela() {
    return this.http.get<any>(this.api);
  }

  updateParametro(id: number, dados: any) {
    return this.http.put(`${API_CONFIG.baseUrl}/parametros/${id}`, dados);
  }
}
