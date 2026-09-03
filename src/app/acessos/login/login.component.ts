import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { getAccessBlockReason } from '../auth/access-state';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  loginErro: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]]
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;

    this.loading = true;
    this.loginErro = null;

    const { email, senha } = this.form.value;

    let signedIn = false;
    try {
      const res = await this.authService.login(email, senha);

      if (res.error) {
        if (res.error.message.includes('Invalid login credentials')) {
          this.loginErro = "Email ou senha incorretos.";
        } else {
          this.loginErro = "Erro ao fazer login.";
        }
        return;
      }

      signedIn = Boolean(res.data.session);
      const reason = getAccessBlockReason(await this.authService.getCurrentAccess());
      if (reason) {
        await this.router.navigate(['/acesso-negado'], {
          queryParams: { motivo: reason },
        });
        return;
      }

      await this.router.navigateByUrl('/dashboard-web');
    } catch {
      if (signedIn) {
        try {
          await this.authService.logout();
        } catch {
          // O estado local é limpo pelo serviço mesmo se o provedor estiver indisponível.
        }
        this.loginErro = 'Não foi possível verificar seu acesso. Tente novamente.';
      } else {
        this.loginErro = 'Erro inesperado. Tente novamente.';
      }
    } finally {
      this.loading = false;
    }
  }

  goToForgotPassword(): void {
    this.router.navigate(['/recuperar-senha']);
  }
}
