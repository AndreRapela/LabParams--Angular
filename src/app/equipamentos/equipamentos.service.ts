import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export type StatusEquipamento = 'ATIVO' | 'MANUTENCAO' | 'FORA_DE_USO';
export type TipoEventoEquipamento =
  | 'CALIBRACAO'
  | 'MANUTENCAO_PREVENTIVA'
  | 'MANUTENCAO_CORRETIVA';
export type StatusEvento =
  | 'AGENDADO'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDO'
  | 'CANCELADO';

export interface Equipamento {
  id: number;
  codigo: string;
  nome: string;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  localizacao: string | null;
  criticidade: 'BAIXA' | 'MEDIA' | 'ALTA';
  status: StatusEquipamento;
  requer_calibracao: boolean;
  frequencia_calibracao_dias: number | null;
  ultima_calibracao: string | null;
  proxima_calibracao: string | null;
  status_operacional: string;
  dias_para_calibracao?: number | null;
  disponivel?: boolean;
  motivo_indisponibilidade?: string | null;
}

export interface EventoEquipamento {
  id: number;
  equipamento_id: number;
  tipo: TipoEventoEquipamento;
  status: StatusEvento;
  descricao: string;
  fornecedor: string | null;
  agendado_para: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  resultado: 'APROVADO' | 'REPROVADO' | 'NAO_APLICAVEL' | null;
  certificado_url: string | null;
  observacao: string | null;
  proxima_calibracao: string | null;
  criado_por_nome?: string;
  concluido_por_nome?: string;
}

interface PageResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; pageSize: number };
}

interface DataResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface EquipamentoInput {
  codigo: string;
  nome: string;
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  localizacao?: string;
  criticidade: 'BAIXA' | 'MEDIA' | 'ALTA';
  requer_calibracao: boolean;
  frequencia_calibracao_dias: number | null;
  ultima_calibracao?: string;
  proxima_calibracao?: string;
}

export interface EventoInput {
  tipo: TipoEventoEquipamento;
  status: 'AGENDADO' | 'EM_ANDAMENTO';
  descricao: string;
  fornecedor?: string;
  agendado_para?: string;
}

@Injectable({ providedIn: 'root' })
export class EquipamentosService {
  private readonly baseUrl = `${API_CONFIG.baseUrl}/equipamentos`;

  constructor(private readonly http: HttpClient) {}

  list(options: {
    page: number;
    pageSize: number;
    search?: string;
    somenteBloqueados?: boolean;
  }): Observable<PageResponse<Equipamento>> {
    let params = new HttpParams()
      .set('page', options.page)
      .set('pageSize', options.pageSize);
    if (options.search) params = params.set('search', options.search);
    if (options.somenteBloqueados)
      params = params.set('somenteBloqueados', true);
    return this.http.get<PageResponse<Equipamento>>(this.baseUrl, { params });
  }

  get(id: number): Observable<DataResponse<Equipamento>> {
    return this.http.get<DataResponse<Equipamento>>(`${this.baseUrl}/${id}`);
  }

  create(input: EquipamentoInput): Observable<DataResponse<Equipamento>> {
    return this.http.post<DataResponse<Equipamento>>(this.baseUrl, input);
  }

  events(id: number): Observable<PageResponse<EventoEquipamento>> {
    return this.http.get<PageResponse<EventoEquipamento>>(
      `${this.baseUrl}/${id}/eventos`,
      {
        params: new HttpParams().set('pageSize', 100),
      },
    );
  }

  createEvent(
    id: number,
    input: EventoInput,
  ): Observable<DataResponse<EventoEquipamento>> {
    return this.http.post<DataResponse<EventoEquipamento>>(
      `${this.baseUrl}/${id}/eventos`,
      input,
    );
  }

  startEvent(
    id: number,
    eventId: number,
  ): Observable<DataResponse<EventoEquipamento>> {
    return this.http.post<DataResponse<EventoEquipamento>>(
      `${this.baseUrl}/${id}/eventos/${eventId}/iniciar`,
      {},
    );
  }

  completeEvent(
    id: number,
    eventId: number,
    input: {
      resultado: 'APROVADO' | 'REPROVADO' | 'NAO_APLICAVEL';
      proxima_calibracao?: string;
      certificado_url?: string;
      observacao?: string;
    },
  ): Observable<
    DataResponse<{ evento: EventoEquipamento; equipamento: Equipamento }>
  > {
    return this.http.post<
      DataResponse<{ evento: EventoEquipamento; equipamento: Equipamento }>
    >(`${this.baseUrl}/${id}/eventos/${eventId}/concluir`, input);
  }

  cancelEvent(
    id: number,
    eventId: number,
    motivo: string,
  ): Observable<DataResponse<EventoEquipamento>> {
    return this.http.post<DataResponse<EventoEquipamento>>(
      `${this.baseUrl}/${id}/eventos/${eventId}/cancelar`,
      { motivo },
    );
  }

  setStatus(
    id: number,
    status: StatusEquipamento,
    motivo: string,
  ): Observable<DataResponse<Equipamento>> {
    return this.http.post<DataResponse<Equipamento>>(
      `${this.baseUrl}/${id}/status`,
      {
        status,
        motivo,
      },
    );
  }

  configureCalibration(
    id: number,
    input: {
      requer_calibracao: boolean;
      frequencia_calibracao_dias: number | null;
      motivo: string;
    },
  ): Observable<DataResponse<Equipamento>> {
    return this.http.post<DataResponse<Equipamento>>(
      `${this.baseUrl}/${id}/configuracao-calibracao`,
      input,
    );
  }
}
