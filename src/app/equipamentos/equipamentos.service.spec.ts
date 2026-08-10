import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { EquipamentosService } from './equipamentos.service';

describe('EquipamentosService', () => {
  let service: EquipamentosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(EquipamentosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('conclui a intervenção no recurso pertencente ao equipamento', () => {
    service
      .completeEvent(10, 22, {
        resultado: 'APROVADO',
        proxima_calibracao: '2027-07-29',
      })
      .subscribe();

    const request = http.expectOne(
      `${API_CONFIG.baseUrl}/equipamentos/10/eventos/22/concluir`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body.resultado).toBe('APROVADO');
    request.flush({ success: true, data: {} });
  });
});
