import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { ApiPagination } from '../shared/pilot-workflow/api.types';

export interface ParametroGerenciamento {
  id: number;
  nome: string;
  unidade_medida: string | null;
  valor_parametro: number | string | null;
  limite_minimo: number | string | null;
  limite_maximo: number | string | null;
  categoria: string | null;
  tipo_resultado: 'numerico' | 'qualitativo' | string;
  tipo_limite: string | null;
  criterio_texto: string | null;
  fonte_referencia: string | null;
  contexto_legislacao_id: number;
  legislacao_id: number;
  matriz_id: number;
  matriz_nome: string;
  legislacao_sigla: string;
  legislacao_nome: string;
  contexto_nome: string;
  contexto_codigo: string | null;
}

export interface MatrizGerenciamento {
  id: number;
  nome: string;
}

export interface LegislacaoGerenciamento {
  id: number;
  sigla: string;
  nome: string;
}

export interface TelaGerenciamentoParametros {
  parametros: ParametroGerenciamento[];
  matrizes: MatrizGerenciamento[];
  legislacoes: LegislacaoGerenciamento[];
  pagination: ApiPagination;
}

export interface FiltrosGerenciamentoParametros {
  q?: string;
  matriz_id?: number;
  legislacao_id?: number;
  page?: number;
  page_size?: number;
}

@Injectable({ providedIn: 'root' })
export class GerenciamentoParametroService {
  private readonly apiUrl = `${API_CONFIG.baseUrl}/gerenciamento-parametros`;

  constructor(private readonly http: HttpClient) {}

  getTela(
    filters: FiltrosGerenciamentoParametros = {},
  ): Observable<TelaGerenciamentoParametros> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    }

    return this.http
      .get<Partial<TelaGerenciamentoParametros>>(this.apiUrl, { params })
      .pipe(
        map((response) => {
          const parametros = response.parametros ?? [];
          return {
            parametros,
            matrizes: response.matrizes ?? [],
            legislacoes: response.legislacoes ?? [],
            pagination: response.pagination ?? {
              page: filters.page ?? 1,
              page_size: filters.page_size ?? Math.max(parametros.length, 30),
              total: parametros.length,
              total_pages: parametros.length ? 1 : 0,
              has_next: false,
              has_previous: false,
            },
          };
        }),
      );
  }

  updateParametro(
    id: number,
    valorParametro: number | null,
  ): Observable<ParametroGerenciamento> {
    return this.http.put<ParametroGerenciamento>(`${this.apiUrl}/${id}`, {
      valor_parametro: valorParametro,
    });
  }
}
