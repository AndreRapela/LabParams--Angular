import { HttpClientTestingModule } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NEVER, of, throwError } from 'rxjs';
import { ImportacaoResposta } from './importacao-resultado.model';
import { ImportacaoResultadoComponent } from './importacao-resultado.component';
import { ImportacaoResultadoService } from './importacao-resultado.service';

describe('ImportacaoResultadoComponent', () => {
  let component: ImportacaoResultadoComponent;
  let fixture: ComponentFixture<ImportacaoResultadoComponent>;
  let service: ImportacaoResultadoService;

  const criarResposta = (success = true): ImportacaoResposta => ({
    success,
    message: success ? 'Importação concluída' : 'Nenhum registro foi inserido',
    resumo: {
      total_linhas: 10,
      validadas_com_sucesso: success ? 10 : 0,
      inseridas_no_banco: success ? 10 : 0,
      erros_validacao: success ? 0 : 10,
      erros_insercao: 0,
      total_erros: success ? 0 : 10
    },
    erros: success ? undefined : [
      { linha: 2, erro: 'Campo obrigatório ausente', dados: {} }
    ]
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportacaoResultadoComponent, HttpClientTestingModule],
      providers: [ImportacaoResultadoService]
    }).compileComponents();

    fixture = TestBed.createComponent(ImportacaoResultadoComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ImportacaoResultadoService);
    fixture.detectChanges();
  });

  it('deve criar o componente com estado inicial limpo', () => {
    expect(component).toBeTruthy();
    expect(component.arquivoSelecionado).toBeNull();
    expect(component.nomeArquivo).toBe('');
    expect(component.erro).toBeNull();
    expect(component.resultado).toBeNull();
    expect(component.loading).toBeFalse();
  });

  it('deve expor somente a importação CSV/XLSX, sem opção de PDF', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const input = fixture.nativeElement.querySelector('#file-input') as HTMLInputElement;

    expect(texto).not.toContain('PDF');
    expect(input.accept).toBe('.csv,.xlsx');
  });

  it('deve abrir o seletor de arquivos pelo botão acessível', () => {
    const input = fixture.nativeElement.querySelector('#file-input') as HTMLInputElement;
    spyOn(input, 'click');

    component.selecionarArquivo();

    expect(input.click).toHaveBeenCalled();
  });

  describe('validação do arquivo', () => {
    it('deve aceitar CSV e XLSX válidos', () => {
      const csv = new File(['teste'], 'dados.csv', { type: 'text/csv' });
      component['processarArquivo'](csv);
      expect(component.arquivoSelecionado).toBe(csv);

      const xlsx = new File(['teste'], 'dados.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      component['processarArquivo'](xlsx);
      expect(component.arquivoSelecionado).toBe(xlsx);
      expect(component.nomeArquivo).toBe('dados.xlsx');
      expect(component.erro).toBeNull();
    });

    it('deve rejeitar XLS legado e outros formatos', () => {
      component['processarArquivo'](new File(['teste'], 'dados.xls'));
      expect(component.arquivoSelecionado).toBeNull();
      expect(component.erro).toContain('Formato não suportado');

      component['processarArquivo'](new File(['teste'], 'dados.pdf'));
      expect(component.arquivoSelecionado).toBeNull();
      expect(component.erro).toContain('Formato não suportado');
    });

    it('deve rejeitar arquivo acima de 10 MB', () => {
      const file = new File(
        [new ArrayBuffer((10 * 1024 * 1024) + 1)],
        'grande.csv',
        { type: 'text/csv' }
      );

      component['processarArquivo'](file);

      expect(component.arquivoSelecionado).toBeNull();
      expect(component.erro).toContain('10 MB');
    });

    it('deve aceitar arquivo de exatamente 10 MB', () => {
      const file = new File(
        [new ArrayBuffer(10 * 1024 * 1024)],
        'limite.csv',
        { type: 'text/csv' }
      );

      component['processarArquivo'](file);

      expect(component.arquivoSelecionado).toBe(file);
      expect(component.erro).toBeNull();
    });
  });

  describe('drag and drop', () => {
    it('deve controlar o destaque da área de envio', () => {
      const event = new DragEvent('dragover');
      component.onDragOver(event);
      expect(component.isDragOver).toBeTrue();

      component.onDragLeave(event);
      expect(component.isDragOver).toBeFalse();
    });

    it('deve processar o primeiro arquivo solto', () => {
      const file = new File(['teste'], 'drop.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const event = new DragEvent('drop', { dataTransfer });

      component.onDrop(event);

      expect(component.arquivoSelecionado).toBe(file);
      expect(component.isDragOver).toBeFalse();
    });
  });

  describe('iniciarImportacao()', () => {
    it('não deve chamar o serviço sem um arquivo', () => {
      const importarSpy = spyOn(service, 'importarPlanilha');

      component.iniciarImportacao();

      expect(importarSpy).not.toHaveBeenCalled();
    });

    it('deve guardar integralmente a resposta de sucesso', () => {
      const file = new File(['teste'], 'resultados.csv', { type: 'text/csv' });
      const resposta = criarResposta(true);
      component.arquivoSelecionado = file;
      spyOn(service, 'importarPlanilha').and.returnValue(of(resposta));

      component.iniciarImportacao();

      expect(service.importarPlanilha).toHaveBeenCalledWith(file);
      expect(component.resultado).toEqual(resposta);
      expect(component.loading).toBeFalse();
      expect(component.erro).toBeNull();
    });

    it('deve preservar resumo e erros recebidos em HTTP 422', () => {
      const resposta = criarResposta(false);
      component.arquivoSelecionado = new File(['teste'], 'invalido.csv');
      spyOn(service, 'importarPlanilha').and.returnValue(throwError(() =>
        new HttpErrorResponse({
          status: 422,
          statusText: 'Unprocessable Entity',
          error: resposta
        })
      ));

      component.iniciarImportacao();

      expect(component.resultado).toEqual(resposta);
      expect(component.resultado?.resumo.inseridas_no_banco).toBe(0);
      expect(component.resultado?.erros?.length).toBe(1);
      expect(component.erro).toBeNull();
      expect(component.loading).toBeFalse();
    });

    it('deve apresentar mensagem de um erro sem resumo', () => {
      component.arquivoSelecionado = new File(['teste'], 'invalido.csv');
      spyOn(service, 'importarPlanilha').and.returnValue(throwError(() =>
        new HttpErrorResponse({
          status: 400,
          statusText: 'Bad Request',
          error: { message: 'Estrutura do arquivo incorreta' }
        })
      ));

      component.iniciarImportacao();

      expect(component.resultado).toBeNull();
      expect(component.erro).toBe('Estrutura do arquivo incorreta');
      expect(component.loading).toBeFalse();
    });
  });

  describe('modelos de importação', () => {
    it('deve solicitar o modelo pelo serviço sem abrir uma URL pública', () => {
      const baixarSpy = spyOn(service, 'baixarTemplate').and.returnValue(NEVER);

      component.baixarTemplate('xlsx');

      expect(baixarSpy).toHaveBeenCalledWith('xlsx');
      expect(component.formatoTemplateEmDownload).toBe('xlsx');
    });

    it('deve informar falha no download do modelo', () => {
      spyOn(service, 'baixarTemplate').and.returnValue(throwError(() =>
        new HttpErrorResponse({
          status: 500,
          statusText: 'Server Error',
          error: { message: 'Erro ao gerar template' }
        })
      ));

      component.baixarTemplate('csv');

      expect(component.erroTemplate).toBe('Erro ao gerar template');
      expect(component.formatoTemplateEmDownload).toBeNull();
    });
  });

  it('deve limpar o estado para uma nova importação', () => {
    component.arquivoSelecionado = new File(['teste'], 'resultados.csv');
    component.nomeArquivo = 'resultados.csv';
    component.erro = 'Erro';
    component.erroTemplate = 'Erro no modelo';
    component.resultado = criarResposta(true);
    component.loading = true;
    component.isDragOver = true;

    component.resetarEstado();

    expect(component.arquivoSelecionado).toBeNull();
    expect(component.nomeArquivo).toBe('');
    expect(component.erro).toBeNull();
    expect(component.erroTemplate).toBeNull();
    expect(component.resultado).toBeNull();
    expect(component.loading).toBeFalse();
    expect(component.isDragOver).toBeFalse();
  });

  it('deve formatar números no padrão brasileiro', () => {
    expect(component.formatarNumero(1_000)).toBe('1.000');
    expect(component.formatarNumero(1_500_000)).toBe('1.500.000');
  });
});
