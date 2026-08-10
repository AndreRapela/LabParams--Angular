import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { LaudoDetalhe, LaudoResultadoSnapshot } from './laudo.model';
import { LaudoDetalheComponent } from './laudo-detalhe.component';
import { LaudosService } from './laudos.service';

describe('LaudoDetalheComponent', () => {
  let component: LaudoDetalheComponent;
  let service: jasmine.SpyObj<LaudosService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<LaudosService>('LaudosService', [
      'obterHtml',
    ]);
    await TestBed.configureTestingModule({
      imports: [LaudoDetalheComponent],
      providers: [
        { provide: LaudosService, useValue: service },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ id: '1' }) },
          },
        },
      ],
    }).compileComponents();
    component = TestBed.createComponent(
      LaudoDetalheComponent,
    ).componentInstance;
  });

  it('bloqueia a impressão quando a integridade não foi confirmada', () => {
    component.laudo = {
      id: 1,
      integridade_valida: false,
    } as LaudoDetalhe;

    component.abrirImpressao();

    expect(service.obterHtml).not.toHaveBeenCalled();
    expect(component.error).toContain('integridade');
  });

  it('formata legislação e contexto estruturados sem exibir objeto bruto', () => {
    const resultado = {
      legislacao: { nome: 'Portaria GM/MS 888/2021', sigla: 'PRC 5' },
      contexto: { nome: 'Padrão de potabilidade', codigo: 'POTABILIDADE' },
    } as LaudoResultadoSnapshot;

    expect(component.legislacaoLabel(resultado)).toBe(
      'PRC 5 · Padrão de potabilidade',
    );
  });

  it('trata datas inválidas sem lançar erro na renderização', () => {
    expect(component.formatDate('valor-inválido')).toBe('Data inválida');
  });
});
