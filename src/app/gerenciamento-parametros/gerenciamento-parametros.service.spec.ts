import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { GerenciamentoParametroService } from './gerenciamento-parametros.service';

describe('GerenciamentoParametroService', () => {
  let service: GerenciamentoParametroService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GerenciamentoParametroService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('carrega a tela pelo endpoint administrativo', () => {
    service.getTela().subscribe((response) => {
      expect(response.parametros).toEqual([]);
      expect(response.pagination).toEqual({
        page: 1,
        page_size: 30,
        total: 0,
        total_pages: 0,
        has_next: false,
        has_previous: false,
      });
    });

    const request = http.expectOne(
      `${API_CONFIG.baseUrl}/gerenciamento-parametros`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ parametros: [], matrizes: [], legislacoes: [] });
  });

  it('envia busca, filtros e paginação ao servidor e preserva os metadados', () => {
    const pagination = {
      page: 2,
      page_size: 30,
      total: 31,
      total_pages: 2,
      has_next: false,
      has_previous: true,
    };
    service
      .getTela({
        q: 'turbidez',
        matriz_id: 3,
        legislacao_id: 7,
        page: 2,
        page_size: 30,
      })
      .subscribe((response) => expect(response.pagination).toEqual(pagination));

    const request = http.expectOne(
      (candidate) => candidate.url === `${API_CONFIG.baseUrl}/gerenciamento-parametros`,
    );
    expect(request.request.params.get('q')).toBe('turbidez');
    expect(request.request.params.get('matriz_id')).toBe('3');
    expect(request.request.params.get('legislacao_id')).toBe('7');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('page_size')).toBe('30');
    request.flush({
      parametros: [],
      matrizes: [],
      legislacoes: [],
      pagination,
    });
  });

  it('atualiza somente o valor operacional no endpoint protegido', () => {
    service.updateParametro(42, 1.25).subscribe();

    const request = http.expectOne(
      `${API_CONFIG.baseUrl}/gerenciamento-parametros/42`,
    );
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ valor_parametro: 1.25 });
    request.flush({ id: 42, valor_parametro: 1.25 });
  });
});
