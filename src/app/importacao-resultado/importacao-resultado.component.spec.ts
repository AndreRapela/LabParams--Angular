import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ImportacaoResultadoComponent } from './importacao-resultado.component';
import { ImportacaoResultadoService } from './importacao-resultado.service';
import { of, throwError } from 'rxjs';

describe('ImportacaoResultadoComponent', () => {
  let component: ImportacaoResultadoComponent;
  let fixture: ComponentFixture<ImportacaoResultadoComponent>;
  let service: ImportacaoResultadoService;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportacaoResultadoComponent, HttpClientTestingModule],
      providers: [ImportacaoResultadoService]
    }).compileComponents();

    fixture = TestBed.createComponent(ImportacaoResultadoComponent);
    component = fixture.componentInstance;
    service = TestBed.inject(ImportacaoResultadoService);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  // =================================================================
  // TESTES DE INICIALIZAÇÃO
  // =================================================================

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('deve inicializar com tipo "planilha" selecionado', () => {
    expect(component.tipoSelecionado).toBe('planilha');
  });

  it('deve inicializar sem arquivo selecionado', () => {
    expect(component.arquivoSelecionado).toBeNull();
    expect(component.nomeArquivo).toBe('');
  });

  it('deve inicializar sem erros', () => {
    expect(component.erro).toBeNull();
    expect(component.sucesso).toBeFalse();
    expect(component.loading).toBeFalse();
  });

  // =================================================================
  // TESTES DE SELEÇÃO DE TIPO
  // =================================================================

  describe('selecionarTipo()', () => {
    it('deve mudar para tipo "planilha"', () => {
      component.selecionarTipo('planilha');
      expect(component.tipoSelecionado).toBe('planilha');
    });

    it('deve mudar para tipo "pdf"', () => {
      component.selecionarTipo('pdf');
      expect(component.tipoSelecionado).toBe('pdf');
    });

    it('deve resetar estado ao mudar de tipo', () => {
      component.arquivoSelecionado = new File(['test'], 'test.csv');
      component.erro = 'Erro teste';
      component.selecionarTipo('pdf');

      expect(component.arquivoSelecionado).toBeNull();
      expect(component.erro).toBeNull();
    });
  });

  // =================================================================
  // TESTES DE VALIDAÇÃO DE ARQUIVO
  // =================================================================

  describe('Validação de arquivo', () => {
    it('deve aceitar arquivo CSV válido', () => {
      const file = new File(['test'], 'dados.csv', { type: 'text/csv' });
      component['processarArquivo'](file);

      expect(component.arquivoSelecionado).toBe(file);
      expect(component.nomeArquivo).toBe('dados.csv');
      expect(component.erro).toBeNull();
    });

    it('deve aceitar arquivo XLSX válido', () => {
      const file = new File(['test'], 'dados.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      component['processarArquivo'](file);

      expect(component.arquivoSelecionado).toBe(file);
      expect(component.nomeArquivo).toBe('dados.xlsx');
      expect(component.erro).toBeNull();
    });

    it('deve aceitar arquivo XLS válido', () => {
      const file = new File(['test'], 'dados.xls', {
        type: 'application/vnd.ms-excel'
      });
      component['processarArquivo'](file);

      expect(component.arquivoSelecionado).toBe(file);
      expect(component.nomeArquivo).toBe('dados.xls');
      expect(component.erro).toBeNull();
    });

    it('deve rejeitar arquivo com extensão inválida', () => {
      const file = new File(['test'], 'dados.txt', { type: 'text/plain' });
      component['processarArquivo'](file);

      expect(component.arquivoSelecionado).toBeNull();
      expect(component.erro).toContain('Formato não suportado');
    });

    it('deve rejeitar arquivo muito grande (>10MB)', () => {
      const largeContent = new Array(11 * 1024 * 1024).join('a');
      const file = new File([largeContent], 'grande.csv', { type: 'text/csv' });
      component['processarArquivo'](file);

      expect(component.arquivoSelecionado).toBeNull();
      expect(component.erro).toContain('muito grande');
    });

    it('deve aceitar arquivo de exatamente 10MB', () => {
      const content = new Array(10 * 1024 * 1024).join('a');
      const file = new File([content], 'limite.csv', { type: 'text/csv' });
      component['processarArquivo'](file);

      expect(component.arquivoSelecionado).toBe(file);
      expect(component.erro).toBeNull();
    });
  });

  // =================================================================
  // TESTES DE DRAG AND DROP
  // =================================================================

  describe('Drag and Drop', () => {
    it('deve ativar estado dragover ao arrastar arquivo', () => {
      const event = new DragEvent('dragover');
      component.onDragOver(event);

      expect(component.isDragOver).toBeTrue();
    });

    it('deve desativar estado dragover ao sair da área', () => {
      component.isDragOver = true;
      const event = new DragEvent('dragleave');
      component.onDragLeave(event);

      expect(component.isDragOver).toBeFalse();
    });

    it('deve processar arquivo ao soltar na área', () => {
      const file = new File(['test'], 'drop.csv', { type: 'text/csv' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);

      const event = new DragEvent('drop', { dataTransfer });
      spyOn(event, 'preventDefault');

      component.onDrop(event);

      expect(event.preventDefault).toHaveBeenCalled();
      expect(component.isDragOver).toBeFalse();
    });
  });

  // =================================================================
  // TESTES DE IMPORTAÇÃO
  // =================================================================

  describe('iniciarImportacao()', () => {
    it('não deve iniciar importação sem arquivo', () => {
      component.arquivoSelecionado = null;
      spyOn(service, 'importarPlanilha');

      component.iniciarImportacao();

      expect(service.importarPlanilha).not.toHaveBeenCalled();
    });

    it('deve chamar serviço com arquivo correto', () => {
      const file = new File(['test'], 'teste.csv');
      component.arquivoSelecionado = file;

      spyOn(service, 'importarPlanilha').and.returnValue(of({
        success: true,
        resumo: { total_linhas: 10, inseridas_no_banco: 10 }
      }));

      component.iniciarImportacao();

      expect(service.importarPlanilha).toHaveBeenCalledWith(file);
    });

    it('deve processar resposta de sucesso', (done) => {
      const file = new File(['test'], 'teste.csv');
      component.arquivoSelecionado = file;

      const mockResponse = {
        success: true,
        message: 'Importação concluída',
        resumo: {
          total_linhas: 100,
          inseridas_no_banco: 95,
          erros_validacao: 5,
          erros_insercao: 0
        },
        erros: []
      };

      spyOn(service, 'importarPlanilha').and.returnValue(of(mockResponse));

      component.iniciarImportacao();

      setTimeout(() => {
        expect(component.loading).toBeFalse();
        expect(component.sucesso).toBeTrue();
        expect(component.resultado).toEqual(mockResponse);
        expect(component.erro).toBeNull();
        done();
      }, 100);
    });

    it('deve processar erro de importação', (done) => {
      const file = new File(['test'], 'teste.csv');
      component.arquivoSelecionado = file;

      const mockError = {
        error: {
          message: 'Erro ao processar arquivo',
          error: 'Arquivo corrompido'
        }
      };

      spyOn(service, 'importarPlanilha').and.returnValue(throwError(() => mockError));

      component.iniciarImportacao();

      setTimeout(() => {
        expect(component.loading).toBeFalse();
        expect(component.sucesso).toBeFalse();
        expect(component.erro).toContain('Erro ao processar arquivo');
        done();
      }, 100);
    });
  });

  // =================================================================
  // TESTES DE RESET
  // =================================================================

  describe('resetarEstado()', () => {
    it('deve limpar todos os estados', () => {
      component.arquivoSelecionado = new File(['test'], 'test.csv');
      component.nomeArquivo = 'test.csv';
      component.erro = 'Erro teste';
      component.sucesso = true;
      component.loading = true;
      component.resultado = { success: true };
      component.isDragOver = true;

      component.resetarEstado();

      expect(component.arquivoSelecionado).toBeNull();
      expect(component.nomeArquivo).toBe('');
      expect(component.erro).toBeNull();
      expect(component.sucesso).toBeFalse();
      expect(component.loading).toBeFalse();
      expect(component.resultado).toBeNull();
      expect(component.isDragOver).toBeFalse();
    });
  });

  describe('novaImportacao()', () => {
    it('deve resetar estado para nova importação', () => {
      spyOn(component, 'resetarEstado');
      component.novaImportacao();
      expect(component.resetarEstado).toHaveBeenCalled();
    });
  });

  // =================================================================
  // TESTES DE FORMATAÇÃO
  // =================================================================

  describe('formatarNumero()', () => {
    it('deve formatar números com separador de milhares', () => {
      expect(component.formatarNumero(1000)).toBe('1.000');
      expect(component.formatarNumero(1000000)).toBe('1.000.000');
    });

    it('deve formatar números pequenos', () => {
      expect(component.formatarNumero(0)).toBe('0');
      expect(component.formatarNumero(10)).toBe('10');
      expect(component.formatarNumero(999)).toBe('999');
    });
  });
});
