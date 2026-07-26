import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ImportacaoResultadoComponent } from './importacao-resultado.component';
import { ImportacaoResultadoService } from './importacao-resultado.service';
import { environment } from '../../environments/environment';

describe('ImportacaoResultado - Testes de Integracao', () => {
  let component: ImportacaoResultadoComponent;
  let service: ImportacaoResultadoService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl || 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ImportacaoResultadoComponent, HttpClientTestingModule],
      providers: [ImportacaoResultadoService]
    });

    const fixture = TestBed.createComponent(ImportacaoResultadoComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ImportacaoResultadoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve processar importacao completa com sucesso', (done) => {
    const file = new File(['datacoleta,valor_medido,legislacao,matriz,numerodaamostra,codigodaamostra,parametro\n01/12/2024,0.5,Portaria 888/2021,Agua Bruta,001,AMO-001,Turbidez'], 'teste.csv', { type: 'text/csv' });

    const mockResponse = {
      success: true,
      message: 'Importacao processada com sucesso',
      resumo: {
        total_linhas: 1,
        validadas_com_sucesso: 1,
        inseridas_no_banco: 1,
        erros_validacao: 0,
        erros_insercao: 0,
        total_erros: 0
      }
    };

    component.arquivoSelecionado = file;
    component.nomeArquivo = 'teste.csv';

    component.iniciarImportacao();

    const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTruthy();

    req.flush(mockResponse);

    setTimeout(() => {
      expect(component.loading).toBeFalse();
      expect(component.sucesso).toBeTrue();
      expect(component.erro).toBeNull();
      expect(component.resultado).toEqual(mockResponse);
      done();
    }, 100);
  });

  it('deve tratar erro de validacao do arquivo', (done) => {
    const file = new File(['dados invalidos'], 'teste.csv', { type: 'text/csv' });

    const mockError = {
      success: false,
      message: 'Estrutura do arquivo incorreta',
      error: 'Campos obrigatorios faltando: datacoleta, valor_medido'
    };

    component.arquivoSelecionado = file;
    component.nomeArquivo = 'teste.csv';

    component.iniciarImportacao();

    const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
    req.flush(mockError, { status: 400, statusText: 'Bad Request' });

    setTimeout(() => {
      expect(component.loading).toBeFalse();
      expect(component.sucesso).toBeFalse();
      expect(component.erro).toBeTruthy();
      done();
    }, 100);
  });

  it('deve tratar erro de servidor', (done) => {
    const file = new File(['test'], 'teste.csv', { type: 'text/csv' });

    component.arquivoSelecionado = file;
    component.iniciarImportacao();

    const req = httpMock.expectOne(`${apiUrl}/importacao/resultado-analise`);
    req.flush({ message: 'Erro interno' }, { status: 500, statusText: 'Internal Server Error' });

    setTimeout(() => {
      expect(component.loading).toBeFalse();
      expect(component.sucesso).toBeFalse();
      expect(component.erro).toContain('Erro');
      done();
    }, 100);
  });

  it('deve validar tamanho maximo do arquivo', () => {
    const largefile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'grande.csv', { type: 'text/csv' });

    component['processarArquivo'](largefile);

    expect(component.arquivoSelecionado).toBeNull();
    expect(component.erro).toContain('muito grande');
  });

  it('deve validar extensoes permitidas', () => {
    const invalidFile = new File(['test'], 'teste.txt', { type: 'text/plain' });

    component['processarArquivo'](invalidFile);

    expect(component.arquivoSelecionado).toBeNull();
    expect(component.erro).toContain('não suportado');
  });

  it('deve resetar estado apos sucesso', () => {
    component.arquivoSelecionado = new File(['test'], 'test.csv');
    component.sucesso = true;
    component.resultado = { success: true };

    component.resetarEstado();

    expect(component.arquivoSelecionado).toBeNull();
    expect(component.sucesso).toBeFalse();
    expect(component.resultado).toBeNull();
  });

  it('deve processar drag and drop de arquivo', () => {
    const file = new File(['test'], 'teste.csv', { type: 'text/csv' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    const event = new DragEvent('drop', { dataTransfer });

    spyOn(event, 'preventDefault');
    spyOn(event, 'stopPropagation');

    component.onDrop(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.arquivoSelecionado).toBeTruthy();
    expect(component.nomeArquivo).toBe('teste.csv');
  });

  it('deve alternar entre estados de drag over', () => {
    const event = new DragEvent('dragover');
    spyOn(event, 'preventDefault');

    component.onDragOver(event);
    expect(component.isDragOver).toBeTrue();

    component.onDragLeave(event);
    expect(component.isDragOver).toBeFalse();
  });

  it('deve formatar numeros corretamente', () => {
    expect(component.formatarNumero(1000)).toBe('1.000');
    expect(component.formatarNumero(1500000)).toBe('1.500.000');
  });
});
