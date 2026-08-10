import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { ImportacaoResposta } from './importacao-resultado.model';
import { ImportacaoResultadoService } from './importacao-resultado.service';

describe('ImportacaoResultadoService', () => {
  let service: ImportacaoResultadoService;
  let httpMock: HttpTestingController;
  const importacaoUrl = `${API_CONFIG.baseUrl}/importacao`;

  const respostaSucesso: ImportacaoResposta = {
    success: true,
    message: 'Importação concluída',
    resumo: {
      total_linhas: 50,
      validadas_com_sucesso: 48,
      inseridas_no_banco: 48,
      erros_validacao: 2,
      erros_insercao: 0,
      total_erros: 2
    },
    erros: [
      { linha: 2, erro: 'Parâmetro não encontrado', dados: {} }
    ]
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ImportacaoResultadoService]
    });

    service = TestBed.inject(ImportacaoResultadoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve ser criado', () => {
    expect(service).toBeTruthy();
  });

  describe('importarPlanilha()', () => {
    it('deve enviar arquivo CSV via FormData e retornar o contrato tipado', () => {
      const file = new File(['teste'], 'resultados.csv', { type: 'text/csv' });
      let respostaRecebida: ImportacaoResposta | undefined;

      service.importarPlanilha(file).subscribe((response) => {
        respostaRecebida = response;
      });

      const request = httpMock.expectOne(`${importacaoUrl}/resultado-analise`);
      expect(request.request.method).toBe('POST');
      expect(request.request.body instanceof FormData).toBeTrue();
      expect(request.request.body.get('arquivo')).toBe(file);

      request.flush(respostaSucesso);
      expect(respostaRecebida).toEqual(respostaSucesso);
    });

    it('deve enviar arquivo XLSX via FormData', () => {
      const file = new File(['teste'], 'resultados.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      service.importarPlanilha(file).subscribe();

      const request = httpMock.expectOne(`${importacaoUrl}/resultado-analise`);
      expect(request.request.body.get('arquivo')).toBe(file);
      request.flush(respostaSucesso);
    });

    it('deve preservar o corpo completo de uma resposta HTTP 422', () => {
      const file = new File(['teste'], 'invalido.csv', { type: 'text/csv' });
      const respostaSemInsercoes: ImportacaoResposta = {
        success: false,
        message: 'Nenhum registro foi inserido no banco de dados',
        resumo: {
          total_linhas: 2,
          validadas_com_sucesso: 0,
          inseridas_no_banco: 0,
          erros_validacao: 2,
          erros_insercao: 0,
          total_erros: 2
        },
        erros: [
          { linha: 2, erro: 'Amostra não encontrada', dados: {} },
          { linha: 3, erro: 'Valor medido inválido', dados: {} }
        ]
      };
      let corpoRecebido: unknown;

      service.importarPlanilha(file).subscribe({
        next: () => fail('A requisição deveria retornar erro'),
        error: (error: unknown) => {
          if (typeof error === 'object' && error !== null && 'error' in error) {
            corpoRecebido = error.error;
          }
        }
      });

      const request = httpMock.expectOne(`${importacaoUrl}/resultado-analise`);
      request.flush(respostaSemInsercoes, {
        status: 422,
        statusText: 'Unprocessable Entity'
      });

      expect(corpoRecebido).toEqual(respostaSemInsercoes);
    });

    it('deve propagar erro de autenticação', () => {
      const file = new File(['teste'], 'resultados.csv', { type: 'text/csv' });
      let statusRecebido: number | undefined;

      service.importarPlanilha(file).subscribe({
        next: () => fail('A requisição deveria retornar erro'),
        error: (error: unknown) => {
          if (typeof error === 'object' && error !== null && 'status' in error) {
            statusRecebido = error.status as number;
          }
        }
      });

      const request = httpMock.expectOne(`${importacaoUrl}/resultado-analise`);
      request.flush(
        { error: 'Token ausente ou inválido' },
        { status: 401, statusText: 'Unauthorized' }
      );

      expect(statusRecebido).toBe(401);
    });

    it('deve encerrar uma importação que ultrapasse cinco minutos', fakeAsync(() => {
      const file = new File(['teste'], 'resultados.csv', { type: 'text/csv' });
      let nomeErro: string | undefined;

      service.importarPlanilha(file).subscribe({
        next: () => fail('A requisição deveria expirar'),
        error: (error: unknown) => {
          if (error instanceof Error) {
            nomeErro = error.name;
          }
        }
      });

      httpMock.expectOne(`${importacaoUrl}/resultado-analise`);
      tick(300_001);

      expect(nomeErro).toBe('TimeoutError');
    }));
  });

  describe('baixarTemplate()', () => {
    it('deve baixar o modelo CSV como Blob pelo HttpClient', () => {
      const arquivo = new Blob(['coluna\nvalor'], { type: 'text/csv' });
      let blobRecebido: Blob | undefined;

      service.baixarTemplate('csv').subscribe((blob) => {
        blobRecebido = blob;
      });

      const request = httpMock.expectOne(
        (candidate) => candidate.url === `${importacaoUrl}/template`
          && candidate.params.get('formato') === 'csv'
      );
      expect(request.request.method).toBe('GET');
      expect(request.request.responseType).toBe('blob');

      request.flush(arquivo);
      expect(blobRecebido).toEqual(arquivo);
    });

    it('deve baixar o modelo XLSX como Blob', () => {
      const arquivo = new Blob(['xlsx'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      service.baixarTemplate('xlsx').subscribe();

      const request = httpMock.expectOne(
        (candidate) => candidate.url === `${importacaoUrl}/template`
          && candidate.params.get('formato') === 'xlsx'
      );
      expect(request.request.responseType).toBe('blob');
      request.flush(arquivo);
    });

    it('deve usar CSV como formato padrão', () => {
      service.baixarTemplate().subscribe();

      const request = httpMock.expectOne(
        (candidate) => candidate.url === `${importacaoUrl}/template`
          && candidate.params.get('formato') === 'csv'
      );
      expect(request.request.params.get('formato')).toBe('csv');
      request.flush(new Blob(['csv'], { type: 'text/csv' }));
    });
  });
});
