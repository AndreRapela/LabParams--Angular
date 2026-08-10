import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { CriarVersaoLaudoPayload } from './laudo.model';
import { LaudosService } from './laudos.service';

describe('LaudosService', () => {
  let service: LaudosService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LaudosService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('envia senha, motivo e observações ao emitir uma revisão', () => {
    const payload: CriarVersaoLaudoPayload = {
      senha: 'senha-segura',
      motivo: 'Correção solicitada pelo responsável técnico.',
      observacoes: null,
    };

    service.criarVersao(42, payload).subscribe();

    const request = http.expectOne(
      API_CONFIG.baseUrl + '/laudos/amostras/42/versoes',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush({ success: true, data: { id: 8 } });
  });

  it('consulta a verificação pública sem incluir credenciais', () => {
    const hash = 'a'.repeat(64);

    service.verificarAutenticidade(hash).subscribe();

    const request = http.expectOne(
      API_CONFIG.baseUrl + '/verificar-laudo/' + hash,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.body).toBeNull();
    request.flush({
      success: true,
      valid: true,
      data: {
        numero: 'LAU-001-V1',
        versao: 1,
        emitido_em: '2026-07-29T12:00:00.000Z',
        conteudo_hash: hash,
        integridade_valida: true,
        laboratorio_nome: 'SYSmLab',
        total_resultados: 2,
      },
    });
  });
});
