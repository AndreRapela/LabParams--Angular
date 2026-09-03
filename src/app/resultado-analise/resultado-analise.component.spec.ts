import { provideHttpClient } from '@angular/common/http';
import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { of } from 'rxjs';
import {
  ResultadoAnalise,
  ResultadoAnaliseService,
} from './resultado-analise.service';
import { ResultadoAnaliseComponent } from './resultado-analise.component';

describe('ResultadoAnaliseComponent accessibility', () => {
  let fixture: ComponentFixture<ResultadoAnaliseComponent>;
  let component: ResultadoAnaliseComponent;
  let service: jasmine.SpyObj<ResultadoAnaliseService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<ResultadoAnaliseService>(
      'ResultadoAnaliseService',
      [
        'getResultados',
        'getAmostras',
        'getMatrizes',
        'getLegislacoes',
        'getContextos',
      ],
    );
    service.getResultados.and.returnValue(of({ success: true, data: [] }));
    service.getAmostras.and.returnValue(of({ success: true, data: [] }));
    service.getMatrizes.and.returnValue(of({ success: true, data: [] }));
    service.getLegislacoes.and.returnValue(of({ success: true, data: [] }));
    service.getContextos.and.returnValue(of({ success: true, data: [] }));

    await TestBed.configureTestingModule({
      imports: [ResultadoAnaliseComponent],
      providers: [
        provideHttpClient(),
        { provide: ResultadoAnaliseService, useValue: service },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResultadoAnaliseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('navega pelas abas com setas, Home e End mantendo um único tab stop', fakeAsync(() => {
    const manual = fixture.nativeElement.querySelector(
      '#manual-tab',
    ) as HTMLButtonElement;
    const imported = fixture.nativeElement.querySelector(
      '#import-tab',
    ) as HTMLButtonElement;
    manual.focus();

    manual.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    tick();

    expect(component.abaAtiva).toBe('importacao');
    expect(imported.getAttribute('tabindex')).toBe('0');
    expect(manual.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(imported);

    imported.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Home',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    tick();

    expect(component.abaAtiva).toBe('manual');
    expect(document.activeElement).toBe(manual);

    manual.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'End',
        bubbles: true,
        cancelable: true,
      }),
    );
    fixture.detectChanges();
    tick();
    expect(component.abaAtiva).toBe('importacao');
    expect(document.activeElement).toBe(imported);
  }));

  it('inicia e contém o foco no modal, fecha com Escape e restaura o acionador', fakeAsync(() => {
    const trigger = document.createElement('button');
    trigger.type = 'button';
    fixture.nativeElement.appendChild(trigger);
    trigger.focus();
    const result: ResultadoAnalise = {
      id: 12,
      valor_medido: 1.5,
      amostra_id: 2,
      parametro_id: 3,
      datacoleta: '2026-08-10T12:00:00.000Z',
      parametro_nome: 'Turbidez',
      numerodaamostra: 'AM-002',
      matriz: 'Água tratada',
      legislacao: 'Portaria GM/MS 888/2021',
      contexto_nome: 'Saída do tratamento',
    };

    component.visualizarResultado(result, trigger);
    fixture.detectChanges();
    tick();

    const dialog = fixture.nativeElement.querySelector(
      '[role="dialog"]',
    ) as HTMLElement;
    const close = dialog.querySelector(
      '[data-dialog-initial-focus]',
    ) as HTMLButtonElement;
    const buttons = dialog.querySelectorAll<HTMLButtonElement>('button');
    const lastButton = buttons.item(buttons.length - 1);
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-describedby')).toBe(
      'result-detail-description',
    );
    expect(document.activeElement).toBe(close);

    lastButton.focus();
    lastButton.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }),
    );
    expect(document.activeElement).toBe(close);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    tick();
    expect(component.resultadoParaVisualizacao).toBeNull();
    expect(document.activeElement).toBe(trigger);
  }));
});
