import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { strongPasswordValidator } from '../../shared/validation/password.validator';

@Component({
  selector: 'app-nova-senha',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './nova-senha.component.html'
})
export class NovaSenhaComponent implements OnInit {
  form: FormGroup;
  loading = false;
  successMessage = '';
  errorMessage = '';
  accessToken = '';
  refreshToken = '';
  validatingToken = true;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group(
      {
        senha: ['', [Validators.required, strongPasswordValidator]],
        confirmarSenha: ['', [Validators.required]]
      },
      {
        validators: this.senhasIguaisValidator
      }
    );
  }

  ngOnInit(): void {
    void this.initializeRecoverySession();
  }

  private async initializeRecoverySession(): Promise<void> {
    const hash = window.location.hash.replace('#', '');
    const params = new URLSearchParams(hash);

    this.accessToken = params.get('access_token') || '';
    this.refreshToken = params.get('refresh_token') || '';
    if (hash) {
      window.history.replaceState(
        {},
        document.title,
        `${window.location.pathname}${window.location.search}`,
      );
    }

    try {
      if (this.accessToken && this.refreshToken) {
        await this.authService.setSessionFromToken(
          this.accessToken,
          this.refreshToken,
        );
      } else if (!(await this.authService.getSession())) {
        this.errorMessage =
          'Token inválido ou expirado. Solicite outro e-mail de recuperação.';
      }
    } catch {
      this.errorMessage =
        'Token inválido ou expirado. Solicite outro e-mail de recuperação.';
    } finally {
      this.accessToken = '';
      this.refreshToken = '';
      this.validatingToken = false;
    }
  }

  senhasIguaisValidator(group: AbstractControl): ValidationErrors | null {
    const senha = group.get('senha')?.value;
    const confirmar = group.get('confirmarSenha')?.value;

    return senha === confirmar ? null : { senhasDiferentes: true };
  }

  async onSubmit(): Promise<void> {
    if (
      this.form.invalid ||
      this.loading ||
      this.validatingToken ||
      this.errorMessage
    ) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      await this.authService.updatePassword(this.form.value.senha);
      this.successMessage = 'Senha atualizada com sucesso.';
      setTimeout(() => this.router.navigate(['/login']), 2000);
    } catch (error: unknown) {
      this.errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Erro ao atualizar a senha.';
    } finally {
      this.loading = false;
    }
  }
}
