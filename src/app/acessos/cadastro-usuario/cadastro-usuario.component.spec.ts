import { TestBed } from '@angular/core/testing';
import { Session } from '@supabase/supabase-js';
import { AuthService, ManagedUser } from '../auth/auth.service';
import { CadastroUsuarioComponent } from './cadastro-usuario.component';

const users: ManagedUser[] = [
  {
    id: 'current-user',
    nome: 'Gestor atual',
    email: 'gestor@example.com',
    telefone: null,
    perfil: 'Gestor',
    acesso_aprovado: true,
    created_at: '2026-08-11T12:00:00.000Z',
    updated_at: '2026-08-11T12:00:00.000Z',
  },
  {
    id: 'pending-user',
    nome: 'Pessoa pendente',
    email: 'pessoa@example.com',
    telefone: null,
    perfil: 'Usuário',
    acesso_aprovado: false,
    created_at: '2026-08-11T12:00:00.000Z',
    updated_at: '2026-08-11T12:00:00.000Z',
  },
];

describe('CadastroUsuarioComponent approval', () => {
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'getSession',
      'listUsers',
      'updateUserApproval',
      'updateUserRole',
      'register',
    ]);
    authService.getSession.and.resolveTo({
      user: { id: 'current-user' },
    } as Session);
    authService.listUsers.and.resolveTo(users);
    authService.updateUserApproval.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [CadastroUsuarioComponent],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compileComponents();
  });

  it('aprova uma conta pendente após confirmação', async () => {
    const fixture = TestBed.createComponent(CadastroUsuarioComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    spyOn(window, 'confirm').and.returnValue(true);

    await fixture.componentInstance.toggleApproval(users[1]);

    expect(authService.updateUserApproval).toHaveBeenCalledOnceWith(
      'pending-user',
      true,
    );
    expect(fixture.componentInstance.feedback).toContain('aprovado');
  });

  it('impede o gestor de bloquear a própria conta', async () => {
    const fixture = TestBed.createComponent(CadastroUsuarioComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const confirm = spyOn(window, 'confirm');

    await fixture.componentInstance.toggleApproval(users[0]);

    expect(confirm).not.toHaveBeenCalled();
    expect(authService.updateUserApproval).not.toHaveBeenCalled();
    expect(fixture.componentInstance.feedback).toContain('própria conta');
  });
});
