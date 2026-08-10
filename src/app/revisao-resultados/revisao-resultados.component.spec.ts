import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../acessos/auth/auth.service';
import { ResultadoWorkflow } from './revisao-resultado.model';
import { RevisaoResultadosComponent } from './revisao-resultados.component';
import { RevisaoResultadosService } from './revisao-resultados.service';

describe('RevisaoResultadosComponent', () => {
  let fixture: ComponentFixture<RevisaoResultadosComponent>;
  let component: RevisaoResultadosComponent;
  let service: jasmine.SpyObj<RevisaoResultadosService>;

  const resultado: ResultadoWorkflow = {
    id: 42,
    amostra_id: 7,
    parametro_id: 3,
    amostra_codigo: 'AM-2026-0042',
    parametro_nome: 'pH',
    valor_medido: 7.2,
    status_resultado: 'em_revisao',
    datacoleta: '2026-08-02T09:00:00.000Z',
  };

  beforeEach(async () => {
    service = jasmine.createSpyObj<RevisaoResultadosService>(
      'RevisaoResultadosService',
      ['listar', 'buscarPorId', 'historico', 'submeter', 'revisar', 'publicar'],
    );
    service.listar.and.returnValue(of({ success: true, data: [resultado] }));

    const authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getSession',
    ]);
    authService.getSession.and.resolveTo(null);

    await TestBed.configureTestingModule({
      imports: [RevisaoResultadosComponent],
      providers: [
        { provide: RevisaoResultadosService, useValue: service },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RevisaoResultadosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exige justificativa técnica ao aprovar', () => {
    component.selecionado = resultado;
    component.iniciarAcao('revisar');
    component.actionForm.controls.senha.setValue('senha-de-teste');

    expect(component.actionForm.controls.comentario.hasError('required')).toBeTrue();

    component.actionForm.controls.comentario.setValue(
      'Critérios técnicos e rastreabilidade conferidos.',
    );
    expect(component.actionForm.valid).toBeTrue();
  });

  it('mantém a justificativa obrigatória ao rejeitar', () => {
    component.selecionado = resultado;
    component.iniciarAcao('revisar');
    component.actionForm.controls.decisao.setValue('rejeitar');
    component.decisaoAlterada();

    expect(component.requiresComment()).toBeTrue();
    expect(component.actionForm.controls.comentario.hasError('required')).toBeTrue();
  });

  it('exibe uma validação técnica neutra para qualquer decisão', () => {
    component.selecionado = resultado;
    component.iniciarAcao('revisar');
    component.actionForm.controls.comentario.markAsTouched();
    fixture.detectChanges();

    const error = fixture.nativeElement.querySelector(
      '#workflow-comment + .field-error',
    ) as HTMLElement | null;
    expect(error?.textContent).toContain(
      'Informe a justificativa técnica da decisão.',
    );
  });

  it('apresenta ações da timeline com rótulos legíveis', () => {
    expect(component.actionLabel('SUBMIT')).toBe('Submetido para revisão');
    expect(component.actionLabel('APPROVE')).toBe('Resultado aprovado');
    expect(component.actionLabel('REJECT')).toBe('Resultado rejeitado');
    expect(component.actionLabel('PUBLISH')).toBe('Resultado publicado');
    expect(component.actionLabel('REOPEN')).toBe('Resultado reaberto');
    expect(component.actionLabel('evento_customizado')).toBe(
      'evento_customizado',
    );
  });
});
