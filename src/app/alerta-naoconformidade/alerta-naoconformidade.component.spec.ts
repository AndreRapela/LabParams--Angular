import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AlertaNaoConformidadeComponent } from './alerta-naoconformidade.component';
import {
  AlertaNaoConformidadeService,
  AlertaResponse,
} from './alerta-naoconformidade.service';

function response(page = 1): AlertaResponse {
  return {
    success: true,
    data: [
      {
        id: page,
        valor_medido: 1.5,
        data_alerta: '2026-08-11T12:00:00.000Z',
        parametro_nome: 'Turbidez',
        unidade_medida: 'uT',
        matriz_nome: 'Água tratada',
        status: 'ALERTA',
        mensagem_limite: '(máx. 1)',
      },
    ],
    stats: { total: 45, alerta: 45, naoConforme: 0, critico: 0 },
    pagination: {
      page,
      page_size: 20,
      total: 45,
      total_pages: 3,
      has_next: page < 3,
      has_previous: page > 1,
    },
  };
}

describe('AlertaNaoConformidadeComponent pagination', () => {
  it('navega no servidor e reinicia ao mudar o status', async () => {
    const service = jasmine.createSpyObj<AlertaNaoConformidadeService>(
      'AlertaNaoConformidadeService',
      ['getAlertas'],
    );
    service.getAlertas.and.callFake((filters) => of(response(filters.page)));
    await TestBed.configureTestingModule({
      imports: [AlertaNaoConformidadeComponent],
      providers: [{ provide: AlertaNaoConformidadeService, useValue: service }],
    }).compileComponents();
    const fixture = TestBed.createComponent(AlertaNaoConformidadeComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.mudarPagina(2);
    expect(service.getAlertas).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 2, page_size: 20 }),
    );
    component.filtroStatus = 'critico';
    component.aplicarFiltros();
    expect(component.page).toBe(1);
    expect(service.getAlertas).toHaveBeenCalledWith(
      jasmine.objectContaining({ page: 1, status: 'critico' }),
    );

    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector(
        'nav[aria-label="Paginação dos alertas"]',
      ),
    ).not.toBeNull();
  });

  it('sempre encerra o loading e exibe erro sanitizado quando a API falha', async () => {
    const service = jasmine.createSpyObj<AlertaNaoConformidadeService>(
      'AlertaNaoConformidadeService',
      ['getAlertas'],
    );
    service.getAlertas.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 500, statusText: 'Server Error' }),
      ),
    );
    await TestBed.configureTestingModule({
      imports: [AlertaNaoConformidadeComponent],
      providers: [{ provide: AlertaNaoConformidadeService, useValue: service }],
    }).compileComponents();
    const fixture = TestBed.createComponent(AlertaNaoConformidadeComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.isLoading).toBeFalse();
    expect(fixture.componentInstance.erroApi).toContain('carregar os alertas');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
  });
});
