import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../acessos/auth/auth.service';
import { Amostra, AmostraService } from '../amostra/amostra.service';
import { LaudoDetalhe, LaudoResumo } from './laudo.model';
import { LaudosComponent } from './laudos.component';
import { LaudosService } from './laudos.service';

describe('LaudosComponent', () => {
  let fixture: ComponentFixture<LaudosComponent>;
  let component: LaudosComponent;
  let laudosService: jasmine.SpyObj<LaudosService>;

  const laudoExistente: LaudoResumo = {
    id: 1,
    numero: 'LAU-001-V1',
    amostra_id: 42,
    pedido_analise_id: null,
    versao: 1,
    conteudo_hash: 'a'.repeat(64),
    observacoes: null,
    emitido_por: 'user-id',
    emitido_em: '2026-07-29T12:00:00.000Z',
  };

  beforeEach(async () => {
    laudosService = jasmine.createSpyObj<LaudosService>('LaudosService', [
      'listar',
      'criarVersao',
    ]);
    laudosService.listar.and.returnValue(of({ success: true, data: [] }));
    laudosService.criarVersao.and.returnValue(
      of({
        success: true,
        data: { id: 8 } as LaudoDetalhe,
      }),
    );

    await TestBed.configureTestingModule({
      imports: [LaudosComponent],
      providers: [
        { provide: LaudosService, useValue: laudosService },
        {
          provide: AmostraService,
          useValue: { findAll: () => of({ success: true, data: [] }) },
        },
        {
          provide: AuthService,
          useValue: {
            getSession: () =>
              Promise.resolve({
                user: { app_metadata: { perfil: 'Gestor' } },
              }),
          },
        },
        {
          provide: Router,
          useValue: {
            navigate: jasmine
              .createSpy('navigate')
              .and.returnValue(Promise.resolve(true)),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LaudosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exige motivo apenas quando a próxima emissão é uma revisão', () => {
    component.form.controls.amostra_id.setValue(42);
    expect(component.revisaoSelecionada).toBeFalse();
    expect(component.form.controls.motivo.hasError('required')).toBeFalse();

    component.laudos = [laudoExistente];
    component.form.controls.amostra_id.setValue(null);
    component.form.controls.amostra_id.setValue(42);

    expect(component.proximaVersaoSelecionada).toBe(2);
    expect(component.revisaoSelecionada).toBeTrue();
    expect(component.form.controls.motivo.hasError('required')).toBeTrue();
  });

  it('envia senha e motivo ao emitir a segunda versão', () => {
    component.laudos = [laudoExistente];
    component.form.setValue({
      amostra_id: 42,
      senha: 'senha-teste-123',
      motivo: 'Resultado republicado após correção.',
      observacoes: 'Revisão controlada.',
    });

    component.gerarVersao();

    expect(laudosService.criarVersao).toHaveBeenCalledOnceWith(42, {
      senha: 'senha-teste-123',
      motivo: 'Resultado republicado após correção.',
      observacoes: 'Revisão controlada.',
    });
    expect(component.form.controls.senha.value).toBe('');
  });

  it('oferece para emissão somente amostras concluídas', () => {
    const base = {
      codigo_amostra: 'AM-001',
      numero_da_amostra: '001',
      data_coleta: '2026-07-29',
      localizacao: 'Ponto 1',
      matriz_id: 1,
      usuario_id: 'user-id',
    };
    component.amostras = [
      { ...base, id: 1, status_amostra: 'em_analise' },
      { ...base, id: 2, status_amostra: 'concluida' },
    ] satisfies Amostra[];

    expect(component.amostrasElegiveis.map((amostra) => amostra.id)).toEqual([
      2,
    ]);
  });
});
