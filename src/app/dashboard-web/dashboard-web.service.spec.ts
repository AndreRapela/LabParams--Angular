import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { DashboardWebService } from './dashboard-web.service';

describe('DashboardWebService', () => {
  let service: DashboardWebService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DashboardWebService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia paginação junto dos filtros existentes', () => {
    service
      .getDashboardData({
        matrizId: 2,
        status: 'critico',
        page: 3,
        page_size: 12,
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) => candidate.url === `${API_CONFIG.baseUrl}/dashboard-web`,
    );
    expect(request.request.params.get('matriz_id')).toBe('2');
    expect(request.request.params.get('status')).toBe('critico');
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('page_size')).toBe('12');
    request.flush({
      success: true,
      data: [],
      statistics: { total_parameters: 0 },
      last_updated: '2026-08-11T12:00:00.000Z',
      pagination: { page: 3, page_size: 12, total: 0, total_pages: 0 },
    });
  });
});
