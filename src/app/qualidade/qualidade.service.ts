import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';

export type StatusOcorrencia =
  | 'ABERTA'
  | 'EM_INVESTIGACAO'
  | 'PLANO_ACAO'
  | 'VERIFICACAO'
  | 'ENCERRADA'
  | 'CANCELADA';
export type StatusCapa =
  | 'PENDENTE'
  | 'EM_ANDAMENTO'
  | 'CONCLUIDA'
  | 'CANCELADA';

export interface AcaoCapa {
  id: number;
  ocorrencia_id: number;
  tipo: 'CORRETIVA' | 'PREVENTIVA';
  descricao: string;
  responsavel_id: string | null;
  responsavel_nome?: string | null;
  prazo: string | null;
  status: StatusCapa;
  evidencia: string | null;
  vencida?: boolean;
  concluida_em: string | null;
}

export interface OcorrenciaQualidade {
  id: number;
  codigo: string;
  tipo: 'NAO_CONFORMIDADE' | 'DESVIO';
  titulo: string;
  descricao: string;
  origem: string | null;
  gravidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  status: StatusOcorrencia;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  aberta_por_nome: string;
  prazo: string | null;
  contencao: string | null;
  causa_raiz: string | null;
  verificacao_eficacia: string | null;
  decisao_final: string | null;
  total_acoes?: number;
  acoes_pendentes?: number;
  vencida?: boolean;
  acoes?: AcaoCapa[];
  created_at: string;
}

export interface QualitySummary {
  ocorrencias_abertas: number;
  criticas_abertas: number;
  ocorrencias_vencidas: number;
  acoes_capa_vencidas: number;
  encerradas_no_mes: number;
}

export interface ResponsibleUser {
  id: string;
  nome: string;
  email: string;
  perfil: string;
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

export interface OccurrenceInput {
  tipo: 'NAO_CONFORMIDADE' | 'DESVIO';
  titulo: string;
  descricao: string;
  origem?: string;
  gravidade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  responsavel_id?: string;
  prazo?: string;
  contencao?: string;
}

export interface CapaInput {
  tipo: 'CORRETIVA' | 'PREVENTIVA';
  descricao: string;
  responsavel_id?: string;
  prazo?: string;
}

@Injectable({ providedIn: 'root' })
export class QualidadeService {
  private readonly baseUrl = `${API_CONFIG.baseUrl}/qualidade`;

  constructor(private readonly http: HttpClient) {}

  summary(): Observable<DataResponse<QualitySummary>> {
    return this.http.get<DataResponse<QualitySummary>>(
      `${this.baseUrl}/resumo`,
    );
  }

  responsibles(): Observable<DataResponse<ResponsibleUser[]>> {
    return this.http.get<DataResponse<ResponsibleUser[]>>(
      `${this.baseUrl}/responsaveis`,
    );
  }

  list(options: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    tipo?: string;
    vencidas?: boolean;
  }): Observable<PageResponse<OcorrenciaQualidade>> {
    let params = new HttpParams()
      .set('page', options.page)
      .set('pageSize', options.pageSize);
    if (options.search) params = params.set('search', options.search);
    if (options.status) params = params.set('status', options.status);
    if (options.tipo) params = params.set('tipo', options.tipo);
    if (options.vencidas) params = params.set('vencidas', true);
    return this.http.get<PageResponse<OcorrenciaQualidade>>(
      `${this.baseUrl}/ocorrencias`,
      { params },
    );
  }

  get(id: number): Observable<DataResponse<OcorrenciaQualidade>> {
    return this.http.get<DataResponse<OcorrenciaQualidade>>(
      `${this.baseUrl}/ocorrencias/${id}`,
    );
  }

  create(
    input: OccurrenceInput,
  ): Observable<DataResponse<OcorrenciaQualidade>> {
    return this.http.post<DataResponse<OcorrenciaQualidade>>(
      `${this.baseUrl}/ocorrencias`,
      input,
    );
  }

  decide(
    id: number,
    input: {
      status: StatusOcorrencia;
      decisao: string;
      causa_raiz?: string;
      verificacao_eficacia?: string;
    },
  ): Observable<DataResponse<OcorrenciaQualidade>> {
    return this.http.post<DataResponse<OcorrenciaQualidade>>(
      `${this.baseUrl}/ocorrencias/${id}/decisoes`,
      input,
    );
  }

  createAction(
    id: number,
    input: CapaInput,
  ): Observable<DataResponse<AcaoCapa>> {
    return this.http.post<DataResponse<AcaoCapa>>(
      `${this.baseUrl}/ocorrencias/${id}/acoes`,
      input,
    );
  }

  updateAction(
    occurrenceId: number,
    actionId: number,
    input: { status: Exclude<StatusCapa, 'CANCELADA'>; evidencia?: string },
  ): Observable<DataResponse<AcaoCapa>> {
    return this.http.patch<DataResponse<AcaoCapa>>(
      `${this.baseUrl}/ocorrencias/${occurrenceId}/acoes/${actionId}`,
      input,
    );
  }

  cancelAction(
    occurrenceId: number,
    actionId: number,
    motivo: string,
  ): Observable<DataResponse<AcaoCapa>> {
    return this.http.post<DataResponse<AcaoCapa>>(
      `${this.baseUrl}/ocorrencias/${occurrenceId}/acoes/${actionId}/cancelar`,
      { motivo },
    );
  }
}
