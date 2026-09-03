import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent access preflight', () => {
  let component: LoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', [
      'login',
      'getCurrentAccess',
      'logout',
    ]);
    router = jasmine.createSpyObj<Router>('Router', [
      'navigate',
      'navigateByUrl',
    ]);
    auth.login.and.resolveTo({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    } as never);
    auth.logout.and.resolveTo();
    router.navigate.and.resolveTo(true);
    router.navigateByUrl.and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    component = TestBed.createComponent(LoginComponent).componentInstance;
    component.form.setValue({
      email: 'analista@example.com',
      senha: 'senha-existente',
    });
  });

  it('não abre o dashboard para uma conta ainda pendente', async () => {
    auth.getCurrentAccess.and.resolveTo({
      cadastrado: true,
      perfil: 'Analista',
      acesso_aprovado: false,
      schema_ready: true,
      status_acesso: 'pendente',
    });

    await component.onSubmit();

    expect(router.navigate).toHaveBeenCalledOnceWith(['/acesso-negado'], {
      queryParams: { motivo: 'pendente' },
    });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(auth.logout).not.toHaveBeenCalled();
    expect(component.loading).toBeFalse();
  });

  it('só abre o dashboard depois da confirmação da API', async () => {
    auth.getCurrentAccess.and.resolveTo({
      cadastrado: true,
      perfil: 'Analista',
      acesso_aprovado: true,
      schema_ready: true,
      status_acesso: 'aprovado',
    });

    await component.onSubmit();

    expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/dashboard-web');
  });

  it('encerra a sessão nova se o preflight não puder ser confirmado', async () => {
    auth.getCurrentAccess.and.rejectWith(new Error('offline'));

    await component.onSubmit();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(component.loginErro).toContain('verificar seu acesso');
  });
});
