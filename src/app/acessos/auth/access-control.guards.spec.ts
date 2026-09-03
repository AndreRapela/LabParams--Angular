import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';
import { redirectGuard } from './redirect.guard';
import { loginGuard } from '../login/login.guard';

describe('access control guards', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(() => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'getSession',
      'getCurrentAccess',
    ]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
      ],
    });
    router = TestBed.inject(Router);
  });

  function url(result: boolean | UrlTree): string {
    expect(result instanceof UrlTree).toBeTrue();
    return router.serializeUrl(result as UrlTree);
  }

  it('mantém a sessão pendente na tela informativa ao abrir o login', async () => {
    auth.getSession.and.resolveTo({ user: { id: 'user-1' } } as never);
    auth.getCurrentAccess.and.resolveTo({
      cadastrado: true,
      perfil: 'Usuário',
      acesso_aprovado: false,
      schema_ready: true,
      status_acesso: 'pendente',
    });

    const result = await TestBed.runInInjectionContext(() => loginGuard(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    ));

    expect(url(result as boolean | UrlTree)).toBe(
      '/acesso-negado?motivo=pendente',
    );
  });

  it('usa o perfil confirmado pela API para proteger rotas administrativas', async () => {
    auth.getSession.and.resolveTo({ user: { id: 'user-1' } } as never);
    auth.getCurrentAccess.and.resolveTo({
      cadastrado: true,
      perfil: 'Analista',
      acesso_aprovado: true,
      schema_ready: true,
      status_acesso: 'aprovado',
    });

    const result = await TestBed.runInInjectionContext(() => authGuard(
      { data: { roles: ['Gestor'] } } as unknown as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    ));

    expect(url(result as boolean | UrlTree)).toBe(
      '/acesso-negado?motivo=perfil',
    );
  });

  it('falha de forma fechada quando a verificação de acesso está indisponível', async () => {
    auth.getSession.and.resolveTo({ user: { id: 'user-1' } } as never);
    auth.getCurrentAccess.and.rejectWith(new Error('offline'));

    const result = await TestBed.runInInjectionContext(() => redirectGuard(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    ));

    expect(url(result as boolean | UrlTree)).toBe(
      '/acesso-negado?motivo=indisponivel',
    );
  });

  it('permanece no login se a sessão expirar durante o preflight', async () => {
    auth.getSession.and.returnValues(
      Promise.resolve({ user: { id: 'user-1' } } as never),
      Promise.resolve(null),
    );
    auth.getCurrentAccess.and.rejectWith(new Error('expired'));

    const result = await TestBed.runInInjectionContext(() => loginGuard(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    ));

    expect(result).toBeTrue();
  });
});
