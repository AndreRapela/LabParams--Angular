import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../acessos/auth/auth.service';
import { AcessoNegadoComponent } from './acesso-negado.component';

describe('AcessoNegadoComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  async function create(reason: string): Promise<AcessoNegadoComponent> {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getCurrentAccess',
      'getSession',
      'logout',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    await TestBed.configureTestingModule({
      imports: [AcessoNegadoComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: { get: () => reason },
            },
          },
        },
      ],
    }).compileComponents();
    return TestBed.createComponent(AcessoNegadoComponent).componentInstance;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('lê o motivo de migração e apresenta a mensagem correspondente', async () => {
    const component = await create('migracao-pendente');

    expect(component.reason).toBe('migracao-pendente');
    expect(component.content.title).toContain('temporariamente indisponível');
  });

  it('abre o painel quando uma nova verificação confirma o acesso', async () => {
    const component = await create('pendente');
    auth.getCurrentAccess.and.resolveTo({
      cadastrado: true,
      perfil: 'Analista',
      acesso_aprovado: true,
      schema_ready: true,
      status_acesso: 'aprovado',
    });

    await component.verificarNovamente();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/dashboard-web']);
    expect(component.checking).toBeFalse();
  });

  it('permite trocar de conta mesmo se o encerramento remoto falhar', async () => {
    const component = await create('indisponivel');
    auth.logout.and.rejectWith(new Error('offline'));

    await component.sair();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
  });

  it('volta ao login quando a sessão expira durante a nova verificação', async () => {
    const component = await create('indisponivel');
    auth.getCurrentAccess.and.rejectWith(new Error('expired'));
    auth.getSession.and.resolveTo(null);

    await component.verificarNovamente();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/login']);
    expect(component.checking).toBeFalse();
  });
});
