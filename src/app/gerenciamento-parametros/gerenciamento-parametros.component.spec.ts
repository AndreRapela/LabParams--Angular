import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import {
  GerenciamentoParametroService,
  ParametroGerenciamento,
  TelaGerenciamentoParametros,
} from './gerenciamento-parametros.service';
import { GerenciamentoParametrosComponent } from './gerenciamento-parametros.component';

function parameter(
  id: number,
  overrides: Partial<ParametroGerenciamento> = {},
): ParametroGerenciamento {
  return {
    id,
    nome: `Parâmetro ${id}`,
    unidade_medida: 'mg/L',
    valor_parametro: null,
    limite_minimo: null,
    limite_maximo: 10,
    categoria: 'Físico-químico',
    tipo_resultado: 'numerico',
    tipo_limite: 'maximo',
    criterio_texto: null,
    fonte_referencia: 'Anexo I',
    contexto_legislacao_id: 100,
    legislacao_id: 1,
    matriz_id: 1,
    matriz_nome: 'Água tratada',
    legislacao_sigla: 'Portaria 888/2021',
    legislacao_nome: 'Padrão de potabilidade',
    contexto_nome: 'Saída do tratamento',
    contexto_codigo: 'POT-SAIDA',
    ...overrides,
  };
}

describe('GerenciamentoParametrosComponent', () => {
  let fixture: ComponentFixture<GerenciamentoParametrosComponent>;
  let component: GerenciamentoParametrosComponent;
  let service: jasmine.SpyObj<GerenciamentoParametroService>;
  let response: TelaGerenciamentoParametros;

  beforeEach(async () => {
    response = {
      parametros: Array.from({ length: 30 }, (_, index) => parameter(index + 1)),
      matrizes: [{ id: 1, nome: 'Água tratada' }],
      legislacoes: [
        { id: 1, sigla: 'Portaria 888/2021', nome: 'Padrão de potabilidade' },
      ],
      pagination: {
        page: 1,
        page_size: 30,
        total: 35,
        total_pages: 2,
        has_next: true,
        has_previous: false,
      },
    };
    service = jasmine.createSpyObj<GerenciamentoParametroService>(
      'GerenciamentoParametroService',
      ['getTela', 'updateParametro'],
    );
    service.getTela.and.callFake((filters = {}) =>
      of({
        ...response,
        pagination: {
          ...response.pagination,
          page: filters.page ?? 1,
          has_next: (filters.page ?? 1) < response.pagination.total_pages,
          has_previous: (filters.page ?? 1) > 1,
        },
      }),
    );
    service.updateParametro.and.callFake((id, value) =>
      of({ ...parameter(id), valor_parametro: value }),
    );

    await TestBed.configureTestingModule({
      imports: [GerenciamentoParametrosComponent],
      providers: [{ provide: GerenciamentoParametroService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(GerenciamentoParametrosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('solicita e renderiza somente a página atual do servidor', () => {
    expect(service.getTela).toHaveBeenCalledOnceWith({
      q: undefined,
      matriz_id: undefined,
      legislacao_id: undefined,
      page: 1,
      page_size: 30,
    });
    expect(component.parametros.length).toBe(30);
    expect(component.totalPages).toBe(2);

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(30);
  });

  it('pagina no servidor preservando o tamanho de página', () => {
    component.mudarPagina(2);

    expect(service.getTela).toHaveBeenCalledWith({
      q: undefined,
      matriz_id: undefined,
      legislacao_id: undefined,
      page: 2,
      page_size: 30,
    });
    expect(component.page).toBe(2);
  });

  it('aplica a busca no servidor com debounce e reinicia a paginação', fakeAsync(() => {
    component.page = 2;
    component.search = '  subterranea  ';
    component.agendarBusca();

    tick(349);
    expect(service.getTela).toHaveBeenCalledTimes(1);
    tick(1);

    expect(service.getTela).toHaveBeenCalledTimes(2);
    expect(service.getTela).toHaveBeenCalledWith({
      q: 'subterranea',
      matriz_id: undefined,
      legislacao_id: undefined,
      page: 1,
      page_size: 30,
    });
    expect(component.page).toBe(1);
  }));

  it('limita a busca ao máximo aceito pelo contrato da API', () => {
    component.search = 'x'.repeat(101);
    component.aplicarFiltros();

    const filters = service.getTela.calls.mostRecent().args[0];
    expect(filters?.q?.length).toBe(100);
    expect(
      fixture.nativeElement.querySelector('input[type="search"]').maxLength,
    ).toBe(100);
  });

  it('cancela a consulta anterior para impedir resposta fora de ordem', () => {
    const stale = new Subject<TelaGerenciamentoParametros>();
    service.getTela.and.returnValue(stale);
    component.carregarTudo();
    expect(stale.observed).toBeTrue();

    service.getTela.and.returnValue(of(response));
    component.aplicarFiltros();
    expect(stale.observed).toBeFalse();

    stale.next({
      ...response,
      parametros: [parameter(999)],
      pagination: { ...response.pagination, page: 2 },
    });
    expect(component.parametros.some((item) => item.id === 999)).toBeFalse();
    expect(component.page).toBe(1);
  });

  it('salva somente o valor editável e preserva o enquadramento local', () => {
    const selected = response.parametros[0];
    component.abrirEdicao(selected);
    component.valorEditado = 2.5;
    component.salvar();

    expect(service.updateParametro).toHaveBeenCalledOnceWith(selected.id, 2.5);
    expect(component.parametros[0].valor_parametro).toBe(2.5);
    expect(component.parametros[0].limite_maximo).toBe(10);
    expect(component.editando).toBeNull();
    expect(component.feedback).toContain(selected.nome);
  });

  it('rejeita valor negativo antes de chamar a API', () => {
    component.abrirEdicao(response.parametros[0]);
    component.valorEditado = -1;
    component.salvar();

    expect(service.updateParametro).not.toHaveBeenCalled();
    expect(component.editorError).toContain('igual ou maior que zero');
  });

  it('expõe o editor como diálogo modal com nome acessível', () => {
    component.abrirEdicao(response.parametros[0]);
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('edit-parameter-title');
  });

  it('mantém o foco no editor, fecha com Escape e restaura o acionador', fakeAsync(() => {
    const trigger = fixture.nativeElement.querySelector(
      '.edit-button',
    ) as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    tick();

    const input = fixture.nativeElement.querySelector(
      '#parameter-current-value',
    ) as HTMLInputElement;
    const dialog = fixture.nativeElement.querySelector(
      '[role="dialog"]',
    ) as HTMLElement;
    const buttons = dialog.querySelectorAll<HTMLButtonElement>('button');
    const lastButton = buttons.item(buttons.length - 1);
    expect(document.activeElement).toBe(input);

    lastButton.focus();
    lastButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(buttons.item(0));

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    tick();
    expect(component.editando).toBeNull();
    expect(document.activeElement).toBe(trigger);
  }));
});
