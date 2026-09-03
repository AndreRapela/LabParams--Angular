import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { AlertaNaoConformidadeService } from './alerta-naoconformidade.service';

describe('AlertaNaoConformidadeService', () => {
  let service: AlertaNaoConformidadeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AlertaNaoConformidadeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia busca, status canônico e paginação', () => {
    service
      .getAlertas({
        q: '  turbidez  ',
        status: 'nao-conforme',
        page: 2,
        page_size: 20,
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${API_CONFIG.baseUrl}/alertas`,
    );
    expect(request.request.params.get('q')).toBe('turbidez');
    expect(request.request.params.get('status')).toBe('nao-conforme');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('page_size')).toBe('20');
    request.flush({
      success: true,
      data: [],
      stats: { total: 0, alerta: 0, naoConforme: 0, critico: 0 },
      pagination: { page: 2, page_size: 20, total: 0, total_pages: 0 },
    });
  });
});
