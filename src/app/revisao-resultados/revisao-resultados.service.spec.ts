import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { RevisaoResultadosService } from './revisao-resultados.service';

describe('RevisaoResultadosService', () => {
  let service: RevisaoResultadosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RevisaoResultadosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia o filtro pelo query param canônico status', () => {
    service.listar('em_revisao').subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${API_CONFIG.baseUrl}/resultados-analise`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('status')).toBe('em_revisao');
    expect(request.request.params.has('status_resultado')).toBeFalse();
    request.flush({ success: true, data: [] });
  });

  it('preserva o contrato em português da timeline', () => {
    let event:
      | {
          resultado_analise_id: number;
          acao: string;
          created_at: string;
          ator_nome: string | null;
          ator_email?: string | null;
        }
      | undefined;

    service.historico(42).subscribe((response) => {
      event = response.data[0];
    });

    const request = http.expectOne(
      `${API_CONFIG.baseUrl}/resultados-analise/42/historico-workflow`,
    );
    request.flush({
      success: true,
      data: [
        {
          id: 9,
          resultado_analise_id: 42,
          status_anterior: 'em_revisao',
          status_novo: 'aprovado',
          acao: 'APPROVE',
          comentario: 'Critérios técnicos conferidos.',
          created_at: '2026-08-02T12:00:00.000Z',
          ator_nome: 'Responsável técnico',
          ator_email: 'responsavel@example.com',
        },
      ],
    });

    expect(event).toEqual(
      jasmine.objectContaining({
        resultado_analise_id: 42,
        acao: 'APPROVE',
        created_at: '2026-08-02T12:00:00.000Z',
        ator_nome: 'Responsável técnico',
        ator_email: 'responsavel@example.com',
      }),
    );
  });
});
