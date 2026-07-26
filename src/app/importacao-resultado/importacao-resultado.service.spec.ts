import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ImportacaoResultadoService } from './importacao-resultado.service';
import { environment } from '../../environments/environment';

describe('ImportacaoResultadoService', () => {
  let service: ImportacaoResultadoService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl || 'http://localhost:3000';

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

  // =================================================================
  // TESTES DE IMPORTAÇÃO DE PLANILHA
  // =================================================================

  describe('importarPlanilha()', () => {
    it('deve enviar arquivo CSV via FormData', () => {
      const file = new File(['test'], 'teste.csv', { type: 'text/csv' });
      const mockResponse = {
        success: true,
        message: 'Importação concluída',
        resumo: {
          total_linhas: 50,
          inseridas_no_banco: 48,
          erros_validacao: 2,
          erros_insercao: 0
        }
      };

      service.importarPlanilha(file).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      expect(req.request.body.get('arquivo')).toBe(file);

      req.flush(mockResponse);
    });

    it('deve enviar arquivo XLSX via FormData', () => {
      const file = new File(['test'], 'teste.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      service.importarPlanilha(file).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
      expect(req.request.body.get('arquivo')).toBe(file);

      req.flush({ success: true });
    });

    it('deve lidar com erro 400 (arquivo inválido)', () => {
      const file = new File(['test'], 'invalido.csv');
      const mockError = {
        success: false,
        message: 'Arquivo inválido',
        error: 'Formato não suportado'
      };

      service.importarPlanilha(file).subscribe(
        () => fail('Deveria ter falhado'),
        error => {
          expect(error.status).toBe(400);
          expect(error.error).toEqual(mockError);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
      req.flush(mockError, { status: 400, statusText: 'Bad Request' });
    });

    it('deve lidar com erro 401 (não autenticado)', () => {
      const file = new File(['test'], 'teste.csv');

      service.importarPlanilha(file).subscribe(
        () => fail('Deveria ter falhado'),
        error => {
          expect(error.status).toBe(401);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
      req.flush(
        { error: 'Token ausente ou inválido' },
        { status: 401, statusText: 'Unauthorized' }
      );
    });

    it('deve lidar com erro 500 (erro interno)', () => {
      const file = new File(['test'], 'teste.csv');

      service.importarPlanilha(file).subscribe(
        () => fail('Deveria ter falhado'),
        error => {
          expect(error.status).toBe(500);
        }
      );

      const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
      req.flush(
        { error: 'Erro interno do servidor' },
        { status: 500, statusText: 'Internal Server Error' }
      );
    });
  });

  // =================================================================
  // TESTES DE DOWNLOAD DE TEMPLATE
  // =================================================================

  describe('baixarTemplate()', () => {
    it('deve abrir nova janela para template CSV', () => {
      spyOn(window, 'open');

      service.baixarTemplate('csv');

      expect(window.open).toHaveBeenCalledWith(
        `${apiUrl}/importacao/template?formato=csv`,
        '_blank'
      );
    });

    it('deve abrir nova janela para template XLSX', () => {
      spyOn(window, 'open');

      service.baixarTemplate('xlsx');

      expect(window.open).toHaveBeenCalledWith(
        `${apiUrl}/importacao/template?formato=xlsx`,
        '_blank'
      );
    });

    it('deve usar CSV como padrão', () => {
      spyOn(window, 'open');

      service.baixarTemplate();

      expect(window.open).toHaveBeenCalledWith(
        `${apiUrl}/importacao/template?formato=csv`,
        '_blank'
      );
    });
  });

  // =================================================================
  // TESTES DE RESPOSTA COM ERROS DE VALIDAÇÃO
  // =================================================================

  describe('Resposta com erros de validação', () => {
    it('deve processar resposta com erros de validação', () => {
      const file = new File(['test'], 'com_erros.csv');
      const mockResponse = {
        success: false,
        message: 'Nenhum registro foi inserido',
        resumo: {
          total_linhas: 10,
          validadas_com_sucesso: 0,
          inseridas_no_banco: 0,
          erros_validacao: 10,
          erros_insercao: 0,
          total_erros: 10
        },
        erros: [
          { linha: 2, dados: {}, erro: 'Campo obrigatório faltando' },
          { linha: 3, dados: {}, erro: 'Valor inválido' }
        ]
      };

      service.importarPlanilha(file).subscribe(response => {
        expect(response.erros.length).toBe(2);
        expect(response.resumo.erros_validacao).toBe(10);
      });

      const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
      req.flush(mockResponse);
    });
  });

  // =================================================================
  // TESTES DE TIMEOUT
  // =================================================================

  describe('Timeout de requisição', () => {
    it('deve lidar com timeout de requisição', fakeAsync(() => {
      const file = new File(['test'], 'grande.csv');
      let receivedError: Error | undefined;

      service.importarPlanilha(file).subscribe({
        next: () => fail('Deveria ter dado timeout'),
        error: error => receivedError = error
      });

      httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
      tick(300_001);

      expect(receivedError?.name).toBe('TimeoutError');
    }));
  });
});
