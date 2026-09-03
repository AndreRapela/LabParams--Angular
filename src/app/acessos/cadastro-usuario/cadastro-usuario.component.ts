import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  AbstractControl
} from '@angular/forms';
import { AuthService, ManagedUser, UserRole } from '../auth/auth.service';
import { strongPasswordValidator } from '../../shared/validation/password.validator';

function senhaMatchValidator(control: AbstractControl) {
  const senha = control.get('senha')?.value;
  const confirmar = control.get('confirmarSenha')?.value;
  return senha === confirmar ? null : { senhaDiferente: true };
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') return fallback;
  const candidate = error as { error?: { error?: unknown }; message?: unknown };
  if (typeof candidate.error?.error === 'string') return candidate.error.error;
  if (typeof candidate.message === 'string') return candidate.message;
  return fallback;
}



@Component({
  selector: 'app-cadastrar-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cadastro-usuario.component.html',
  styleUrl: './cadastro-usuario.component.css'
})
export class CadastroUsuarioComponent implements OnInit {
  readonly roles: UserRole[] = ['Usuário', 'Analista', 'Gestor'];
  form: FormGroup;
  loading = false;
  loadingUsers = true;
  updatingUserId = '';
  updatingApprovalUserId = '';
  currentUserId = '';
  users: ManagedUser[] = [];
  selectedRoles: Record<string, UserRole> = {};
  feedback = '';
  feedbackType: 'success' | 'error' = 'success';

  constructor(
    private readonly fb: FormBuilder,
    private readonly authService: AuthService
  ) {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['',[Validators.required,Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)]],
      perfil: ['Usuário', Validators.required],
      senha: ['', [Validators.required, strongPasswordValidator]],
      confirmarSenha: ['', Validators.required]
    }, { validators: senhaMatchValidator });
  }

  ngOnInit(): void {
    void this.initializePage();
  }

  mascaraTelefone(event: Event) {
  const input = event.target as HTMLInputElement;
  let valor = input.value.replace(/\D/g, '');

  if (valor.length > 11) {
    valor = valor.substring(0, 11);
  }

  if (valor.length <= 10) {
    valor = valor.replace(/(\d{2})(\d{4})(\d)/, '($1) $2-$3');
  } else {
    valor = valor.replace(/(\d{2})(\d{5})(\d)/, '($1) $2-$3');
  }

  input.value = valor;

  // não dispara novo evento
  this.form.get('telefone')?.setValue(valor, { emitEvent: false });
}


  onSubmit(): void {
    if (this.form.invalid || this.loading) return;
    void this.createUser();
  }

  async updateRole(user: ManagedUser): Promise<void> {
    const perfil = this.selectedRoles[user.id];
    if (
      !perfil ||
      perfil === user.perfil ||
      this.updatingUserId ||
      this.updatingApprovalUserId
    ) return;

    this.updatingUserId = user.id;
    this.clearFeedback();
    try {
      await this.authService.updateUserRole(user.id, perfil);
      this.showFeedback('Perfil atualizado com sucesso.', 'success');
      await this.loadUsers(false);
    } catch (error: unknown) {
      this.selectedRoles[user.id] = user.perfil;
      this.showFeedback(
        apiErrorMessage(error, 'Não foi possível atualizar o perfil.'),
        'error'
      );
    } finally {
      this.updatingUserId = '';
    }
  }

  async toggleApproval(user: ManagedUser): Promise<void> {
    const approving = !user.acesso_aprovado;
    if (!approving && user.id === this.currentUserId) {
      this.showFeedback('Você não pode bloquear o acesso da sua própria conta.', 'error');
      return;
    }
    if (this.updatingApprovalUserId || this.updatingUserId) return;

    const action = approving ? 'aprovar' : 'bloquear';
    if (!window.confirm(`Deseja realmente ${action} o acesso de ${user.nome}?`)) {
      return;
    }

    this.updatingApprovalUserId = user.id;
    this.clearFeedback();
    try {
      await this.authService.updateUserApproval(user.id, approving);
      this.showFeedback(
        approving ? 'Acesso aprovado com sucesso.' : 'Acesso bloqueado com sucesso.',
        'success'
      );
      await this.loadUsers(false);
    } catch (error: unknown) {
      this.showFeedback(
        apiErrorMessage(error, `Não foi possível ${action} o acesso.`),
        'error'
      );
    } finally {
      this.updatingApprovalUserId = '';
    }
  }

  isSelfBlock(user: ManagedUser): boolean {
    return user.id === this.currentUserId && user.acesso_aprovado;
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(value));
  }

  private async createUser(): Promise<void> {
    this.loading = true;
    this.clearFeedback();
    const { nome, email, telefone, senha, perfil } = this.form.value;

    try {
      const response = await this.authService.register(email, senha, nome, telefone, perfil);
      if (!response.success) {
        throw new Error(response.error || 'Não foi possível cadastrar o usuário');
      }
      this.showFeedback('Usuário cadastrado com sucesso.', 'success');
      this.form.reset({ nome: '', email: '', telefone: '', perfil: 'Usuário', senha: '', confirmarSenha: '' });
      await this.loadUsers(false);
    } catch (error: unknown) {
      this.showFeedback(
        apiErrorMessage(error, 'Não foi possível cadastrar o usuário.'),
        'error'
      );
    } finally {
      this.loading = false;
    }
  }

  private async initializePage(): Promise<void> {
    try {
      this.currentUserId = (await this.authService.getSession())?.user.id ?? '';
    } catch {
      this.currentUserId = '';
    }
    await this.loadUsers();
  }

  private async loadUsers(showLoading = true): Promise<void> {
    if (showLoading) this.loadingUsers = true;
    try {
      this.users = await this.authService.listUsers();
      this.selectedRoles = Object.fromEntries(
        this.users.map((user) => [user.id, user.perfil])
      );
    } catch {
      this.showFeedback('Não foi possível carregar os usuários.', 'error');
    } finally {
      this.loadingUsers = false;
    }
  }

  private showFeedback(message: string, type: 'success' | 'error'): void {
    this.feedback = message;
    this.feedbackType = type;
  }

  private clearFeedback(): void {
    this.feedback = '';
  }

}
