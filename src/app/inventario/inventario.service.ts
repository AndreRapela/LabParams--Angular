import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export type TipoInsumo = 'REAGENTE' | 'PADRAO' | 'CONSUMIVEL' | 'OUTRO';
export type StatusLote = 'DISPONIVEL' | 'QUARENTENA' | 'BLOQUEADO' | 'ESGOTADO';
export type TipoMovimento =
  | 'ENTRADA'
  | 'SAIDA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

export interface LoteInsumo {
  id: number;
  insumo_id: number;
  numero_lote: string;
  validade: string | null;
  data_recebimento: string;
  quantidade_inicial: string | number;
  quantidade_atual: string | number;
  fornecedor: string | null;
  local_armazenamento: string | null;
  certificado_url: string | null;
  status: StatusLote;
  situacao_validade?: 'VALIDO' | 'VENCENDO' | 'VENCIDO' | 'SEM_VALIDADE';
}

export interface Insumo {
  id: number;
  codigo: string;
  nome: string;
  tipo: TipoInsumo;
  unidade_medida: string;
  estoque_minimo: string | number;
  fabricante: string | null;
  condicao_armazenamento: string | null;
  estoque_total: string | number;
  estoque_disponivel: string | number;
  lotes_vencendo?: number;
  lotes_vencidos?: number;
  abaixo_estoque_minimo?: boolean;
  lotes?: LoteInsumo[];
}

export interface MovimentoEstoque {
  id: number;
  tipo: TipoMovimento;
  quantidade: string | number;
  saldo_anterior: string | number;
  saldo_posterior: string | number;
  motivo: string;
  referencia: string | null;
  realizado_por_nome?: string;
  created_at: string;
}

export interface PageResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

interface DataResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface InsumoInput {
  codigo: string;
  nome: string;
  tipo: TipoInsumo;
  unidade_medida: string;
  estoque_minimo: number;
  fabricante?: string;
  condicao_armazenamento?: string;
}

export interface LoteInput {
  numero_lote: string;
  validade?: string;
  data_recebimento?: string;
  quantidade_inicial: number;
  fornecedor?: string;
  local_armazenamento?: string;
  certificado_url?: string;
  status: StatusLote;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private readonly baseUrl = `${API_CONFIG.baseUrl}/inventario`;

  constructor(private readonly http: HttpClient) {}

  list(options: {
    page: number;
    pageSize: number;
    search?: string;
    baixoEstoque?: boolean;
  }): Observable<PageResponse<Insumo>> {
    let params = new HttpParams()
      .set('page', options.page)
      .set('pageSize', options.pageSize);
    if (options.search) params = params.set('search', options.search);
    if (options.baixoEstoque) params = params.set('baixoEstoque', true);
    return this.http.get<PageResponse<Insumo>>(this.baseUrl, { params });
  }

  get(id: number): Observable<DataResponse<Insumo>> {
    return this.http.get<DataResponse<Insumo>>(`${this.baseUrl}/${id}`);
  }

  create(input: InsumoInput): Observable<DataResponse<Insumo>> {
    return this.http.post<DataResponse<Insumo>>(this.baseUrl, input);
  }

  createLot(
    insumoId: number,
    input: LoteInput,
  ): Observable<DataResponse<LoteInsumo>> {
    return this.http.post<DataResponse<LoteInsumo>>(
      `${this.baseUrl}/${insumoId}/lotes`,
      input,
    );
  }

  move(
    lotId: number,
    input: {
      tipo: 'ENTRADA' | 'SAIDA';
      quantidade: number;
      motivo: string;
      referencia?: string;
    },
  ): Observable<
    DataResponse<{ lote: LoteInsumo; movimentacao: MovimentoEstoque }>
  > {
    return this.http.post<
      DataResponse<{ lote: LoteInsumo; movimentacao: MovimentoEstoque }>
    >(`${this.baseUrl}/lotes/${lotId}/movimentacoes`, input);
  }

  adjust(
    lotId: number,
    input: {
      tipo: 'AJUSTE_POSITIVO' | 'AJUSTE_NEGATIVO';
      quantidade: number;
      motivo: string;
      referencia?: string;
    },
  ): Observable<
    DataResponse<{ lote: LoteInsumo; movimentacao: MovimentoEstoque }>
  > {
    return this.http.post<
      DataResponse<{ lote: LoteInsumo; movimentacao: MovimentoEstoque }>
    >(`${this.baseUrl}/lotes/${lotId}/ajustes`, input);
  }

  movements(lotId: number): Observable<PageResponse<MovimentoEstoque>> {
    return this.http.get<PageResponse<MovimentoEstoque>>(
      `${this.baseUrl}/lotes/${lotId}/movimentacoes`,
      { params: new HttpParams().set('pageSize', 100) },
    );
  }
}
