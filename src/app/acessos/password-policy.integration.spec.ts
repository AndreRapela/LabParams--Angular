import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { CadastroUsuarioComponent } from './cadastro-usuario/cadastro-usuario.component';
import { LoginComponent } from './login/login.component';
import { NovaSenhaComponent } from './nova-senha/nova-senha.component';

describe('política de senha nos fluxos de acesso', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('exige a senha forte ao cadastrar um usuário', async () => {
    await TestBed.configureTestingModule({
      imports: [CadastroUsuarioComponent],
      providers: [
        {
          provide: AuthService,
          useValue: { listUsers: () => Promise.resolve([]) },
        },
      ],
    }).compileComponents();
    const component = TestBed.createComponent(
      CadastroUsuarioComponent,
    ).componentInstance;
    const password = component.form.controls['senha'];

    password.setValue('senhafraca');
    expect(password.hasError('passwordStrength')).toBeTrue();
    password.setValue('SenhaForte#123');
    expect(password.valid).toBeTrue();
    password.setValue(`Aa1!${'x'.repeat(197)}`);
    expect(password.getError('passwordStrength').maximumLength).toBeTrue();
  });

  it('exige a mesma política ao redefinir a senha', async () => {
    await TestBed.configureTestingModule({
      imports: [NovaSenhaComponent],
      providers: [
        { provide: ActivatedRoute, useValue: {} },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        {
          provide: AuthService,
          useValue: {
            getSession: () => Promise.resolve({ user: { id: 'user-id' } }),
            setSessionFromToken: () => Promise.resolve({ user: { id: 'user-id' } }),
            updatePassword: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();
    const component = TestBed.createComponent(NovaSenhaComponent).componentInstance;
    const password = component.form.controls['senha'];

    password.setValue('SenhaSemNumero!');
    expect(password.hasError('passwordStrength')).toBeTrue();
    password.setValue('SenhaForte#123');
    expect(password.valid).toBeTrue();
    password.setValue(`Aa1!${'x'.repeat(197)}`);
    expect(password.getError('passwordStrength').maximumLength).toBeTrue();
  });

  it('não aplica a nova política ao login de contas legadas', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: Router, useValue: {} },
        { provide: AuthService, useValue: {} },
      ],
    }).compileComponents();
    const component = TestBed.createComponent(LoginComponent).componentInstance;

    component.form.setValue({ email: 'legado@example.com', senha: '123456' });
    expect(component.form.valid).toBeTrue();
  });
});
