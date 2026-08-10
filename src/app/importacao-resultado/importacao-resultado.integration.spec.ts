import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../config/api.config';
import { ImportacaoResposta } from './importacao-resultado.model';
import { ImportacaoResultadoComponent } from './importacao-resultado.component';
import { ImportacaoResultadoService } from './importacao-resultado.service';

describe('ImportacaoResultado - integração', () => {
  let component: ImportacaoResultadoComponent;
  let fixture: ComponentFixture<ImportacaoResultadoComponent>;
  let httpMock: HttpTestingController;
  const endpoint = `${API_CONFIG.baseUrl}/importacao/resultado-analise`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportacaoResultadoComponent, HttpClientTestingModule],
      providers: [ImportacaoResultadoService]
    }).compileComponents();

    fixture = TestBed.createComponent(ImportacaoResultadoComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve processar e apresentar uma importação completa', () => {
    const file = new File([
      'datacoleta,valor_medido,legislacao,matriz,numerodaamostra,codigodaamostra,parametro\n' +
      '01/12/2024,0.5,Portaria 888/2021,Água,001,AMO-001,Turbidez'
    ], 'resultados.csv', { type: 'text/csv' });
    const resposta: ImportacaoResposta = {
      success: true,
      message: 'Importação processada com sucesso',
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
    component.nomeArquivo = file.name;
    component.iniciarImportacao();

    const request = httpMock.expectOne(endpoint);
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBeTrue();
    expect(request.request.body.get('arquivo')).toBe(file);
    request.flush(resposta);
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.loading).toBeFalse();
    expect(component.resultado).toEqual(resposta);
    expect(texto).toContain('Importação concluída');
    expect(texto).toContain('Importação processada com sucesso');
    expect(texto).toContain('Registros inseridos');
  });

  it('deve preservar e exibir resumo e erros quando a API responder HTTP 422', () => {
    const resposta: ImportacaoResposta = {
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
        { linha: 2, erro: 'Amostra AMO-404 não encontrada', dados: {} },
        { linha: 3, erro: 'Parâmetro inválido', dados: {} }
      ]
    };

    component.arquivoSelecionado = new File(['dados inválidos'], 'resultados.csv', {
      type: 'text/csv'
    });
    component.iniciarImportacao();

    const request = httpMock.expectOne(endpoint);
    request.flush(resposta, {
      status: 422,
      statusText: 'Unprocessable Entity'
    });
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.loading).toBeFalse();
    expect(component.erro).toBeNull();
    expect(component.resultado).toEqual(resposta);
    expect(texto).toContain('Importação não efetivada');
    expect(texto).toContain('Nenhum registro foi inserido no banco de dados');
    expect(texto).toContain('Amostra AMO-404 não encontrada');
    expect(texto).toContain('Parâmetro inválido');
    expect(texto).toContain('Erros de validação');
  });

  it('deve mostrar erro estrutural sem inventar um resumo', () => {
    component.arquivoSelecionado = new File(['dados inválidos'], 'resultados.csv', {
      type: 'text/csv'
    });
    component.iniciarImportacao();

    const request = httpMock.expectOne(endpoint);
    request.flush(
      {
        success: false,
        message: 'Estrutura do arquivo incorreta',
        error: 'Campos obrigatórios faltando: datacoleta'
      },
      { status: 400, statusText: 'Bad Request' }
    );
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(component.resultado).toBeNull();
    expect(component.erro).toBe('Estrutura do arquivo incorreta');
    expect(texto).toContain('Estrutura do arquivo incorreta');
  });

  it('deve validar arquivo antes de abrir a requisição', () => {
    const arquivoGrande = new File(
      [new ArrayBuffer((10 * 1024 * 1024) + 1)],
      'grande.csv',
      { type: 'text/csv' }
    );

    component['processarArquivo'](arquivoGrande);

    expect(component.arquivoSelecionado).toBeNull();
    expect(component.erro).toContain('10 MB');
    httpMock.expectNone(endpoint);
  });

  it('deve aceitar um CSV recebido por drag and drop', () => {
    const file = new File(['teste'], 'resultados.csv', { type: 'text/csv' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const event = new DragEvent('drop', { dataTransfer });

    component.onDrop(event);

    expect(component.arquivoSelecionado).toBe(file);
    expect(component.nomeArquivo).toBe('resultados.csv');
  });
});
