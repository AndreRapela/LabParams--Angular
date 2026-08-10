import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { InventarioService } from './inventario.service';

describe('InventarioService', () => {
  let service: InventarioService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InventarioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia paginação e filtros com os nomes aceitos pela API', () => {
    service
      .list({
        page: 2,
        pageSize: 20,
        search: 'reagente',
        baixoEstoque: true,
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${API_CONFIG.baseUrl}/inventario`,
    );
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('pageSize')).toBe('20');
    expect(request.request.params.get('search')).toBe('reagente');
    expect(request.request.params.get('baixoEstoque')).toBe('true');
    request.flush({
      success: true,
      data: [],
      meta: { total: 0, page: 2, pageSize: 20 },
    });
  });
});
