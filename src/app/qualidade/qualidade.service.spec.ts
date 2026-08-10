import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { QualidadeService } from './qualidade.service';

describe('QualidadeService', () => {
  let service: QualidadeService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(QualidadeService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('registra decisão e transição da ocorrência em um único endpoint', () => {
    service
      .decide(8, {
        status: 'PLANO_ACAO',
        decisao: 'Causa confirmada e plano aprovado.',
        causa_raiz: 'Falha no procedimento de conferência.',
      })
      .subscribe();

    const request = http.expectOne(
      `${API_CONFIG.baseUrl}/qualidade/ocorrencias/8/decisoes`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body.status).toBe('PLANO_ACAO');
    request.flush({ success: true, data: {} });
  });
});
